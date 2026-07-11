import { useState, FormEvent, useRef, useEffect, type ChangeEvent } from 'react';
import { Store, Save, Image as ImageIcon, Upload, ShoppingBag } from 'lucide-react';
import { useAppContext } from '../AppContext';
import ChangePasswordCard from './ChangePasswordCard';

export default function StoreSettingsForm() {
  const { storeSettings, setStoreSettings } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: storeSettings.name,
    logoUrl: storeSettings.logoUrl || '',
    cartEnabled: storeSettings.cartEnabled !== false,
  });

  // Store data loads asynchronously after this form first mounts. Re-sync the
  // local form fields when it arrives, otherwise the inputs stay stuck on the
  // "جاري التحميل..." placeholder until the user navigates away and back.
  useEffect(() => {
    setFormData({
      name: storeSettings.name,
      logoUrl: storeSettings.logoUrl || '',
      cartEnabled: storeSettings.cartEnabled !== false,
    });
  }, [storeSettings.name, storeSettings.logoUrl, storeSettings.cartEnabled]);

  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');

    if (file.size > 500 * 1024) {
       setErrorMessage("حجم الصورة كبير جداً. الرجاء اختيار صورة بحجم أقل من 500 كيلوبايت لضمان سرعة التحميل.");
       if (fileInputRef.current) fileInputRef.current.value = '';
       return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
       if (event.target?.result) {
         setFormData({ ...formData, logoUrl: event.target.result as string });
       }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStoreSettings({
      name: formData.name,
      logoUrl: formData.logoUrl || null,
      visits: storeSettings.visits,
      cartEnabled: formData.cartEnabled
    });
    setSavedMessage('تم حفظ الإعدادات بنجاح!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary-light/30 text-primary-dark rounded-xl">
          <Store className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">إعدادات المتجر</h2>
          <p className="text-gray-500 text-sm">تخصيص البيانات الأساسية الخاصة بسوقك</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">اسم المتجر</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl focus:ring-2 focus:ring-primary-main focus:border-transparent outline-none transition-all"
            placeholder="مثال: أسواق النخبة"
          />
        </div>

        <div>
           <label className="block text-sm font-bold text-gray-700 mb-2">شعار المتجر (صورة)</label>
           <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
             <div className="w-16 h-16 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
               {formData.logoUrl ? (
                 <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
               ) : (
                 <ImageIcon className="w-6 h-6 text-gray-400" />
               )}
             </div>
             
             <div className="flex-1 w-full space-y-2">
                 <div className="flex w-full gap-2 relative">
                   <input
                     type="url"
                     value={formData.logoUrl}
                     onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                     className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-primary-main focus:border-transparent outline-none transition-all text-left"
                     placeholder="رابط الصورة (https://...) أو قم بالرفع"
                     dir="ltr"
                   />
                   <input 
                     type="file" 
                     accept="image/*" 
                     className="hidden" 
                     ref={fileInputRef}
                     onChange={handleImageUpload}
                   />
                   <button 
                     type="button"
                     onClick={() => fileInputRef.current?.click()}
                     className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shrink-0"
                   >
                     <Upload className="w-4 h-4" />
                     <span>رفع صورة</span>
                   </button>
                 </div>
                 <p className="text-xs text-gray-500 font-medium">الحد الأقصى لحجم الصورة: 500 كيلوبايت. يفضل استخدام شعار مربع.</p>
                 {errorMessage && (
                   <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-100 my-2">{errorMessage}</p>
                 )}
             </div>
           </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">قائمة المشتريات (السلة)</label>
          <button
            type="button"
            role="switch"
            aria-checked={formData.cartEnabled}
            onClick={() => setFormData({ ...formData, cartEnabled: !formData.cartEnabled })}
            className={`w-full flex items-center justify-between gap-4 p-4 rounded-xl border transition-all text-right ${
              formData.cartEnabled
                ? 'bg-primary-light/10 border-primary-light/40'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className={`p-2.5 rounded-lg ${formData.cartEnabled ? 'bg-primary-light/30 text-primary-dark' : 'bg-gray-200 text-gray-500'}`}>
                <ShoppingBag className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-gray-900">
                  {formData.cartEnabled ? 'قائمة المشتريات مفعّلة' : 'قائمة المشتريات موقوفة'}
                </span>
                <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                  عند الإيقاف يصبح التطبيق قارئ أسعار فقط: يظهر سعر المنتج دون إمكانية إضافته لقائمة المشتريات.
                </span>
              </span>
            </span>
            <span
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
                formData.cartEnabled ? 'bg-primary-dark' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  formData.cartEnabled ? 'right-1' : 'right-6'
                }`}
              />
            </span>
          </button>
        </div>

        <div className="pt-4 flex items-center justify-between">
          <button
            type="submit"
            className="bg-primary-dark text-white rounded-xl px-8 py-3.5 font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all active:scale-95"
          >
            <Save className="w-5 h-5" />
            <span>حفظ الإعدادات</span>
          </button>
          
          {savedMessage && (
            <span className="text-emerald-600 font-bold text-sm animate-pulse">{savedMessage}</span>
          )}
        </div>
      </form>
    </div>

      <ChangePasswordCard />
    </div>
  );
}
