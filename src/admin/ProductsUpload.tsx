import { useState, useRef, ChangeEvent, useMemo, useEffect } from 'react';
import { Upload, FileSpreadsheet, Package, CheckCircle2, AlertTriangle, Download, Plus, Trash2, Search, ChevronRight, ChevronLeft, Edit } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../AppContext';
import { Product } from '../types';

export default function ProductsUpload() {
  const { products, setProducts } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', barcode: '', price: 0 });
  const ITEMS_PER_PAGE = 50;

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, products.length]);

  const handleSaveProduct = () => {
    if (!newProduct.name || !newProduct.barcode || newProduct.price === undefined) {
       alert("الرجاء تعبئة الاسم والباركود والسعر");
       return;
    }
    
    if (editingId) {
       const updatedProducts = products.map(p => {
          if (p.id === editingId) {
             return {
                ...p,
                name: newProduct.name || '',
                barcode: newProduct.barcode || '',
                price: Number(newProduct.price) || 0,
             } as Product;
          }
          return p;
       });
       setProducts(updatedProducts);
    } else {
       const p: Product = {
           id: Date.now().toString(),
           name: newProduct.name || '',
           barcode: newProduct.barcode || '',
           price: Number(newProduct.price) || 0,
           category: newProduct.category || 'general',
           description: newProduct.description || '',
           imageEmoji: newProduct.imageEmoji || '📦',
           stock: newProduct.stock,
       };
       setProducts([...products, p]);
    }
    
    setIsAddingMode(false);
    setEditingId(null);
    setNewProduct({ name: '', barcode: '', price: 0 });
  };

  const handleEditProduct = (p: Product) => {
    setIsAddingMode(true);
    setEditingId(p.id);
    setNewProduct({
      name: p.name,
      barcode: p.barcode,
      price: p.price,
      description: p.description,
      category: p.category,
      stock: p.stock,
      imageEmoji: p.imageEmoji
    });
  };

  const handleDeleteProduct = (id: string) => {
    if(confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleDeleteAll = () => {
    if(confirm('هل أنت متأكد من حذف جميع المنتجات؟ هذا الإجراء لا يمكن التراجع عنه.')) {
        setProducts([]);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        name: 'منتج تجريبي (احذف هذا السطر)',
        barcode: '123456789012',
        price: 15.5,
        category: 'snacks',
        description: 'وصف المنتج التجريبي',
        imageEmoji: '📦',
        stock: 100,
        calories: 250,
        weight: '50g'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'المنتجات');
    XLSX.writeFile(workbook, 'قالب_المنتجات.xlsx');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setError(null);
    if (!selected) return;
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);
        
        const parsedProducts: Product[] = json.map((row: any, index: number) => ({
          id: row['id']?.toString() || `uploaded_${Date.now()}_${index}`,
          name: row['name'] || 'منتج غير معروف',
          barcode: row['barcode']?.toString() || '',
          price: Number(row['price']) || 0,
          category: row['category'] || 'general',
          description: row['description'] || '',
          imageEmoji: row['imageEmoji'] || '📦',
          imageUrl: row['imageUrl'] || undefined,
          stock: row['stock'] ? Number(row['stock']) : undefined,
          calories: row['calories'] ? Number(row['calories']) : undefined,
          weight: row['weight']?.toString(),
        }));

        setPreview(parsedProducts);
      } catch (err) {
        console.error(err);
        setError('حدث خطأ أثناء قراءة الملف. تأكد من أن الملف هو ملف Excel صالح بصفحة واحدة وتنسيق صحيح للكتابة.');
      }
    };
    reader.readAsBinaryString(selected);
  };

  const handleConfirmUpload = () => {
    if (preview.length > 0) {
      // Merge with existing products by barcode
      const existingProducts = [...products];
      let newCount = 0;
      let updatedCount = 0;

      preview.forEach((uploadedP) => {
        const existingIdx = existingProducts.findIndex((p) => p.barcode === uploadedP.barcode && p.barcode !== '');
        if (existingIdx !== -1) {
          // Update
          existingProducts[existingIdx] = { ...existingProducts[existingIdx], ...uploadedP, id: existingProducts[existingIdx].id }; // preserve original id
          updatedCount++;
        } else {
          // Add
          existingProducts.push(uploadedP);
          newCount++;
        }
      });

      setProducts(existingProducts);
      setFile(null);
      setPreview([]);
      alert(`تم بنجاح. منتجات جديدة: ${newCount}، منتجات محدثة: ${updatedCount}.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">إدارة المنتجات</h2>
            <p className="text-gray-500 text-sm">عدد المنتجات الحالية: {products.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center mb-6">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
        />
        <div className="flex flex-col items-center justify-center">
          <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">قم برفع ملف المنتجات</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            يمكنك رفع ملف إكسل <span dir="ltr">(.xlsx)</span> يحتوي على الأعمدة:
            <span dir="ltr" className="block text-xs bg-white border mt-2 p-2 rounded-md">
              name, barcode, price, category, description, imageEmoji...
            </span>
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>اختر ملف إكسل</span>
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>تحميل القالب</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl flex items-center gap-3 mb-6 border border-rose-100">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {preview.length > 0 && (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>تم العثور على {preview.length} منتج في الملف</span>
            </h3>
            <button
              onClick={handleConfirmUpload}
              className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-lg font-bold hover:bg-indigo-700 transition-colors"
            >
              اعتماد التحديثات
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-4 bg-white">
            <table className="w-full text-sm text-right text-gray-600">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2">الاسم</th>
                  <th className="px-4 py-2">الباركود</th>
                  <th className="px-4 py-2">السعر</th>
                  <th className="px-4 py-2">الفئة</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((p, idx) => (
                  <tr key={idx} className="border-b last:border-0 border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{p.imageEmoji} {p.name}</td>
                    <td className="px-4 py-2" dir="ltr">{p.barcode}</td>
                    <td className="px-4 py-2 font-bold">{p.price}</td>
                    <td className="px-4 py-2">{p.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && (
              <p className="text-center text-xs text-gray-400 mt-4">...و {preview.length - 50} منتجات أخرى</p>
            )}
          </div>
        </div>
      )}

      {/* Existing Products Management */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 flex-1">
             <div className="relative flex-1 max-w-md">
               <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="ابحث بالاسم أو الباركود..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-10 focus:ring-2 focus:ring-primary-main outline-none"
               />
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button
               onClick={() => setIsAddingMode(!isAddingMode)}
               className="bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
               <Plus className="w-4 h-4" />
               إضافة يدوية
            </button>
            <button
               onClick={handleDeleteAll}
               className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
               <Trash2 className="w-4 h-4" />
               حذف الكل
            </button>
          </div>
        </div>

        {isAddingMode && (
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
             <div>
               <label className="block text-xs font-bold text-gray-500 mb-1">الاسم</label>
               <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="اسم المنتج" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-500 mb-1">الباركود</label>
               <input type="text" value={newProduct.barcode} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} className="w-full p-2 border rounded-lg" dir="ltr" placeholder="123456" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-500 mb-1">السعر</label>
               <input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full p-2 border rounded-lg" dir="ltr" placeholder="0.00" />
             </div>
             <div className="flex items-end gap-2">
               <button onClick={handleSaveProduct} className="flex-1 bg-primary-main hover:bg-primary-dark text-white font-bold p-2 text-sm rounded-lg h-[42px] transition-colors">{editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}</button>
               {editingId && (
                 <button onClick={() => { setIsAddingMode(false); setEditingId(null); setNewProduct({ name: '', barcode: '', price: 0 }); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold p-2 text-sm rounded-lg h-[42px] transition-colors">إلغاء</button>
               )}
             </div>
          </div>
        )}

        <div className="overflow-x-auto border border-gray-200 rounded-xl">
           <table className="w-full text-sm text-right text-gray-600">
             <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-200">
               <tr>
                 <th className="px-4 py-3 text-right">الاسم</th>
                 <th className="px-4 py-3 text-right">الباركود</th>
                 <th className="px-4 py-3 text-right">السعر</th>
                 <th className="px-4 py-3 text-left">إجراء</th>
               </tr>
             </thead>
             <tbody>
               {paginatedProducts.length > 0 ? paginatedProducts.map(p => (
                 <tr key={p.id} className="border-b last:border-0 border-gray-100 hover:bg-gray-50/50 transition-colors">
                   <td className="px-4 py-3 font-medium text-gray-900">{p.imageEmoji} {p.name}</td>
                   <td className="px-4 py-3 font-mono text-xs" dir="ltr">{p.barcode}</td>
                   <td className="px-4 py-3 font-bold text-primary-main">{p.price}</td>
                   <td className="px-4 py-3 text-left">
                     <div className="flex items-center justify-end gap-2">
                       <button onClick={() => handleEditProduct(p)} className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors">
                         <Edit className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleDeleteProduct(p.id)} className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </td>
                 </tr>
               )) : (
                 <tr>
                   <td colSpan={4} className="text-center py-8 text-gray-400 font-medium">لا توجد منتجات مسجلة</td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 border-t border-gray-100 pt-6">
             <p className="text-sm text-gray-500 font-medium">الصفحة {currentPage} من {totalPages}</p>
             <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:bg-gray-50"
                  title="السابق"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-50 disabled:bg-gray-50"
                  title="التالي"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
