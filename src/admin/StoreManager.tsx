import { useState, useEffect } from 'react';
import { Users, Trash2, Plus, Store, Link as LinkIcon } from 'lucide-react';

export default function StoreManager() {
  const [stores, setStores] = useState<any[]>([]);
  const [newStore, setNewStore] = useState({ username: '', password: '', storeName: '' });
  const [isAddingMode, setIsAddingMode] = useState(false);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/admin/all-stores', { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (res.ok) {
         setStores(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  useEffect(() => { fetchStores(); }, []);

  const handleCreate = async () => {
     if (!newStore.username || !newStore.password || !newStore.storeName) {
       alert("الرجاء تعبئة جميع الحقول");
       return;
     }

     try {
       const res = await fetch('/api/admin/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStore)
       });
       if (res.ok) {
          alert('تم إضافة المتجر بنجاح');
          setNewStore({ username: '', password: '', storeName: '' });
          setIsAddingMode(false);
          fetchStores();
       } else {
          const err = await res.json();
          alert(err.error || 'خطأ في إضافة المتجر');
       }
     } catch (error) {
       alert('خطأ في الاتصال');
       console.error(error);
     }
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المتجر؟ جميع بياناته ومنتجاته ستحذف نهائياً.')) {
      try {
        const res = await fetch(`/api/admin/stores/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        if (res.ok) {
          fetchStores();
        } else {
          const err = await res.json();
          alert(err.error || 'خطأ في عملية الحذف');
        }
      } catch (error) {
        alert('خطأ في الاتصال');
        console.error(error);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
           <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-2">
             <Users className="w-6 h-6 text-primary-main" />
             إدارة المشتركين
           </h2>
           <p className="text-gray-500">يمكنك إضافة وإدارة متاجر العملاء من هنا.</p>
        </div>
        <button 
          onClick={() => setIsAddingMode(!isAddingMode)}
          className="bg-primary-main hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          مستفيد جديد
        </button>
      </div>

      {isAddingMode && (
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
           <div>
             <label className="block text-xs font-bold text-gray-500 mb-2">اسم المتجر</label>
             <input type="text" value={newStore.storeName} onChange={e => setNewStore({...newStore, storeName: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main" placeholder="أسواق السلام" />
           </div>
           <div>
             <label className="block text-xs font-bold text-gray-500 mb-2">اسم المستخدم للعميل</label>
             <input type="text" value={newStore.username} onChange={e => setNewStore({...newStore, username: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main" dir="ltr" placeholder="store_xyz" />
           </div>
           <div>
             <label className="block text-xs font-bold text-gray-500 mb-2">كلمة مرور العميل</label>
             <input type="text" value={newStore.password} onChange={e => setNewStore({...newStore, password: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main" dir="ltr" placeholder="123456" />
           </div>
           <div className="flex items-end">
             <button onClick={handleCreate} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold p-3 rounded-xl transition-colors h-[48px]">إنشاء حساب عميل</button>
           </div>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-xl">
         <table className="w-full text-sm text-right text-gray-600">
           <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-200">
             <tr>
               <th className="px-4 py-3 text-right">المتجر</th>
               <th className="px-4 py-3 text-right">بيانات الدخول</th>
               <th className="px-4 py-3 text-center">المنتجات</th>
               <th className="px-4 py-3 text-left">إجراء</th>
             </tr>
           </thead>
           <tbody>
             {stores.length > 0 ? stores.map(store => {
               const storeUrl = `${window.location.origin}/store/${store.id}`;
               return (
                 <tr key={store.id} className="border-b last:border-0 border-gray-100 hover:bg-gray-50/50 transition-colors">
                   <td className="px-4 py-4 font-bold text-gray-900">
                     <div className="flex items-center gap-2">
                       <Store className="w-4 h-4 text-gray-400" />
                       {store.storeName}
                     </div>
                   </td>
                   <td className="px-4 py-4 font-mono text-xs">
                     <span className="bg-gray-100 px-2 py-1 rounded text-gray-600" dir="ltr">يوزر: {store.username}</span>
                     <span className="bg-gray-100 px-2 py-1 rounded text-gray-600 mr-2" dir="ltr">باس: {store.password}</span>
                   </td>
                   <td className="px-4 py-4 text-center font-bold">
                     <div className="bg-blue-50 text-blue-700 inline-block px-3 py-1 rounded-full text-xs">
                        {store.productsCount} منتج
                     </div>
                   </td>
                   <td className="px-4 py-4 text-left">
                     <div className="flex items-center justify-end gap-2">
                       <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary-main bg-gray-50 hover:bg-primary-50 p-2 rounded-lg transition-colors title='رابط المتجر'">
                         <LinkIcon className="w-4 h-4" />
                       </a>
                       <button onClick={() => handleDelete(store.id)} className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors">
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
    </div>
  );
}
