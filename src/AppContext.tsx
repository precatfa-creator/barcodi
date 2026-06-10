import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Product, StoreSettings } from './types';

interface AppContextProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  storeSettings: StoreSettings;
  setStoreSettings: (settings: StoreSettings) => void;
  loadStoreData: (storeId: string) => Promise<void>;
  subscribeToStoreData: (storeId: string) => () => void;
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
    if (token) {
       await fetch('/api/admin/products', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ products: newProducts })
       });
    }
  }, []);

  const setStoreSettings = useCallback(async (newSettings: StoreSettings) => {
    setStoreSettingsState(newSettings);
    const token = localStorage.getItem('adminToken');
    if (token) {
       await fetch('/api/admin/store', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ storeName: newSettings.name, storeLogo: newSettings.logoUrl })
       });
    }
  }, []);

  return (
    <AppContext.Provider value={{ products, setProducts, storeSettings, setStoreSettings, loadStoreData, subscribeToStoreData, loading, storeSuspended }}>
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
