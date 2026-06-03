/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ShieldAlert, Bug, Cog, RefreshCw, Store, Globe } from 'lucide-react';
import { AppSettings } from '../types';
import { useNavigate } from 'react-router-dom';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onShowAbout: () => void;
}

export function SettingsTab({ settings, onUpdateSettings, onShowAbout }: SettingsTabProps) {
  const [updateState, setUpdateState] = useState<'idle' | 'clearing' | 'success'>('idle');
  const navigate = useNavigate();

  const handleClearCacheAndUpdate = async () => {
    setUpdateState('clearing');
    
    try {
      // 1. Clear Cache storage if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      }
      
      // 2. Unregister service workers if available
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister())
        );
      }
      
      // 3. Short delay for realistic execution before relaunching
      setTimeout(() => {
        setUpdateState('success');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }, 1500);
      
    } catch (err) {
      console.error('Failed to clear cache & update:', err);
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in" id="settings-tab-root">
      <div className="text-center mb-2">
        <div className="w-16 h-16 rounded-3xl bg-white/60 mx-auto flex items-center justify-center text-primary-dark shadow-sm border border-white/50 mb-3">
          <Cog className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight">الإعدادات</h2>
        <p className="text-xs text-gray-500 mt-1">إعدادات النظام المتقدمة</p>
      </div>

      {/* Developers options card */}
      <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200/50 flex items-center gap-2">
          <Bug className="w-4 h-4 text-primary-dark" />
          خيارات المطورين
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-[13px] font-bold text-gray-900">وضع الاختبار (Test Mode)</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed mt-1 max-w-[240px]">
              عند التفعيل، سيسمح لك النظام بمسح أي باركود عشوائي وسيقوم بتوليد منتج وهمي بسعر عشوائي لتجربة السلة بدون منتجات حقيقية.
            </p>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer mr-4" id="toggle-test-mode">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings.isTestMode}
              onChange={(e) => onUpdateSettings({ ...settings, isTestMode: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-dark"></div>
          </label>
        </div>
        
        {settings.isTestMode && (
          <div className="mt-4 bg-amber-50/80 border border-amber-200/60 p-3 rounded-xl flex gap-2 items-start opacity-90 text-[11px] text-amber-800">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
            <p>وضع الاختبار مفعّل الآن. يمكنك توجيه الكاميرا إلى أي باركود لتجربة السلة.</p>
          </div>
        )}
      </div>

      {/* Language UI Card */}
      <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200/50 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary-dark" />
          {settings.language === 'en' ? 'Language / اللغة' : 'تغيير اللغة'}
        </h3>
        <div className="flex gap-4 items-center">
            <button 
              onClick={() => onUpdateSettings({ ...settings, language: 'ar' })} 
              className={`flex-1 p-3 rounded-2xl font-bold transition-all border ${settings.language !== 'en' ? 'bg-primary-dark text-white border-primary-dark' : 'bg-white text-gray-500 border-gray-200 hover:border-primary-main hover:text-primary-main'}`}
            >
              العربية
            </button>
            <button 
              onClick={() => onUpdateSettings({ ...settings, language: 'en' })} 
              className={`flex-1 p-3 rounded-2xl font-bold transition-all border ${settings.language === 'en' ? 'bg-primary-dark text-white border-primary-dark' : 'bg-white text-gray-500 border-gray-200 hover:border-primary-main hover:text-primary-main'}`}
            >
              English
            </button>
        </div>
      </div>

      {/* PWA Updates and Memory clearing Card */}
      <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-bold text-gray-900 mb-3 pb-3 border-b border-gray-200/50 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary-dark animate-none" />
          تحديثات التطبيق والذاكرة
        </h3>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
          إذا واجهت أي مشاكل في الأسعار أو القراءة، يمكنك مسح الذاكرة المؤقتة (الكاش) وتحميل أحدث نسخة مستقرة من الخادم فوراً.
        </p>
        
        {updateState === 'idle' ? (
          <button 
            onClick={handleClearCacheAndUpdate}
            className="w-full bg-primary-dark hover:bg-primary-main text-white py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>مسح الذاكرة المؤقتة وتحديث التطبيق</span>
          </button>
        ) : updateState === 'clearing' ? (
          <div className="w-full bg-slate-100 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary-dark" />
            <span>جاري مسح الذاكرة المؤقتة وتحديث الملفات...</span>
          </div>
        ) : (
          <div className="w-full bg-green-50 border border-green-200 text-green-800 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 animate-pulse">
            <span>تم المسح بنجاح! جاري إعادة تشغيل التطبيق...</span>
          </div>
        )}
      </div>

      {/* Admin Panel Link */}
      <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] mt-2">
        <h3 className="text-sm font-bold text-gray-900 mb-3 pb-3 border-b border-gray-200/50 flex items-center gap-2">
          <Store className="w-4 h-4 text-primary-dark" />
          لوحة تحكم المتجر
        </h3>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
          تسجيل الدخول لإعدادات إدارة المتجر المتقدمة مثل تحديث المنتجات عبر ملف الإكسل (Excel) وتغيير بيانات المتجر.
        </p>
        <button 
          onClick={() => navigate('/admin')}
          className="w-full bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <Store className="w-4 h-4" />
          <span>الدخول إلى لوحة التحكم</span>
        </button>
      </div>

      {/* About App Card */}
      <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-center mt-2">
        <h3 className="text-[13px] font-bold text-gray-900 mb-3">عن النظام</h3>
        <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
          إصدار PWA المستقر 1.0.2
          <br/>
          جميع الحقوق محفوظة © 2026
        </p>
        
        <button 
          onClick={onShowAbout}
          className="bg-gray-900 text-white hover:bg-gray-800 px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all w-full max-w-[200px] shadow-md border border-gray-800"
        >
          التواصل مع المطور
        </button>
      </div>
    </div>
  );
}
