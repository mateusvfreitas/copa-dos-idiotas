/**
 * Phase 3: import auth.identities (Google OAuth links) from Lovable CSV.
 *
 * Phase 2 (createUser) creates email identities — this replaces them with
 * the real Google provider rows so "Entrar com Google" matches existing users.
 *
 * Uses: migration-data/.env.migration + supabase CLI (must be logged in)
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  loadMigrationEnv,
  parseCsv,
  parseJson,
  sqlLiteral,
  runLinkedSql,
} from "./migration-lib.mjs";

loadMigrationEnv();

const csvPath = process.argv[2] ?? "migration-data/authIdentities.csv";
const dryRun = process.argv.includes("--dry-run");

const records = parseCsv(readFileSync(resolve(csvPath), "utf8"));
console.log(`Found ${records.length} identity row(s) in ${csvPath}`);
if (dryRun) console.log("(dry run — no SQL will be executed)\n");

const userIds = records.map((r) => r.user_id?.trim()).filter(Boolean);

const statements = [];

if (userIds.length > 0) {
  statements.push(
    `DELETE FROM auth.identities WHERE provider = 'email' AND user_id IN (${userIds.map(sqlLiteral).join(", ")});`,
  );
}

for (const row of records) {
  const id = row.id?.trim();
  const userId = row.user_id?.trim();
  const provider = row.provider?.trim();
  const providerId = row.provider_id?.trim();
  const identityData = parseJson(row.identity_data);
  const createdAt = row.created_at?.trim();
  const updatedAt = row.updated_at?.trim();

  if (!id || !userId || !provider || !providerId) {
    console.error("SKIP: row missing required fields", row);
    continue;
  }

  statements.push(`
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES (
  ${sqlLiteral(id)}::uuid,
  ${sqlLiteral(userId)}::uuid,
  ${sqlLiteral(providerId)},
  ${sqlLiteral(JSON.stringify(identityData))}::jsonb,
  ${sqlLiteral(provider)},
  NULL,
  ${sqlLiteral(createdAt)}::timestamptz,
  ${sqlLiteral(updatedAt)}::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  provider_id = EXCLUDED.provider_id,
  identity_data = EXCLUDED.identity_data,
  provider = EXCLUDED.provider,
  updated_at = EXCLUDED.updated_at;
`.trim());

  if (dryRun) {
    console.log(`Would import: ${provider} ${providerId} → user ${userId}`);
  }
}

const sql = statements.join("\n\n");

if (dryRun) {
  runLinkedSql(sql, { dryRun: true, label: "identities import" });
  console.log(`Done. ${records.length} identity row(s) ready to import.`);
} else {
  console.log("Running SQL on linked Supabase project…");
  runLinkedSql(sql, { label: "identities import" });
  console.log(`Done. Imported ${records.length} identity row(s).`);
}
