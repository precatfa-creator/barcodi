import fs from 'fs';
import path from 'path';

const distDir = path.join(process.cwd(), 'dist');
const redirectsPath = path.join(distDir, '_redirects');
const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, '');
const isNetlifyBuild = process.env.NETLIFY === 'true';

if (!fs.existsSync(distDir)) {
  throw new Error('dist directory does not exist. Run the Vite build before generating Netlify redirects.');
}

if (isNetlifyBuild && !backendUrl) {
  throw new Error('BACKEND_URL is required for Netlify production builds so /api/* can proxy to Cloud Run.');
}

const lines = [];

if (backendUrl) {
  lines.push(`/api/*  ${backendUrl}/api/:splat  200`);
} else {
  console.warn('BACKEND_URL is not set; generated Netlify redirects without an /api proxy.');
}

lines.push('/*  /index.html  200');
fs.writeFileSync(redirectsPath, `${lines.join('\n')}\n`);
console.log(`Wrote ${redirectsPath}`);
