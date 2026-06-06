# Production Deployment

This project deploys as:

- Netlify for the React/Vite frontend
- Google Cloud Run service `barcodi-api` for `/api/**`
- Supabase Postgres for store/admin/product data

The frontend calls `/api/...` normally. Netlify proxies those paths to Cloud Run using `dist/_redirects`, generated from the `BACKEND_URL` environment variable during the Netlify build.

## 1. Supabase

Create this table in Supabase, or run the migration already applied in this workspace:

```sql
create table if not exists public.stores (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  store_name text not null,
  store_logo text not null default '',
  products jsonb not null default '[]'::jsonb,
  visits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stores enable row level security;
```

No browser policies are required because the app writes through the server with the service role key.

## 2. Deploy the Backend to Cloud Run

Set Cloud Run env vars/secrets:

- `NODE_ENV=production`
- `ADMIN_USERNAME=commander`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `APP_URL=https://YOUR_NETLIFY_SITE.netlify.app`
- `CORS_ORIGIN=https://YOUR_NETLIFY_SITE.netlify.app`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Deploy:

```bash
gcloud run deploy barcodi-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,ADMIN_USERNAME=commander,APP_URL=https://YOUR_NETLIFY_SITE.netlify.app,CORS_ORIGIN=https://YOUR_NETLIFY_SITE.netlify.app,SUPABASE_URL=https://YOUR_SUPABASE_PROJECT.supabase.co \
  --set-secrets JWT_SECRET=JWT_SECRET:latest,ADMIN_PASSWORD=ADMIN_PASSWORD:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest
```

Copy the Cloud Run service URL from the deploy output.

## 3. Deploy the Frontend to Netlify

In Netlify:

- Build command: `npm run build:netlify`
- Publish directory: `dist`
- Environment variable: `BACKEND_URL=https://YOUR_CLOUD_RUN_SERVICE_URL`

Then deploy from Git or run:

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --build
netlify deploy --build --prod
```

## 4. First Login

Open:

```text
https://YOUR_NETLIFY_SITE.netlify.app/admin
```

Use:

```text
username: commander
password: the ADMIN_PASSWORD secret
```

## Notes

- Do not commit `.env.local` or production secrets.
- The Supabase service role key must stay server-side only.
- If your Netlify URL changes, update Cloud Run `APP_URL` and `CORS_ORIGIN`.
