import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Store, UploadCloud, LogOut, QrCode, Users, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import StoreSettingsForm from './StoreSettingsForm';
import ProductsUpload from './ProductsUpload';
import StoreManager from './StoreManager';
import CommanderOverview from './CommanderOverview';
import { useAppContext } from '../AppContext';

interface Props {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { loadStoreData } = useAppContext();

  useEffect(() => {
    const fetchStore = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          const res = await fetch('/api/admin/store', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setStoreId(data.storeId);
            setIsAdmin(data.username === 'admin' || data.username === 'administrator' || data.username === 'commander');
            await loadStoreData(data.storeId);
          }
        } catch (e) {}
      }
    };
    fetchStore();
  }, [loadStoreData]);

  const isCommander = storeId === 'default';

  const navItems = isCommander
    ? [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'غرفة القيادة والعمليات' },
        { path: '/admin/dashboard/subscribers', icon: Users, label: 'إدارة المشتركين والمتاجر' }
      ]
    : [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة القيادة' },
        { path: '/admin/dashboard/settings', icon: Store, label: 'إعدادات المتجر' },
        { path: '/admin/dashboard/products', icon: UploadCloud, label: 'إدارة المنتجات' },
      ];

  if (isAdmin && !isCommander) {
    navItems.push({ path: '/admin/dashboard/customers', icon: Users, label: 'إدارة المشتركين' });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Sidebar sidebar */}
      <aside className="w-64 bg-white border-l border-gray-200 hidden md:flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-black text-primary-dark">
            {isCommander ? 'لوحة التحكم' : 'إدارة متجرك'}
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                location.pathname === item.path
                  ? 'bg-primary-light/20 text-primary-dark'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl font-bold transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

        <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full max-w-full pb-20 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-white px-4 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
          <h2 className="font-black text-primary-dark">
            {isCommander ? 'لوحة التحكم' : 'إدارة متجرك'}
          </h2>
          <button onClick={onLogout} className="p-2 text-rose-500">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile Nav */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl flex justify-around p-2 gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-primary-light/20 text-primary-dark'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-primary-dark' : 'text-gray-400'}`} />
              <span className="text-[10px] font-bold md:text-sm text-center leading-tight whitespace-normal">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8">
          <div className="max-w-4xl mx-auto w-full">
            <Routes>
              {isCommander ? (
                <>
                  <Route path="/" element={<CommanderOverview />} />
                  <Route path="/subscribers" element={<StoreManager />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Overview storeId={storeId} />} />
                  <Route path="/settings" element={<StoreSettingsForm />} />
                  <Route path="/products" element={<ProductsUpload />} />
                  {isAdmin && <Route path="/customers" element={<StoreManager />} />}
                </>
              )}
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

function Overview({ storeId }: { storeId: string | null }) {
  const storeUrl = storeId ? `${window.location.origin}/store/${storeId}` : '';
  const { products, storeSettings } = useAppContext();
  const qrRef = useRef<HTMLDivElement>(null);

  const handlePrintQr = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgMarkup = new XMLSerializer().serializeToString(svg);
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

    const win = window.open('', '_blank', 'width=480,height=720');
    if (!win) return;
    win.document.write(
      `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />` +
        `<title>${esc(storeSettings.name)} - QR</title>` +
        `<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet" />` +
        `<style>` +
        `*{box-sizing:border-box}` +
        `body{font-family:'Cairo',system-ui,sans-serif;margin:0;padding:40px 32px;text-align:center;color:#1f2937}` +
        `.name{font-size:28px;font-weight:800;margin:0 0 4px}` +
        `.sub{font-size:14px;color:#6b7280;margin:0 0 28px}` +
        `.qr{display:inline-block;padding:22px;border:2px solid #e5e7eb;border-radius:24px}` +
        `.qr svg{width:300px;height:300px;display:block}` +
        `.hint{font-size:16px;font-weight:700;margin:28px 0 8px}` +
        `.url{direction:ltr;font-size:12px;color:#6b7280;word-break:break-all;max-width:340px;margin:0 auto}` +
        `.brand{margin-top:32px;font-size:12px;color:#9ca3af}` +
        `@media print{body{padding:0;padding-top:24px}}` +
        `</style></head><body>` +
        `<p class="name">${esc(storeSettings.name)}</p>` +
        `<p class="sub">قارئ الأسعار الذكي</p>` +
        `<div class="qr">${svgMarkup}</div>` +
        `<p class="hint">امسح الرمز للدخول إلى المتجر وقراءة الأسعار</p>` +
        `<p class="url">${esc(storeUrl)}</p>` +
        `<p class="brand">مدعوم بواسطة باركودي</p>` +
        `</body></html>`
    );
    win.document.close();
    win.focus();
    win.onload = () => win.print();
    setTimeout(() => { try { win.print(); } catch {} }, 400);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white justify-between rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center gap-6">
        <div className="text-center md:text-right flex-1">
          <Store className="w-16 h-16 text-gray-300 mx-auto md:mx-0 mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">مرحباً بك في لوحة تحكم المتجر</h2>
          <p className="text-gray-500 max-w-lg mx-auto md:mx-0">
            يمكنك من هنا تغيير إسم المتجر والشعار، بالإضافة إلى رفع ملفات إكسل لإضافة وتحديث المنتجات بسرعة.
          </p>
        </div>
        
        {/* Statistics Widgets */}
        <div className="flex gap-4 w-full lg:w-auto mt-6 lg:mt-0">
          <div className="flex-1 lg:w-32 bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center">
            <div className="text-3xl font-black text-primary-main mb-1">{products.length}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">الأصناف مسجلة</div>
          </div>
          <div className="flex-1 lg:w-32 bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center">
            <div className="text-3xl font-black text-blue-600 mb-1">{storeSettings.visits || 0}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">زيارات العملاء</div>
          </div>
        </div>
      </div>

      {storeId && (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <QrCode className="w-12 h-12 text-primary-main mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">رابط المتجر للعملاء</h3>
          <p className="text-gray-500 text-sm mb-6">دع عملاءك يمسحون هذا الرمز للدخول مباشرة إلى متجرك</p>
          
          <div ref={qrRef} className="bg-gray-50 inline-block p-4 rounded-2xl mb-6">
            <QRCodeSVG value={storeUrl} size={200} />
          </div>

          <div className="flex flex-col items-center gap-4">
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-primary-dark font-bold hover:underline" style={{ direction: 'ltr', display: 'inline-block' }}>
              {storeUrl}
            </a>
            <button
              onClick={handlePrintQr}
              className="inline-flex items-center gap-2 bg-primary-dark hover:bg-primary-dark/90 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition-colors active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة رمز QR</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
