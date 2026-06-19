import { readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

export function loadMigrationEnv() {
  loadEnvFile(resolve(__dirname, "../migration-data/.env.migration"));
  loadEnvFile(resolve(projectRoot, "migration-data/.env.migration"));
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

export function getProjectRef() {
  const url = process.env.MIGRATION_SUPABASE_URL ?? "";
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    console.error("MIGRATION_SUPABASE_URL must look like https://YOUR_REF.supabase.co");
    process.exit(1);
  }
  return match[1];
}

export function detectDelimiter(headerLine) {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export function parseCsv(text) {
  const delimiter = detectDelimiter(text.split(/\r?\n/)[0] ?? "");
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    return obj;
  });
}

export function parseJson(value, fallback = {}) {
  if (!value || value === "null" || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function runLinkedSql(sql, { dryRun = false, label = "SQL" } = {}) {
  if (dryRun) {
    console.log(`--- ${label} (dry run) ---\n${sql}\n`);
    return;
  }

  const sqlFile = resolve(projectRoot, "migration-data/.import-run.sql");
  writeFileSync(sqlFile, sql, "utf8");

  try {
    const projectRef = getProjectRef();
    execSync(`npx supabase db query --linked -f "${sqlFile}"`, {
      cwd: projectRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        SUPABASE_PROJECT_ID: projectRef,
        VITE_SUPABASE_PROJECT_ID: projectRef,
      },
    });
  } finally {
    if (existsSync(sqlFile)) unlinkSync(sqlFile);
  }
}
