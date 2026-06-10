import { useState, useEffect } from 'react';
import { Users, Trash2, Plus, Store, Link as LinkIcon, AlertCircle, CheckCircle, X, KeyRound, Copy, Wand2, PauseCircle, PlayCircle } from 'lucide-react';
import { generateStrongPassword } from './passwordUtils';

export default function StoreManager() {
  const [stores, setStores] = useState<any[]>([]);
  const [newStore, setNewStore] = useState({ username: '', password: '', storeName: '' });
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<any | null>(null);
  const [resettingStoreId, setResettingStoreId] = useState<string | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ username: string; password: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/admin/all-stores', { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.ok) {
         const all = await res.json();
         // The commander's own platform account (default) isn't a subscriber.
         setStores(all.filter((s: any) => s.id !== 'default'));
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  useEffect(() => { 
    fetchStores(); 
  }, []);

  const handleCreate = async () => {
     if (!newStore.username || !newStore.password || !newStore.storeName) {
       setErrorMessage("الرجاء تعبئة جميع الحقول المطلوبة");
       return;
     }

     if (newStore.password.length < 8) {
       setErrorMessage("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
       return;
     }

     setIsSubmitting(true);
     setErrorMessage(null);
     setSuccessMessage(null);

     // Temporary unique local ID for optimistic UI
     const tempId = 'temp-' + Date.now();
     const optimisticStore = {
       id: tempId,
       storeName: newStore.storeName,
       username: newStore.username,
       productsCount: 0,
       visits: 0,
       isOptimistic: true // Marker for local loading/indicator if needed
     };

     // Insert at the beginning of the stores list immediately!
     setStores(prev => [optimisticStore, ...prev]);
     
     // Close input pane and clear fields immediately for snappy layout
     setNewStore({ username: '', password: '', storeName: '' });
     setIsAddingMode(false);

     try {
       const res = await fetch('/api/admin/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            username: newStore.username,
            password: newStore.password,
            storeName: newStore.storeName
          })
       });
       
       if (res.ok) {
          const data = await res.json();
          setSuccessMessage('تم إضافة المشترك الجديد بنجاح فوري!');
          
          // Replace optimistic store with the real one returned from server
          setStores(prev => 
            prev.map(s => s.id === tempId ? { ...s, id: data.storeId, isOptimistic: false } : s)
          );

          // Auto-fade success message after 4 seconds
          setTimeout(() => setSuccessMessage(null), 4000);
       } else {
          const err = await res.json();
          // Remove from list since registration failed
          setStores(prev => prev.filter(s => s.id !== tempId));
          setErrorMessage(err.error || 'خطأ في إضافة المتجر، الرجاء التحقق من البيانات.');
       }
     } catch (error) {
       setStores(prev => prev.filter(s => s.id !== tempId));
       setErrorMessage('خطأ في الاتصال، تعذر تأكيد إنشاء الحساب.');
       console.error(error);
     } finally {
       setIsSubmitting(false);
     }
  };

  const handleDeleteClick = (store: any) => {
    setStoreToDelete(store);
  };

  const handleToggleSuspend = async (store: any) => {
    if (store.id === 'default' || store.isOptimistic) return;
    const nextSuspended = !store.suspended;

    // Optimistic flip
    setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, suspended: nextSuspended } : s)));
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/stores/${store.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ suspended: nextSuspended }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'تعذر تحديث حالة المتجر');
      }
      setSuccessMessage(nextSuspended ? `تم إيقاف متجر "${store.storeName}" مؤقتاً` : `تم إعادة تفعيل متجر "${store.storeName}"`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      // Roll back on failure
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, suspended: store.suspended } : s)));
      setErrorMessage(error.message || 'خطأ في الاتصال أثناء تحديث حالة المتجر');
    }
  };

  const openResetModal = (store: any) => {
    if (store.id === 'default' || store.isOptimistic) return;
    setResetTarget(store);
    setResetPasswordInput('');
    setErrorMessage(null);
    setResetPasswordResult(null);
  };

  const submitResetPassword = async () => {
    const store = resetTarget;
    if (!store) return;

    // A blank field tells the server to auto-generate; a filled field (8+ chars)
    // sets it manually.
    const manual = resetPasswordInput.trim();
    if (manual && manual.length < 8) {
      setErrorMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setResettingStoreId(store.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    setResetPasswordResult(null);

    try {
      const res = await fetch(`/api/admin/stores/${store.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(manual ? { password: manual } : {})
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر إعادة تعيين كلمة المرور');
      }

      setResetPasswordResult({ username: data.username, password: data.newPassword });
      setSuccessMessage('تم إعادة تعيين كلمة المرور بنجاح');
      setResetTarget(null);
      setResetPasswordInput('');
    } catch (error: any) {
      setErrorMessage(error.message || 'خطأ في الاتصال أثناء إعادة تعيين كلمة المرور');
    } finally {
      setResettingStoreId(null);
    }
  };

  const handleCopyResetPassword = async () => {
    if (!resetPasswordResult) return;
    const text = `username: ${resetPasswordResult.username}\npassword: ${resetPasswordResult.password}`;
    await navigator.clipboard.writeText(text);
    setSuccessMessage('تم نسخ بيانات الدخول الجديدة');
  };

  const handleConfirmDelete = async () => {
    if (!storeToDelete) return;

    const idToRemove = storeToDelete.id;
    // Optimistically remove from list
    const originalStores = [...stores];
    setStores(prev => prev.filter(s => s.id !== idToRemove));
    setStoreToDelete(null);

    try {
      const res = await fetch(`/api/admin/stores/${idToRemove}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.ok) {
        setSuccessMessage('تم حذف المتجر بنجاح');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'خطأ في عملية الحذف');
        // Rollback
        setStores(originalStores);
      }
    } catch (error) {
      setErrorMessage('خطأ في الاتصال أثناء محاولة الحذف');
      setStores(originalStores);
      console.error(error);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 relative">
      
      {/* Notifications Bar */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-2xl border border-green-200 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-bold text-sm">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-2xl border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-bold text-sm">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {resetPasswordResult && (
        <div className="mb-4 p-4 bg-blue-50 text-blue-900 rounded-2xl border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-sm font-bold">
            <div className="mb-1">بيانات الدخول الجديدة</div>
            <div className="font-mono text-xs bg-white/70 border border-blue-100 rounded-xl px-3 py-2" dir="ltr">
              username: {resetPasswordResult.username}<br />
              password: {resetPasswordResult.password}
            </div>
          </div>
          <button
            onClick={handleCopyResetPassword}
            className="self-start md:self-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
          >
            <Copy className="w-4 h-4" />
            نسخ
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
           <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-2">
             <Users className="w-6 h-6 text-primary-main" />
             إدارة المشتركين
           </h2>
           <p className="text-gray-500">يمكنك إضافة وإدارة متاجر العملاء من هنا بشكل فوري.</p>
        </div>
        <button 
          onClick={() => setIsAddingMode(!isAddingMode)}
          className="bg-primary-main hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-primary-main/10"
        >
          <Plus className="w-5 h-5" />
          مستفيد جديد
        </button>
      </div>

      {isAddingMode && (
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <div>
             <label className="block text-xs font-bold text-gray-500 mb-2">اسم المتجر</label>
             <input type="text" value={newStore.storeName} onChange={e => setNewStore({...newStore, storeName: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main" placeholder="مثال: أسواق السلام" />
           </div>
           <div>
             <label className="block text-xs font-bold text-gray-500 mb-2">اسم المستخدم للعميل</label>
             <input type="text" value={newStore.username} onChange={e => setNewStore({...newStore, username: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main" dir="ltr" placeholder="username" />
           </div>
           <div>
             <label className="block text-xs font-bold text-gray-500 mb-2">كلمة مرور العميل</label>
             <input type="text" value={newStore.password} onChange={e => setNewStore({...newStore, password: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main" dir="ltr" placeholder="123456" />
           </div>
           <div className="flex items-end">
             <button onClick={handleCreate} disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold p-3 rounded-xl transition-colors h-[48px]">
               {isSubmitting ? 'جاري الإضافة الإلکترونية...' : 'إنشاء حساب عميل'}
             </button>
           </div>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-xl">
         <table className="w-full text-sm text-right text-gray-600">
           <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-200">
             <tr>
               <th className="px-4 py-3 text-right">المتجر</th>
               <th className="px-4 py-3 text-right">حساب الدخول</th>
               <th className="px-4 py-3 text-center">المنتجات</th>
               <th className="px-4 py-3 text-left">إجراء</th>
             </tr>
           </thead>
           <tbody>
             {stores.length > 0 ? stores.map(store => {
               const storeUrl = `${window.location.origin}/store/${store.id}`;
               return (
                 <tr key={store.id} className={`border-b last:border-0 border-gray-100 hover:bg-gray-50/50 transition-colors ${store.isOptimistic ? 'opacity-60 bg-green-50/30' : ''}`}>
                   <td className="px-4 py-4 font-bold text-gray-900">
                     <div className="flex items-center gap-2">
                       <Store className={`w-4 h-4 ${store.suspended ? 'text-amber-500' : 'text-gray-400'}`} />
                       <span className={store.suspended ? 'text-gray-400' : ''}>{store.storeName}</span>
                       {store.suspended && (
                         <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">موقوف</span>
                       )}
                       {store.isOptimistic && (
                         <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-normal">جاري المزامنة...</span>
                       )}
                     </div>
                   </td>
                   <td className="px-4 py-4 font-mono text-xs">
                     <span className="bg-gray-100 px-2 py-1 rounded text-gray-600" dir="ltr">username: {store.username}</span>
                     <span className="block mt-2 text-[11px] text-gray-400 font-sans">كلمة المرور لا تعرض بعد الإنشاء</span>
                   </td>
                   <td className="px-4 py-4 text-center font-bold">
                     <div className="bg-blue-50 text-blue-700 inline-block px-3 py-1 rounded-full text-xs">
                        {store.productsCount} منتج
                     </div>
                   </td>
                   <td className="px-4 py-4 text-left">
                     <div className="flex items-center justify-end gap-2">
                       <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary-main bg-gray-50 hover:bg-primary-50 p-2 rounded-lg transition-colors" title="رابط المتجر">
                         <LinkIcon className="w-4 h-4" />
                       </a>
                       <button
                         onClick={() => handleToggleSuspend(store)}
                         disabled={store.id === 'default' || store.isOptimistic}
                         className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                           store.suspended
                             ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                             : 'text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100'
                         }`}
                         title={store.suspended ? 'إعادة تفعيل المتجر' : 'إيقاف المتجر مؤقتاً'}
                       >
                         {store.suspended ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                       </button>
                       <button
                         onClick={() => openResetModal(store)}
                         disabled={store.id === 'default' || store.isOptimistic || resettingStoreId === store.id}
                         className="text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed p-2 rounded-lg transition-colors"
                         title={store.id === 'default' ? 'لا يمكن إعادة ضبط حساب القائد من هنا' : 'إعادة تعيين كلمة المرور'}
                       >
                         <KeyRound className={`w-4 h-4 ${resettingStoreId === store.id ? 'animate-pulse' : ''}`} />
                       </button>
                       <button onClick={() => handleDeleteClick(store)} className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </td>
                 </tr>
               );
             }) : (
               <tr>
                 <td colSpan={4} className="text-center py-8 text-gray-400 font-medium">لا يوجد عملاء مسجلين</td>
               </tr>
             )}
           </tbody>
         </table>
      </div>

      {/* Reset password modal: manual entry or suggest-strong */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              إعادة تعيين كلمة المرور
            </h3>
            <p className="text-gray-500 text-sm mb-5">
              لمتجر <span className="font-extrabold text-gray-900">"{resetTarget.storeName}"</span>. اكتب كلمة مرور جديدة، أو اتركها فارغة لتوليد واحدة تلقائياً.
            </p>

            <label className="block text-xs font-bold text-gray-500 mb-2">كلمة المرور الجديدة (اختياري)</label>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main font-mono text-sm"
                dir="ltr"
                placeholder="اتركها فارغة للتوليد التلقائي"
              />
              <button
                type="button"
                onClick={() => setResetPasswordInput(generateStrongPassword(16))}
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 rounded-xl font-bold flex items-center gap-2 transition-colors shrink-0 text-sm"
                title="اقتراح كلمة مرور قوية"
              >
                <Wand2 className="w-4 h-4" />
                <span className="hidden sm:inline">اقتراح قوية</span>
              </button>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setResetTarget(null); setResetPasswordInput(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={submitResetPassword}
                disabled={resettingStoreId === resetTarget.id}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                {resettingStoreId === resetTarget.id ? 'جاري الحفظ...' : 'تأكيد إعادة التعيين'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elegant Custom Confirmation Modal for deletion */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-slide-up">
            <h3 className="text-lg font-black text-gray-900 mb-2">تأكيد حذف المتجر</h3>
            <p className="text-gray-500 text-sm mb-6">
              هل أنت متأكد من رغبتك في حذف متجر <span className="font-extrabold text-gray-900">"{storeToDelete.storeName}"</span>؟ 
              جميع المنتجات والبيانات والزيارات المرتبطة بهذا المتجر سيتم إزالتها فورياً ولا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setStoreToDelete(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                تراجع وإلغاء
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                نعم، احذف المتجر
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
