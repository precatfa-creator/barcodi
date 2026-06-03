import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger JSON for excels

// Setup our simple in-memory DB or fallback to file
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Ensure data folder exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

let db: {
  stores: Record<string, any>;
} = {
  stores: {}
};

// Seed initial old DB if existed for migration (optional)
try {
  if (fs.existsSync(DB_PATH)) {
    const rawData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    if (rawData.stores) {
      db = rawData;
    } else {
      // Migrate old data
      db = {
        stores: {
          'default': {
            id: 'default',
            username: process.env.ADMIN_USERNAME || 'commander',
            password: process.env.ADMIN_PASSWORD || 'J9@x#2$vK!8z&P*qLwR%Tb_Nd5m7Xs9Y',
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
    db.stores['default'] = {
      id: 'default',
      username: process.env.ADMIN_USERNAME || 'commander',
      password: process.env.ADMIN_PASSWORD || 'J9@x#2$vK!8z&P*qLwR%Tb_Nd5m7Xs9Y',
      storeName: "سوبر ماركت السلام",
      storeLogo: "",
      products: [],
      visits: 0
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }

  // Enforce updating the default credentials if they already existed with old presets
  if (db.stores['default']) {
    db.stores['default'].username = process.env.ADMIN_USERNAME || 'commander';
    db.stores['default'].password = process.env.ADMIN_PASSWORD || 'J9@x#2$vK!8z&P*qLwR%Tb_Nd5m7Xs9Y';
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }
} catch (e) {
  console.error("Error loading DB", e);
}

const saveDb = () => {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret';

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

// API: Register Store
app.post('/api/admin/register', (req, res) => {
  const { username, password, storeName } = req.body;
  
  if (!username || !password || !storeName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existingStore = Object.values(db.stores).find((s: any) => s.username === username);
  if (existingStore) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const storeId = Date.now().toString() + Math.random().toString(36).substring(7);
  
  db.stores[storeId] = {
    id: storeId,
    username,
    password, // Store plaintext for this simple PoC, should be hashed!
    storeName,
    storeLogo: "",
    products: []
  };
  saveDb();

  const token = jwt.sign({ username, storeId }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, storeId });
});

// API: Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  const store = Object.values(db.stores).find((s: any) => s.username === username && s.password === password) as any;

  if (store) {
    const token = jwt.sign({ username: store.username, storeId: store.id }, JWT_SECRET, { expiresIn: '7d' });
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
    saveDb();
    res.json({
      storeName: store.storeName,
      storeLogo: store.storeLogo
    });
  } else {
    res.status(404).json({ error: 'Store not found' });
  }
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
app.get('/api/admin/all-stores', authenticateToken, (req, res) => {
  const user = (req as any).user;
  if (user.username !== process.env.ADMIN_USERNAME && user.username !== 'admin' && user.username !== 'administrator') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const storesList = Object.values(db.stores).map((s: any) => ({
    id: s.id,
    username: s.username,
    password: s.password, // Needed so admin can share credentials with customer
    storeName: s.storeName,
    productsCount: s.products?.length || 0,
    visits: s.visits || 0
  }));

  res.json(storesList);
});

// API: Delete a store (Super Admin only)
app.delete('/api/admin/stores/:id', authenticateToken, (req, res) => {
  const user = (req as any).user;
  if (user.username !== process.env.ADMIN_USERNAME && user.username !== 'admin' && user.username !== 'administrator') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  const idToRemove = req.params.id;
  // Prevent deleting oneself
  if (idToRemove === user.storeId) {
    return res.status(400).json({ error: 'Cannot delete own account' });
  }

  if (db.stores[idToRemove]) {
    delete db.stores[idToRemove];
    saveDb();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// API: Update Store Info (Admin)
app.put('/api/admin/store', authenticateToken, (req, res) => {
  const storeId = (req as any).user.storeId;
  if (!db.stores[storeId]) return res.status(404).json({ error: 'Not found' });

  const { storeName, storeLogo } = req.body;
  if (storeName !== undefined) db.stores[storeId].storeName = storeName;
  if (storeLogo !== undefined) db.stores[storeId].storeLogo = storeLogo;
  saveDb();
  res.json({ success: true, storeName: db.stores[storeId].storeName, storeLogo: db.stores[storeId].storeLogo });
});

// API: Upload Products (Admin)
app.post('/api/admin/products', authenticateToken, (req, res) => {
  const storeId = (req as any).user.storeId;
  if (!db.stores[storeId]) return res.status(404).json({ error: 'Not found' });

  const { products } = req.body;
  if (Array.isArray(products)) {
    db.stores[storeId].products = products;
    saveDb();
    res.json({ success: true, count: products.length });
  } else {
    res.status(400).json({ error: 'Invalid products format' });
  }
});


async function startServer() {
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
