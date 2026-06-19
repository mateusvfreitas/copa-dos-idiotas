# Deploy Copa dos Idiotas (Vercel + Google OAuth)

## 1. Google Cloud Console

Use an existing OAuth client or create one: [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).

**Authorized JavaScript origins** (add all you use):

- `http://localhost:8080` (local dev — this project uses port 8080)
- `https://YOUR-APP.vercel.app` (after first deploy)
- `https://your-custom-domain.com` (if any)

**Authorized redirect URIs** — only Supabase’s callback (not your app URL):

```
https://gqlvuchyrxemqenmjfys.supabase.co/auth/v1/callback
```

Copy the **Client ID** and **Client secret**.

---

## 2. Supabase Dashboard (new project)

Project: `gqlvuchyrxemqenmjfys`

### Authentication → Providers → Google

- Enable Google
- Paste Client ID and Client secret from step 1

### Authentication → URL configuration

| Field | Value |
|-------|--------|
| **Site URL** | `https://YOUR-APP.vercel.app` (update after deploy) |
| **Redirect URLs** | `http://localhost:8080/auth/callback` |
| | `https://YOUR-APP.vercel.app/auth/callback` |

Save. Without these, Google login redirects fail after OAuth.

---

## 3. Environment variables

Set the same vars locally (`.env`) and on Vercel (**Project → Settings → Environment Variables**):

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://gqlvuchyrxemqenmjfys.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` from Supabase → Settings → API |
| `SUPABASE_URL` | same as above |
| `SUPABASE_PUBLISHABLE_KEY` | same publishable key |

Use the **Publishable** key in the app, never the Secret key.

See `.env.example`.

---

## 4. Deploy to Vercel (free tier)

1. Push this repo to GitHub (if not already).
2. [vercel.com/new](https://vercel.com/new) → Import repository.
3. Framework preset should detect **TanStack Start** (nitro + vercel preset in `vite.config.ts`).
4. Build command: `npm run build` (default).
5. Add env vars from step 3 for **Production** (and Preview if you want OAuth on preview URLs).
6. Deploy.

After the first deploy, copy your Vercel URL (e.g. `https://copa-dos-idiotas.vercel.app`) and:

- Update Supabase **Site URL** and add `https://…/auth/callback` to **Redirect URLs**
- Add that origin to Google **Authorized JavaScript origins**
- Redeploy is not required for Supabase/Google changes

---

## 5. Smoke test

1. Open production URL → **Entrar com Google**
2. Sign in with an account that was migrated (same Gmail as Lovable)
3. Confirm `/palpites` shows existing predictions
4. Check `/ranking` points

---

## 6. Optional: custom domain

Vercel → Domains → add domain, then repeat URL updates in Supabase and Google for the new domain.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Redirect to wrong site after Google | Supabase Redirect URLs missing `/auth/callback` |
| `redirect_uri_mismatch` from Google | Add Supabase callback URL in Google Console |
| Empty account after login | Auth migration UUID mismatch — re-check phases 2–3 |
| 404 on refresh | Vercel should use Nitro output; confirm `nitro: { preset: "vercel" }` in `vite.config.ts` |
| Build fails locally | Run `npm run build`; fix errors before pushing |
