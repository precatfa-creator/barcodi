/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, ArrowRight, CornerDownLeft, Info, RefreshCw, Flame, Barcode } from 'lucide-react';
import { Product } from '../types';
import { STORE_CATEGORIES } from '../data/products';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  currentCartQty: number; // to see if product already there
  onDismiss: () => void;
  // Store-level purchase-list toggle: when false the card is a pure price
  // display with no quantity/cart controls.
  cartEnabled?: boolean;
}

export function ProductCard({
  product,
  onAddToCart,
  currentCartQty,
  onDismiss,
  cartEnabled = true,
}: ProductCardProps) {
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [product]);

  const handleIncrement = () => setQty(prev => Math.min(prev + 1, 99));
  const handleDecrement = () => setQty(prev => Math.max(prev - 1, 1));

  const dept = STORE_CATEGORIES.find(c => c.id === product.category);

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-[2xl] border border-white p-5 shadow-[0_12px_40px_-5px_rgba(53,133,142,0.15)] relative animate-scale-up" id="product-card-root">
      {/* Upper Navigation Row */}
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-1.5 bg-white/60 text-primary-dark text-[11px] font-bold px-3 py-1.5 rounded-full border border-white shadow-sm">
          <span>{dept?.emoji || '🏷️'}</span>
          <span>قسم {dept?.name || 'المنتجات'}</span>
        </span>
        
        <button
          onClick={onDismiss}
          className="text-[10px] text-gray-500 hover:text-gray-900 bg-white hover:bg-white/80 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors border border-white/60 shadow-sm"
          id="btn-dismiss-product-view"
        >
          <span>عد للمسح</span>
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        </button>
      </div>

      {/* Main product presentation */}
      <div className="flex flex-col items-center text-center">
        {/* Giant premium emoji display */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-pale to-primary-light border-[4px] border-white flex items-center justify-center text-4xl mb-3 shadow-sm pr-1">
          {product.imageEmoji}
        </div>

        <h2 className="text-lg font-black text-gray-900 px-2 line-clamp-2 leading-snug tracking-tight mb-1">
          {product.name}
        </h2>
        
        <span className="text-[10px] font-mono font-medium text-gray-400 bg-white/50 px-2 py-0.5 rounded-md">
          باركود: {product.barcode}
        </span>

        {/* Big styled price tag */}
        <div className="mt-4 flex items-baseline gap-1" id="product-details-price">
          <span className="text-3xl font-black text-primary-dark font-mono tracking-tight">
            {(product.price * qty).toFixed(2)}
          </span>
          <span className="text-sm font-black text-gray-800">د.ل</span>
          {qty > 1 && (
            <span className="text-[11px] text-gray-500 font-mono mr-2 bg-white/60 px-2 py-0.5 rounded-md border border-white">
              ({product.price.toFixed(2)} د.ل/للوحدة)
            </span>
          )}
        </div>

        {/* Nutritional or specification details */}
        {(product.weight || product.calories) && (
          <div className="flex items-center gap-3 mt-4 bg-white/60 rounded-xl px-3 py-2 border border-white shadow-sm text-[11px]">
            {product.weight && (
               <span className="text-gray-700 flex items-center gap-1 font-medium">
                <span className="font-black text-gray-900">الوزن:</span> {product.weight}
              </span>
            )}
            {product.weight && product.calories && (
              <span className="w-px h-3 bg-gray-300" />
            )}
            {product.calories && (
              <span className="text-gray-700 flex items-center gap-1 font-mono font-medium">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="font-sans font-black text-gray-900">السعرات:</span> {product.calories} كالو
              </span>
            )}
          </div>
        )}

        {/* Description line */}
        <p className="text-[10px] font-medium text-gray-500 leading-relaxed mt-2.5 max-w-sm px-2">
          {product.description}
        </p>

        {/* Quantity editor controller */}
        {cartEnabled && (
        <div className="w-full border-t border-gray-200/50 mt-4 pt-4" id="qty-selector-panel">
          <span className="text-[11px] font-bold text-gray-600 block mb-2.5">حدد كمية الشراء:</span>
          {currentCartQty > 0 && (
            <span className="text-[10px] text-primary-dark font-black bg-primary-pale/70 border border-primary-light/30 px-2 py-1 rounded-lg inline-block mb-2">
              موجود في السلة حالياً: {currentCartQty}
            </span>
          )}
          <div className="flex items-center justify-center gap-4 max-w-[160px] mx-auto bg-white/60 border border-white shadow-sm p-1 rounded-2xl">
            <button
              onClick={handleDecrement}
              className="w-9 h-9 rounded-xl bg-white active:scale-95 border border-white flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all font-bold hover:shadow-sm"
              id="btn-decrement-qty"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-black text-gray-900 font-mono min-w-8" id="current-qty-badge">
              {qty}
            </span>
            <button
              onClick={handleIncrement}
              className="w-9 h-9 rounded-xl bg-white active:scale-95 border border-white flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all font-bold hover:shadow-sm"
              id="btn-increment-qty"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        )}

        {/* Main interactive action: add to cart, or back to scanning when the
            store runs in price-checker mode (cart disabled) */}
        {cartEnabled ? (
          <button
            onClick={() => {
              onAddToCart(product, qty);
            }}
            className={`w-full text-white font-bold text-xs py-3.5 px-6 rounded-2xl mt-4 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
              currentCartQty > 0
                ? 'bg-gray-900 hover:bg-black shadow-[0_4px_15px_rgba(0,0,0,0.2)]'
                : 'bg-primary-dark hover:bg-primary-main shadow-[0_4px_15px_rgba(53,133,142,0.3)]'
            }`}
            id="btn-add-product-to-cart"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>
              {currentCartQty > 0 ? 'إضافة الكمية للسلة' : 'تأكيد وإضافة للسلة'}
            </span>
          </button>
        ) : (
          <button
            onClick={onDismiss}
            className="w-full text-white font-bold text-xs py-3.5 px-6 rounded-2xl mt-4 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer bg-primary-dark hover:bg-primary-main shadow-[0_4px_15px_rgba(53,133,142,0.3)]"
            id="btn-continue-scanning"
          >
            <Barcode className="w-4 h-4" />
            <span>متابعة المسح</span>
          </button>
        )}
      </div>
    </div>
  );
}
