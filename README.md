# Barcodi

Barcodi is a Vite/React PWA for store barcode scanning. Customers open a store URL, scan product barcodes, and build a cart. Store admins manage branding and product uploads. The commander account manages subscriber stores.

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set:

   - `JWT_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `APP_URL` or `CORS_ORIGIN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. Start the app:

   ```bash
   npm run dev
   ```

## Production Notes

- `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` are required when `NODE_ENV=production`.
- Store passwords are hashed with PBKDF2 before storage.
- `/api/admin/register`, `/api/admin/all-stores`, and store deletion require the commander token.
- Supabase Postgres stores server-side records in the `stores` table.
- The Supabase service role key is used only by the backend and must never be exposed to browser code.
- See `DEPLOYMENT.md` for Netlify frontend, Cloud Run API, and Supabase deployment steps.

## Checks

```bash
npm run lint
npm run build
npm audit
```
