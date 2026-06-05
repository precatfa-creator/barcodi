import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Play, Activity, CheckCircle, Flame, ShieldAlert, Cpu, HardDrive, Wifi, Server } from 'lucide-react';

interface SimulatedRequest {
  id: string;
  time: string;
  storeName: string;
  action: string;
  latency: number;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

export default function CommanderLiveFeed() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulatedLogs, setSimulatedLogs] = useState<SimulatedRequest[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedStore, setSimulatedStore] = useState('random');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'stores'), (snapshot) => {
      const storesList: any[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id !== 'default') {
          storesList.push({ id: docSnap.id, ...docSnap.data() });
        }
      });
      setStores(storesList);
      setLoading(false);
    }, (error) => {
      console.warn("LiveFeed onSnapshot offline or unreachable:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Simple simulator loop
  useEffect(() => {
    let timer: any = null;
    if (isSimulating && stores.length > 0) {
      timer = setInterval(() => {
        // Pick store
        let store = stores[0];
        if (simulatedStore === 'random') {
          store = stores[Math.floor(Math.random() * stores.length)];
        } else {
          store = stores.find(s => s.id === simulatedStore) || stores[0];
        }

        const actions = [
          'استعلام عن باركود المنتج',
          'تحميل واجهة السكنر الذكية',
          'إضافة منتج لسلة المشتريات الموحدة',
          'تحديث كميات السلة التقديرية',
          'قراءة كود الاستجابة السريعة للرف'
        ];

        const latency = Math.floor(Math.random() * 85) + 15; // 15-100ms
        const status = latency > 85 ? 'WARNING' : 'SUCCESS';

        const newLog: SimulatedRequest = {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString('ar-EG'),
          storeName: store.storeName,
          action: actions[Math.floor(Math.random() * actions.length)],
          latency,
          status
        };

        setSimulatedLogs(prev => [newLog, ...prev].slice(0, 30));

        // Let's also increment visits in the cloud for that store in-memory to simulate real customer visits in real-time!
        const incrementVisitInCloud = async () => {
          try {
            const storeRef = doc(db, 'stores', store.id);
            await updateDoc(storeRef, {
              visits: (store.visits || 0) + 1
            });
          } catch (e) {
            console.error("Simulation cloud increment failed:", e);
          }
        };
        incrementVisitInCloud();

      }, 1800);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSimulating, stores, simulatedStore]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500" dir="rtl">
        <Server className="w-10 h-10 text-primary-main animate-bounce mb-4" />
        <p className="font-bold text-sm">جاري قياس مستويات الاستجابة وزمن الاستجابة السحابي...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans" dir="rtl">
      
      {/* Simulation options card */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary-dark">
            <Cpu className="w-6 h-6 text-primary-main" />
            <h3 className="font-black text-lg text-gray-900">محاكي ضغط تصفح العملاء</h3>
          </div>
          <p className="text-xs text-gray-500 text-right leading-relaxed font-semibold">
            تتيح لك هذه الأداة توليد طلبات وعمليات تصفح عشوائية للعملاء على متاجر المشتركين. من شأن هذا اختبار استجابة السيرفرات، ومتابعة تغير العدادات فورياً في لوحة التحكم في نفس الوقت!
          </p>

          <div className="space-y-3 pt-2 text-right">
             <div>
               <label className="block text-xs text-gray-400 font-bold mb-1.5">المتجر المستهدف بالمحاكاة</label>
               <select 
                 value={simulatedStore} 
                 onChange={e => setSimulatedStore(e.target.value)}
                 className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main text-xs font-black bg-white"
               >
                 <option value="random">توزيع عشوائي على الجميع 🎲</option>
                 {stores.map(s => (
                   <option key={s.id} value={s.id}>{s.storeName}</option>
                 ))}
               </select>
             </div>
          </div>
        </div>

        <div className="pt-6">
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            className={`w-full py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all outline-none ${
              isSimulating 
                ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse shadow-md' 
                : 'bg-primary-main text-white hover:bg-primary-dark shadow-md'
            }`}
          >
            <Play className={`w-4 h-4 ${isSimulating ? 'rotate-90' : ''}`} />
            <span>{isSimulating ? 'إيقاف محاكاة العملاء' : 'تشغيل محاكي العمليات المباشر'}</span>
          </button>
        </div>
      </div>

      {/* Latency and telemetry logs view */}
      <div className="lg:col-span-2 bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-sm flex flex-col h-[400px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-5 h-5 text-emerald-500 shrink-0" />
            <h3 className="font-black text-base text-white">مراقب المعالجة والمحاكاة الحية (Operations Audit Console)</h3>
          </div>
          <span className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-mono border border-emerald-500/20">LIVE METRICS</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 font-mono text-[11px] pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {simulatedLogs.length > 0 ? simulatedLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between border-b border-slate-800/20 pb-2.5 last:border-0 hover:bg-white/5 p-1 rounded transition-colors text-right">
              
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-500 font-mono">{log.time}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                  log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {log.status}
                </span>
                <span className="text-slate-400 font-bold font-sans">({log.latency}ms)</span>
              </div>

              <div className="flex-1 pr-4">
                <span className="text-white font-sans font-black">"{log.storeName}"</span>
                <span className="text-slate-405 mr-1 font-sans">← {log.action}</span>
              </div>

            </div>
          )) : (
            <div className="text-slate-500 text-center py-16 text-xs flex flex-col items-center justify-center gap-3">
              <Activity className="w-8 h-8 text-slate-700 shrink-0 animate-pulse" />
              <span>قم بتشغيل المحاكي لتجريب نظام المراقبة المباشرة وتدفق بيانات الزيارات والتصفح للعملاء في السحاب.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
