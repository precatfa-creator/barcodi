import { useState, useEffect } from 'react';
import { 
  Users, 
  Store, 
  Layers, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Search,
  MessageSquare,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';

interface StoreData {
  id: string;
  username: string;
  storeName: string;
  storeLogo?: string;
  products?: any[];
  visits?: number;
  password?: string;
}

export default function CommanderOverview() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch('/api/admin/all-stores', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load stores');
        const storesList = (await res.json()).filter((store: StoreData) => store.id !== 'default');
        setStores(storesList);
      } catch (error) {
        console.error("Commander stores load error", error);
      } finally {
        setLoading(false);
      }
    };

    loadStores();
    const interval = window.setInterval(loadStores, 5000);

    return () => window.clearInterval(interval);
  }, []);

  // Calculate calculations
  const totalStores = stores.length;
  const totalProducts = stores.reduce((sum, s) => sum + (s.products?.length || 0), 0);
  const avgProductsPerStore = totalStores > 0 ? Math.round(totalProducts / totalStores) : 0;

  // Sorting
  const emptyStores = stores.filter(s => !s.products || s.products.length === 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500" dir="rtl">
        <Activity className="w-12 h-12 text-primary-main animate-bounce mb-4" />
        <p className="font-bold">جاري تحميل لوحة القائد والمؤشرات الحية السحابية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Upper header */}
      <div className="bg-gradient-to-l from-primary-dark to-primary-main text-white rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-10 md:left-20 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Activity className="w-48 h-48" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-right">
            <span className="bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              حساب القائد العام (Commander Account)
            </span>
            <h2 className="text-3xl font-black">غرفة القيادة والتحليلات والعمليات للمشروع</h2>
            <p className="text-primary-pale text-sm max-w-xl font-medium">
              أنت لست متجراً، بل المدير العام للمنصة. تمنحك هذه اللوحة سيطرة واضحة لإدارة كافة المتاجر المشتركة، متابعة الكتالوجات، وضمان جودة تشغيل المنصة.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-4 py-2 rounded-2xl md:self-center self-start text-xs font-black text-emerald-300 shadow-sm animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>نظام المراقبة السحابي نشط</span>
          </div>
        </div>
      </div>

      {/* Global telemetry KPI boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* KPI 1: Stores count */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1 text-right">
            <span className="text-gray-400 font-bold text-xs">المتاجر النشطة</span>
            <div className="text-3xl font-black text-gray-900">{totalStores}</div>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black inline-block">حسابات المستفيدين</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Total products catalog */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1 text-right">
            <span className="text-gray-400 font-bold text-xs">إجمالي السلع المرفوعة</span>
            <div className="text-3xl font-black text-gray-900">{totalProducts}</div>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-black inline-block">فهرس الباركود المنصة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Mean Density */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1 text-right">
            <span className="text-gray-400 font-bold text-xs">متوسط كثافة الأصناف</span>
            <div className="text-3xl font-black text-gray-900">{avgProductsPerStore}</div>
            <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-black inline-block">منتج لكل متجر مشترك</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>
      {/* Operational Watchdog & Audits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Security / Alert Watchdog */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h3 className="font-black text-lg text-gray-900 mb-2 text-right flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            تنبيهات ومراقبة الجودة (Quality Watchdog)
          </h3>
          <p className="text-xs text-gray-500 mb-4 text-right">نظام الرصد التلقائي للمتاجر التي تواجه مشاكل في إعداد كتالوجاتها.</p>

          <div className="space-y-3">
            {emptyStores.length > 0 ? emptyStores.map(store => (
              <div key={store.id} className="bg-rose-50 text-rose-800 p-3.5 rounded-2xl border border-rose-100 flex items-center justify-between text-xs font-bold font-sans">
                <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-lg">بدون منتجات</span>
                <span className="text-right">متجر <strong>"{store.storeName}"</strong> فارغ وتائه، يحتاج مساعدة لرفع قالب الإكسل.</span>
              </div>
            )) : (
              <div className="bg-green-50 text-green-800 p-4 rounded-2xl border border-green-100 flex items-center gap-3 text-xs font-bold text-right">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <span>جميع المشتركين حالياً لديهم قوائم منتجات ومعرّفات باركود نشطة بنسبة 100%! عمل جماعي رائع.</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Launch & operational controls */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-black text-lg text-gray-900 mb-2 text-right">
              إجراءات سريعة وصلاحيات القائد
            </h3>
            <p className="text-xs text-gray-500 mb-4 text-right">إجراء تعديلات عملياتية سريعة وطباعة التقارير الإجمالية لإدارة المشتركين وفحص المنصة.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                alert("تنبيه: سيتم تنزيل ملف الإحصائيات الكامل لجميع المتاجر النشطة بطلبك.");
              }}
              className="bg-gray-50 hover:bg-gray-100 text-gray-700 p-4 rounded-2xl border border-gray-200 font-bold text-xs flex flex-col items-center justify-center gap-2 transition-colors"
            >
              <FileText className="w-5 h-5 text-gray-400" />
              <span>تصدير تقرير SaaS</span>
            </button>

            <button
              onClick={() => {
                const mailBody = `مرحباً بكم من منصة قارئ متجري، يسعدنا مساعدتكم في رفع المنتجات...`;
                window.open(`https://wa.me/218945953967?text=${encodeURIComponent(mailBody)}`);
              }}
              className="bg-primary-pale text-primary-dark hover:bg-primary-light/30 p-4 rounded-2xl border border-primary-light/30 font-black text-xs flex flex-col items-center justify-center gap-2 transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              <span>دعم المشتركين (واتساب)</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
