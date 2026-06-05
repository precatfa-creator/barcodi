import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

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
            username: 'commander',
            password: 'J9@x#2$vK!8z&P*qLwR%Tb_Nd5m7Xs9Y',
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
      username: 'commander',
      password: 'J9@x#2$vK!8z&P*qLwR%Tb_Nd5m7Xs9Y',
      storeName: "باركودي - الإدارة العامة",
      storeLogo: "",
      products: [],
      visits: 0
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }

  // Enforce updating the default credentials if they already existed with old presets
  if (db.stores['default']) {
    db.stores['default'].username = 'commander';
    db.stores['default'].password = 'J9@x#2$vK!8z&P*qLwR%Tb_Nd5m7Xs9Y';
    db.stores['default'].storeName = "باركودي - الإدارة العامة";
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  }
} catch (e) {
  console.error("Error loading DB", e);
}

// ----------------------------------------------------
// FIREBASE FIRESTORE SYNC & MIGRATION ENGINE
// ----------------------------------------------------
let firestoreDb: any = null;
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    const firebaseApp = initializeApp(firebaseConfig);
    const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== "" 
      ? firebaseConfig.firestoreDatabaseId 
      : undefined;
    firestoreDb = dbId 
      ? initializeFirestore(firebaseApp, { experimentalForceLongPolling: true }, dbId)
      : initializeFirestore(firebaseApp, { experimentalForceLongPolling: true });
    console.log("🔥 Successfully connected to Firebase cloud!");
  } catch (err) {
    console.error("❌ Failed to initialize Firebase app:", err);
  }
}

const saveStoreToFirestore = async (storeId: string) => {
  if (!firestoreDb) return;
  try {
    const storeData = db.stores[storeId];
    if (storeData) {
      await setDoc(doc(firestoreDb, 'stores', storeId), storeData);
    } else {
      await deleteDoc(doc(firestoreDb, 'stores', storeId));
    }
  } catch (err) {
    console.error(`❌ Failed to sync store ${storeId} to Firestore:`, err);
  }
};

const loadDbFromFirestore = async () => {
  if (!firestoreDb) return;
  try {
    const querySnapshot = await getDocs(collection(firestoreDb, 'stores'));
    let cloudStoresCount = 0;
    querySnapshot.forEach((docSnap) => {
      db.stores[docSnap.id] = docSnap.data();
      cloudStoresCount++;
    });

    // Enforce that 'default' (Commander) is ALWAYS safely initialized in db.stores 
    if (!db.stores['default']) {
      db.stores['default'] = {
        id: 'default',
        username: 'commander',
        password: 'J9@x#2$vK!8z&P*qLwR%Tb_Nd5m7Xs9Y',
        storeName: "باركودي - الإدارة العامة",
        storeLogo: "",
        products: [],
        visits: 0
      };
      if (firestoreDb) {
        await setDoc(doc(firestoreDb, 'stores', 'default'), db.stores['default']);
      }
    } else {
      // Enforce the default admin credentials and store name even if loaded from old firestore data
      const expectedUser = 'commander';
      const expectedPass = 'J9@x#2$vK!8z&P*qLwR%Tb_Nd5m7Xs9Y';
      const expectedName = "باركودي - الإدارة العامة";
      if (
        db.stores['default'].username !== expectedUser || 
        db.stores['default'].password !== expectedPass || 
        db.stores['default'].storeName !== expectedName
      ) {
        db.stores['default'].username = expectedUser;
        db.stores['default'].password = expectedPass;
        db.stores['default'].storeName = expectedName;
        if (firestoreDb) {
          await setDoc(doc(firestoreDb, 'stores', 'default'), db.stores['default']);
        }
        console.log("☁️ Updated old default admin credentials or store name in Firestore.");
      }
    }

    if (cloudStoresCount === 0) {
      console.log("☁️ Cloud database is empty. Uploading current local seed data to Cloud Firestore...");
      // Seed Cloud Firestore with existing local database stores
      for (const [storeId, storeData] of Object.entries(db.stores)) {
        await setDoc(doc(firestoreDb, 'stores', storeId), storeData);
      }
      console.log("☁️ Seeding Cloud Firestore completed successfully!");
    }
  } catch (err) {
    console.error("❌ Error running Firestore database synchronization:", err);
  }
};

// Initial sync on startup
if (firestoreDb) {
  loadDbFromFirestore();
  // Periodic background check every 30 seconds to fetch changes from other scaled containers
  setInterval(loadDbFromFirestore, 30000);
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
  saveStoreToFirestore(storeId);

  const token = jwt.sign({ username, storeId }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, storeId });
});

// API: Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  let store = Object.values(db.stores).find((s: any) => s.username === username && s.password === password) as any;

  // Let's also check dynamic environment-configured ADMIN_USERNAME and ADMIN_PASSWORD
  const envAdminUser = process.env.ADMIN_USERNAME || 'admin';
  const envAdminPass = process.env.ADMIN_PASSWORD || 'password123';
  
  const expectedCommanderUser = 'commander';
  const expectedCommanderPass = 'J9@x#2$vK!8z&P*qLwR%Tb_Nd5m7Xs9Y';

  if (!store) {
    if ((username === envAdminUser && password === envAdminPass) || 
        (username === expectedCommanderUser && password === expectedCommanderPass)) {
      // Authenticate as the default (commander) store
      if (!db.stores['default']) {
        db.stores['default'] = {
          id: 'default',
          username: expectedCommanderUser,
          password: expectedCommanderPass,
          storeName: "غرفة القيادة والعمليات والمراقبة",
          storeLogo: "",
          products: [],
          visits: 0
        };
        saveDb();
        if (firestoreDb) {
          setDoc(doc(firestoreDb, 'stores', 'default'), db.stores['default']).catch(err => {
            console.error("Failed to seed default store in firebase:", err);
          });
        }
      }
      store = db.stores['default'];
    }
  }

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
    saveStoreToFirestore(storeId);
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
  const adminUser = 'commander';
  if (user.username !== adminUser && user.username !== 'admin' && user.username !== 'administrator') {
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
  const adminUser = 'commander';
  if (user.username !== adminUser && user.username !== 'admin' && user.username !== 'administrator') {
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
    saveStoreToFirestore(idToRemove);
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
  saveStoreToFirestore(storeId);
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
    saveStoreToFirestore(storeId);
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
