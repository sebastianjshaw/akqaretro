# Deploy (Vercel + Neon)

## 1. Neon

1. Create a project at [neon.tech](https://neon.tech).
2. On the project dashboard, click **Connect** to open the “Connect to your database” modal.
3. **Pooled (for `DATABASE_URL`):** Leave **Connection pooling** turned **on**. Copy the connection string → use as `DATABASE_URL`.
4. **Direct (for `DIRECT_URL`):** Turn **Connection pooling** **off** in the same modal. Copy the new connection string → use as `DIRECT_URL`.  
   (Direct = hostname without `-pooler`; Prisma needs this for migrations.)

## 2. Vercel

1. Import the repo in [Vercel](https://vercel.com).
2. **Environment variables** (Production, Preview, Development):
   - `DATABASE_URL` = Neon pooled connection string
   - `DIRECT_URL` = Neon direct connection string
3. Deploy. Build runs `prisma generate`; migrations are **not** run automatically.

## 3. Run migrations once

From your machine (with Neon env in `.env`):

```bash
npx prisma migrate deploy
```

Or in Vercel: **Settings → General → Build & Development Settings**: set **Build Command** to e.g. `prisma generate && prisma migrate deploy && next build` so each deploy applies pending migrations.

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
