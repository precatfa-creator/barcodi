/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from '../types';

export const STORE_CATEGORIES = [
  { id: 'all', name: 'الكل', emoji: '🏬' },
  { id: 'bakery', name: 'المخبوزات', emoji: '🍞' },
  { id: 'produce', name: 'الخضار والفواكه', emoji: '🍎' },
  { id: 'dairy', name: 'الألبان والأجبان', emoji: '🥛' },
  { id: 'groceries', name: 'البقالة والمعلبات', emoji: '🥫' },
  { id: 'snacks', name: 'الحلويات والتسالي', emoji: '🍫' },
  { id: 'beverages', name: 'المشروبات العصائر', emoji: '🥤' },
  { id: 'cleaning', name: 'العناية والمنظفات', emoji: '🧼' }
];

export const PRODUCTS_DATABASE: Product[] = [
  // Bakery
  {
    id: '1',
    name: 'خبز التوست الأبيض المميز',
    barcode: '628110010012',
    price: 4.50,
    category: 'bakery',
    description: 'توست أبيض طري ومحضر يومياً، مثالي لوجبة الفطور والسندوتشات الصحية.',
    imageEmoji: '🍞',
    weight: '600 جرام',
    calories: 260
  },
  {
    id: '2',
    name: 'كرواسون زبدة فرنسي (٤ قطع)',
    barcode: '628110010029',
    price: 12.00,
    category: 'bakery',
    description: 'كرواسون فرنسي هش غني بالزبدة الطبيعية، يخبز طازجاً في أفراننا.',
    imageEmoji: '🥐',
    weight: '240 جرام',
    calories: 380
  },
  {
    id: '3',
    name: 'صامولي فاخر بالسمسم (٦ قطع)',
    barcode: '101', // Short code for testing
    price: 3.00,
    category: 'bakery',
    description: 'خبز صامولي كلاسيكي هش مزين بالسمسم المحمص الطازج.',
    imageEmoji: '🥖',
    weight: '350 جرام',
    calories: 280
  },

  // Produce
  {
    id: '4',
    name: 'تفاح أحمر سكري طازج',
    barcode: '628110020011',
    price: 8.95,
    category: 'produce',
    description: 'تفاح أحمر مستورد من أجود المزارع، غني بالألياف ومقرمش ولذيذ.',
    imageEmoji: '🍎',
    weight: '1 كجم',
    calories: 52
  },
  {
    id: '5',
    name: 'موز فيليبيني فاخر درجة أولى',
    barcode: '102', // Short code for testing
    price: 5.50,
    category: 'produce',
    description: 'موز طازج ومغذي مليء بالبوتاسيوم والطاقة الحيوية للنشاط اليومي.',
    imageEmoji: '🍌',
    weight: '1 كجم',
    calories: 89
  },
  {
    id: '6',
    name: 'طماطم بلدي طازجة',
    barcode: '628110020035',
    price: 4.25,
    category: 'produce',
    description: 'طماطم حمراء ناضجة ومباشرة من مزارعنا المحلية، غنية بالليكوبين.',
    imageEmoji: '🍅',
    weight: '1 كجم',
    calories: 18
  },

  // Dairy & Cheese
  {
    id: '7',
    name: 'حليب كامل الدسم عضوي',
    barcode: '103', // Short code for testing
    price: 7.00,
    category: 'dairy',
    description: 'حليب بقري طبيعي ١٠٠٪ معقم وبدون مواد حافظة ومصدر ممتاز للكالسيوم.',
    imageEmoji: '🥛',
    weight: '1 لتر',
    calories: 62
  },
  {
    id: '8',
    name: 'جبنة موزاريلا مبشورة طبيعية',
    barcode: '628110030027',
    price: 14.50,
    category: 'dairy',
    description: 'جبنة موزاريلا بقري غنية وقابلة للتمدد بشكل ممتاز فوق المعجنات والبيتزا.',
    imageEmoji: '🧀',
    weight: '200 جرام',
    calories: 300
  },
  {
    id: '9',
    name: 'زبادي يوناني كامل الدسم',
    barcode: '628110030034',
    price: 4.00,
    category: 'dairy',
    description: 'زبادي يوناني مكثف غني بالبروتين والقوام الكريمي الفاخر.',
    imageEmoji: '🍦',
    weight: '150 جرام',
    calories: 120
  },

  // Groceries
  {
    id: '10',
    name: 'أرز بسمتي أبيض طويل',
    barcode: '104', // Short code for testing
    price: 68.00,
    category: 'groceries',
    description: 'أرز بسمتي عنبر هندي فاخر، نقي مميز بطوله ونكهته الطبيعية العطرة.',
    imageEmoji: '🌾',
    weight: '5 كجم',
    calories: 130
  },
  {
    id: '11',
    name: 'زيت زيتون بكر ممتاز معصور بارد',
    barcode: '628110040026',
    price: 32.50,
    category: 'groceries',
    description: 'زيت زيتون بكر فاخر من أول قطفة صحي ومثالي لجميع أطباقك اللذيذة.',
    imageEmoji: '🫒',
    weight: '500 مل',
    calories: 884
  },
  {
    id: '12',
    name: 'صلصة طماطم كلاسيكية غنية',
    barcode: '628110040033',
    price: 2.75,
    category: 'groceries',
    description: 'معجون طماطم منقى ناعم لإعطاء أطباقك طعماً ولوناً رائعين.',
    imageEmoji: '🥫',
    weight: '135 جرام',
    calories: 82
  },

  // Snacks & Sweets
  {
    id: '13',
    name: 'شوكولاتة داكنة بالبندق ٧٠٪',
    barcode: '105', // Short code for testing
    price: 9.50,
    category: 'snacks',
    description: 'شوكولاتة بلجيكية داكنة غنية بمضادات الأكسدة مع قطع البندق المحمص المقرمش.',
    imageEmoji: '🍫',
    weight: '100 جرام',
    calories: 540
  },
  {
    id: '14',
    name: 'رقائق البطاطس بالملح البحري',
    barcode: '628110050025',
    price: 5.75,
    category: 'snacks',
    description: 'شيبس بطاطس مقرمش ومحمر بلطف بزيت عباد الشمس الخفيف والملح الطبيعي.',
    imageEmoji: '🥔',
    weight: '120 جرام',
    calories: 520
  },

  // Beverages
  {
    id: '15',
    name: 'عصير برتقال طبيعي مع اللب',
    barcode: '106', // Short code for testing
    price: 6.50,
    category: 'beverages',
    description: 'عصير برتقال طبيعي معصور طازجاً ومحفوظ ببرودة لحماية الفيتامينات والنشاط.',
    imageEmoji: '🍊',
    weight: '1 لتر',
    calories: 45
  },
  {
    id: '16',
    name: 'مياه معدنية نقية مستدامة',
    barcode: '628110060024',
    price: 1.50,
    category: 'beverages',
    description: 'مياه صالحة للشرب مستخرجة من آبار طبيعية ومعالجة بأعلى جودة للاستدامة.',
    imageEmoji: '💧',
    weight: '500 مل',
    calories: 0
  },

  // Cleaning & Personal Care
  {
    id: '17',
    name: 'صابون سائل لليدين برائحة المندرين',
    barcode: '107', // Short code for testing
    price: 18.00,
    category: 'cleaning',
    description: 'صابون رغوي معقم لليدين يحافظ على رطوبتها بعطر اليوسفي المنعش.',
    imageEmoji: '🧴',
    weight: '400 مل',
    calories: undefined
  },
  {
    id: '18',
    name: 'مسحوق غسيل كلاسيكي مركز',
    barcode: '628110070023',
    price: 49.00,
    category: 'cleaning',
    description: 'منظف فعال فائق التركيز لإزالة البقع العنيدة من أول رشة ويمنح رائحة فواحة للغسيل.',
    imageEmoji: '🧼',
    weight: '2.5 كجم',
    calories: undefined
  }
];

export function lookupProductByBarcode(barcode: string): Product | undefined {
  const cleanBarcode = barcode.trim();
  return PRODUCTS_DATABASE.find(
    (product) => product.barcode === cleanBarcode || product.id === cleanBarcode
  );
}
