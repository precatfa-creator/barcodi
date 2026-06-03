/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wifi, Info, ShieldAlert, Award, HelpCircle } from 'lucide-react';

interface NetworkGuardProps {
  isWifiConnected: boolean;
  onConnectWifi: () => void;
  wifiName: string;
}

export function NetworkGuard({
  isWifiConnected,
  onConnectWifi,
  wifiName,
}: NetworkGuardProps) {
  if (isWifiConnected) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 text-center animate-fade-in" id="network-guard-container">
      <div className="max-w-md w-full bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white p-8 shadow-[0_12px_40px_-10px_rgba(53,133,142,0.15)] relative overflow-hidden" id="network-guard-card">
        {/* Visual elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-pale/30 rounded-full blur-2xl -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-light/20 rounded-full blur-2xl -ml-10 -mb-10" />

        <div className="relative z-10">
          {/* Logo badge */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-white/80 border border-white flex items-center justify-center text-primary-dark mb-6 shadow-sm">
            <Wifi className="w-10 h-10 animate-bounce" />
          </div>

          <span className="inline-flex items-center gap-1 bg-white/60 text-primary-dark text-xs font-bold px-3 py-1.5 rounded-full border border-white shadow-sm mb-4">
            <ShieldAlert className="w-3.5 h-3.5" />
            تنبيه: تطبيق داخلي للمتجر فقط
          </span>

          <h1 className="text-xl font-black text-gray-900 tracking-tight leading-snug mb-3">
            أنت غير متصل بشبكة المحل
          </h1>
          
          <p className="text-gray-600 text-sm leading-relaxed mb-6 font-medium">
            يعمل نظام القارئ التلقائي فقط عندما يكون جهازك متصلاً بشبكة الـ Wi-Fi الداخلية لـ <strong className="text-primary-dark font-black">أسواق النخبة</strong> لضمان جلب الأسعار بشكل لحظي.
          </p>

          {/* Wi-Fi instructions */}
          <div className="bg-white/50 border border-white rounded-2xl p-4.5 text-right mb-6 shadow-sm" id="wifi-connection-card">
            <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5 justify-start">
              <Info className="w-4 h-4 text-primary-main" />
              كيف تتصل الآن بالشبكة؟
            </h3>
            <ul className="space-y-3 text-xs text-gray-600 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white text-primary-dark border border-white shadow-sm flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">١</span>
                <div className="mt-1 mt-0.5">افتح إعدادات الـ <strong className="text-gray-800 font-black">Wi-Fi</strong> في جوالك.</div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white text-primary-dark border border-white shadow-sm flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">٢</span>
                <div className="mt-0.5">
                  اختر الشبكة المجانية: <code className="bg-white text-primary-dark font-mono text-[11px] px-2 py-0.5 rounded font-bold border border-white shadow-sm">{wifiName}</code>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white text-primary-dark border border-white shadow-sm flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">٣</span>
                <div className="mt-0.5">الشبكة مجانية بالكامل ومفتوحة لكل عملاء السوبرماركت دون كلمة مرور.</div>
              </li>
            </ul>
          </div>

          <button
            onClick={onConnectWifi}
            className="w-full bg-primary-dark hover:bg-gray-900 active:scale-95 text-white font-bold text-sm py-4 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
            id="btn-simulate-connect-action"
          >
            <Wifi className="w-4 h-4" />
            تأكيد الاتصال بشبكة المتجر والبدء
          </button>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-bold">
            <Award className="w-3.5 h-3.5 text-primary-light" />
            <span>طلب آمن لراحتك وموفر لبيانات الجوال</span>
          </div>
        </div>
      </div>
    </div>
  );
}
