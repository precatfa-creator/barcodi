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

3. Start the app:

   ```bash
   npm run dev
   ```

## Production Notes

- `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` are required when `NODE_ENV=production`.
- Store passwords are hashed with PBKDF2 before storage.
- `/api/admin/register`, `/api/admin/all-stores`, and store deletion require the commander token.
- Firestore browser rules allow public reads of known sanitized store documents only. Public listing and all browser writes are denied.
- Firestore server sync uses Firebase Admin credentials through Application Default Credentials or `FIREBASE_SERVICE_ACCOUNT_KEY`.
- Full server records are stored in the server-only `privateStores` collection. Public clients only read sanitized `stores/{storeId}` documents.
- Do not deploy old Firestore documents that contain `username`, `password`, or `passwordHash`; start the server once with Admin credentials so it republishes sanitized store documents.
- See `DEPLOYMENT.md` for Netlify frontend, Cloud Run API, and Firestore deployment steps.

## Checks

```bash
npm run lint
npm run build
npm audit
```
