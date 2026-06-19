/**
 * Phase 2: copy auth.users from Lovable CSV into your NEW Supabase project.
 *
 *
 * Credentials (pick one):
 *   migration-data/.env.migration   ← recommended (gitignored, paste Secret key here)
 *   or PowerShell env vars
 *
 * Dry run (no writes):
 *   node scripts/import-auth-users.mjs path/to/auth.users.csv --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// Optional: migration-data/.env.migration (gitignored) — paste Secret key there, not in chat
loadEnvFile(resolve(__dirname, "../migration-data/.env.migration"));
loadEnvFile(resolve(process.cwd(), "migration-data/.env.migration"));

function detectDelimiter(headerLine) {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsv(text) {
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

function parseJson(value, fallback = {}) {
  if (!value || value === "null" || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing env var: ${name}`);
    console.error("");
    console.error("Option A — create migration-data/.env.migration (see .env.migration.example)");
    console.error("Option B — set env vars in PowerShell before running this script");
    console.error("");
    console.error("  MIGRATION_SUPABASE_URL");
    console.error("  MIGRATION_SUPABASE_SECRET_KEY   (sb_secret_... from Dashboard → API)");
    process.exit(1);
  }
  return value;
}

function requireSecretKey() {
  return (
    process.env.MIGRATION_SUPABASE_SECRET_KEY ||
    process.env.MIGRATION_SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      console.error("Missing env var: MIGRATION_SUPABASE_SECRET_KEY");
      console.error("");
      console.error("Use the Secret key (sb_secret_...), not the Publishable key.");
      console.error("Legacy service_role JWT also works until late 2026.");
      process.exit(1);
    })()
  );
}

const csvPath = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!csvPath) {
  console.error("Usage: node scripts/import-auth-users.mjs <auth.users.csv> [--dry-run]");
  process.exit(1);
}

const url = requireEnv("MIGRATION_SUPABASE_URL");
const secretKey = requireSecretKey();

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const records = parseCsv(readFileSync(resolve(csvPath), "utf8"));
console.log(`Found ${records.length} user(s) in ${csvPath}`);
if (dryRun) console.log("(dry run — no users will be created)\n");

let ok = 0;
let failed = 0;

for (const row of records) {
  const id = row.id?.trim();
  const email = row.email?.trim();

  if (!id || !email) {
    console.error("SKIP: row missing id or email", row);
    failed++;
    continue;
  }

  const payload = {
    id,
    email,
    email_confirm: true,
    user_metadata: parseJson(row.raw_user_meta_data),
    app_metadata: parseJson(row.raw_app_meta_data),
  };

  const passwordHash = row.encrypted_password?.trim();
  if (passwordHash && passwordHash !== "null") {
    payload.password_hash = passwordHash;
  }

  if (dryRun) {
    console.log(`Would import: ${email} (${id})`);
    ok++;
    continue;
  }

  const { data, error } = await supabase.auth.admin.createUser(payload);

  if (error) {
    console.error(`FAIL: ${email} — ${error.message}`);
    failed++;
    continue;
  }

  console.log(`OK: ${email} → ${data.user?.id ?? id}`);
  ok++;
}

console.log("");
console.log(`Done. ${ok} succeeded, ${failed} failed.`);
if (failed > 0) process.exit(1);
