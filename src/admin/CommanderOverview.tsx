import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Layers,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  MessageSquare,
  Crown,
  Eye,
  Users,
  ArrowUpLeft,
  Trophy,
} from 'lucide-react';
import ChangePasswordCard from './ChangePasswordCard';

interface StoreData {
  id: string;
  username: string;
  storeName: string;
  storeLogo?: string;
  productsCount?: number;
  visits?: number;
}

export default function CommanderOverview() {
  const navigate = useNavigate();
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
        console.error('Commander stores load error', error);
      } finally {
        setLoading(false);
      }
    };

    loadStores();
    const interval = window.setInterval(loadStores, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const totalStores = stores.length;
  const totalProducts = stores.reduce((sum, s) => sum + (s.productsCount || 0), 0);
  const totalVisits = stores.reduce((sum, s) => sum + (s.visits || 0), 0);
  const avgProductsPerStore = totalStores > 0 ? Math.round(totalProducts / totalStores) : 0;

  const emptyStores = stores.filter((s) => !s.productsCount);
  const topStores = [...stores].sort((a, b) => (b.visits || 0) - (a.visits || 0)).slice(0, 5);
  const maxVisits = topStores.reduce((m, s) => Math.max(m, s.visits || 0), 0);

  const kpis = [
    { label: 'المتاجر النشطة', value: totalStores, hint: 'حسابات المستفيدين', icon: Store, tint: 'text-indigo-600 bg-indigo-50' },
    { label: 'إجمالي السلع المرفوعة', value: totalProducts.toLocaleString('en-US'), hint: 'فهرس باركود المنصة', icon: Layers, tint: 'text-amber-600 bg-amber-50' },
    { label: 'إجمالي الزيارات', value: totalVisits.toLocaleString('en-US'), hint: 'دخول العملاء للمتاجر', icon: Eye, tint: 'text-sky-600 bg-sky-50' },
    { label: 'متوسط كثافة الأصناف', value: avgProductsPerStore, hint: 'منتج لكل متجر', icon: TrendingUp, tint: 'text-rose-600 bg-rose-50' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-gray-400" dir="rtl">
        <div className="w-10 h-10 rounded-full border-2 border-primary-light border-t-primary-dark animate-spin mb-4" />
        <p className="font-bold text-sm">جاري تحميل لوحة القيادة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-primary-dark via-primary-dark to-[#2a6b73] text-white p-7 md:p-9 shadow-lg shadow-primary-dark/20">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-1/3 -bottom-24 w-72 h-72 rounded-full bg-primary-main/20 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-black border border-white/15">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              حساب القائد العام
            </span>
            <h2 className="text-2xl md:text-3xl font-black leading-tight">غرفة القيادة والعمليات</h2>
            <p className="text-primary-pale/90 text-sm max-w-xl leading-relaxed">
              نظرة شاملة على أداء المنصة: إدارة المتاجر المشتركة، متابعة الكتالوجات، ومراقبة جودة التشغيل من مكان واحد.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start bg-emerald-500/15 border border-emerald-400/25 px-4 py-2.5 rounded-2xl text-xs font-black text-emerald-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            النظام يعمل بشكل مباشر
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${kpi.tint} group-hover:scale-105 transition-transform`}>
              <kpi.icon className="w-5.5 h-5.5" />
            </div>
            <div className="text-3xl font-black text-gray-900 tracking-tight tabular-nums">{kpi.value}</div>
            <div className="text-sm font-bold text-gray-700 mt-1">{kpi.label}</div>
            <div className="text-[11px] text-gray-400 font-bold mt-0.5">{kpi.hint}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard + attention */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Busiest stores */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              أكثر المتاجر زيارة
            </h3>
            <button
              onClick={() => navigate('/admin/dashboard/subscribers')}
              className="text-xs font-bold text-primary-dark hover:text-primary-main flex items-center gap-1 transition-colors"
            >
              إدارة الكل
              <ArrowUpLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {topStores.length > 0 ? (
            <div className="space-y-2">
              {topStores.map((store, idx) => (
                <div key={store.id} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-gray-50 transition-colors">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-primary-pale/60 text-primary-dark flex items-center justify-center shrink-0 overflow-hidden">
                    {store.storeLogo ? (
                      <img src={store.storeLogo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 truncate">{store.storeName}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-primary-dark to-primary-main"
                        style={{ width: `${maxVisits > 0 ? Math.max(6, ((store.visits || 0) / maxVisits) * 100) : 6}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="flex items-center gap-1 text-sm font-black text-gray-900 tabular-nums">
                      <Eye className="w-3.5 h-3.5 text-gray-300" />
                      {(store.visits || 0).toLocaleString('en-US')}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold">{store.productsCount || 0} صنف</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm font-bold">لا توجد متاجر مسجلة بعد</div>
          )}
        </div>

        {/* Attention / watchdog */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col">
          <h3 className="font-black text-gray-900 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            متاجر تحتاج اهتمام
          </h3>
          <p className="text-xs text-gray-400 font-bold mb-4">متاجر بلا منتجات تحتاج مساعدة في رفع كتالوجها.</p>

          <div className="space-y-2 flex-1">
            {emptyStores.length > 0 ? (
              emptyStores.slice(0, 5).map((store) => (
                <div key={store.id} className="flex items-center justify-between gap-2 bg-rose-50/70 border border-rose-100 rounded-2xl px-3.5 py-3">
                  <span className="font-bold text-xs text-rose-900 truncate">{store.storeName}</span>
                  <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg shrink-0">بدون منتجات</span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-gray-500 max-w-[200px] leading-relaxed">
                  كل المتاجر لديها كتالوجات منتجات نشطة. عمل رائع! 🎉
                </p>
              </div>
            )}
          </div>
          {emptyStores.length > 5 && (
            <p className="text-[11px] text-gray-400 font-bold text-center mt-3">و{emptyStores.length - 5} متجر آخر…</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/admin/dashboard/subscribers')}
          className="group bg-gradient-to-bl from-primary-dark to-primary-main text-white rounded-2xl p-5 text-right shadow-sm hover:shadow-md transition-all flex items-center justify-between"
        >
          <div>
            <div className="font-black text-sm">إدارة المشتركين</div>
            <div className="text-[11px] text-primary-pale/90 font-bold mt-0.5">إضافة وتعديل المتاجر</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
            <Users className="w-5 h-5" />
          </div>
        </button>

        <button
          onClick={() => {
            const header = ['اسم المتجر', 'اسم المستخدم', 'عدد المنتجات', 'الزيارات'];
            const rows = stores.map((s) => [s.storeName, s.username, s.productsCount || 0, s.visits || 0]);
            const csv = '﻿' + [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `تقرير_المتاجر_${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
          }}
          className="group bg-white border border-gray-100 rounded-2xl p-5 text-right shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex items-center justify-between"
        >
          <div>
            <div className="font-black text-sm text-gray-900">تصدير تقرير المتاجر</div>
            <div className="text-[11px] text-gray-400 font-bold mt-0.5">ملف CSV بكل البيانات</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
            <FileText className="w-5 h-5" />
          </div>
        </button>

        <a
          href={`https://wa.me/218945953967?text=${encodeURIComponent('مرحباً من لوحة قيادة باركودي، أحتاج دعماً للمشتركين.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white border border-gray-100 rounded-2xl p-5 text-right shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex items-center justify-between"
        >
          <div>
            <div className="font-black text-sm text-gray-900">دعم المشتركين</div>
            <div className="text-[11px] text-gray-400 font-bold mt-0.5">تواصل عبر واتساب</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-green-100 transition-colors">
            <MessageSquare className="w-5 h-5" />
          </div>
        </a>
      </div>

      {/* Commander's own login password */}
      <ChangePasswordCard />
    </div>
  );
}
