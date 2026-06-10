import { useState, FormEvent } from 'react';
import { KeyRound, Save, Wand2, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { generateStrongPassword } from './passwordUtils';

export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSuggest = () => {
    const generated = generateStrongPassword(16);
    setNewPassword(generated);
    setShowNew(true);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error === 'Current password is incorrect'
            ? 'كلمة المرور الحالية غير صحيحة'
            : data.error || 'تعذر تغيير كلمة المرور'
        );
      }
      setSuccess('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setShowNew(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100" dir="rtl">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
          <KeyRound className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">تغيير كلمة المرور</h2>
          <p className="text-gray-500 text-sm">حدّث كلمة مرور دخولك الخاصة بهذا الحساب</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-xl border border-green-200 flex items-center gap-2 text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 text-green-600" /> {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 flex items-center gap-2 text-sm font-bold">
          <AlertTriangle className="w-5 h-5 text-red-600" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">كلمة المرور الحالية</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary-main outline-none transition-all"
            dir="ltr"
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">كلمة المرور الجديدة</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary-main outline-none transition-all font-mono"
                dir="ltr"
                autoComplete="new-password"
                placeholder="8 أحرف على الأقل"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title={showNew ? 'إخفاء' : 'إظهار'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSuggest}
              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 rounded-xl font-bold flex items-center gap-2 transition-colors shrink-0 text-sm"
              title="اقتراح كلمة مرور قوية"
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">اقتراح قوية</span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary-dark text-white rounded-xl px-8 py-3.5 font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{isSubmitting ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}</span>
        </button>
      </form>
    </div>
  );
}
