/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Wifi, ShoppingBag, Barcode, HelpCircle, Sparkles, MapPin, Store, RefreshCw, Signal, Settings, Loader2 } from 'lucide-react';
import { Product, CartItem, AppSettings } from './types';
import { NetworkGuard } from './components/NetworkGuard';
import { ScannerTab, playBeepSound } from './components/ScannerTab';
import { ProductCard } from './components/ProductCard';
import { CartTab } from './components/CartTab';
import { SettingsTab } from './components/SettingsTab';
import { AboutDeveloper } from './components/AboutDeveloper';
import { useAppContext } from './AppContext';

export default function App() {
  const { storeId } = useParams<{ storeId: string }>();
  const { storeSettings, loadStoreInfo, subscribeToStoreData, registerVisit, loading, storeSuspended } = useAppContext();

  useEffect(() => {
    if (storeId) {
      loadStoreInfo(storeId);
      registerVisit(storeId);
      return subscribeToStoreData(storeId);
    }
  }, [storeId]);
  
  // Store Config & simulated wifi status
  const storeName = storeSettings.name;
  const logoUrl = storeSettings.logoUrl;
  
  const [wifiName] = useState('Elite_Market_Free_WiFi');
  const [isWifiConnected, setIsWifiConnected] = useState<boolean>(() => {
    const saved = localStorage.getItem('elite_store_wifi');
    return saved !== null ? saved === 'true' : true; // Start connected to let scanner open immediately.
  });

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('elite_app_settings');
    return saved ? JSON.parse(saved) : { isTestMode: false };
  });

  // Local storage persisted Shopping Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('elite_store_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Current screen states
  type TabType = 'scan' | 'cart' | 'settings';
  const [activeTab, setActiveTab] = useState<TabType>('scan');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('elite_store_wifi', String(isWifiConnected));
  }, [isWifiConnected]);

  useEffect(() => {
    localStorage.setItem('elite_store_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('elite_app_settings', JSON.stringify(settings));
  }, [settings]);

  // Cart Management
  const handleAddToCart = (product: Product, quantity: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          product,
          quantity: Math.min(updated[idx].quantity + quantity, 99),
        };
        return updated;
      } else {
        return [...prev, { product, quantity }];
      }
    });
    // Return to scanning and dismiss details overlay on successful addition
    setScannedProduct(null);
    playBeepSound(); // play success beep on add
  };

  const handleUpdateQty = (prodId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(prodId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === prodId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (prodId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== prodId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleProductScanTriggered = (product: Product) => {
    setScannedProduct(product);
    setActiveTab('scan');
  };

  const resolveWifiConnection = () => {
    setIsWifiConnected(true);
  };

  const cartBadgeCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isEng = settings.language === 'en';

  // Per-store purchase-list toggle: when off, the app is a pure price checker.
  const cartEnabled = storeSettings.cartEnabled !== false;

  useEffect(() => {
    if (!cartEnabled && activeTab === 'cart') {
      setActiveTab('scan');
    }
  }, [cartEnabled, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-primary-main" dir={isEng ? 'ltr' : 'rtl'}>
         <Loader2 className="w-10 h-10 animate-spin mb-4" />
         <p className="font-bold text-gray-700">{isEng ? 'Loading store...' : 'جاري تحميل المتجر...'}</p>
      </div>
    );
  }

  if (storeSuspended) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-8 text-center" dir={isEng ? 'ltr' : 'rtl'}>
        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mb-6 shadow-sm">
          <Store className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">{isEng ? 'Store temporarily unavailable' : 'المتجر غير متاح حالياً'}</h1>
        <p className="text-sm text-gray-500 font-medium max-w-sm leading-relaxed">
          {isEng
            ? 'This store is paused at the moment. Please check back later or contact the store.'
            : 'تم إيقاف هذا المتجر مؤقتاً. يرجى المحاولة لاحقاً أو التواصل مع إدارة المتجر.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-between" id="app-viewport-root" dir={isEng ? 'ltr' : 'rtl'}>
      
      {/* 1. Header Widget */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl shadow-sm flex flex-col" id="app-navigation-bar">
        {/* Global Shop Branding Bar */}
        <div className="px-5 py-4 flex items-center justify-between max-w-md w-full mx-auto">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="w-10 h-10 rounded-[1rem] shadow-sm object-cover bg-white" />
            ) : (
              <div className="p-2 bg-gradient-to-br from-primary-main to-primary-dark rounded-[1rem] shadow-sm text-white">
                <Store className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-[15px] font-black text-gray-900 tracking-tight leading-tight">{storeName}</h1>
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold mt-0.5">
                <MapPin className="w-3 h-3 text-primary-dark" />
                <span>{isEng ? 'Main Branch • Network' : 'الفرع الرئيسي • شبكة المتجر'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isWifiConnected ? (
              <span className="inline-flex items-center h-6 gap-1 bg-white/60 backdrop-blur text-primary-dark text-[10px] font-black px-2.5 rounded-full border border-primary-light shadow-sm">
                <Signal className="w-3.5 h-3.5 text-primary-main" />
                <span>{isEng ? 'Connected' : 'متصل'}</span>
              </span>
            ) : (
             <button onClick={resolveWifiConnection} className="px-2 py-1 text-[9px] bg-sky-100 text-sky-800 rounded font-bold animate-pulse">{isEng ? 'Connect Check' : 'اتصل للتجربة'}</button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main content router viewport */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-4 pb-28">
        {!isWifiConnected ? (
          <NetworkGuard
            isWifiConnected={isWifiConnected}
            onConnectWifi={resolveWifiConnection}
            wifiName={wifiName}
          />
        ) : (
          <>
            {activeTab === 'scan' && (
              <div className="flex flex-col gap-4">
                {scannedProduct && (
                  /* Active Product screen overlay */
                  <ProductCard
                    product={scannedProduct}
                    onAddToCart={handleAddToCart}
                    currentCartQty={cart.find((i) => i.product.id === scannedProduct.id)?.quantity || 0}
                    onDismiss={() => setScannedProduct(null)}
                    cartEnabled={cartEnabled}
                  />
                )}
                <div className={scannedProduct ? 'hidden' : 'block'}>
                  <ScannerTab
                    storeId={storeId || ''}
                    onProductFound={handleProductScanTriggered}
                    settings={settings}
                    isPaused={!!scannedProduct}
                  />
                </div>
              </div>
            )}

            {activeTab === 'cart' && cartEnabled && (
              /* Cart Calculation Tab */
              <CartTab
                cart={cart}
                onUpdateQty={handleUpdateQty}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onNavigateToScan={() => setActiveTab('scan')}
                storeName={storeName}
              />
            )}

            {activeTab === 'settings' && (
              /* Settings Tab */
              <SettingsTab
                settings={settings}
                onUpdateSettings={setSettings}
                onShowAbout={() => setShowAboutModal(true)}
              />
            )}
          </>
        )}
      </main>

      {/* 3. Bottom App Navigation Bar (Sticks to screen bottom like native App) */}
      {isWifiConnected && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-sm mx-auto">
          <div className="bg-white/80 backdrop-blur-xl border border-white p-2 rounded-[2rem] shadow-[0_8px_30px_-5px_rgba(53,133,142,0.3)]">
            <div className="flex items-center justify-around relative">
              
              {/* Settings Tab Button */}
              <button
                onClick={() => {
                  setScannedProduct(null);
                  setActiveTab('settings');
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all outline-none py-2 rounded-2xl ${
                  activeTab === 'settings' && !scannedProduct
                    ? 'text-primary-dark bg-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'fill-primary-dark/20 stroke-[1.5px]' : 'stroke-2'}`} />
                <span className="text-[10px] font-bold">{isEng ? 'Settings' : 'الإعدادات'}</span>
              </button>

              {/* Center Scan Button (Floating) */}
              <div className="flex-1 flex justify-center -translate-y-5">
                <button
                  onClick={() => {
                    setScannedProduct(null);
                    setActiveTab('scan');
                  }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all shadow-[0_4px_15px_rgba(53,133,142,0.4)] active:scale-95 border-4 border-white/80 backdrop-blur-sm ${
                    activeTab === 'scan' && !scannedProduct
                      ? 'bg-gradient-to-tr from-primary-dark to-primary-main'
                      : 'bg-primary-dark/80 hover:bg-primary-dark'
                  }`}
                >
                  <Barcode className="w-6 h-6" />
                </button>
              </div>

              {/* Cart Tab Button */}
              {cartEnabled && (
              <button
                onClick={() => {
                  setScannedProduct(null);
                  setActiveTab('cart');
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all outline-none py-2 rounded-2xl ${
                  activeTab === 'cart' && !scannedProduct
                    ? 'text-primary-dark bg-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="relative">
                  <ShoppingBag className={`w-5 h-5 ${activeTab === 'cart' ? 'fill-primary-dark/20 stroke-[1.5px]' : 'stroke-2'}`} />
                  {cartBadgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white font-mono font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-scale-up border-[1.5px] border-white">
                      {cartBadgeCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold">{isEng ? 'Cart' : 'السلة'}</span>
              </button>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAboutModal && (
        <AboutDeveloper onClose={() => setShowAboutModal(false)} />
      )}
    </div>
  );
}
