import { useState, useEffect } from 'react';
import { Search, Layers, Box, Tag, DollarSign, BarChart2 } from 'lucide-react';

interface ProductWithStore {
  id: string;
  name: string;
  barcode: string;
  price: number;
  category: string;
  imageEmoji: string;
  description: string;
  storeName: string;
  storeId: string;
}

export default function CommanderProductAudit() {
  const [stores, setStores] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<ProductWithStore[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStore, setSelectedStore] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch('/api/admin/all-stores', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load stores');

        const storesList = (await res.json()).filter((store: any) => store.id !== 'default');
        const joinedProducts: ProductWithStore[] = [];
        storesList.forEach((store: any) => {
          if (Array.isArray(store.products)) {
            store.products.forEach((prod: any) => {
              joinedProducts.push({
                ...prod,
                storeId: store.id,
                storeName: store.storeName || 'متجر غير مسمى',
              });
            });
          }
        });

        setStores(storesList);
        setAllItems(joinedProducts);
      } catch (error) {
        console.warn("ProductAudit load failed:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, []);

  // Filter products
  const filteredProducts = allItems.filter(prod => {
    const sName = prod.storeName.toLowerCase();
    const pName = prod.name.toLowerCase();
    const barcode = prod.barcode.toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = sName.includes(query) || pName.includes(query) || barcode.includes(query);
    const matchesCategory = selectedCategory === 'All' || prod.category === selectedCategory;
    const matchesStore = selectedStore === 'All' || prod.storeId === selectedStore;

    return matchesSearch && matchesCategory && matchesStore;
  });

  // Extract categoric lists
  const categories = ['All', ...Array.from(new Set(allItems.map(p => p.category).filter(Boolean)))];

  // Calculate pricing metrics
  const avgPrice = filteredProducts.length > 0 
    ? (filteredProducts.reduce((sum, p) => sum + (p.price || 0), 0) / filteredProducts.length).toFixed(2)
    : '0.00';
  
  const maxPrice = filteredProducts.length > 0
    ? Math.max(...filteredProducts.map(p => p.price || 0)).toFixed(2)
    : '0.00';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500" dir="rtl">
        <Layers className="w-10 h-10 text-primary-main animate-spin mb-4" />
        <p className="font-bold text-sm">جاري تجميع وفهرسة بضائع المشتركين النشطة...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100" dir="rtl">
      
      {/* Header instructions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="text-right">
          <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-2.5">
            <Box className="w-6 h-6 text-primary-main shrink-0" />
            مراقبة وتفتيش السلع المشتركة
          </h2>
          <p className="text-gray-500 text-sm font-medium">
            تصفح وفحص كامل منتجات وأسعار المشتركين بالمنصة بلحظتها لكشف مخالفات التسعير أو الحسابات.
          </p>
        </div>

        <div className="bg-primary-pale text-primary-dark rounded-2xl px-5 py-3 font-black text-xs text-center border border-primary-light/30">
          📍 إجمالي السلع المفهرسة: {allItems.length} صنف متاح
        </div>
      </div>

      {/* Filter and stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-right">
          <span className="block text-xs text-gray-400 font-bold mb-1">أصناف الفحص الفعلي</span>
          <span className="text-2xl font-black text-gray-900">{filteredProducts.length}</span>
        </div>
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-right">
          <span className="block text-xs text-gray-400 font-bold mb-1">متوسط السعر المعروض</span>
          <span className="text-2xl font-black text-emerald-600 font-sans">{avgPrice} د.ل</span>
        </div>
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-right">
          <span className="block text-xs text-gray-400 font-bold mb-1">صنف القيمة العليا</span>
          <span className="text-2xl font-black text-indigo-600 font-sans">{maxPrice} د.ل</span>
        </div>
      </div>

      {/* Control filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        {/* Search */}
        <div className="relative">
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث بالباركود، اسم السلعة، أو العميل..." 
            className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main text-xs font-semibold"
          />
          <Search className="w-4 h-4 text-gray-450 absolute right-3.5 top-3.5" />
        </div>

        {/* Store filter */}
        <select 
          value={selectedStore}
          onChange={e => setSelectedStore(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main text-xs font-black"
        >
          <option value="All">جميع المتاجر النشطة</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.storeName}</option>
          ))}
        </select>

        {/* Category filter */}
        <select 
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-main text-xs font-black"
        >
          <option value="All">جميع فئات السلع</option>
          {categories.filter(c => c !== 'All').map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

      </div>

      {/* Grid result table */}
      <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner">
        <table className="w-full text-sm text-right text-gray-600">
          <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-4 text-right font-black">الصنف والباركود</th>
              <th className="px-5 py-4 text-right font-black">المتجر الحاضن</th>
              <th className="px-5 py-4 text-right font-black">فئة السلعة</th>
              <th className="px-5 py-4 text-left font-black">السعر</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? filteredProducts.map((prod, idx) => (
              <tr key={idx} className="border-b last:border-0 border-gray-100 hover:bg-gray-50/50 transition-colors">
                
                {/* Product spec */}
                <td className="px-5 py-4 font-bold text-gray-900">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl bg-gray-50 p-1.5 rounded-lg border border-gray-100 shrink-0">{prod.imageEmoji || '📦'}</span>
                    <div className="text-right">
                      <span className="block text-gray-800 text-xs font-black">{prod.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono" dir="ltr">{prod.barcode}</span>
                    </div>
                  </div>
                </td>

                {/* Subscribed store name */}
                <td className="px-5 py-4 text-xs font-bold text-indigo-650">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    {prod.storeName}
                  </div>
                </td>

                {/* Category tag */}
                <td className="px-5 py-4">
                  <span className="bg-gray-100 text-gray-600 font-sans font-black text-[10px] px-2.5 py-1 rounded-full border border-gray-200/50">
                    {prod.category || 'عام'}
                  </span>
                </td>

                {/* Price local currency */}
                <td className="px-5 py-4 text-left font-black text-emerald-600 font-sans text-sm">
                  {prod.price} د.ل
                </td>

              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400 font-bold text-xs">
                  لا توجد أصناف أو نتائج تطابق مرشحات البحث الحالية.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
