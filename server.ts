import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: ['.env.local', '.env'] });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const requiredProductionEnv = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
const missingProductionEnv = requiredProductionEnv.filter((key) => !process.env[key]);
if (isProduction && missingProductionEnv.length > 0) {
  throw new Error(`Missing required production environment variables: ${missingProductionEnv.join(', ')}`);
}

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.APP_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: isProduction ? allowedOrigins : true,
}));
app.use(express.json({ limit: '5mb' }));

// Allow camera and media features for barcode scanning on all pages
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
  next();
});

// Setup our simple in-memory DB or fallback to file
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const shouldUseSeedDb = !isProduction || process.env.USE_SEED_DB === 'true';
const PASSWORD_SCHEME = 'pbkdf2_sha256';
const PASSWORD_ITERATIONS = 310000;
const MAX_PRODUCTS_PER_STORE = Number(process.env.MAX_PRODUCTS_PER_STORE || 5000);

const devJwtSecret = crypto.randomBytes(32).toString('hex');
const JWT_SECRET = process.env.JWT_SECRET || devJwtSecret;
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. A temporary development-only JWT secret will be used for this process.');
}

const getBootstrapAdmin = () => ({
  username: process.env.ADMIN_USERNAME?.trim() || 'commander',
  password: process.env.ADMIN_PASSWORD || 'change-this-local-admin-password',
});

if (!isProduction && (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD)) {
  console.warn('ADMIN_USERNAME/ADMIN_PASSWORD are not set. Using local development bootstrap credentials only.');
}

