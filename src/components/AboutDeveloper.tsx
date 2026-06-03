/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, Code2, ShieldCheck, Heart, Github, Send } from 'lucide-react';

interface AboutDeveloperProps {
  onClose: () => void;
}

export function AboutDeveloper({ onClose }: AboutDeveloperProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-[325px] bg-white/90 backdrop-blur-xl border border-white rounded-[1.75rem] p-5 shadow-[0_12px_45px_-10px_rgba(53,133,142,0.25)] animate-scale-up">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100/80 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Circular Badge */}
          <div className="relative mb-3 mt-1">
            <div className="w-16 h-16 rounded-full border-2 border-primary-dark/20 flex items-center justify-center bg-gradient-to-br from-primary-pale to-primary-light">
              <span className="text-2xl font-bold text-primary-dark font-sans opacity-80">ع</span>
            </div>
            
            <div className="absolute -bottom-1 -right-1 bg-primary-main text-white p-1 rounded-full border border-white shadow-sm">
              <Code2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-3 shadow-sm border border-emerald-110">
            <ShieldCheck className="w-3 h-3" />
            <span>إصدار مستقر</span>
          </div>

          <h2 className="text-xl font-black text-gray-900 mb-0.5 tracking-tight">م. عمر</h2>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">مطور ومصمم تطبيق عزيز المالي</p>
          <p className="text-[10px] text-gray-400 mb-4">طرابلس، ليبيا</p>

          <div className="bg-white/60 rounded-xl p-3 border border-white/80 text-[11.5px] leading-relaxed text-gray-600 shadow-sm mb-4">
            مهندس برمجيات متخصص في بناء حلول التكنولوچيا المالية وتطبيقات تجربة المستخدم الراقية والحلول التفاعلية الذكية.
          </div>

          <div className="w-full relative px-1">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white/0 px-2.5 text-[9px] font-bold text-gray-400 backdrop-blur-md">تواصل مباشر</span>
            </div>
          </div>

          <div className="flex justify-center gap-1.5 mt-3.5 w-full">
            <a href="https://wa.me/218945953967" className="flex-1 flex items-center justify-center gap-1 bg-[#25D366]/90 hover:bg-[#25D366] text-white py-2 rounded-lg font-bold text-xs transition-all shadow-sm">
              <Send className="w-3 h-3 -rotate-44" /> واتساب
            </a>
            <a href="https://t.me/om_218" className="flex-1 flex items-center justify-center gap-1 bg-[#0088cc]/90 hover:bg-[#0088cc] text-white py-2 rounded-lg font-bold text-xs transition-all shadow-sm">
              <Send className="w-3 h-3" /> تليجرام
            </a>
            <a href="https://github.com/om218" className="flex-1 flex items-center justify-center gap-1 bg-gray-900/90 hover:bg-gray-900 text-white py-2 rounded-lg font-bold text-xs transition-all shadow-sm">
              <Github className="w-3 h-3" /> جيت هاب
            </a>
          </div>

          <div className="mt-4 text-[10px] font-mono text-gray-400 leading-tight">
            <p>+218 94 595 3967</p>
            <p>omarmail092@gmail.com</p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1 text-[10px] font-bold text-gray-400">
            <span>صُنع بكل</span>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span>شغف لدعم الموازنة الشخصية</span>
          </div>
        </div>
      </div>
    </div>
  );
}
