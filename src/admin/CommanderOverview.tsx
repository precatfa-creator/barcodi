import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users, 
  Store, 
  Layers, 
  Eye, 
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

interface LogEvent {
  id: string;
  time: string;
  message: string;
  type: 'join' | 'leave' | 'visit' | 'product' | 'system';
}

export default function CommanderOverview() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const prevStoresRef = useRef<StoreData[]>([]);

  // Sound generator parameters for live actions (subtle beep sound effects using Web Audio API)
  const playAlertSound = (type: 'nice' | 'visit') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'nice') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(520, audioCtx.currentTime); // C5
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(330, audioCtx.currentTime); // E4
        gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime);
        oscillator.start();
         oscillator.stop(audioCtx.currentTime + 0.08);
      }
    } catch (e) {
      // Audio context might be blocked by browser autoplay rules
    }
  };

  useEffect(() => {
    // 📍 Real-time Firestore sync of the overall stores collection
    const storesCollection = collection(db, 'stores');
    
    // Add initial log
    const initialLog: LogEvent = {
      id: 'init-' + Date.now(),
      time: new Date().toLocaleTimeString('ar-EG'),
      message: 'تم تأسيس الاتصال الآمن بقاعدة البيانات السحابية (آيريس-1)',
      type: 'system'
    };
    setLogs([initialLog]);

    const unsubscribe = onSnapshot(storesCollection, (snapshot) => {
      const storesList: StoreData[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Exclude the 'default' commander document itself from store stats
        if (docSnap.id !== 'default') {
          storesList.push({
            id: docSnap.id,
            ...data
          } as StoreData);
        }
      });

      // Analyze deltas for Real-time event notifications stream
      const prevStores = prevStoresRef.current;
      if (prevStores.length > 0) {
        const prevMap = new Map<string, StoreData>(prevStores.map(s => [s.id, s]));
        const currMap = new Map<string, StoreData>(storesList.map(s => [s.id, s]));

        const newLogs: LogEvent[] = [];
        const timeStr = new Date().toLocaleTimeString('ar-EG');

        // Check for additions
        storesList.forEach(store => {
          if (!prevMap.has(store.id)) {
            newLogs.push({
              id: 'join-' + store.id + '-' + Date.now(),
              time: timeStr,
              message: `✨ مشترك جديد انضم للمنصة: "${store.storeName}" (${store.username})`,
              type: 'join'
            });
            playAlertSound('nice');
          } else {
            // Check for updates
            const prev = prevMap.get(store.id)!;
            const newVisits = store.visits || 0;
            const oldVisits = prev.visits || 0;
            if (newVisits > oldVisits) {
              newLogs.push({
                id: 'visit-' + store.id + '-' + Date.now() + '-' + newVisits,
                time: timeStr,
                message: `📍 زيارة جديدة مسجلة لمتجر "${store.storeName}" | الزيارات الآن: ${newVisits}`,
                type: 'visit'
              });
              playAlertSound('visit');
            }

            const newProdCount = store.products?.length || 0;
            const oldProdCount = prev.products?.length || 0;
            if (newProdCount !== oldProdCount) {
              newLogs.push({
                id: 'prod-' + store.id + '-' + Date.now() + '-' + newProdCount,
                time: timeStr,
                message: `📦 متجر "${store.storeName}" حدّث قائمة منتجاته | الأصناف الجديدة: ${newProdCount} (تغير: ${newProdCount - oldProdCount})`,
                type: 'product'
              });
              playAlertSound('nice');
            }
          }
        });

        // Check for deletions
        prevStores.forEach(store => {
          if (!currMap.has(store.id)) {
            newLogs.push({
              id: 'leave-' + store.id + '-' + Date.now(),
              time: timeStr,
              message: `❌ تم إنهاء حساب وحذف المتجر: "${store.storeName}" نهائياً من الخوادم`,
              type: 'leave'
            });
            playAlertSound('visit');
          }
        });

        if (newLogs.length > 0) {
          setLogs(prev => [...newLogs, ...prev].slice(0, 50)); // Keep last 50 events
        }
      }

      prevStoresRef.current = storesList;
      setStores(storesList);
      setLoading(false);
    }, (error) => {
      console.error("Commander onSnapshot error", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate calculations
  const totalStores = stores.length;
  const totalProducts = stores.reduce((sum, s) => sum + (s.products?.length || 0), 0);
  const totalVisits = stores.reduce((sum, s) => sum + (s.visits || 0), 0);
  const avgProductsPerStore = totalStores > 0 ? Math.round(totalProducts / totalStores) : 0;

  // Sorting
  const topStores = [...stores].sort((a, b) => (b.visits || 0) - (a.visits || 0)).slice(0, 4);
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
              أنت لست متجراً، بل المدير العام للمنصة. تمنحك هذه اللوحة سيطرة مطلقة لمراقبة كافة المتاجر المشتركة، حجم المعاملات، وزيارات العملاء المباشرة بلحظتها.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-4 py-2 rounded-2xl md:self-center self-start text-xs font-black text-emerald-300 shadow-sm animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>نظام المراقبة السحابي نشط</span>
          </div>
        </div>
      </div>

      {/* Global telemetry KPI boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
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

        {/* KPI 3: Total platform visits */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1 text-right">
            <span className="text-gray-400 font-bold text-xs">إجمالي الاستعلامات البصرية</span>
            <div className="text-3xl font-black text-gray-900">{totalVisits}</div>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-black inline-block">زيارات العملاء الإجمالية</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Eye className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Mean Density */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Operational Events feed */}
        <div className="lg:col-span-2 bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <h3 className="font-black text-lg text-white">سجل الأحداث المباشرة (Real-time Live Stream)</h3>
            </div>
            <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded text-[10px] font-mono">FIRESTORE SNAPSHOTS</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {logs.length > 0 ? logs.map((log) => {
              let tagColor = 'bg-slate-800 text-slate-400 border-slate-700';
              if (log.type === 'join') tagColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              if (log.type === 'leave') tagColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
              if (log.type === 'visit') tagColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
              if (log.type === 'product') tagColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              if (log.type === 'system') tagColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';

              return (
                <div key={log.id} className="flex items-start gap-3 border-b border-slate-800/40 pb-2.5 last:border-0 hover:bg-white/5 p-1 rounded transition-colors">
                  <span className="text-[10px] text-slate-500 shrink-0 select-none">{log.time}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border shrink-0 text-center w-[75px] ${tagColor}`}>
                    {log.type === 'join' ? 'انضمام' : log.type === 'leave' ? 'حذف' : log.type === 'visit' ? 'عميل' : log.type === 'product' ? 'بضائع' : 'نظام'}
                  </span>
                  <span className="text-slate-200 leading-relaxed text-right flex-1">{log.message}</span>
                </div>
              );
            }) : (
              <div className="text-slate-500 text-center py-12">بانتظار تلقي عمليات مباشرة من العملاء...</div>
            )}
          </div>
        </div>

        {/* Premium Statistics: Most visited stores */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col h-[400px]">
          <h3 className="font-black text-lg text-gray-900 border-b border-gray-100 pb-4 mb-4 text-right">
            المتاجر الأكثر نشاطاً وتفاعلاً
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {topStores.map((store, index) => {
              const visitPercent = totalVisits > 0 ? Math.round(((store.visits || 0) / totalVisits) * 100) : 0;
              return (
                <div key={store.id} className="space-y-1.5 text-right">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-500">{store.visits || 0} زيارة ({visitPercent}%)</span>
                    <span className="font-black text-gray-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary-pale text-primary-dark font-black text-[10px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      {store.storeName}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary-main h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.max(3, visitPercent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {topStores.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-12">لا توجد بيانات متاجر كافية</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mt-4 text-xs text-gray-500 leading-relaxed text-right font-medium">
            💡 يتم تتبع نشاطات المتاجر وحجم الزيارات وقوائم السلع فوريًا لضمان سلامة وكفاءة المنصة.
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
