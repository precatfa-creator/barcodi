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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Desktop floating dock */}
      <aside className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-5 z-50 flex-col items-center gap-1.5 bg-white/80 backdrop-blur-xl border border-white/70 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(53,133,142,0.35)] p-2.5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-dark to-primary-main flex items-center justify-center text-white shadow-md mb-1">
          <Store className="w-5 h-5" />
        </div>
        <div className="w-7 h-px bg-gray-200/80 my-0.5" />

        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className={`group relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                active
                  ? 'bg-primary-dark text-white shadow-md shadow-primary-dark/30'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 translate-x-1 group-hover:translate-x-0 whitespace-nowrap bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                {item.label}
              </span>
            </button>
          );
        })}

        <div className="w-7 h-px bg-gray-200/80 my-0.5" />
        <button
          onClick={() => setShowLogoutConfirm(true)}
          aria-label="تسجيل الخروج"
          className="group relative w-11 h-11 rounded-2xl flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          <span className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 translate-x-1 group-hover:translate-x-0 whitespace-nowrap bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg">
            تسجيل الخروج
          </span>
        </button>
      </aside>

        <main className="flex flex-col min-h-screen w-full max-w-full pb-24 md:pb-0 md:pr-24">
        {/* Mobile Header */}
        <header className="md:hidden bg-white px-4 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
          <h2 className="font-black text-primary-dark">
            {isCommander ? 'لوحة التحكم' : 'إدارة متجرك'}
          </h2>
          <button onClick={() => setShowLogoutConfirm(true)} className="p-2 text-rose-500">
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

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-1">تسجيل الخروج</h3>
            <p className="text-sm text-gray-500 mb-6">هل أنت متأكد من رغبتك في الخروج من لوحة التحكم؟</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={onLogout}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
              >
                خروج
              </button>
            </div>
          </div>
        </div>
      )}
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
    const scanGlyph =
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="M4 7V5a1 1 0 0 1 1-1h2"/><path d="M17 4h2a1 1 0 0 1 1 1v2"/>` +
      `<path d="M20 17v2a1 1 0 0 1-1 1h-2"/><path d="M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M4 12h16"/></svg>`;

    win.document.write(
      `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />` +
        `<title>${esc(storeSettings.name)} - Barcodi QR</title>` +
        `<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet" />` +
        `<style>` +
        `*{box-sizing:border-box}` +
        `html,body{margin:0}` +
        `body{font-family:'Cairo',system-ui,sans-serif;color:#1f2937;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
        `.card{width:420px;max-width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:28px;overflow:hidden;text-align:center;box-shadow:0 12px 44px rgba(53,133,142,.12)}` +
        `.accent{height:8px;background:linear-gradient(90deg,#35858E,#7DA78C,#C2D099)}` +
        `.brandrow{display:flex;align-items:center;justify-content:center;gap:10px;padding:24px 24px 4px}` +
        `.logo{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#35858E,#7DA78C);display:flex;align-items:center;justify-content:center}` +
        `.bn{font-size:21px;font-weight:800;letter-spacing:.5px;color:#35858E;direction:ltr;line-height:1}` +
        `.ba{font-size:11px;color:#6b7280;font-weight:700;margin-top:3px}` +
        `.store{font-size:24px;font-weight:800;margin:16px 24px 2px}` +
        `.tag{font-size:13px;color:#6b7280;margin:0 24px 20px}` +
        `.qrwrap{display:flex;justify-content:center;margin-bottom:18px}` +
        `.qr{padding:18px;border-radius:20px;background:#fff;border:2px solid #E6EEC9}` +
        `.qr svg{width:248px;height:248px;display:block}` +
        `.steps{display:flex;justify-content:center;gap:8px;margin:0 18px 18px;flex-wrap:wrap}` +
        `.step{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#374151;background:#f3f4f6;border-radius:999px;padding:6px 12px}` +
        `.num{width:18px;height:18px;border-radius:50%;background:#35858E;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center}` +
        `.url{direction:ltr;font-size:11px;color:#6b7280;background:#f9fafb;border:1px dashed #d1d5db;border-radius:10px;padding:8px 12px;margin:0 24px;word-break:break-all}` +
        `.foot{font-size:11px;color:#9ca3af;padding:18px 24px 24px}` +
        `.foot b{color:#35858E}` +
        `@page{size:A4;margin:10mm}` +
        `@media print{` +
        `body{background:#fff;padding:0;min-height:auto;display:block}` +
        `.card{width:100%;max-width:none;min-height:277mm;border:none;border-radius:0;box-shadow:none;display:flex;flex-direction:column;justify-content:space-between}` +
        `.accent{height:10px}` +
        `.brandrow{padding-top:6mm;gap:14px}` +
        `.logo{width:60px;height:60px;border-radius:18px}` +
        `.bn{font-size:34px}` +
        `.ba{font-size:16px}` +
        `.store{font-size:44px;margin:6mm 0 2mm}` +
        `.tag{font-size:20px;margin-bottom:0}` +
        `.qrwrap{flex:1;align-items:center;margin:0}` +
        `.qr{padding:8mm;border-width:3px}` +
        `.qr svg{width:150mm;height:150mm}` +
        `.steps{gap:14px;margin:0 0 4mm}` +
        `.step{font-size:18px;padding:10px 18px}` +
        `.num{width:26px;height:26px;font-size:15px}` +
        `.url{font-size:15px;padding:12px 16px;margin:0 10mm}` +
        `.foot{font-size:15px;padding:6mm 0}` +
        `}` +
        `</style></head><body>` +
        `<div class="card">` +
        `<div class="accent"></div>` +
        `<div class="brandrow">` +
        `<div class="logo">${scanGlyph}</div>` +
        `<div><div class="bn">Barcodi</div><div class="ba">باركودي · قارئ الأسعار الذكي</div></div>` +
        `</div>` +
        `<div class="store">${esc(storeSettings.name)}</div>` +
        `<div class="tag">امسح الكود لتصفّح المتجر ومعرفة الأسعار فوراً</div>` +
        `<div class="qrwrap"><div class="qr">${svgMarkup}</div></div>` +
        `<div class="steps">` +
        `<div class="step"><span class="num">١</span>افتح الكاميرا</div>` +
        `<div class="step"><span class="num">٢</span>وجّهها للكود</div>` +
        `<div class="step"><span class="num">٣</span>تصفّح الأسعار</div>` +
        `</div>` +
        `<div class="url">${esc(storeUrl)}</div>` +
        `<div class="foot">مدعوم بواسطة <b>Barcodi</b></div>` +
        `</div>` +
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
