import { useState, type FormEvent } from 'react';
import { Store, ArrowRight, ShieldCheck, LogIn, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onLogin: (user: string, pass: string) => void;
}

export default function AdminLogin({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        
        {/* Back action */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 font-bold mb-8 hover:text-gray-900 transition-colors">
          <ArrowRight className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </button>

        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-primary-light/20 rounded-3xl flex items-center justify-center border-4 border-white shadow-sm">
              <Store className="w-10 h-10 text-primary-main" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-center text-gray-900 mb-2">
            تسجيل الدخول للإدارة
          </h2>
          <p className="text-gray-500 text-center font-medium mb-8">
            أدخل بيانات حساب المتجر للمتابعة
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">اسم المستخدم</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary-main focus:border-transparent outline-none transition-all mb-4"
                placeholder="أدخل اسم المستخدم"
                autoFocus
              />
              <label className="block text-sm font-bold text-gray-700 mb-2">كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary-main focus:border-transparent outline-none transition-all"
                placeholder="أدخل كلمة المرور"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary-dark hover:bg-gray-900 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <LogIn className="w-5 h-5" />
              <span>تسجيل الدخول</span>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center flex flex-col items-center">
            <p className="text-gray-500 font-bold mb-4">ليس لديك متجر مسجل؟</p>
            <a
              href="https://wa.me/218945953967"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-green-600 bg-green-50 hover:bg-green-100 px-6 py-3 rounded-xl font-bold transition-colors w-full"
            >
              <MessageCircle className="w-5 h-5" />
              <span dir="ltr">+218 94 595 3967</span>
              <span>تواصل معنا لإنشاء متجرك</span>
            </a>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 font-medium text-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>منطقة آمنة ومحمية</span>
        </div>
      </div>
    </div>
  );
}
