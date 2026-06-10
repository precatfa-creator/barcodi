/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, lazy, Suspense } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, Info, ClipboardCheck, ArrowRight, Sparkles, AlertTriangle, X, Download, Loader2, CheckCircle2, Barcode as BarcodeIcon } from 'lucide-react';
import { CartItem } from '../types';

// react-barcode is only rendered inside the "approve invoice" modal, so load it
// lazily instead of shipping it in the initial bundle. jspdf and html-to-image
// are imported dynamically inside generatePDF (see below) for the same reason.
const ReactBarcode = lazy(() => import('react-barcode'));

interface CartTabProps {
  cart: CartItem[];
  onUpdateQty: (prodId: string, quantity: number) => void;
  onRemoveItem: (prodId: string) => void;
  onClearCart: () => void;
  onNavigateToScan: () => void;
  storeName?: string;
}

export function CartTab({
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onNavigateToScan,
  storeName = 'أسواق النخبة',
}: CartTabProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printInvoiceRef = useRef<HTMLDivElement>(null);

  const handleApprove = () => {
    // Generate a random unique 9-digit ID for the invoice
    setInvoiceId('INV-' + Math.floor(100000000 + Math.random() * 900000000).toString());
    setShowApproveModal(true);
  };

  const generatePDF = async () => {
    if (!printInvoiceRef.current) return;
    setIsGeneratingPdf(true);
    try {
      // Load the heavy PDF/image libraries only when the user actually exports.
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);

      const imgData = await toPng(printInvoiceRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top right',
        }
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => (img.onload = resolve));
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Full image height scaled to the page width (keeps aspect ratio).
      const pdfHeight = (img.height * pdfWidth) / img.width;

      // Slice the tall invoice across as many pages as needed. Each page shows
      // the same image shifted up by one page height, so long carts no longer
      // get clipped at the bottom of page one.
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      // Clean, Arabic dynamic filename based on store name
      const safeStoreName = storeName.trim().replace(/\s+/g, '_');
      pdf.save(`فاتورة_مشتريات_${safeStoreName}.pdf`);
    } catch (error) {
      console.error('Error generating PDF', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const subTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.03)]" id="empty-cart-view">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-pale to-primary-light border-4 border-white flex items-center justify-center text-primary-dark mb-6 shadow-sm">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">سلتك التقديرية فارغة</h3>
        <p className="text-[13px] text-gray-600 max-w-[240px] leading-relaxed mb-8">
          لم تقم بإضافة أي منتجات للسلة بعد. يرجى مسح الباركود الخاص بالمنتج لتسجيله هنا.
        </p>
        <button
          onClick={onNavigateToScan}
          className="bg-primary-dark hover:bg-gray-900 active:scale-95 text-white font-bold text-sm py-4 px-8 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>ابدأ بمسح المنتجات الآن</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in" id="cart-tab-root">
      {/* Top control panel */}
      <div className="flex items-center justify-between px-1" id="cart-list-controls">
        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
          سلة المشتريات
          <span className="bg-primary-pale text-primary-dark px-2.5 py-1 rounded-full text-xs font-bold font-mono shadow-inner border border-primary-light/30">
            {totalItemsCount}
          </span>
        </h3>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="text-xs text-rose-600 hover:text-white font-bold flex items-center gap-1.5 bg-rose-50 hover:bg-rose-500 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm border border-rose-100 hover:border-rose-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>إفراغ السلة</span>
        </button>
      </div>

      {/* Main Glassmorphic Table Container */}
      <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_12px_40px_-10px_rgba(53,133,142,0.15)] overflow-hidden flex flex-col pt-2 pb-1">

        {/* Table Header */}
        <div className="grid grid-cols-[2.2fr_0.8fr_1.6fr_1.2fr_0.6fr] gap-2 px-3 py-3 bg-white/40 border-b border-gray-200/50 text-[11px] font-bold text-gray-500">
          <div>الصنف</div>
          <div className="text-center">السعر</div>
          <div className="text-center">الكمية</div>
          <div className="text-left pl-1">الإجمالي</div>
          <div></div>
        </div>

        {/* Table Rows */}
        <div className="flex flex-col divide-y divide-gray-100/60 font-sans">
          {cart.map((item) => (
            <div key={item.product.id} className="grid grid-cols-[2.2fr_0.8fr_1.6fr_1.2fr_0.6fr] gap-2 px-3 py-3.5 items-center transition-colors hover:bg-white/60 group">
              
              {/* Product Info */}
              <div className="flex items-center gap-2 min-w-0 pr-1">
                <span className="hidden xs:flex text-lg bg-white/60 p-1.5 rounded-xl border border-white shrink-0 shadow-sm">
                  {item.product.imageEmoji}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-[11px] text-gray-900 line-clamp-2 leading-snug">
                    {item.product.name}
                  </div>
                  {item.product.weight && !item.product.weight.includes('قطعة') && (
                    <div className="text-[9px] text-gray-400 mt-0.5">{item.product.weight}</div>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="text-center font-mono text-[11px] font-bold text-gray-500">
                {item.product.price}
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-center">
                <div className="flex items-center bg-white/80 border border-white shadow-sm rounded-lg p-0.5">
                  <button
                    onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
                    className="w-5.5 h-5.5 rounded flex items-center justify-center text-gray-500 hover:bg-rose-50 hover:text-rose-600 active:bg-gray-200 transition-colors cursor-pointer"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="text-[11px] font-bold font-mono min-w-[16px] text-center text-gray-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
                    className="w-5.5 h-5.5 rounded flex items-center justify-center text-gray-500 hover:bg-primary-pale hover:text-primary-dark active:bg-gray-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* Item Total */}
              <div className="text-left font-mono font-bold text-[12px] text-primary-dark pl-1">
                {(item.product.price * item.quantity).toFixed(2)}
              </div>
              
              {/* Delete Button */}
              <div className="flex justify-end pl-1">
                <button
                  onClick={() => onRemoveItem(item.product.id)}
                  className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors focus:opacity-100 cursor-pointer"
                  title="حذف هذا الصنف من السلة"
                  aria-label="حذف"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer / Aggregates */}
        <div className="bg-gradient-to-br from-primary-pale/30 to-primary-light/20 border-t border-gray-200/50 p-5 mt-auto">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="font-black text-gray-900 text-sm">إجمالي السلة التقديري</span>
              <div className="text-left font-mono">
                <span className="text-2xl font-black text-primary-dark">{subTotal.toFixed(2)}</span>
                <span className="text-xs font-bold text-gray-500 mr-1.5 font-sans">د.ل</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-4 flex gap-3 items-start shadow-[0_4px_20px_rgba(0,0,0,0.02)] mt-1">
        <ClipboardCheck className="w-5 h-5 text-primary-dark shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-600 leading-relaxed text-right font-medium">
          هذه السلة تقديرية لمساعدتك في حساب إجمالياتك ومراقبة أسعار المنتجات. لإتمام عملية الشراء نرجو التوجه لنقاط البيع الذاتية أو الكاشير.
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full mt-2">
        <button
          onClick={handleApprove}
          className="w-full bg-primary-dark hover:bg-gray-900 text-white font-bold text-sm py-4 px-4 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>اعتماد الفاتورة (للكاشير)</span>
        </button>
        <div className="flex gap-2 w-full">
          <button
            onClick={onNavigateToScan}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-800 font-bold text-sm py-3 px-4 rounded-2xl transition-all shadow-sm border border-gray-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>إضافة المزيد</span>
          </button>
          <button
            onClick={generatePDF}
            disabled={isGeneratingPdf}
            className="flex-1 bg-white hover:bg-gray-50 text-primary-dark font-bold text-sm py-3 px-4 rounded-2xl transition-all shadow-sm border border-primary-light flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>حفظ الفاتورة</span>
          </button>
        </div>
      </div>

      {/* Offscreen Beautiful Printable Invoice */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
        <div 
          ref={printInvoiceRef} 
          className="bg-white p-10 w-[680px] text-right font-sans border border-gray-100" 
          style={{ direction: 'rtl', fontFamily: '"Cairo", sans-serif' }}
        >
          {/* Top colored accent with brand */}
          <div className="-mx-10 -mt-10 mb-8 px-10 py-3 bg-gradient-to-l from-[#35858E] to-[#7DA78C] flex items-center justify-between">
            <span className="text-white font-black text-lg tracking-wide" style={{ direction: 'ltr' }}>Barcodi</span>
            <span className="text-white/85 text-[11px] font-bold">باركودي · قارئ الأسعار الذكي</span>
          </div>

          {/* Invoice Header */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                🏪 {storeName}
              </h1>
              <p className="text-gray-500 text-xs font-semibold">الفرع الرئيسي • طرابلس، ليبيا</p>
              <p className="text-gray-400 text-[10px]">نظام الخدمة الذاتية • هاتف: 091-0000000</p>
            </div>

            <div className="text-left">
              <span className="inline-block bg-[#35858E]/10 text-[#35858E] font-black text-xs px-3.5 py-1 rounded-md mb-3">
                فاتورة مشتريات تقديرية
              </span>
              <div className="text-[10px] text-gray-500 space-y-0.5 font-mono">
                <div>رقم الفاتورة: <span className="font-bold text-gray-800">#INV-{new Date().getFullYear()}-{Math.floor(100000 + Math.random() * 900000)}</span></div>
                <div>التاريخ: <span className="font-bold text-gray-800">{new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span></div>
                <div>الوقت: <span className="font-bold text-gray-800">{new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit', hour12: true })}</span></div>
              </div>
            </div>
          </div>

          {/* Table of items */}
          <table className="w-full text-right border-collapse text-xs mb-8">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200 text-gray-600 font-extrabold">
                <th className="py-2.5 px-3 text-center w-8">#</th>
                <th className="py-2.5 px-2">الصنف</th>
                <th className="py-2.5 px-2 text-center w-24">سعر الوحدة</th>
                <th className="py-2.5 px-2 text-center w-16">الكمية</th>
                <th className="py-2.5 px-3 text-left w-24">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cart.map((item, index) => (
                <tr key={item.product.id} className="text-gray-700">
                  <td className="py-3 px-3 text-center font-bold text-gray-400">{index + 1}</td>
                  <td className="py-3 px-2">
                    <span className="ml-2 text-sm">{item.product.imageEmoji}</span>
                    <span className="font-bold text-gray-900">{item.product.name}</span>
                    {item.product.weight && !item.product.weight.includes('قطعة') && (
                      <span className="text-[9px] text-gray-400 block mt-0.5">{item.product.weight}</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-mono">{item.product.price.toFixed(2)} د.ل</td>
                  <td className="py-3 px-2 text-center font-bold text-gray-800">{item.quantity}</td>
                  <td className="py-3 px-3 text-left font-mono font-bold text-[#35858E]">
                    {(item.product.price * item.quantity).toFixed(2)} د.ل
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals section */}
          <div className="flex justify-between items-start pt-6 border-t border-gray-200 mb-8">
            <div className="w-1/2 space-y-2">
              <h4 className="font-bold text-gray-800 text-xs">إرشادات سريعة:</h4>
              <ul className="text-[10px] text-gray-500 leading-relaxed list-disc list-inside space-y-1">
                <li>هذه الفاتورة تمثل سلتك الافتراضية للخدمة الذاتية.</li>
                <li>تساعدك هذه الورقة في تتبع ومراجعة إجمالي السلة المالي بكل سهولة.</li>
                <li>لتتم المحاسبة والشراء الفعلي، يرجى التوجه لنقاط البيع الذاتية أو الكاشير المعتمد.</li>
              </ul>
            </div>
            <div className="w-5/12 space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>أصناف السلة:</span>
                <span className="font-bold text-gray-800">{cart.length} أصناف</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>إجمالي القطع:</span>
                <span className="font-bold text-gray-800">{totalItemsCount} قطع</span>
              </div>
              <div className="flex justify-between text-gray-500 pb-2 border-b border-gray-100">
                <span>ضريبة القيمة المضافة (0%):</span>
                <span className="font-bold text-gray-800 font-mono">0.00 د.ل</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2">
                <span className="text-xs font-black text-gray-900">الإجمالي النهائي التقديري:</span>
                <span className="text-base font-black text-[#35858E] font-mono">{subTotal.toFixed(2)} د.ل</span>
              </div>
            </div>
          </div>

          {/* Barcode and closure message */}
          <div className="flex flex-col items-center justify-center text-center border-t border-gray-100 pt-8 mt-10">
            {/* Elegant simulated retail barcode */}
            <div className="flex items-center gap-[1.5px] h-10 mb-2 bg-white px-2">
              {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 1, 2, 3, 1, 4, 1, 2, 3, 1, 2, 4, 2, 1, 2, 1].map((width, i) => (
                <div key={i} className="bg-gray-800 h-full" style={{ width: `${width}px` }} />
              ))}
            </div>
            <div className="text-[10px] font-mono text-gray-400 tracking-[0.3em] mb-4">
              *NKHBA-INV-{Date.now().toString().slice(-6)}*
            </div>
            <h3 className="text-sm font-black text-gray-800 mb-1">شكراً لزيارتكم {storeName}!</h3>
            <p className="text-[10px] text-gray-400">يسعدنا دائماً خدمتكم وتوفير أفضل تجربة تسوق</p>
            <p className="text-[10px] text-gray-400 mt-3 pt-3 border-t border-gray-100 w-full">
              مدعوم بواسطة <span className="font-black text-[#35858E]" style={{ direction: 'ltr' }}>Barcodi</span> — باركودي
            </p>
          </div>
        </div>
      </div>

      {/* Approve Invoice Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowApproveModal(false)} />
          <div className="relative w-full max-w-[340px] bg-white backdrop-blur-xl border border-white rounded-[2rem] p-8 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.3)] animate-scale-up text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-emerald-500 mb-4 shadow-sm border border-emerald-100">
              <BarcodeIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">اعتماد الفاتورة</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              يرجى مسح الباركود التالي من خلال جهاز الكاشير (POS) لسحب الأصناف وإتمام الدفع.
            </p>
            
            <div className="bg-white p-4 rounded-xl border-2 border-gray-100 flex justify-center items-center mb-6 shadow-inner pointer-events-none min-h-[112px]" dir="ltr">
              <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-gray-300" />}>
                <ReactBarcode value={invoiceId} width={2} height={80} displayValue={true} background="#ffffff" lineColor="#1f2937" margin={0} />
              </Suspense>
            </div>

            <button
              onClick={() => setShowApproveModal(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm py-3 px-4 rounded-xl transition-all cursor-pointer block"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowClearConfirm(false)} />
          <div className="relative w-full max-w-[300px] bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-[0_12px_40px_-10px_rgba(225,29,72,0.3)] animate-scale-up text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500 mb-4 shadow-sm border border-rose-100">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">إفراغ السلة</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في إفراغ سلتك بالكامل؟ لا يمكن التراجع عن هذه الخطوة.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-600 font-bold text-xs py-3 px-4 rounded-xl transition-all border border-gray-200"
              >
                تراجع
              </button>
              <button
                onClick={() => {
                  onClearCart();
                  setShowClearConfirm(false);
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-sm"
              >
                تأكيد الإفراغ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
