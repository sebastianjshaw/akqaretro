# Deploy (Vercel + Neon)

## 1. Neon

1. Create a project at [neon.tech](https://neon.tech).
2. On the project dashboard, click **Connect** to open the “Connect to your database” modal.
3. **Pooled (for `DATABASE_URL`):** Leave **Connection pooling** turned **on**. Copy the connection string → use as `DATABASE_URL`.
4. **Direct (for `DIRECT_URL`):** Turn **Connection pooling** **off** in the same modal. Copy the new connection string → use as `DIRECT_URL`.  
   (Direct = hostname without `-pooler`; Prisma needs this for migrations.)

## 2. Google sign-in (optional but recommended)

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project (or use an existing one).
2. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**. Application type: **Web application**. Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google` (and for local: `http://localhost:3000/api/auth/callback/google`).
3. Copy the **Client ID** and **Client secret**.
4. Generate a secret for Auth.js: `npx auth secret` (or `openssl rand -base64 32`). Set as `AUTH_SECRET`.
5. Add to Vercel and `.env`: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.

Without these, the app still works with anonymous “My retros” (device-only); with them, retros are tied to the signed-in Google account.

## 3. Vercel

1. Import the repo in [Vercel](https://vercel.com).
2. **Environment variables** (Production, Preview, Development):
   - `DATABASE_URL` = Neon pooled connection string
   - `DIRECT_URL` = Neon direct connection string
   - `AUTH_SECRET` = from step 2.4
   - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` = from step 2.3 (if using Google sign-in)
3. Deploy. The build runs **migrations against your Neon DB** (using `DATABASE_URL` and `DIRECT_URL` from Vercel), then builds the app. No need to run migrations from your machine.

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
