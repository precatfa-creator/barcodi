import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { Product, StoreSettings } from './types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';

interface AppContextProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  storeSettings: StoreSettings;
  setStoreSettings: (settings: StoreSettings) => void;
  loadStoreData: (storeId: string) => Promise<void>;
  loading: boolean;
}

const defaultStoreSettings: StoreSettings = {
  name: 'جاري التحميل...',
  logoUrl: null,
  currency: 'ر.س',
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProductsState] = useState<Product[]>([]);
  const [storeSettings, setStoreSettingsState] = useState<StoreSettings>(defaultStoreSettings);
  const [loading, setLoading] = useState(false);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Clean up listener on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const loadStoreData = async (storeId: string) => {
    setLoading(true);
    
    // Unsubscribe from any previous store updates
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      // 1. Rapid API Initial load
      const [storeRes, productsRes] = await Promise.all([
        fetch(`/api/public/store/${storeId}`),
        fetch(`/api/public/products/${storeId}`)
      ]);
      
      if (storeRes.ok) {
        const storeData = await storeRes.json();
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

    // 2. Real-time Firebase Firestore Sync for direct web clients
    try {
      const storeDocRef = doc(db, 'stores', storeId);
      unsubscribeRef.current = onSnapshot(storeDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          
          if (data.storeName !== undefined) {
            setStoreSettingsState(prev => ({
              ...prev,
              name: data.storeName,
              logoUrl: data.storeLogo || null,
              visits: data.visits || prev.visits
            }));
          }
          
          if (Array.isArray(data.products)) {
            setProductsState(data.products);
          }
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `stores/${storeId}`);
      });
    } catch (err) {
      console.warn("Client Firestore live sync unconfigured or denied:", err);
    }
  };

  const setProducts = async (newProducts: Product[]) => {
    setProductsState(newProducts);
    const token = localStorage.getItem('adminToken');
    if (token) {
       await fetch('/api/admin/products', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ products: newProducts })
       });
    }
  };

  const setStoreSettings = async (newSettings: StoreSettings) => {
    setStoreSettingsState(newSettings);
    const token = localStorage.getItem('adminToken');
    if (token) {
       await fetch('/api/admin/store', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ storeName: newSettings.name, storeLogo: newSettings.logoUrl })
       });
    }
  };

  return (
    <AppContext.Provider value={{ products, setProducts, storeSettings, setStoreSettings, loadStoreData, loading }}>
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