const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 32, 'sha256').toString('hex');
  return `${PASSWORD_SCHEME}$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
};

const verifyPassword = (password: string, passwordHash: string) => {
  const [scheme, iterationsRaw, salt, expectedHash] = passwordHash.split('$');
  if (scheme !== PASSWORD_SCHEME || !iterationsRaw || !salt || !expectedHash) return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;

  const actual = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
};

const sanitizeText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const validateUsername = (username: unknown) => {
  const normalized = sanitizeText(username, 64).toLowerCase();
  return /^[a-z0-9._-]{3,64}$/.test(normalized) ? normalized : null;
};

const validatePasswordInput = (password: unknown) => {
  if (typeof password !== 'string') return null;
  return password.length >= 8 && password.length <= 128 ? password : null;
};

const generateTemporaryPassword = () => `Barcodi-${crypto.randomBytes(6).toString('base64url')}`;

const validateStoreLogo = (logo: unknown) => {
  if (logo === undefined || logo === null || logo === '') return '';
  if (typeof logo !== 'string') return null;
  if (logo.length > 750000) return null;
  if (/^https:\/\/[^\s]+$/i.test(logo) || /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(logo)) {
    return logo;
  }
  return null;
};

const normalizeProduct = (raw: any, index: number): ProductRecord | null => {
  if (!raw || typeof raw !== 'object') return null;

  const name = sanitizeText(raw.name, 160);
  const barcode = sanitizeText(raw.barcode, 80);
  const price = Number(raw.price);
  if (!name || !barcode || !Number.isFinite(price) || price < 0 || price > 1000000) return null;

  const imageUrl = raw.imageUrl === undefined || raw.imageUrl === ''
    ? undefined
    : validateStoreLogo(raw.imageUrl);
  if (imageUrl === null) return null;

  const stock = raw.stock === undefined || raw.stock === null || raw.stock === ''
    ? undefined
    : Number(raw.stock);
  if (stock !== undefined && (!Number.isFinite(stock) || stock < 0 || stock > 100000000)) return null;

  const calories = raw.calories === undefined || raw.calories === null || raw.calories === ''
    ? undefined
    : Number(raw.calories);
  if (calories !== undefined && (!Number.isFinite(calories) || calories < 0 || calories > 1000000)) return null;

  return {
    id: sanitizeText(raw.id, 80) || crypto.randomUUID(),
    name,
    barcode,
    price,
    category: sanitizeText(raw.category, 80) || 'general',
    description: sanitizeText(raw.description, 500),
    imageEmoji: sanitizeText(raw.imageEmoji, 16) || 'box',
    imageUrl: imageUrl || undefined,
    stock,
    calories,
    weight: sanitizeText(raw.weight, 50) || undefined,
  };
};

const normalizeProducts = (products: unknown) => {
  if (!Array.isArray(products) || products.length > MAX_PRODUCTS_PER_STORE) return null;
  const normalized = products.map(normalizeProduct);
  if (normalized.some((product) => product === null)) return null;
  return normalized as ProductRecord[];
};

const migrateStoreCredentials = (store: StoreRecord) => {
  if (!store.passwordHash && store.password) {
    store.passwordHash = hashPassword(store.password);
  }
  delete store.password;
};

const requireCommander = (req: any, res: any, next: any) => {
  const user = req.user;
  if (user?.storeId !== 'default' && user?.role !== 'commander') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  next();
};

// Ensure data folder exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

type StoreRecord = {
  id: string;
  username: string;
  password?: string;
  passwordHash?: string;
  storeName: string;
  storeLogo: string;
  products: ProductRecord[];
  visits?: number;
  suspended?: boolean;
  // Purchase-list (cart) feature toggle. Undefined means enabled so existing
  // stores keep their current behavior without a data migration.
  cartEnabled?: boolean;
};

type ProductRecord = {
  id: string;
  name: string;
  barcode: string;
  price: number;
  category: string;
  description: string;
  imageEmoji: string;
  imageUrl?: string;
  stock?: number;
  calories?: number;
  weight?: string;
};

type StoreEventClient = {
  id: string;
  res: express.Response;
};

let db: {
  stores: Record<string, StoreRecord>;
} = {
  stores: {}
};

// Seed initial old DB if existed for migration (optional)
try {
  if (shouldUseSeedDb && fs.existsSync(DB_PATH)) {
    const rawData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    if (rawData.stores) {
      db = rawData;
    } else {
      // Migrate old data
      const bootstrapAdmin = getBootstrapAdmin();
      db = {
        stores: {
          'default': {
            id: 'default',
            username: bootstrapAdmin.username,
            passwordHash: hashPassword(bootstrapAdmin.password),
            storeName: rawData.storeName || "سوبر ماركت السلام",
            storeLogo: rawData.storeLogo || "",
            products: rawData.products || []
          }
        }
      }
    }
  } else {
    // Just save the empty template 
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }

  // Ensure there's at least one store (the default admin account) populated
  if (Object.keys(db.stores).length === 0) {
    const bootstrapAdmin = getBootstrapAdmin();
    db.stores['default'] = {
      id: 'default',
      username: bootstrapAdmin.username,
      passwordHash: hashPassword(bootstrapAdmin.password),
      storeName: "باركودي - الإدارة العامة",
      storeLogo: "",
      products: [],
      visits: 0
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }

  let migratedData = false;
  for (const store of Object.values(db.stores)) {
    if (store.password) migratedData = true;
    migrateStoreCredentials(store);
    const normalizedProducts = normalizeProducts(store.products || []) || [];
    const normalizedLogo = validateStoreLogo(store.storeLogo) || '';
    const normalizedStoreName = sanitizeText(store.storeName, 120) || 'Store';
    const normalizedUsername = validateUsername(store.username) || store.username;

    if (
      JSON.stringify(store.products || []) !== JSON.stringify(normalizedProducts) ||
      store.storeLogo !== normalizedLogo ||
      store.storeName !== normalizedStoreName ||
      store.username !== normalizedUsername
    ) {
      migratedData = true;
    }

    store.products = normalizedProducts;
    store.storeLogo = normalizedLogo;
    store.storeName = normalizedStoreName;
    store.username = normalizedUsername;
  }

  if (db.stores['default'] && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    const bootstrapAdmin = getBootstrapAdmin();
    const defaultStore = db.stores['default'];
    if (defaultStore.username !== bootstrapAdmin.username) {
      defaultStore.username = bootstrapAdmin.username;
      migratedData = true;
    }
    if (!defaultStore.passwordHash || !verifyPassword(bootstrapAdmin.password, defaultStore.passwordHash)) {
      defaultStore.passwordHash = hashPassword(bootstrapAdmin.password);
      migratedData = true;
    }
  }

  if (migratedData) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }
} catch (e) {
  console.error("Error loading DB", e);
}

// ----------------------------------------------------
// SUPABASE DATABASE SYNC
// ----------------------------------------------------
let supabase: SupabaseClient | null = null;
let supabaseFailureCount = 0;
let supabaseUnavailableUntil = 0;
let supabaseFlushInFlight = false;
let supabaseLoadInFlight = false;
let supabaseFlushTimer: ReturnType<typeof setTimeout> | null = null;
const pendingSupabaseStoreIds = new Set<string>();

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  console.log("Supabase database configured.");
} else if (isProduction) {
  console.warn(
    '⚠️  DATA LOSS RISK: Supabase is NOT configured in production. Data is kept only ' +
    'in a local file, which is wiped on every redeploy/restart on most hosts (e.g. Render). ' +
    'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to persist data durably.'
  );
} else {
  console.log("Supabase credentials not configured; running with local file storage only.");
}

const getSupabaseBackoffMs = () => Math.min(5 * 60 * 1000, 10_000 * (2 ** Math.min(supabaseFailureCount, 5)));

const isSupabasePaused = () => Date.now() < supabaseUnavailableUntil;

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message?: unknown }).message);
  return String(err);
};

const markSupabaseFailure = (context: string, err: unknown) => {
  supabaseFailureCount += 1;
  const backoffMs = getSupabaseBackoffMs();
  supabaseUnavailableUntil = Date.now() + backoffMs;
  console.warn(`${context}. Supabase sync paused for ${Math.round(backoffMs / 1000)}s: ${getErrorMessage(err)}`);
};

const markSupabaseSuccess = () => {
  supabaseFailureCount = 0;
  supabaseUnavailableUntil = 0;
};

// Per-store content hash. Hashing each store independently avoids building one
// giant JSON string for the whole database (which, with base64 product/logo
// images, drove runaway memory use during the old full-table poll).
const storeHash = (store: StoreRecord) =>
  crypto
    .createHash('sha1')
    .update(
      JSON.stringify({
        username: store.username,
        passwordHash: store.passwordHash,
        storeName: store.storeName,
        storeLogo: store.storeLogo || '',
        products: store.products || [],
        visits: store.visits || 0,
        suspended: Boolean(store.suspended),
        cartEnabled: store.cartEnabled !== false,
      })
    )
    .digest('hex');

const hashStoreMap = (stores: Record<string, StoreRecord>) => {
  const map = new Map<string, string>();
  for (const [id, store] of Object.entries(stores)) {
    if (store) map.set(id, storeHash(store));
  }
  return map;
};

// Products now live in their own table, so the store row no longer carries the
// products blob. (The legacy stores.products column is left untouched.)
const storeToSupabaseRow = (store: StoreRecord) => ({
  id: store.id,
  username: store.username,
  password_hash: store.passwordHash,
  store_name: store.storeName,
  store_logo: store.storeLogo || '',
  visits: store.visits || 0,
  suspended: Boolean(store.suspended),
  cart_enabled: store.cartEnabled !== false,
});

const supabaseRowToStore = (row: any): StoreRecord | null => {
  if (!row?.id || !row?.username || !row?.password_hash) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    storeName: sanitizeText(row.store_name, 120) || 'Store',
    storeLogo: validateStoreLogo(row.store_logo) || '',
    products: [], // hydrated from the products table
    visits: Number.isFinite(Number(row.visits)) ? Number(row.visits) : 0,
    suspended: Boolean(row.suspended),
    cartEnabled: row.cart_enabled !== false,
  };
};

const productToRow = (storeId: string, p: ProductRecord) => ({
  id: p.id,
  store_id: storeId,
  barcode: p.barcode || '',
  name: p.name,
  price: p.price,
  category: p.category || 'general',
  description: p.description || '',
  image_emoji: p.imageEmoji || '📦',
  image_url: p.imageUrl ?? null,
  stock: p.stock ?? null,
  calories: p.calories ?? null,
  weight: p.weight ?? null,
  updated_at: new Date().toISOString(),
});

const rowToProduct = (row: any): ProductRecord | null =>
  normalizeProduct(
    {
      id: row.id,
      name: row.name,
      barcode: row.barcode,
      price: row.price,
      category: row.category,
      description: row.description,
      imageEmoji: row.image_emoji,
      imageUrl: row.image_url ?? undefined,
      stock: row.stock ?? undefined,
      calories: row.calories ?? undefined,
      weight: row.weight ?? undefined,
    },
    0
  );

// Load all products grouped by store id from the products table.
const fetchProductsByStore = async (): Promise<Record<string, ProductRecord[]>> => {
  const grouped: Record<string, ProductRecord[]> = {};
  if (!supabase) return grouped;
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  for (const row of data || []) {
    const product = rowToProduct(row);
    if (!product) continue;
    (grouped[row.store_id] ||= []).push(product);
  }
  return grouped;
};

// Persist a product change to durable storage and report success. Writes a
// local file mirror, then the Supabase row op; falls back gracefully on failure.
const persistProductChange = async (supabaseOp: () => Promise<void>): Promise<boolean> => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch {
    // ignore (read-only FS)
  }
  if (!supabase) return true;
  try {
    await supabaseOp();
    markSupabaseSuccess();
    return true;
  } catch (err) {
    markSupabaseFailure('Product write to Supabase failed', err);
    return false;
  }
};

const storeEventClients = new Map<string, Set<StoreEventClient>>();

// Shoppers fetch products per-scan now, so realtime only carries store status
// (name/logo/suspended) — no catalog payload.
const getPublicStorePayload = (store: StoreRecord) => ({
  storeName: store.storeName,
  storeLogo: store.storeLogo,
  visits: store.visits || 0,
  suspended: Boolean(store.suspended),
  cartEnabled: store.cartEnabled !== false,
});

const writeStoreEvent = (client: StoreEventClient, event: string, data: unknown) => {
  client.res.write(`event: ${event}\n`);
  client.res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const broadcastStoreUpdate = (storeId: string) => {
  const clients = storeEventClients.get(storeId);
  const store = db.stores[storeId];
  if (!clients || clients.size === 0 || !store) return;

  for (const client of clients) {
    writeStoreEvent(client, 'store:update', getPublicStorePayload(store));
  }
};

const broadcastStoreDeleted = (storeId: string) => {
  const clients = storeEventClients.get(storeId);
  if (!clients || clients.size === 0) return;

  for (const client of clients) {
    writeStoreEvent(client, 'store:deleted', { storeId });
  }
};

const flushPendingStoreSyncs = async () => {
  if (!supabase || supabaseFlushInFlight || pendingSupabaseStoreIds.size === 0) return;
  if (isSupabasePaused()) {
    scheduleSupabaseFlush();
    return;
  }

  supabaseFlushInFlight = true;
  const storeIds = [...pendingSupabaseStoreIds];
  pendingSupabaseStoreIds.clear();

  try {
    const rows = storeIds
      .map((storeId) => db.stores[storeId])
      .filter(Boolean)
      .map(storeToSupabaseRow);
    const deletedIds = storeIds.filter((storeId) => !db.stores[storeId]);

    if (rows.length > 0) {
      const { error } = await supabase.from('stores').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }

    if (deletedIds.length > 0) {
      const { error } = await supabase.from('stores').delete().in('id', deletedIds);
      if (error) throw error;
    }

    markSupabaseSuccess();
  } catch (err) {
    storeIds.forEach((storeId) => pendingSupabaseStoreIds.add(storeId));
    markSupabaseFailure(`Failed to sync ${storeIds.length} store change(s) to Supabase`, err);
  } finally {
    supabaseFlushInFlight = false;
    if (pendingSupabaseStoreIds.size > 0) scheduleSupabaseFlush();
  }
};

function scheduleSupabaseFlush() {
  if (!supabase || supabaseFlushTimer) return;
  const delay = isSupabasePaused()
    ? Math.max(1000, supabaseUnavailableUntil - Date.now())
    : 1000;

  supabaseFlushTimer = setTimeout(() => {
    supabaseFlushTimer = null;
    void flushPendingStoreSyncs();
  }, delay);
}

const saveStoreToDatabase = async (storeId: string) => {
  if (!supabase) return;
  pendingSupabaseStoreIds.add(storeId);
  scheduleSupabaseFlush();
};

// Persist a single store immediately and report whether it succeeded. Used by
// user-facing writes so a request only returns OK once the data is durably
// stored — no more fire-and-forget acks that vanish if the instance restarts
// before the debounced flush runs. Falls back to the retry queue on failure so
// the write is never silently dropped.
const persistStoreNow = async (storeId: string): Promise<boolean> => {
  // Best-effort local mirror (cheap durability net within an instance lifetime).
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch {
    // ignore (e.g. read-only filesystem)
  }

  if (!supabase) return true;

  const store = db.stores[storeId];
  try {
    if (store) {
      const { error } = await supabase.from('stores').upsert([storeToSupabaseRow(store)], { onConflict: 'id' });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw error;
    }
    pendingSupabaseStoreIds.delete(storeId);
    markSupabaseSuccess();
    return true;
  } catch (err) {
    // Keep the write in the retry queue rather than losing it.
    pendingSupabaseStoreIds.add(storeId);
    scheduleSupabaseFlush();
    markSupabaseFailure(`Immediate persist failed for store ${storeId}`, err);
    return false;
  }
};

const publishAllStoresToDatabase = async () => {
  if (!supabase) return;
  if (isSupabasePaused()) return;
  try {
    const rows = Object.values(db.stores).map(storeToSupabaseRow);
    if (rows.length === 0) return;
    const { error } = await supabase.from('stores').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
    markSupabaseSuccess();
    console.log("Published store data to Supabase.");
  } catch (err) {
    markSupabaseFailure("Error publishing Supabase store data", err);
  }
};

const loadDbFromSupabase = async () => {
  if (!supabase) return;
  if (supabaseLoadInFlight || isSupabasePaused()) return;
  supabaseLoadInFlight = true;
  try {
    const { data, error } = await supabase.from('stores').select('*').order('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      await publishAllStoresToDatabase();
      return;
    }

    const productsByStore = await fetchProductsByStore();

    const cloudStores: Record<string, StoreRecord> = {};
    for (const row of data) {
      const store = supabaseRowToStore(row);
      if (store) {
        store.products = productsByStore[store.id] || [];
        cloudStores[store.id] = store;
      }
    }

    if (Object.keys(cloudStores).length > 0) {
      const previousStores = db.stores;

      // Preserve local edits that haven't been flushed to Supabase yet, so a
      // reconcile can never roll back a change an admin just made.
      for (const pendingId of pendingSupabaseStoreIds) {
        if (previousStores[pendingId]) cloudStores[pendingId] = previousStores[pendingId];
      }

      const previousHashes = hashStoreMap(previousStores);
      const cloudHashes = hashStoreMap(cloudStores);
      db.stores = cloudStores;

      const touchedStoreIds = new Set([...previousHashes.keys(), ...cloudHashes.keys()]);
      let changed = false;
      for (const storeId of touchedStoreIds) {
        const before = previousHashes.get(storeId);
        const after = cloudHashes.get(storeId);
        if (before === after) continue;
        changed = true;
        if (!after) {
          broadcastStoreDeleted(storeId);
        } else {
          broadcastStoreUpdate(storeId);
        }
      }
      if (changed) {
        console.log('Loaded updated store data from Supabase.');
      }
    }
    markSupabaseSuccess();
  } catch (err) {
    markSupabaseFailure("Error loading Supabase store data", err);
  } finally {
    supabaseLoadInFlight = false;
  }
};

// --- Products table write helpers -----------------------------------------
const upsertProductRows = async (storeId: string, products: ProductRecord[]) => {
  if (!supabase || products.length === 0) return;
  const { error } = await supabase
    .from('products')
    .upsert(products.map((p) => productToRow(storeId, p)), { onConflict: 'id' });
  if (error) throw error;
};

const deleteProductRow = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
};

const deleteProductsForStore = async (storeId: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('products').delete().eq('store_id', storeId);
  if (error) throw error;
};

// One-time migration: copy products from the legacy stores.products JSONB into
// the products table, then clear the blob so deleted items can't resurrect.
const migrateJsonbProductsToTable = async () => {
  if (!supabase) return;
  try {
    const { data, error } = await supabase.from('stores').select('id, products');
    if (error) throw error;
    const existing = await fetchProductsByStore();
    for (const row of data || []) {
      const blob = Array.isArray(row.products) ? row.products : [];
      if (blob.length === 0) continue;
      if ((existing[row.id] || []).length > 0) continue; // already migrated
      const normalized = normalizeProducts(blob) || [];
      if (normalized.length === 0) continue;
      await upsertProductRows(row.id, normalized);
      await supabase.from('stores').update({ products: [] }).eq('id', row.id);
      console.log(`Migrated ${normalized.length} products for store ${row.id} into the products table.`);
    }
  } catch (err) {
    console.warn('Product migration skipped/failed:', getErrorMessage(err));
  }
};

// Reconcile in-memory state with Supabase when another instance (or admin)
// changes data. We subscribe to Realtime for instant propagation instead of
// polling the whole table every 30s — the old poll was both costly and a memory
// hog. A slow safety poll covers the case where the realtime socket drops.
function startSupabaseRealtime() {
  if (!supabase) return;
  supabase
    .channel('barcodi-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, () => {
      void loadDbFromSupabase();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
      void loadDbFromSupabase();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Supabase realtime subscribed to store & product changes.');
      }
    });
}

const databaseReady = supabase ? migrateJsonbProductsToTable() : Promise.resolve();
if (supabase) {
  databaseReady.then(() => {
    void loadDbFromSupabase();
    startSupabaseRealtime();
    setInterval(() => { void loadDbFromSupabase(); }, 5 * 60 * 1000);
  });
}

function saveDb() {
  if (supabase) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function saveDbIfChanged() {
  if (supabase) return;
  const next = JSON.stringify(db, null, 2);
  try {
    if (fs.existsSync(DB_PATH) && fs.readFileSync(DB_PATH, 'utf-8') === next) {
      return;
    }
  } catch {
    // Fall through and rewrite if the cache cannot be read.
  }
  fs.writeFileSync(DB_PATH, next);
}

// The public store endpoint is hit on every shopper page load and only bumps a
// visit counter. Persisting that synchronously on each hit thrashes disk I/O,
// so batch the writes and flush at most once per window.
const dirtyVisitStoreIds = new Set<string>();
let visitFlushTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleVisitFlush = () => {
  if (visitFlushTimer) return;
  visitFlushTimer = setTimeout(() => {
    visitFlushTimer = null;
    if (dirtyVisitStoreIds.size === 0) return;
    const storeIds = [...dirtyVisitStoreIds];
    dirtyVisitStoreIds.clear();
    saveDbIfChanged();
    for (const storeId of storeIds) saveStoreToDatabase(storeId);
  }, 10_000);
  visitFlushTimer.unref?.();
};


// Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Generic in-memory rate limiter. Periodically evicts expired buckets so the
// map cannot grow unbounded across many client IPs.
const createRateLimiter = ({ windowMs, max, message }: { windowMs: number; max: number; message: string }) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of hits) {
      if (value.resetAt < now) hits.delete(key);
    }
  }, windowMs);
  cleanup.unref?.();

  return (req: any, res: any, next: any) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const current = hits.get(key);

    if (!current || current.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      return res.status(429).json({ error: message });
    }

    current.count += 1;
    return next();
  };
};

const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Try again later.',
});

// Generous limit for public reads: a normal page load is ~2 requests, so this
// absorbs reloads while blocking abusive loops that thrash disk I/O.
const publicApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many requests. Please slow down.',
});

// API: Register Store
app.post('/api/admin/register', authenticateToken, requireCommander, async (req, res) => {
  const username = validateUsername(req.body.username);
  const password = validatePasswordInput(req.body.password);
  const storeName = sanitizeText(req.body.storeName, 120);
  
  if (!username || !password || !storeName) {
    return res.status(400).json({ error: 'Valid username, password, and store name are required' });
  }

  const existingStore = Object.values(db.stores).find((s: StoreRecord) => s.username === username);
  if (existingStore) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const storeId = crypto.randomUUID();
  
  db.stores[storeId] = {
    id: storeId,
    username,
    passwordHash: hashPassword(password),
    storeName,
    storeLogo: "",
    products: []
  };
  const ok = await persistStoreNow(storeId);
  if (!ok) {
    delete db.stores[storeId];
    return res.status(503).json({ error: 'تعذّر إنشاء المتجر، يرجى المحاولة مرة أخرى' });
  }

  res.status(201).json({ storeId });
});

// API: Login
app.post('/api/admin/login', loginRateLimit, (req, res) => {
  const username = validateUsername(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  
  if (!username || !password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const store = Object.values(db.stores).find((s: StoreRecord) => s.username === username);
  if (store?.passwordHash && verifyPassword(password, store.passwordHash)) {
    if (store.suspended && store.id !== 'default') {
      return res.status(403).json({ error: 'Account suspended', suspended: true });
    }
    const role = store.id === 'default' ? 'commander' : 'store_admin';
    const token = jwt.sign({ username: store.username, storeId: store.id, role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, storeId: store.id });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// API: Get Store Info (Public)
app.get('/api/public/store/:storeId', publicApiLimiter, (req, res) => {
  const storeId = req.params.storeId;
  const store = db.stores[storeId];
  if (store) {
    // Visits are counted separately (POST /visit, deduplicated per device/day by
    // the client) so simply loading store info doesn't inflate the counter.
    res.json({
      storeName: store.storeName,
      storeLogo: store.storeLogo,
      suspended: Boolean(store.suspended),
      cartEnabled: store.cartEnabled !== false,
    });
  } else {
    res.status(404).json({ error: 'Store not found' });
  }
});

// API: Register a visit (called once per device per day by the client)
app.post('/api/public/store/:storeId/visit', publicApiLimiter, (req, res) => {
  const store = db.stores[req.params.storeId];
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (store.suspended) return res.json({ counted: false });

  // Count in memory and persist on a debounced timer (no broadcast — a visit
  // bump shouldn't re-push the catalog to every connected client).
  store.visits = (store.visits || 0) + 1;
  dirtyVisitStoreIds.add(store.id);
  scheduleVisitFlush();
  res.json({ counted: true });
});

// API: Realtime public store updates
app.get('/api/public/store/:storeId/events', (req, res) => {
  const storeId = req.params.storeId;
  const store = db.stores[storeId];
  if (!store) {
    return res.status(404).json({ error: 'Store not found' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('\n');

  const client: StoreEventClient = {
    id: crypto.randomUUID(),
    res,
  };
  const clients = storeEventClients.get(storeId) || new Set<StoreEventClient>();
  clients.add(client);
  storeEventClients.set(storeId, clients);

  writeStoreEvent(client, 'store:update', getPublicStorePayload(store));

  const heartbeat = setInterval(() => {
    writeStoreEvent(client, 'heartbeat', { now: Date.now() });
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
    if (clients.size === 0) {
      storeEventClients.delete(storeId);
    }
  });
});

// API: Get Products (Public)
app.get('/api/public/products/:storeId', publicApiLimiter, (req, res) => {
  const storeId = req.params.storeId;
  const store = db.stores[storeId];
  if (store) {
    res.json(store.suspended ? [] : store.products);
  } else {
    res.status(404).json({ error: 'Store not found' });
  }
});

// API: Look up a single product by barcode (the shopper scan path).
// Uses the indexed products table so the phone fetches only the scanned item
// instead of downloading the whole catalog.
app.get('/api/public/store/:storeId/product/:barcode', publicApiLimiter, async (req, res) => {
  const store = db.stores[req.params.storeId];
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (store.suspended) return res.status(404).json({ error: 'unavailable' });

  const barcode = String(req.params.barcode || '').trim();
  if (!barcode) return res.status(400).json({ error: 'barcode required' });

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .eq('barcode', barcode)
        .limit(1);
      if (error) throw error;
      const product = data && data[0] ? rowToProduct(data[0]) : null;
      if (product) return res.json({ product });
    } catch {
      // fall through to the in-memory cache
    }
  }

  // Fallback (file mode, or DB miss): the server always holds the full catalog
  // in memory, and this also matches products keyed by id (legacy test data).
  const local = (store.products || []).find((p) => p.barcode === barcode || p.id === barcode);
  return local ? res.json({ product: local }) : res.status(404).json({ product: null });
});

// API: Get My Store Admin Info
app.get('/api/admin/store', authenticateToken, (req, res) => {
  const store = db.stores[(req as any).user.storeId];
  if (store) {
    res.json({ storeId: store.id, storeName: store.storeName, storeLogo: store.storeLogo, username: store.username, visits: store.visits || 0, cartEnabled: store.cartEnabled !== false });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// API: Get all stores (Super Admin only)
app.get('/api/admin/all-stores', authenticateToken, requireCommander, (req, res) => {
  // Deliberately omit the full products array: the commander UI only needs
  // counts, and shipping every store's whole catalog here was a large, repeated
  // payload (this endpoint is polled).
  const storesList = Object.values(db.stores).map((s: StoreRecord) => ({
    id: s.id,
    username: s.username,
    storeName: s.storeName,
    storeLogo: s.storeLogo,
    productsCount: s.products?.length || 0,
    visits: s.visits || 0,
    suspended: Boolean(s.suspended)
  }));

  res.json(storesList);
});

// API: Download a full backup (Super Admin only)
app.get('/api/admin/backup', authenticateToken, requireCommander, (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="barcodi-backup.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    version: 1,
    stores: db.stores,
  });
});

// API: Suspend / resume a store (Super Admin only)
app.post('/api/admin/stores/:id/suspend', authenticateToken, requireCommander, async (req, res) => {
  const user = (req as any).user;
  const storeId = req.params.id;
  if (storeId === user.storeId || storeId === 'default') {
    return res.status(400).json({ error: 'Cannot suspend this account' });
  }

  const store = db.stores[storeId];
  if (!store) return res.status(404).json({ error: 'Store not found' });

  store.suspended = Boolean(req.body?.suspended);
  const ok = await persistStoreNow(storeId);
  if (!ok) {
    return res.status(503).json({ error: 'تعذّر تحديث حالة المتجر، يرجى المحاولة مرة أخرى' });
  }
  // Push the new status so any customers currently in the store react live.
  broadcastStoreUpdate(storeId);

  res.json({ success: true, storeId, suspended: store.suspended });
});

// API: Delete a store (Super Admin only)
app.delete('/api/admin/stores/:id', authenticateToken, requireCommander, async (req, res) => {
  const user = (req as any).user;
  const idToRemove = req.params.id;
  // Prevent deleting oneself
  if (idToRemove === user.storeId) {
    return res.status(400).json({ error: 'Cannot delete own account' });
  }

  if (db.stores[idToRemove]) {
    const removed = db.stores[idToRemove];
    delete db.stores[idToRemove];
    const ok = await persistStoreNow(idToRemove);
    if (!ok) {
      // Restore so state stays consistent with storage.
      db.stores[idToRemove] = removed;
      return res.status(503).json({ error: 'تعذّر حذف المتجر، يرجى المحاولة مرة أخرى' });
    }
    // Remove the store's products too (best-effort; store row is already gone).
    try { await deleteProductsForStore(idToRemove); } catch { /* orphan cleanup can retry later */ }
    broadcastStoreDeleted(idToRemove);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// API: Reset a store password (Super Admin only)
app.post('/api/admin/stores/:id/reset-password', authenticateToken, requireCommander, async (req, res) => {
  const user = (req as any).user;
  const storeId = req.params.id;

  if (storeId === user.storeId) {
    return res.status(400).json({ error: 'Cannot reset own account password from this screen' });
  }

  const store = db.stores[storeId];
  if (!store) {
    return res.status(404).json({ error: 'Store not found' });
  }

  const newPassword = validatePasswordInput(req.body?.password) || generateTemporaryPassword();
  store.passwordHash = hashPassword(newPassword);
  const ok = await persistStoreNow(storeId);
  if (!ok) {
    return res.status(503).json({ error: 'تعذّر حفظ كلمة المرور الجديدة، يرجى المحاولة مرة أخرى' });
  }

  res.json({
    success: true,
    storeId,
    username: store.username,
    newPassword,
  });
});

// API: Change my own password (any authenticated admin, incl. commander)
app.post('/api/admin/change-password', authenticateToken, async (req, res) => {
  const storeId = (req as any).user.storeId;
  const store = db.stores[storeId];
  if (!store) return res.status(404).json({ error: 'Not found' });

  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = validatePasswordInput(req.body?.newPassword);
  if (!newPassword) {
    return res.status(400).json({ error: 'New password must be 8-128 characters' });
  }
  if (!store.passwordHash || !verifyPassword(currentPassword, store.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  store.passwordHash = hashPassword(newPassword);
  const ok = await persistStoreNow(storeId);
  if (!ok) {
    return res.status(503).json({ error: 'تعذّر حفظ كلمة المرور، يرجى المحاولة مرة أخرى' });
  }
  res.json({ success: true });
});

// API: Update Store Info (Admin)
app.put('/api/admin/store', authenticateToken, async (req, res) => {
  const storeId = (req as any).user.storeId;
  if (!db.stores[storeId]) return res.status(404).json({ error: 'Not found' });

  const storeName = req.body.storeName === undefined ? undefined : sanitizeText(req.body.storeName, 120);
  const storeLogo = req.body.storeLogo === undefined ? undefined : validateStoreLogo(req.body.storeLogo);

  if (req.body.storeName !== undefined && !storeName) {
    return res.status(400).json({ error: 'Invalid store name' });
  }
  if (req.body.storeLogo !== undefined && storeLogo === null) {
    return res.status(400).json({ error: 'Invalid store logo' });
  }
  if (req.body.cartEnabled !== undefined && typeof req.body.cartEnabled !== 'boolean') {
    return res.status(400).json({ error: 'Invalid cartEnabled value' });
  }

  if (storeName !== undefined) db.stores[storeId].storeName = storeName;
  if (storeLogo !== undefined) db.stores[storeId].storeLogo = storeLogo;
  if (req.body.cartEnabled !== undefined) db.stores[storeId].cartEnabled = req.body.cartEnabled;
  const ok = await persistStoreNow(storeId);
  if (!ok) {
    return res.status(503).json({ error: 'تعذّر حفظ الإعدادات، يرجى المحاولة مرة أخرى' });
  }
  broadcastStoreUpdate(storeId);
  res.json({ success: true, storeName: db.stores[storeId].storeName, storeLogo: db.stores[storeId].storeLogo, cartEnabled: db.stores[storeId].cartEnabled !== false });
});

// API: Upload Products (Admin)
app.post('/api/admin/products', authenticateToken, async (req, res) => {
  const storeId = (req as any).user.storeId;
  if (!db.stores[storeId]) return res.status(404).json({ error: 'Not found' });

  const products = normalizeProducts(req.body.products);
  if (!products) {
    return res.status(400).json({ error: 'Invalid products format' });
  }

  const previous = db.stores[storeId].products || [];
  db.stores[storeId].products = products;
  const ok = await persistProductChange(async () => {
    await deleteProductsForStore(storeId);
    await upsertProductRows(storeId, products);
  });
  if (!ok) {
    db.stores[storeId].products = previous;
    return res.status(503).json({ error: 'تعذّر حفظ المنتجات، يرجى المحاولة مرة أخرى' });
  }
  broadcastStoreUpdate(storeId);
  res.json({ success: true, count: products.length });
});

// --- Row-level product writes ---------------------------------------------
// Each endpoint merges a single change into the server's authoritative product
// list, instead of the client replacing the whole array. This eliminates the
// last-write-wins clobbering that happened when two tabs/admins each POSTed
// their full (stale) list. Persistence reuses persistStoreNow (awaited +
// confirmed), and the previous list is restored if the write doesn't land.
const commitProducts = async (
  res: express.Response,
  storeId: string,
  previous: ProductRecord[],
  supabaseOp: () => Promise<void>,
  payload: Record<string, unknown>
) => {
  const ok = await persistProductChange(supabaseOp);
  if (!ok) {
    db.stores[storeId].products = previous; // keep memory consistent with storage
    return res.status(503).json({ error: 'تعذّر حفظ التغييرات، يرجى المحاولة مرة أخرى' });
  }
  broadcastStoreUpdate(storeId);
  res.json({ success: true, ...payload });
};

// Add one product (upserts by barcode within the store).
app.post('/api/admin/products/item', authenticateToken, async (req, res) => {
  const storeId = (req as any).user.storeId;
  const store = db.stores[storeId];
  if (!store) return res.status(404).json({ error: 'Not found' });

  const product = normalizeProduct(req.body, 0);
  if (!product) return res.status(400).json({ error: 'Invalid product' });

  const previous = store.products || [];
  const next = [...previous];
  const idx = next.findIndex((p) => p.barcode && p.barcode === product.barcode);
  if (idx >= 0) {
    product.id = next[idx].id;
    next[idx] = product;
  } else {
    next.push(product);
  }
  store.products = next;
  await commitProducts(res, storeId, previous, () => upsertProductRows(storeId, [product]), { product });
});

// Update one product by id.
app.patch('/api/admin/products/item/:id', authenticateToken, async (req, res) => {
  const storeId = (req as any).user.storeId;
  const store = db.stores[storeId];
  if (!store) return res.status(404).json({ error: 'Not found' });

  const previous = store.products || [];
  const idx = previous.findIndex((p) => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Product not found' });

  const merged = normalizeProduct({ ...previous[idx], ...req.body, id: req.params.id }, 0);
  if (!merged) return res.status(400).json({ error: 'Invalid product' });

  const next = [...previous];
  next[idx] = merged;
  store.products = next;
  await commitProducts(res, storeId, previous, () => upsertProductRows(storeId, [merged]), { product: merged });
});

// Delete one product by id.
app.delete('/api/admin/products/item/:id', authenticateToken, async (req, res) => {
  const storeId = (req as any).user.storeId;
  const store = db.stores[storeId];
  if (!store) return res.status(404).json({ error: 'Not found' });

  const previous = store.products || [];
  const next = previous.filter((p) => p.id !== req.params.id);
  if (next.length === previous.length) return res.status(404).json({ error: 'Product not found' });

  store.products = next;
  await commitProducts(res, storeId, previous, () => deleteProductRow(req.params.id), {});
});

// Bulk import: merge a list by barcode (update existing, add new) without
// dropping products the uploaded file didn't include.
app.post('/api/admin/products/import', authenticateToken, async (req, res) => {
  const storeId = (req as any).user.storeId;
  const store = db.stores[storeId];
  if (!store) return res.status(404).json({ error: 'Not found' });

  const incoming = normalizeProducts(req.body.products);
  if (!incoming) return res.status(400).json({ error: 'Invalid products format' });

  const previous = store.products || [];
  const next = [...previous];
  const changed: ProductRecord[] = [];
  let added = 0;
  let updated = 0;
  for (const p of incoming) {
    const idx = next.findIndex((x) => x.barcode && x.barcode === p.barcode);
    if (idx >= 0) {
      const row = { ...p, id: next[idx].id };
      next[idx] = row;
      changed.push(row);
      updated += 1;
    } else {
      next.push(p);
      changed.push(p);
      added += 1;
    }
  }
  store.products = next;
  await commitProducts(res, storeId, previous, () => upsertProductRows(storeId, changed), { added, updated, count: next.length });
});

// Clear all products for the store.
app.delete('/api/admin/products', authenticateToken, async (req, res) => {
  const storeId = (req as any).user.storeId;
  const store = db.stores[storeId];
  if (!store) return res.status(404).json({ error: 'Not found' });

  const previous = store.products || [];
  store.products = [];
  await commitProducts(res, storeId, previous, () => deleteProductsForStore(storeId), {});
});


async function startServer() {
  await databaseReady;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
