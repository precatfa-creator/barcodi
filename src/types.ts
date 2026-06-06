/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  category: string;
  description: string;
  imageEmoji: string; // fallback high quality emoji
  imageUrl?: string;  // optional real image URL
  stock?: number;
  calories?: number;
  weight?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AppSettings {
  isTestMode: boolean;
  language?: 'ar' | 'en';
}

export interface StoreSettings {
  name: string;
  logoUrl: string | null;
  visits?: number;
}

