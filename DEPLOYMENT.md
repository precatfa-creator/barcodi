# Production Deployment

This project deploys as:

- Netlify for the React/Vite frontend
- Google Cloud Run service `barcodi-api` for `/api/**`
- Firebase Firestore for the database and security rules

The frontend calls `/api/...` normally. Netlify proxies those paths to Cloud Run using `dist/_redirects`, generated from the `BACKEND_URL` environment variable during the Netlify build.

## 1. Deploy the Backend to Cloud Run

Enable Google Cloud CLI access for project `barcodi-a95a9`, then create production secrets:

```bash
gcloud secrets create JWT_SECRET --project barcodi-a95a9
gcloud secrets versions add JWT_SECRET --project barcodi-a95a9 --data-file=-

gcloud secrets create ADMIN_PASSWORD --project barcodi-a95a9
gcloud secrets versions add ADMIN_PASSWORD --project barcodi-a95a9 --data-file=-
```

Generate a strong JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Deploy the API:

```bash
gcloud run deploy barcodi-api \
  --source . \
  --region us-central1 \
  --project barcodi-a95a9 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,ADMIN_USERNAME=commander,APP_URL=https://YOUR_NETLIFY_SITE.netlify.app,CORS_ORIGIN=https://YOUR_NETLIFY_SITE.netlify.app \
  --set-secrets JWT_SECRET=JWT_SECRET:latest,ADMIN_PASSWORD=ADMIN_PASSWORD:latest
```

Copy the Cloud Run service URL from the deploy output. It will look like:

```text
https://barcodi-api-xxxxx-uc.a.run.app
```

## 2. Deploy the Frontend to Netlify

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

## 3. Deploy Firestore Rules

```bash
firebase login
firebase use barcodi-a95a9
firebase deploy --only firestore:rules,firestore:indexes
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
- Firestore public collection `stores` is sanitized for clients.
- Firestore private collection `privateStores` stores server-only records and is inaccessible from browser rules.
- If your Netlify URL changes, update Cloud Run `APP_URL` and `CORS_ORIGIN`.
