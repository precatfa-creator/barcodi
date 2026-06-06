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

const storesFingerprint = (stores: Record<string, StoreRecord>) => JSON.stringify(
  Object.keys(stores)
    .sort()
    .map((id) => ({
      id,
      username: stores[id].username,
      passwordHash: stores[id].passwordHash,
      storeName: stores[id].storeName,
      storeLogo: stores[id].storeLogo || '',
      products: stores[id].products || [],
      visits: stores[id].visits || 0,
    }))
);

const storeToSupabaseRow = (store: StoreRecord) => ({
  id: store.id,
  username: store.username,
  password_hash: store.passwordHash,
  store_name: store.storeName,
  store_logo: store.storeLogo || '',
  products: store.products || [],
  visits: store.visits || 0,
});

const supabaseRowToStore = (row: any): StoreRecord | null => {
  if (!row?.id || !row?.username || !row?.password_hash) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    storeName: sanitizeText(row.store_name, 120) || 'Store',
    storeLogo: validateStoreLogo(row.store_logo) || '',
    products: normalizeProducts(row.products || []) || [],
    visits: Number.isFinite(Number(row.visits)) ? Number(row.visits) : 0,
  };
};

const storeEventClients = new Map<string, Set<StoreEventClient>>();

const getPublicStorePayload = (store: StoreRecord) => ({
  storeName: store.storeName,
  storeLogo: store.storeLogo,
  products: store.products || [],
  visits: store.visits || 0,
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

    const cloudStores: Record<string, StoreRecord> = {};
    for (const row of data) {
      const store = supabaseRowToStore(row);
      if (store) cloudStores[store.id] = store;
    }

    if (Object.keys(cloudStores).length > 0) {
      const previousStores = db.stores;
      const hasChanged = storesFingerprint(previousStores) !== storesFingerprint(cloudStores);
      db.stores = cloudStores;
      if (hasChanged) {
        console.log("Loaded updated store data from Supabase.");
        const touchedStoreIds = new Set([
          ...Object.keys(previousStores),
          ...Object.keys(cloudStores),
        ]);
        for (const storeId of touchedStoreIds) {
          if (!cloudStores[storeId]) {
            broadcastStoreDeleted(storeId);
          } else if (
            storesFingerprint({ [storeId]: previousStores[storeId] }) !==
            storesFingerprint({ [storeId]: cloudStores[storeId] })
          ) {
            broadcastStoreUpdate(storeId);
          }
        }
      }
    }
    markSupabaseSuccess();
  } catch (err) {
    markSupabaseFailure("Error loading Supabase store data", err);
  } finally {
    supabaseLoadInFlight = false;
  }
};

const databaseReady = Promise.resolve();
if (supabase) {
  void loadDbFromSupabase();
  setInterval(loadDbFromSupabase, 30000);
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

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const loginRateLimit = (req: any, res: any, next: any) => {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current || current.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return next();
  }

  if (current.count >= 20) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  current.count += 1;
  return next();
};

// API: Register Store
app.post('/api/admin/register', authenticateToken, requireCommander, (req, res) => {
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
  saveDbIfChanged();
  saveStoreToDatabase(storeId);

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
    const role = store.id === 'default' ? 'commander' : 'store_admin';
    const token = jwt.sign({ username: store.username, storeId: store.id, role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, storeId: store.id });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// API: Get Store Info (Public)
app.get('/api/public/store/:storeId', (req, res) => {
  const storeId = req.params.storeId;
  const store = db.stores[storeId];
  if (store) {
    store.visits = (store.visits || 0) + 1;
    saveDbIfChanged();
    saveStoreToDatabase(storeId);
    broadcastStoreUpdate(storeId);
    res.json({
      storeName: store.storeName,
      storeLogo: store.storeLogo
    });
  } else {
    res.status(404).json({ error: 'Store not found' });
  }
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
app.get('/api/public/products/:storeId', (req, res) => {
  const storeId = req.params.storeId;
  const store = db.stores[storeId];
  if (store) {
    res.json(store.products);
  } else {
    res.status(404).json({ error: 'Store not found' });
  }
});

// API: Get My Store Admin Info
app.get('/api/admin/store', authenticateToken, (req, res) => {
  const store = db.stores[(req as any).user.storeId];
  if (store) {
    res.json({ storeId: store.id, storeName: store.storeName, storeLogo: store.storeLogo, username: store.username, visits: store.visits || 0 });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// API: Get all stores (Super Admin only)
app.get('/api/admin/all-stores', authenticateToken, requireCommander, (req, res) => {
  const storesList = Object.values(db.stores).map((s: StoreRecord) => ({
    id: s.id,
    username: s.username,
    storeName: s.storeName,
    storeLogo: s.storeLogo,
    products: s.products || [],
    productsCount: s.products?.length || 0,
    visits: s.visits || 0
  }));

  res.json(storesList);
});

// API: Delete a store (Super Admin only)
app.delete('/api/admin/stores/:id', authenticateToken, requireCommander, (req, res) => {
  const user = (req as any).user;
  const idToRemove = req.params.id;
  // Prevent deleting oneself
  if (idToRemove === user.storeId) {
    return res.status(400).json({ error: 'Cannot delete own account' });
  }

  if (db.stores[idToRemove]) {
    delete db.stores[idToRemove];
    saveDbIfChanged();
    saveStoreToDatabase(idToRemove);
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
  saveDbIfChanged();
  await saveStoreToDatabase(storeId);

  res.json({
    success: true,
    storeId,
    username: store.username,
    newPassword,
  });
});

// API: Update Store Info (Admin)
app.put('/api/admin/store', authenticateToken, (req, res) => {
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

  if (storeName !== undefined) db.stores[storeId].storeName = storeName;
  if (storeLogo !== undefined) db.stores[storeId].storeLogo = storeLogo;
  saveDbIfChanged();
  saveStoreToDatabase(storeId);
  broadcastStoreUpdate(storeId);
  res.json({ success: true, storeName: db.stores[storeId].storeName, storeLogo: db.stores[storeId].storeLogo });
});

// API: Upload Products (Admin)
app.post('/api/admin/products', authenticateToken, (req, res) => {
  const storeId = (req as any).user.storeId;
  if (!db.stores[storeId]) return res.status(404).json({ error: 'Not found' });

  const products = normalizeProducts(req.body.products);
  if (products) {
    db.stores[storeId].products = products;
    saveDbIfChanged();
    saveStoreToDatabase(storeId);
    broadcastStoreUpdate(storeId);
    res.json({ success: true, count: products.length });
  } else {
    res.status(400).json({ error: 'Invalid products format' });
  }
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
