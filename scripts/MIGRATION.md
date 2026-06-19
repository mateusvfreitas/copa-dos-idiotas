# Lovable → Supabase migration (auth)

Your app links data to **`auth.users.id`** (UUID). Phase 2 copies those users from Lovable into your new Supabase so palpites still match after Google login.

## The idea (Phase 2 in one paragraph)

When someone signed up on Lovable with Google, Supabase created a row in `auth.users` with a UUID like `a1b2c3d4-...`. Every prediction stores that UUID in `user_id`. Phase 2 **recreates those same rows** (same UUID, same email) in your **new** Supabase project. You cannot paste the CSV into the dashboard — you run a small script that calls Supabase’s admin API once per user.

---

## Which Supabase project?

| Project | Ref | Role |
|---------|-----|------|
| Old (Lovable Cloud) | `rauhckgllpfanpkjtmas` | Export CSVs from here |
| New (yours) | `gqlvuchyrxemqenmjfys` | Run migrations + import here |

Your `.env` still points at the **old** project. The import script uses `MIGRATION_*` env vars so you target the **new** project on purpose.

---

## Step-by-step after exporting `auth.users` CSV

### 1. Put the CSV somewhere local

Example: `migration-data/auth.users.csv` (folder is gitignored).

### 2. Add your Secret key locally (do not paste in chat)

Copy the example file and paste your **Secret** key only on your machine:

```powershell
copy migration-data\.env.migration.example migration-data\.env.migration
# Edit migration-data\.env.migration — set MIGRATION_SUPABASE_SECRET_KEY=sb_secret_...
```

This file is gitignored. Then ask the agent to run the import, or run it yourself.

### 3. Dry run (see what would happen)

```powershell
cd c:\Users\mateu\Documents\copa-dos-idiotas

$env:MIGRATION_SUPABASE_URL="https://gqlvuchyrxemqenmjfys.supabase.co"
$env:MIGRATION_SUPABASE_SECRET_KEY="sb_secret_..."

node scripts/import-auth-users.mjs migration-data/auth.users.csv --dry-run
```

You should see one line per user: `Would import: email@gmail.com (uuid...)`.

### 4. Real import

```powershell
node scripts/import-auth-users.mjs migration-data/auth.users.csv
```

Each line should print `OK: email@gmail.com → uuid`.

### 5. Verify in new Supabase

SQL Editor:

```sql
SELECT count(*) FROM auth.users;
SELECT id, email FROM auth.users ORDER BY created_at;
```

Count should match your Lovable export.

### 6. Then Phase 3 — identities (Google)

Phase 2 alone is **not enough** for Google login. You still need `auth.identities` so Supabase knows “this Google account = this UUID”. See parent migration guide or ask for `import-auth-identities` script.

### 7. Then import public CSVs

`profiles`, `user_roles`, `predictions`, `bonus_predictions` — only **after** auth users exist.

---

## What the script does (per CSV row)

For each line in `auth.users.csv` it calls:

```
supabase.auth.admin.createUser({
  id: "<same UUID from Lovable>",
  email: "user@gmail.com",
  email_confirm: true,
  user_metadata: { ... from raw_user_meta_data ... },
})
```

Google-only users usually have an empty `encrypted_password` column — that’s fine.

Side effect: your DB trigger may auto-create an empty `profiles` row. When you import the `profiles` CSV later, use upsert or update if you get duplicate key errors.

---

## Common errors

| Error | Meaning |
|-------|---------|
| `User already registered` | User already imported or someone logged in on new app first — check UUID |
| `Missing env var` | Set `MIGRATION_SUPABASE_URL` and `MIGRATION_SUPABASE_SECRET_KEY` |
| `Invalid API key` | Used Publishable key instead of Secret, or wrong project URL |
| User logs in but no palpites | Phase 3 (identities) missing, or UUID mismatch |

---

## Do NOT do this before Phase 2 finishes

- Don’t let users click “Entrar com Google” on the new app (creates new UUIDs).
- Don’t import `predictions` before `auth.users` exists on the new project.
