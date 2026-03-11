# Deploy (Vercel + Neon)

## 1. Neon

1. Create a project at [neon.tech](https://neon.tech).
2. On the project dashboard, click **Connect** to open the “Connect to your database” modal.
3. **Pooled (for `DATABASE_URL`):** Leave **Connection pooling** turned **on**. Copy the connection string → use as `DATABASE_URL`.
4. **Direct (for `DIRECT_URL`):** Turn **Connection pooling** **off** in the same modal. Copy the new connection string → use as `DIRECT_URL`.  
   (Direct = hostname without `-pooler`; Prisma needs this for migrations.)

## 2. Google sign-in (optional but recommended)

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project (or use an existing one).
2. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**. Application type: **Web application**.
3. **Authorized redirect URIs** – add **both** (exact strings, no trailing slash):
   - Production: `https://<your-vercel-domain>/api/auth/callback/google` (e.g. `https://akqaretro.vercel.app/api/auth/callback/google`)
   - Local: `http://localhost:3000/api/auth/callback/google`
4. Copy the **Client ID** and **Client secret**.
5. Generate a secret for Auth.js: `npx auth secret` (or `openssl rand -base64 32`). Set as `AUTH_SECRET`.
6. Add to Vercel and `.env`: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
7. **Production only:** In Vercel, set **`AUTH_URL`** to your production URL (e.g. `https://akqaretro.vercel.app`). Without this, the Google callback can use the wrong URL and sign-in will just refresh the page.

Without these, the app still works with anonymous “My retros” (device-only); with them, retros are tied to the signed-in Google account.

## 3. Vercel

1. Import the repo in [Vercel](https://vercel.com).
2. **Environment variables** (Production, Preview, Development):
   - `DATABASE_URL` = Neon pooled connection string
   - `DIRECT_URL` = Neon direct connection string
   - `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK` = `1` (avoids P1002 timeout during `migrate deploy` on Neon; [see Prisma env vars](https://www.prisma.io/docs/orm/reference/prisma-environment-variables-reference))
   - `AUTH_SECRET` = from step 2.5
   - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` = from step 2.4 (if using Google sign-in)
   - `AUTH_URL` = your production URL, e.g. `https://akqaretro.vercel.app` (required for Google sign-in on production)
3. **Env checklist:** For each variable, select **Production** (and Preview if you use it). Paste the **value only** (no quotes). After saving, trigger a **Redeploy**; if sign-in still fails, use **Redeploy** → **Clear cache and redeploy**.
4. Deploy. The build runs **migrations against your Neon DB** (using `DIRECT_URL`), then builds the app.

**Run migrations on production manually (optional)**  
To apply pending migrations without deploying (e.g. from your machine):

```bash
# With production Neon URLs in .env, or inline:
DATABASE_URL="postgresql://...pooled..." DIRECT_URL="postgresql://...direct..." npx prisma migrate deploy
```

Use the same pooled and direct connection strings you have in Vercel for production.

**If builds still fail with P1002 (advisory lock timeout):** Remove migrations from the build and run them once from your machine. In `package.json` change the build script to `"build": "prisma generate && next build"`, then run `npx prisma migrate deploy` locally with production `DATABASE_URL`/`DIRECT_URL` whenever you add a new migration.

## 4. Local dev with Neon

In `.env`:

```
DATABASE_URL="postgresql://...?sslmode=require"
DIRECT_URL="postgresql://...?sslmode=require"
```

Then:

```bash
npx prisma migrate deploy   # if needed
npm run dev
```

For local SQLite instead, switch `provider` in `prisma/schema.prisma` to `sqlite` and use `DATABASE_URL="file:./dev.db"` (no `directUrl`).

---

## Debugging 500 on create retro

1. **Vercel logs:** Project → **Logs** (or **Deployments** → latest → **Functions**). Reproduce the error, then check the server log for `POST /api/retros` — the real error and optional `code` (e.g. Prisma `P1001`) are logged there.
2. **Env:** In Vercel → **Settings** → **Environment Variables**, confirm `DATABASE_URL` (and `DIRECT_URL`) are set for Production and that **Build** ran after adding them.
3. **Migrations:** If the log says the table/relation does not exist, redeploy so the build runs `prisma migrate deploy` (it’s in the default build script). Ensure `DIRECT_URL` is set in Vercel—migrations use it.
4. **Neon URL:** Connection string should include `?sslmode=require` (Neon usually adds this). If you see a connection/timeout error, re-copy the pooled URL from Neon and ensure no typo.
