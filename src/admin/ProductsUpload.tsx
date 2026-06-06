import { useState, useRef, ChangeEvent, useMemo, useEffect, type DragEvent } from 'react';
import { Upload, FileSpreadsheet, Package, CheckCircle2, AlertTriangle, Download, Plus, Trash2, Search, ChevronRight, ChevronLeft, Edit, X } from 'lucide-react';
import { readSheet } from 'read-excel-file/browser';
import { useAppContext } from '../AppContext';
import { Product } from '../types';

type ProductImportRow = Record<string, string | number | undefined>;

const cellToValue = (value: unknown): string | number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const escapeXml = (value: string | number | undefined) => {
  const text = value === undefined ? '' : String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const columnName = (index: number) => {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const dateToDosTime = (date: Date) => ({
  time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
});

const createZip = (files: { name: string; content: string }[]) => {
  const encoder = new TextEncoder();
  const now = dateToDosTime(new Date());
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const checksum = crc32(contentBytes);

    const localHeader = new ArrayBuffer(30 + nameBytes.length);
    const localView = new DataView(localHeader);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, now.time, true);
    localView.setUint16(12, now.date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    new Uint8Array(localHeader, 30).set(nameBytes);

    localParts.push(new Uint8Array(localHeader), contentBytes);

    const centralHeader = new ArrayBuffer(46 + nameBytes.length);
    const centralView = new DataView(centralHeader);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, now.time, true);
    centralView.setUint16(14, now.date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    new Uint8Array(centralHeader, 46).set(nameBytes);

    centralParts.push(new Uint8Array(centralHeader));
    offset += localHeader.byteLength + contentBytes.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new ArrayBuffer(22);
  const endView = new DataView(endRecord);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);

  return new Blob([...localParts, ...centralParts, new Uint8Array(endRecord)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

const downloadXlsx = (rows: ProductImportRow[], filename: string) => {
  const headers = Object.keys(rows[0]);
  const sheetRows = [headers, ...rows.map((row) => headers.map((header) => row[header]))]
    .map((row, rowIndex) => {
      const cells = row.map((value, colIndex) => {
        const ref = `${columnName(colIndex)}${rowIndex + 1}`;
        if (typeof value === 'number') {
          return `<c r="${ref}"><v>${value}</v></c>`;
        }
        return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
      }).join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');

  const dimension = `A1:${columnName(headers.length - 1)}${rows.length + 1}`;
  const files = [
    {
      name: '[Content_Types].xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="products" sheetId="1" r:id="rId1"/></sheets>' +
        '</workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<dimension ref="${dimension}"/>` +
        '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
        '<sheetFormatPr defaultRowHeight="15"/>' +
        `<sheetData>${sheetRows}</sheetData>` +
        '</worksheet>',
    },
  ];

  const blob = createZip(files);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

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

  // Non-blocking UI alert and confirm states
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [isDraggingExcel, setIsDraggingExcel] = useState(false);

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
       setErrorInfo("الرجاء تعبئة الاسم والباركود والسعر");
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
       setSuccessInfo("تم تعديل المنتج بنجاح!");
       setTimeout(() => setSuccessInfo(null), 3000);
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
       setSuccessInfo("تم إضافة المنتج بنجاح!");
       setTimeout(() => setSuccessInfo(null), 3000);
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
    const p = products.find(prod => prod.id === id);
    if (p) {
      setProductToDelete(p);
    }
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      setProducts(products.filter(p => p.id !== productToDelete.id));
      setSuccessInfo(`تم حذف المنتج "${productToDelete.name}" بنجاح`);
      setTimeout(() => setSuccessInfo(null), 3000);
      setProductToDelete(null);
    }
  };

  const handleDeleteAll = () => {
    setShowConfirmDeleteAll(true);
  };

  const confirmDeleteAll = () => {
    setProducts([]);
    setSuccessInfo("تم إفراغ جميع المنتجات بنجاح");
    setTimeout(() => setSuccessInfo(null), 3000);
    setShowConfirmDeleteAll(false);
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
    downloadXlsx(templateData, 'قالب_المنتجات.xlsx');
  };

  const processExcelFile = (selected: File) => {
    setError(null);

    if (!/\.(xlsx|xls)$/i.test(selected.name)) {
      setError('الرجاء رفع ملف Excel فقط بصيغة .xlsx أو .xls');
      return;
    }

    setFile(selected);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        if (!(data instanceof ArrayBuffer)) {
          throw new Error('Invalid file data');
        }

        const rows = await readSheet(data);
        if (rows.length < 2) {
          throw new Error('Workbook has no product rows');
        }
        const headers: string[] = [];
        rows[0].forEach((cell, index) => {
          headers[index] = String(cellToValue(cell) || '').trim();
        });

        const json: ProductImportRow[] = [];
        rows.slice(1).forEach((row) => {
          const item: ProductImportRow = {};
          headers.forEach((header, colNumber) => {
            if (!header) return;
            item[header] = cellToValue(row[colNumber]);
          });
          if (Object.values(item).some((value) => value !== undefined && value !== '')) {
            json.push(item);
          }
        });
        
        const parsedProducts: Product[] = json.map((row, index) => ({
          id: row['id']?.toString() || `uploaded_${Date.now()}_${index}`,
          name: row['name']?.toString() || 'منتج غير معروف',
          barcode: row['barcode']?.toString() || '',
          price: Number(row['price']) || 0,
          category: row['category']?.toString() || 'general',
          description: row['description']?.toString() || '',
          imageEmoji: row['imageEmoji']?.toString() || '📦',
          imageUrl: row['imageUrl']?.toString() || undefined,
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
    reader.readAsArrayBuffer(selected);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processExcelFile(selected);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingExcel(false);
    const selected = e.dataTransfer.files?.[0];
    if (!selected) return;
    processExcelFile(selected);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingExcel(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDraggingExcel(false);
    }
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
      setSuccessInfo(`تم الاستيراد بنجاح! منتجات جديدة: ${newCount}، منتجات محدثة: ${updatedCount}.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 relative">
      
      {/* Non-blocking feedback messages */}
      {successInfo && (
        <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-2xl border border-green-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-bold text-sm">{successInfo}</span>
          </div>
          <button onClick={() => setSuccessInfo(null)} className="text-green-600 hover:text-green-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorInfo && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-2xl border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-bold text-sm">{errorInfo}</span>
          </div>
          <button onClick={() => setErrorInfo(null)} className="text-red-600 hover:text-red-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Elegant Custom Confirmation Modal for a single product */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-2">تأكيد حذف المنتج</h3>
            <p className="text-gray-500 text-sm mb-6">
              هل أنت متأكد من رغبتك في حذف المنتج <span className="font-extrabold text-gray-900">"{productToDelete.name}"</span>؟ سيتم حذفه من قاعدة البيانات فوراً.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setProductToDelete(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                تراجع وإلغاء
              </button>
              <button 
                onClick={confirmDeleteProduct}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                نعم، احذف المنتج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elegant Custom Confirmation Modal for ALL products */}
      {showConfirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-black text-rose-700 mb-2">تنبيه: حذف جميع المنتجات!</h3>
            <p className="text-gray-500 text-sm mb-6">
              هل أنت متأكد تماماً من رغبتك في حذف <span className="font-extrabold text-rose-700">جميع المنتجات دفعة واحدة</span>؟ هذا الإجراء سوف يفرغ كامل الكتالوج ولا يمكن استرجاع المنتجات المحذوفة لاحقاً.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowConfirmDeleteAll(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                تراجع وإلغاء
              </button>
              <button 
                onClick={confirmDeleteAll}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                نعم، امسح كل شيء
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-2xl p-8 text-center mb-6 transition-colors ${
          isDraggingExcel
            ? 'bg-indigo-50 border-indigo-400'
            : 'bg-gray-50 border-gray-300'
        }`}
      >
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
        />
        <div className="flex flex-col items-center justify-center">
          <FileSpreadsheet className={`w-12 h-12 mb-4 ${isDraggingExcel ? 'text-indigo-600' : 'text-gray-400'}`} />
          <h3 className="text-lg font-bold text-gray-900 mb-2">قم برفع ملف المنتجات</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            اسحب ملف الإكسل وأفلته هنا، أو اختره يدوياً من الزر بالأسفل. يدعم النظام ملفات <span dir="ltr">.xlsx</span> و <span dir="ltr">.xls</span>.
            <span dir="ltr" className="block text-xs bg-white border mt-2 p-2 rounded-md">
              name, barcode, price, category, description, imageEmoji...
            </span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>رفع ملف إكسل</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>تحميل قالب Excel (.xlsx)</span>
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
