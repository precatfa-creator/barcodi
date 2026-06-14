import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Product, StoreSettings } from './types';

interface AppContextProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  storeSettings: StoreSettings;
  setStoreSettings: (settings: StoreSettings) => void;
  loadStoreData: (storeId: string) => Promise<void>;
  subscribeToStoreData: (storeId: string) => () => void;
  registerVisit: (storeId: string) => void;
  addProduct: (product: Partial<Product>) => Promise<boolean>;
  updateProduct: (id: string, fields: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  clearProducts: () => Promise<boolean>;
  importProducts: (products: Product[]) => Promise<{ added: number; updated: number } | null>;
  loading: boolean;
  storeSuspended: boolean;
}

const defaultStoreSettings: StoreSettings = {
  name: 'جاري التحميل...',
  logoUrl: null,
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProductsState] = useState<Product[]>([]);
  const [storeSettings, setStoreSettingsState] = useState<StoreSettings>(defaultStoreSettings);
  const [loading, setLoading] = useState(false);
  const [storeSuspended, setStoreSuspended] = useState(false);
  
  const loadStoreData = useCallback(async (storeId: string) => {
    setLoading(true);

    try {
      // 1. Rapid API Initial load
      const [storeRes, productsRes] = await Promise.all([
        fetch(`/api/public/store/${storeId}`),
        fetch(`/api/public/products/${storeId}`)
      ]);
      
      if (storeRes.ok) {
        const storeData = await storeRes.json();
        setStoreSuspended(Boolean(storeData.suspended));
        if (storeData.storeName) {
           setStoreSettingsState(prev => ({
             ...prev,
             name: storeData.storeName,
             logoUrl: storeData.storeLogo || null,
             visits: storeData.visits || prev.visits
           }));
        }
      }
      
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        if (productsData && productsData.length > 0) {
          setProductsState(productsData);
        } else {
          setProductsState([]);
        }
      } else {
         setProductsState([]);
      }
    } catch(e) {
      setProductsState([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Count a visit at most once per device per day. The localStorage stamp is
  // only written when the server confirms it counted, so visits to a suspended
  // store still count once it's reactivated.
  const registerVisit = useCallback(async (storeId: string) => {
    try {
      const key = `barcodi_visit_${storeId}`;
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(key) === today) return;
      const res = await fetch(`/api/public/store/${storeId}/visit`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.counted) localStorage.setItem(key, today);
    } catch {
      // best-effort analytics; ignore failures
    }
  }, []);

  const applyStorePayload = useCallback((storeData: any) => {
    setStoreSuspended(Boolean(storeData.suspended));
    if (storeData.storeName) {
      setStoreSettingsState(prev => ({
        ...prev,
        name: storeData.storeName,
        logoUrl: storeData.storeLogo || null,
        visits: storeData.visits ?? prev.visits
      }));
    }

    if (Array.isArray(storeData.products)) {
      setProductsState(storeData.products);
    }
  }, []);

  const subscribeToStoreData = useCallback((storeId: string) => {
    if (typeof window === 'undefined' || !('EventSource' in window)) {
      return () => {};
    }

    const events = new EventSource(`/api/public/store/${storeId}/events`);

    events.addEventListener('store:update', (event) => {
      try {
        applyStorePayload(JSON.parse(event.data));
      } catch (error) {
        console.warn('Failed to parse realtime store update', error);
      }
    });

    events.addEventListener('store:deleted', () => {
      setProductsState([]);
      setStoreSettingsState({
        ...defaultStoreSettings,
        name: 'المتجر غير متاح',
      });
    });

    events.onerror = () => {
      // Browser EventSource reconnects automatically. The server also sends heartbeats.
    };

    return () => events.close();
  }, [applyStorePayload]);

  const setProducts = useCallback(async (newProducts: Product[]) => {
    setProductsState(newProducts);
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ products: newProducts })
      });
      if (!res.ok) throw new Error('save failed');
    } catch {
      // The server did NOT durably store the change — tell the admin instead of
      // silently pretending it saved.
      if (typeof window !== 'undefined') {
        window.alert('تعذّر حفظ التغييرات على الخادم. لم يتم الحفظ، يرجى المحاولة مرة أخرى.');
      }
    }
  }, []);

  const setStoreSettings = useCallback(async (newSettings: StoreSettings) => {
    setStoreSettingsState(newSettings);
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ storeName: newSettings.name, storeLogo: newSettings.logoUrl })
      });
      if (!res.ok) throw new Error('save failed');
    } catch {
      if (typeof window !== 'undefined') {
        window.alert('تعذّر حفظ الإعدادات على الخادم. لم يتم الحفظ، يرجى المحاولة مرة أخرى.');
      }
    }
  }, []);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
  });

  const warnSaveFailed = () => {
    if (typeof window !== 'undefined') {
      window.alert('تعذّر حفظ التغييرات على الخادم. لم يتم الحفظ، يرجى المحاولة مرة أخرى.');
    }
  };

  // Row-level product writes: each call changes one product (or merges an
  // import) on the server, which holds the authoritative list — so concurrent
  // edits from another tab/device no longer overwrite each other.
  const addProduct = useCallback(async (product: Partial<Product>): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/products/item', { method: 'POST', headers: authHeaders(), body: JSON.stringify(product) });
      if (!res.ok) throw new Error('save failed');
      const { product: saved } = await res.json();
      setProductsState((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id || (saved.barcode && p.barcode === saved.barcode));
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved];
      });
      return true;
    } catch {
      warnSaveFailed();
      return false;
    }
  }, []);

  const updateProduct = useCallback(async (id: string, fields: Partial<Product>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/products/item/${encodeURIComponent(id)}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(fields) });
      if (!res.ok) throw new Error('save failed');
      const { product: saved } = await res.json();
      setProductsState((prev) => prev.map((p) => (p.id === id ? saved : p)));
      return true;
    } catch {
      warnSaveFailed();
      return false;
    }
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/products/item/${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('delete failed');
      setProductsState((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch {
      warnSaveFailed();
      return false;
    }
  }, []);

  const clearProducts = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/products', { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('clear failed');
      setProductsState([]);
      return true;
    } catch {
      warnSaveFailed();
      return false;
    }
  }, []);

  const importProducts = useCallback(async (incoming: Product[]): Promise<{ added: number; updated: number } | null> => {
    try {
      const res = await fetch('/api/admin/products/import', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ products: incoming }) });
      if (!res.ok) throw new Error('import failed');
      const data = await res.json();
      // Mirror the server's merge (upsert by barcode) into local state.
      setProductsState((prev) => {
        const next = [...prev];
        for (const p of incoming) {
          const idx = next.findIndex((x) => x.barcode && x.barcode === p.barcode);
          if (idx >= 0) next[idx] = { ...p, id: next[idx].id };
          else next.push(p);
        }
        return next;
      });
      return { added: data.added || 0, updated: data.updated || 0 };
    } catch {
      warnSaveFailed();
      return null;
    }
  }, []);

  return (
    <AppContext.Provider value={{ products, setProducts, storeSettings, setStoreSettings, loadStoreData, subscribeToStoreData, registerVisit, addProduct, updateProduct, deleteProduct, clearProducts, importProducts, loading, storeSuspended }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
