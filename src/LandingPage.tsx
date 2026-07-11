import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Store,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Smartphone,
  MessageCircle,
  Check,
  ShoppingCart,
  ArrowDown,
  Wallet,
  PackageCheck,
  Camera,
  Plus,
  Minus,
  Sparkles,
  Infinity as InfinityIcon,
  Timer,
  FileSpreadsheet,
  SlidersHorizontal,
  Zap,
  FlipHorizontal,
  ChefHat,
  Barcode,
  Flame,
} from 'lucide-react';

// Reveal elements with the `reveal` class as they scroll into view. Pure
// IntersectionObserver — no animation library, keeps the public bundle light.
function useScrollReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (elements.length === 0) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

const WHATSAPP_NUMBER = '218945953967';

function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Small uppercase label with a brand dot — the recurring section eyebrow.
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-primary-dark to-primary-light" />
      {children}
    </span>
  );
}

// Slim phone chassis shared by the hero demo and the in-app screens gallery.
// Real handset proportions: modern iPhones (incl. iPhone 17) run a ~19.5:9
// display, so the screen area is locked to that ratio instead of collapsing
// to whatever height the content happens to have.
function PhoneFrame({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-[280px] max-w-full rounded-[3rem] bg-gray-950 p-2 shadow-[0_30px_70px_-20px_rgba(16,42,46,0.45)] ring-1 ring-gray-800">
        <div className="rounded-[2.5rem] overflow-hidden bg-[#f3f6f2] relative aspect-[9/19.5]">
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-gray-950 z-20" />
          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-gray-900/25 z-20" />
          {/* Stretch the single screen child to fill the full display */}
          <div className="absolute inset-0 flex flex-col [&>*]:flex-1">{children}</div>
        </div>
      </div>
      {label && <span className="text-xs font-bold text-gray-500">{label}</span>}
    </div>
  );
}

// The signature hero moment: a phone endlessly looping the real product flow —
// laser scan over a Nutella barcode, then the price card with the Pro plan's
// AI recipe suggestions. Two phases driven by a simple timer.
function LiveScanDemo() {
  const [phase, setPhase] = useState<'scanning' | 'found'>('scanning');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('found');
      return;
    }
    let mounted = true;
    let timer: number;
    const next = (current: 'scanning' | 'found') => {
      if (!mounted) return;
      setPhase(current);
      timer = window.setTimeout(() => next(current === 'scanning' ? 'found' : 'scanning'), current === 'scanning' ? 3000 : 4200);
    };
    next('scanning');
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <PhoneFrame>
      <div className="pt-11 pb-6 px-4 bg-gradient-to-b from-[#eef4ee] via-[#f6f8f0] to-[#eaf1e6] flex flex-col gap-3" dir="rtl">
        {/* Store header, as the shopper sees it */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary-dark text-white flex items-center justify-center">
              <Store className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-gray-800">سوق النخبة — فرع المدينة</span>
          </div>
          <span className="text-[9px] font-bold bg-white text-primary-dark border border-primary-light/40 px-2 py-0.5 rounded-full">مباشر</span>
        </div>

        {phase === 'scanning' ? (
          /* Full-bleed camera view, exactly like the real scanner screen */
          <div className="flex-1 -mx-4 -mb-5 relative bg-gray-950 overflow-hidden animate-fade-in">
            {/* Simulated shelf blur behind the reticle */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#3d3428_0%,#171a16_60%)]" />
            {/* Barcode being scanned */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg px-3 py-2 flex flex-col items-center gap-1">
              <div className="flex items-end gap-[2px] h-8">
                {[3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2].map((w, i) => (
                  <span key={i} className="bg-gray-900 h-full" style={{ width: `${w}px` }} />
                ))}
              </div>
              <span className="text-[8px] font-mono text-gray-700 tracking-widest">8000500179864</span>
            </div>
            {/* Reticle + laser, straight from the real scanner */}
            <div className="absolute left-[9%] right-[9%] top-1/2 h-[34%] -translate-y-1/2 rounded-2xl border-2 border-primary-light/90 shadow-[0_0_0_999px_rgba(0,0,0,0.45)] pointer-events-none" />
            <div className="absolute left-0 right-0 h-[3px] bg-emerald-400 shadow-[0_0_20px_#10b981,0_0_8px_#10b981] animate-laser pointer-events-none z-10" style={{ top: '0%' }} />
            <p className="relative z-10 mt-5 px-4 text-[10px] text-white/90 text-center font-medium">وجّه الباركود داخل الإطار الأخضر</p>
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl text-[8px] font-bold text-white flex items-center justify-center gap-1.5 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              المسح التلقائي مفعّل — جارٍ التعرّف على المنتج
              <Camera className="w-3 h-3 text-white/70" />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center gap-2.5 animate-scale-up">
            {/* Product card, mirroring the in-app layout */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white p-4 shadow-[0_12px_40px_-5px_rgba(53,133,142,0.18)] flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-pale to-primary-light border-[3px] border-white flex items-center justify-center text-2xl mb-2 shadow-sm">
                🍫
              </div>
              <h4 className="text-[13px] font-black text-gray-900 leading-snug">نوتيلا — كريمة البندق بالكاكاو ٣٥٠غ</h4>
              <span className="text-[8px] font-mono text-gray-400 bg-white/60 px-2 py-0.5 rounded-md mt-1">باركود: 8000500179864</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-primary-dark font-mono tracking-tight">12.50</span>
                <span className="text-[11px] font-black text-gray-800">د.ل</span>
              </div>
              <button className="mt-3 w-full bg-primary-dark text-white text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" />
                أضِف إلى السلة
              </button>
            </div>

            {/* AI suggestion — the Pro add-on, shown in its natural habitat */}
            <div className="rounded-2xl border border-primary-light/50 bg-gradient-to-l from-primary-pale/80 to-white p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-primary-dark" />
                <span className="text-[10px] font-black text-primary-dark">اقتراح ذكي — وصفات بهذا المنتج</span>
                <span className="mr-auto text-[8px] font-bold bg-primary-dark text-white px-1.5 py-0.5 rounded-md">إضافة احترافية</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['كريب محشو بالبندق', 'تشيز كيك بارد', 'ميلك شيك بالشوكولاتة'].map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-[9px] font-bold px-2 py-1 rounded-full">
                    <ChefHat className="w-3 h-3 text-primary-dark" />
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

// Floating page scroller — jump to top / bottom with smooth scrolling.
function ScrollArrows() {
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setAtTop(y < 320);
      setAtBottom(y + window.innerHeight >= document.documentElement.scrollHeight - 160);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const btn =
    'w-11 h-11 rounded-full border border-gray-200 bg-white/90 backdrop-blur-md text-gray-700 shadow-[0_10px_30px_rgba(0,0,0,0.12)] flex items-center justify-center hover:bg-primary-dark hover:border-primary-dark hover:text-white transition-all duration-300';

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2">
      <button
        type="button"
        aria-label="الانتقال إلى أعلى الصفحة"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`${btn} ${atTop ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'}`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
      <button
        type="button"
        aria-label="الانتقال إلى أسفل الصفحة"
        onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
        className={`${btn} ${atBottom ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'}`}
      >
        <ArrowDown className="w-5 h-5" />
      </button>
    </div>
  );
}

type Benefit = {
  icon: LucideIcon;
  tile: string;
  iconClass: string;
  title: string;
  desc: string;
};

// "Why Barcodi" showcase — tab list drives a spotlight card. Auto-advances
// every 5s, pauses on hover, arrows + dots for manual navigation.
function WhyShowcase({ items }: { items: Benefit[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % items.length), 5000);
    return () => window.clearInterval(id);
  }, [paused, items.length]);

  const item = items[active];
  const goTo = (i: number) => setActive((i + items.length) % items.length);

  return (
    <div
      className="grid lg:grid-cols-[0.9fr_1.35fr] gap-4 lg:gap-6 items-stretch"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Tab rail — vertical on desktop, swipeable chips on mobile */}
      <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible -mx-6 px-6 lg:mx-0 lg:px-0 pb-2 lg:pb-0" role="tablist" aria-label="مزايا باركودي">
        {items.map((b, i) => {
          const isActive = i === active;
          return (
            <button
              key={b.title}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => goTo(i)}
              className={`relative shrink-0 lg:shrink lg:w-full text-right rounded-2xl border px-4 py-3.5 overflow-hidden transition-all duration-300 ${
                isActive
                  ? 'border-primary-dark/25 bg-white shadow-[0_14px_36px_rgba(53,133,142,0.14)]'
                  : 'border-gray-200 bg-white/60 hover:bg-white hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? 'bg-primary-dark text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <b.icon className="w-4 h-4" />
                </span>
                <span className={`text-sm font-black whitespace-nowrap lg:whitespace-normal ${isActive ? 'text-gray-950' : 'text-gray-500'}`}>
                  {b.title}
                </span>
              </span>
              {isActive && !paused && (
                <span className="absolute bottom-0 right-0 h-[3px] rounded-full bg-gradient-to-l from-primary-dark to-primary-light animate-progress" />
              )}
            </button>
          );
        })}
      </div>

      {/* Spotlight card */}
      <div className="relative rounded-[2rem] border border-gray-200 bg-white overflow-hidden shadow-[0_24px_60px_-20px_rgba(16,42,46,0.18)]">
        <div key={active} className="h-full flex flex-col animate-fade-in-up">
          <div className={`relative bg-gradient-to-br ${item.tile} px-8 pt-10 pb-8`}>
            <span className="absolute -top-4 left-4 text-[110px] leading-none font-black text-gray-950/5 font-display select-none" aria-hidden="true">
              {`0${active + 1}`}
            </span>
            <div className={`w-16 h-16 rounded-2xl ${item.iconClass} flex items-center justify-center shadow-sm`}>
              <item.icon className="w-8 h-8" />
            </div>
          </div>
          <div className="flex-1 flex flex-col p-8 pt-6 text-right">
            <h3 className="text-2xl md:text-3xl font-black text-gray-950 font-display leading-tight">{item.title}</h3>
            <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed mt-3.5">{item.desc}</p>

            <div className="mt-auto pt-8 flex items-center justify-between">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {items.map((b, i) => (
                  <button
                    key={b.title}
                    type="button"
                    tabIndex={-1}
                    onClick={() => goTo(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === active ? 'w-7 bg-primary-dark' : 'w-2 bg-gray-200 hover:bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="الميزة السابقة"
                  onClick={() => goTo(active - 1)}
                  className="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 flex items-center justify-center hover:border-primary-dark hover:text-primary-dark transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="الميزة التالية"
                  onClick={() => goTo(active + 1)}
                  className="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 flex items-center justify-center hover:border-primary-dark hover:text-primary-dark transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type BillingCycle = 'monthly' | 'semiannual' | 'yearly';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  useScrollReveal();

  const heroStats = [
    { icon: Wallet, value: 'صفر', label: 'تكلفة أجهزة القراءة' },
    { icon: Timer, value: 'لحظة', label: 'لظهور السعر' },
    { icon: InfinityIcon, value: 'بلا حدود', label: 'عدد الأصناف' },
    { icon: Smartphone, value: 'بلا تثبيت', label: 'يعمل من كاميرا الهاتف' },
  ];

  const howItWorks = [
    {
      icon: QrCode,
      title: 'امسح رمز المتجر',
      desc: 'يوجّه العميل كاميرا هاتفه إلى رمز QR المطبوع على الرفوف أو عربات التسوّق، فيُفتح متجرك فوراً دون تثبيت أي تطبيق.',
    },
    {
      icon: Camera,
      title: 'وجّه الكاميرا نحو المنتج',
      desc: 'يصوّب الكاميرا نحو باركود أي صنف، فيقرأه النظام في لحظة ويعرض الاسم والسعر والمواصفات بدقة.',
    },
    {
      icon: ShoppingCart,
      title: 'أضِف إلى السلة واحسب',
      desc: 'يضيف الأصناف إلى سلة ذكية تحسب الإجمالي التقديري فوراً، فيتسوّق بثقة ويصل إلى الكاشير دون مفاجآت. وهذه ميزة اختيارية تفعّلها أو توقفها متى شئت.',
    },
  ];

  // Ordered deliberately: economy → availability → no scatter → flexibility →
  // spreadsheets. Drives the WhyShowcase spotlight slider.
  const benefits: Benefit[] = [
    {
      icon: Wallet,
      tile: 'from-emerald-50 to-teal-50',
      iconClass: 'bg-emerald-100 text-emerald-700',
      title: 'اقتصادي وموفّر',
      desc: 'لا حاجة لشراء أجهزة قراءة باهظة أو مدّ كابلات وشبكات معقّدة وصيانتها. يوفّر متجرك آلاف الدنانير مستفيداً من هواتف يحملها عملاؤك أصلاً.',
    },
    {
      icon: Smartphone,
      tile: 'from-sky-50 to-indigo-50',
      iconClass: 'bg-sky-100 text-sky-700',
      title: 'متاح في كل مكان وزمان',
      desc: 'قارئ الأسعار في يد كل عميل لا في زاوية بعيدة من المتجر. لا طوابير أمام جهاز واحد، ولا جهاز معطّل يوقف الخدمة؛ فكل هاتف هو نقطة استعلام مستقلة.',
    },
    {
      icon: PackageCheck,
      tile: 'from-rose-50 to-orange-50',
      iconClass: 'bg-rose-100 text-rose-600',
      title: 'لا تبعثر للمنتجات',
      desc: 'يستعلم العميل عن السعر وهو أمام الرفّ مباشرة، فلا يحمل الصنف بعيداً ولا يتركه في مكان خاطئ. تنتهي فوضى الرفوف نهائياً.',
    },
    {
      icon: SlidersHorizontal,
      tile: 'from-violet-50 to-fuchsia-50',
      iconClass: 'bg-violet-100 text-violet-600',
      title: 'مرونة كاملة',
      desc: 'حدّث الأسعار في أي لحظة فتظهر للعملاء فوراً، وبدّل باقتك أو خصّص واجهة متجرك بشعارك وألوانك متى شئت.',
    },
    {
      icon: FileSpreadsheet,
      tile: 'from-amber-50 to-lime-50',
      iconClass: 'bg-amber-100 text-amber-600',
      title: 'إكسل أو جداول بيانات Google',
      desc: 'أدرِج آلاف الأصناف في ملف إكسل أو جداول بيانات Google وارفعه، فيقرأه النظام ويتجاوز الباركودات المكررة ويدمجها تلقائياً بضغطة واحدة.',
    },
  ];

  const aiFeatures = [
    {
      icon: ChefHat,
      title: 'وصفات فورية عند المسح',
      desc: 'يمسح العميل عبوة نوتيلا فيعرض له النظام وصفات شهية تدخل فيها؛ فيشتري مكوّناتها كاملة من متجرك.',
    },
    {
      icon: Sparkles,
      title: 'اقتراح منتجات مكمّلة',
      desc: 'مع كل صنف يُمسح تظهر منتجات ترافقه عادةً — شاي مع السكر، ومعكرونة مع الصلصة — فترتفع قيمة السلة.',
    },
    {
      icon: Zap,
      title: 'تنبيهات عروض لحظية',
      desc: 'يرى العميل عرض المتجر على الصنف الذي بين يديه لحظة مسحه، فيتّخذ قرار الشراء في مكانه.',
    },
  ];

  // Starter-plan billing cycles. Longer commitments price lower per month.
  const starterBilling: Record<BillingCycle, { price: string; note: string; save?: string; whatsappMsg: string }> = {
    monthly: {
      price: '499',
      note: 'دون التزام طويل — جدّد شهراً بشهر',
      whatsappMsg: 'مرحباً، أرغب في الاشتراك الشهري في باقة الانطلاق من باركودي',
    },
    semiannual: {
      price: '449',
      note: 'تُدفع 2,694 د.ل كل ستة أشهر',
      save: 'وفّر 10%',
      whatsappMsg: 'مرحباً، أرغب في الاشتراك النصف سنوي (6 أشهر) في باقة الانطلاق من باركودي',
    },
    yearly: {
      price: '399',
      note: 'تُدفع 4,788 د.ل مرة واحدة سنوياً',
      save: 'وفّر 20%',
      whatsappMsg: 'مرحباً، أرغب في الاشتراك السنوي في باقة الانطلاق من باركودي',
    },
  };

  const billingOptions: Array<{ id: BillingCycle; label: string; tag?: string }> = [
    { id: 'monthly', label: 'شهري' },
    { id: 'semiannual', label: 'كل 6 أشهر', tag: '-10%' },
    { id: 'yearly', label: 'سنوي', tag: '-20%' },
  ];

  const pricePlans = [
    {
      name: 'التجربة المجانية',
      badge: 'جرّب قبل أن تلتزم',
      price: '0',
      period: 'د.ل / حتى 7 أيام',
      priceNote: 'دون بطاقة دفع ودون أي التزام',
      priceSave: undefined as string | undefined,
      description: 'جرّب باركودي داخل متجرك بكامل مزايا باقة الانطلاق لمدة تصل إلى سبعة أيام.',
      features: [
        'كامل مزايا باقة الانطلاق دون استثناء',
        'إعداد متجرك ورمز QR خلال دقائق',
        'إلغاء تلقائي بانتهاء المدة — دون رسوم',
        'انتقل إلى الباقة المدفوعة متى شئت',
      ],
      aiAddons: [] as string[],
      popular: false,
      comingSoon: false,
      buttonText: 'ابدأ تجربتك المجانية',
      whatsappMsg: 'مرحباً، أرغب في تجربة باركودي مجاناً لمدة 7 أيام في متجري',
    },
    {
      name: 'باقة الانطلاق',
      badge: 'للمتاجر الصاعدة',
      price: starterBilling[billingCycle].price,
      period: 'د.ل / شهرياً',
      priceNote: starterBilling[billingCycle].note,
      priceSave: starterBilling[billingCycle].save,
      description: 'كل ما يحتاجه متجرك ليقدّم خدمة استعلام الأسعار الذاتية من اليوم الأول.',
      features: [
        'رمز QR مخصّص لمتجرك جاهز للطباعة',
        'رفع المنتجات عبر إكسل أو جداول بيانات Google',
        'سلة ذكية اختيارية — فعّلها أو أوقفها من لوحة التحكم',
        'تحديث الأسعار في أي وقت',
        'دعم فني عبر واتساب',
      ],
      aiAddons: [] as string[],
      popular: true,
      comingSoon: false,
      buttonText: 'ابدأ مع باقة الانطلاق',
      whatsappMsg: starterBilling[billingCycle].whatsappMsg,
    },
    {
      name: 'الباقة الاحترافية',
      badge: 'للمتاجر الكبرى والفروع',
      price: '699',
      period: 'د.ل / شهرياً',
      priceNote: undefined as string | undefined,
      priceSave: undefined as string | undefined,
      description: 'قدرات كاملة مع إضافات الذكاء الاصطناعي التي تحوّل كل عملية مسح إلى فرصة بيع.',
      features: [
        'شعار وهوية مخصّصة لمتجرك وفروعه',
        'لوحة متابعة لحظية لعدد الزوار وسلوكهم',
        'تحديث جماعي فوري للفهارس',
        'أولوية معالجة على خوادم سريعة',
        'دعم فني ذو أولوية على مدار الساعة',
      ],
      aiAddons: [
        'اقتراحات ذكية: وصفات فورية عند مسح المنتج',
        'اقتراح منتجات مكمّلة ترفع قيمة السلة',
        'تنبيهات عروض لحظية أمام الرفّ',
      ],
      popular: false,
      comingSoon: true,
      buttonText: 'متاحة قريباً',
      whatsappMsg: 'مرحباً، أرغب بأن يتم إشعاري عند إطلاق الباقة الاحترافية من باركودي',
    },
  ];

  const faqs = [
    {
      q: 'كيف يوفّر باركودي ميزانية المتجر مقارنة بالحلول التقليدية؟',
      a: 'تحتاج الحلول التقليدية إلى شراء أجهزة قراءة أسعار وتثبيتها وربطها بشبكة سلكية وخادم محلي، وهي كلفة تتجاوز آلاف الدنانير. مع باركودي لا تشتري أي جهاز؛ فهاتف العميل هو قارئ الأسعار الخاص به مباشرة عبر رمز QR.',
    },
    {
      q: 'هل يحتاج العميل إلى تثبيت أي تطبيق لاستخدامه؟',
      a: 'لا. لا يحتاج العميل إلى تثبيت شيء أو إنشاء حساب. يكفي أن يوجّه كاميرا هاتفه إلى رمز QR الخاص بمتجرك ليدخل مباشرة إلى واجهة ويب سريعة تحمل شعارك وتعمل كقارئ متطوّر عبر الكاميرا.',
    },
    {
      q: 'كيف أرفع منتجاتي إلى النظام؟',
      a: 'من لوحة التحكم تنزّل قالباً جاهزاً، تملؤه بأسماء المنتجات وأرقام الباركود والأسعار في إكسل أو جداول بيانات Google، ثم ترفعه في ثوانٍ ليصبح متجرك جاهزاً للعمل.',
    },
    {
      q: 'ما المقصود بالاقتراحات الذكية في الباقة الاحترافية؟',
      a: 'حين يمسح العميل منتجاً — عبوة نوتيلا مثلاً — يعرض له النظام وصفات يدخل فيها ذلك المنتج، ومنتجات مكمّلة تُشترى معه عادةً، وعروض المتجر عليه في تلك اللحظة. هكذا تتحوّل كل عملية استعلام عن سعر إلى فرصة بيع إضافية. الباقة الاحترافية وإضافات الذكاء الاصطناعي قيد الإطلاق حالياً وستتوفر قريباً.',
    },
    {
      q: 'كيف تعمل التجربة المجانية؟',
      a: 'تتواصل معنا عبر واتساب فنجهّز متجرك ورمز QR الخاص بك خلال دقائق، وتستخدم كامل مزايا باقة الانطلاق مجاناً لمدة تصل إلى سبعة أيام. لا نطلب بطاقة دفع، وبانتهاء المدة تختار بنفسك: الاشتراك في باقة مدفوعة أو التوقف دون أي رسوم.',
    },
    {
      q: 'هل سلة التسوق الذكية إلزامية في متجري؟',
      a: 'لا، السلة ميزة اختيارية بالكامل. من لوحة التحكم تفعّلها أو توقفها بضغطة واحدة وفق رغبة متجرك؛ فإن أوقفتها عمل باركودي كقارئ أسعار خالص يعرض السعر والمواصفات فقط، وإن فعّلتها أضاف عملاؤك الأصناف وحسبوا إجمالي جولتهم قبل الوصول إلى الكاشير.',
    },
    {
      q: 'كيف يمنع باركودي تبعثر المنتجات في الرفوف الخاطئة؟',
      a: 'في الطريقة القديمة يحمل العميل المنتج إلى قارئ الأسعار البعيد، فإذا عدل عن شرائه تركه في أقرب رفّ مسبّباً فوضى وتضارباً في الأسعار. مع باركودي يستعلم العميل عن السعر وهو واقف أمام المنتج دون أن يبرح مكانه، فينتهي هذا الخلل تماماً.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-primary-pale selection:text-primary-dark" dir="rtl">

      {/* Floating pill navigation — features first, pricing last, no plan CTA */}
      <header className="sticky top-3 z-50 px-4">
        <nav className="mx-auto max-w-5xl flex items-center justify-between gap-3 rounded-full border border-gray-200 bg-white/85 backdrop-blur-md px-3 sm:px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2.5 ps-1">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-primary-dark to-primary-main flex items-center justify-center text-white shadow-sm shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="leading-none">
              <span className="block text-base font-black tracking-tight text-gray-950 font-display">باركودي</span>
              <span className="hidden sm:block text-[10px] text-gray-400 font-bold mt-0.5">بوابة تسوّق ذاتية ذكية</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 text-sm font-bold text-gray-600">
            <a href="#how" className="px-3 py-1.5 rounded-full hover:text-gray-950 hover:bg-gray-100 transition-colors">كيف يعمل</a>
            <a href="#why" className="px-3 py-1.5 rounded-full hover:text-gray-950 hover:bg-gray-100 transition-colors">لماذا باركودي</a>
            <a href="#screens" className="px-3 py-1.5 rounded-full hover:text-gray-950 hover:bg-gray-100 transition-colors">من داخل التطبيق</a>
            <a href="#pricing" className="px-3 py-1.5 rounded-full hover:text-gray-950 hover:bg-gray-100 transition-colors">الباقات</a>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center rounded-full px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-950 hover:bg-gray-100 transition-colors"
            >
              تسجيل الدخول
            </Link>
            <a
              href={whatsappLink('مرحباً، أرغب في إنشاء حساب متجر على باركودي')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-950 hover:bg-gray-800 text-white px-4 sm:px-5 py-2 text-sm font-bold transition-colors"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">طلب حساب متجر</span>
            </a>
          </div>
        </nav>
      </header>

      {/* Hero — headline beside a live demo of the real scan flow */}
      <section className="relative max-w-6xl mx-auto px-6 pt-14 sm:pt-20 pb-10">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-8 items-center">
          <div className="text-center lg:text-right">
            <div className="flex justify-center lg:justify-start mb-7 reveal">
              <Eyebrow>الجيل الجديد من الخدمة الذاتية في المتاجر</Eyebrow>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-gray-950 tracking-tight leading-[1.15] animate-fade-in-up">
              حوّل هاتف عميلك إلى{' '}
              <span className="bg-gradient-to-l from-primary-dark via-primary-main to-primary-light bg-clip-text text-transparent">
                قارئ أسعار
              </span>{' '}
              متطوّر
            </h1>

            <p className="text-lg md:text-xl text-gray-500 max-w-xl mx-auto lg:mx-0 mt-6 leading-relaxed font-medium">
              بلا أجهزة تُشترى ولا شبكات تُمدّ — رمز QR واحد يكفي ليعرف عملاؤك أسعار منتجاتك فوراً وهم أمام الرفّ.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mt-9">
              <a
                href="#how"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary-dark hover:bg-primary-dark/90 text-white px-7 py-3.5 font-bold text-base shadow-sm transition-all hover:-translate-y-0.5"
              >
                <span>شاهد كيف يعمل</span>
                <ArrowDown className="w-5 h-5" />
              </a>
              <a
                href={whatsappLink('مرحباً، أرغب في استشارة مجانية حول باركودي')}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white hover:border-gray-400 text-gray-800 px-7 py-3.5 font-bold text-base transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span>استشارة مجانية عبر واتساب</span>
              </a>
            </div>
          </div>

          <div className="flex justify-center lg:justify-start animate-fade-in-up">
            <LiveScanDemo />
          </div>
        </div>

        {/* Stat strip — clean hairline row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px mt-14 rounded-3xl overflow-hidden border border-gray-200 bg-gray-200 reveal">
          {heroStats.map((stat) => (
            <div key={stat.label} className="bg-white px-5 py-6 flex flex-col items-center gap-1.5 text-center">
              <div className="w-9 h-9 rounded-xl bg-primary-pale/60 text-primary-dark flex items-center justify-center mb-1">
                <stat.icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-xl md:text-2xl font-black text-gray-950 leading-none font-display">{stat.value}</span>
              <span className="text-[11px] text-gray-400 font-bold leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — numbered sequence */}
      <section id="how" className="max-w-5xl mx-auto px-6 py-24 md:py-28 scroll-mt-20">
        <div className="max-w-2xl mb-14 text-right">
          <Eyebrow>ثلاث خطوات</Eyebrow>
          <h2 className="font-display text-3xl md:text-5xl font-black text-gray-950 mt-5 leading-tight tracking-tight">
            كيف يعمل باركودي؟
          </h2>
          <p className="text-base md:text-lg text-gray-500 mt-4 font-medium leading-relaxed">
            لا أجهزة، ولا تطبيقات، ولا تعقيد. ثلاث خطوات فقط تفصل عميلك عن معرفة السعر وإتمام جولته بثقة.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {howItWorks.map((step, i) => (
            <div
              key={step.title}
              className="reveal group rounded-3xl border border-gray-200 bg-white p-7 text-right hover:border-gray-300 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-dark to-primary-main text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <step.icon className="w-7 h-7" />
                </div>
                <span className="text-5xl font-black text-gray-100 leading-none tabular-nums font-display">{`0${i + 1}`}</span>
              </div>
              <h3 className="text-xl font-black text-gray-950 mb-2.5 font-display">{step.title}</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Barcodi — bento grid in the agreed order */}
      <section id="why" className="bg-gray-50 border-y border-gray-200 py-24 md:py-28 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-2xl mb-14 text-right">
            <Eyebrow>لماذا باركودي</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl font-black text-gray-950 mt-5 leading-tight tracking-tight">
              الخيار الأذكى لمتجرك
            </h2>
            <p className="text-base md:text-lg text-gray-500 mt-4 font-medium leading-relaxed">
              حوّل مشكلات المتجر التقليدية إلى تجربة رقمية تفاعلية تُسعد عملاءك وتسهّل الإدارة المالية وتحديث المخزون فوراً.
            </p>
          </div>

          <div className="reveal">
            <WhyShowcase items={benefits} />
          </div>
        </div>
      </section>

      {/* Inside the app — faithful recreations of the real client screens */}
      <section id="screens" className="max-w-6xl mx-auto px-6 py-24 md:py-28 scroll-mt-20">
        <div className="max-w-2xl mb-14 text-right">
          <Eyebrow>من داخل التطبيق</Eyebrow>
          <h2 className="font-display text-3xl md:text-5xl font-black text-gray-950 mt-5 leading-tight tracking-tight">
            هذا ما يراه عميلك على هاتفه
          </h2>
          <p className="text-base md:text-lg text-gray-500 mt-4 font-medium leading-relaxed">
            واجهة حقيقية سريعة وبسيطة تحمل شعار متجرك، من لحظة المسح إلى حساب السلة — والسلة ميزة اختيارية تتحكم بها إدارة المتجر بالكامل.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 items-start">
          {/* Screen 1 — the scanner */}
          <div className="reveal">
            <PhoneFrame label="الماسح الضوئي — يقرأ الباركود من الكاميرا مباشرة">
              <div className="pt-11 pb-6 px-4 bg-gradient-to-b from-[#eef4ee] via-[#f6f8f0] to-[#eaf1e6] flex flex-col gap-3" dir="rtl">
                <div className="grid grid-cols-2 gap-1 bg-white/50 p-1 rounded-2xl border border-white">
                  <div className="py-2 rounded-xl text-[9px] font-bold bg-white text-primary-dark border border-primary-light/30 flex flex-col items-center gap-1">
                    <Barcode className="w-3.5 h-3.5" />
                    المسح الضوئي بالكاميرا
                  </div>
                  <div className="py-2 rounded-xl text-[9px] font-bold text-gray-500 flex flex-col items-center gap-1 justify-center">
                    <span className="text-[7px] font-mono bg-primary-pale text-primary-dark px-1 rounded">6281001234567</span>
                    إدخال الباركود يدوياً
                  </div>
                </div>
                <p className="text-[9px] text-gray-500 text-center">وجّه الباركود داخل الإطار الأخضر</p>
                <div className="relative w-full aspect-[4/3] bg-gray-950 rounded-2xl border-[4px] border-gray-900 overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,#2c3530_0%,#12150f_65%)]" />
                  <div className="absolute left-[11%] right-[11%] top-1/2 h-[40%] -translate-y-1/2 rounded-xl border-2 border-primary-light/90 shadow-[0_0_0_999px_rgba(0,0,0,0.30)]" />
                  <div className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_16px_#10b981] animate-laser" style={{ top: '0%' }} />
                  <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 border border-white/20">
                    <FlipHorizontal className="w-3 h-3 text-white" />
                  </div>
                  <div className="absolute top-9 right-2.5 p-1.5 rounded-lg bg-black/60 border border-white/20">
                    <Zap className="w-3 h-3 text-amber-300" />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 bg-black/80 px-2.5 py-1.5 rounded-lg text-[7px] font-bold text-white flex items-center gap-1 border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    المسح التلقائي مفعّل...
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[9px] text-gray-400 font-medium mt-1">
                  <Camera className="w-3 h-3" />
                  يدعم EAN وUPC وCode-128 وغيرها
                </div>
              </div>
            </PhoneFrame>
          </div>

          {/* Screen 2 — the product card */}
          <div className="reveal">
            <PhoneFrame label="بطاقة المنتج — الاسم والسعر والمواصفات فور القراءة">
              <div className="pt-11 pb-6 px-4 bg-gradient-to-b from-[#eef4ee] via-[#f6f8f0] to-[#eaf1e6] flex flex-col justify-center" dir="rtl">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white p-4 shadow-[0_12px_40px_-5px_rgba(53,133,142,0.18)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 bg-white/70 text-primary-dark text-[8px] font-bold px-2 py-1 rounded-full border border-white shadow-sm">
                      🥛 قسم الألبان
                    </span>
                    <span className="text-[8px] text-gray-500 bg-white px-2 py-1 rounded-lg font-bold border border-white/60">عد للمسح ←</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-pale to-primary-light border-[3px] border-white flex items-center justify-center text-2xl mb-2 shadow-sm">
                      🥛
                    </div>
                    <h4 className="text-[13px] font-black text-gray-900 leading-snug">حليب كامل الدسم — ١ لتر</h4>
                    <span className="text-[8px] font-mono text-gray-400 bg-white/60 px-2 py-0.5 rounded-md mt-1">باركود: 628100234561</span>
                    <div className="mt-2.5 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-primary-dark font-mono tracking-tight">2.50</span>
                      <span className="text-[11px] font-black text-gray-800">د.ل</span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-3 bg-white/70 rounded-lg px-2.5 py-1.5 border border-white text-[8px] text-gray-700">
                      <span><b>الوزن:</b> ١ لتر</span>
                      <span className="w-px h-2.5 bg-gray-300" />
                      <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500" /><b>السعرات:</b> ٦١٠ كالو</span>
                    </div>
                    <div className="w-full border-t border-gray-200/60 mt-3 pt-3">
                      <span className="text-[8px] font-bold text-gray-600 block mb-2">حدد كمية الشراء:</span>
                      <div className="flex items-center justify-center gap-3 max-w-[120px] mx-auto bg-white/70 border border-white p-1 rounded-xl">
                        <span className="w-7 h-7 rounded-lg bg-white border border-white flex items-center justify-center text-gray-500"><Minus className="w-3 h-3" /></span>
                        <span className="text-sm font-black text-gray-900 font-mono">2</span>
                        <span className="w-7 h-7 rounded-lg bg-white border border-white flex items-center justify-center text-gray-500"><Plus className="w-3 h-3" /></span>
                      </div>
                      <div className="mt-3 bg-primary-dark text-white text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        أضِف إلى السلة
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </PhoneFrame>
          </div>

          {/* Screen 3 — the smart cart */}
          <div className="reveal">
            <PhoneFrame label="السلة الذكية (اختيارية) — فعّلها أو أوقفها من لوحة التحكم">
              <div className="pt-11 pb-6 px-4 bg-gradient-to-b from-[#eef4ee] via-[#f6f8f0] to-[#eaf1e6] flex flex-col gap-3" dir="rtl">
                <div className="flex items-center justify-between mt-1">
                  <h4 className="font-black text-gray-900 text-sm font-display">سلة مشترياتي</h4>
                  <span className="text-[9px] bg-white border border-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded-lg">3 أصناف</span>
                </div>
                <div className="space-y-2 flex-1">
                  {[
                    { emoji: '🍫', name: 'نوتيلا كريمة البندق ٣٥٠غ', qty: '1', price: '12.50' },
                    { emoji: '🧃', name: 'عصير برتقال طبيعي', qty: '2', price: '3.50' },
                    { emoji: '💧', name: 'مياه معدنية ٥٠٠ مل', qty: '1', price: '0.50' },
                  ].map((row) => (
                    <div key={row.name} className="p-2.5 bg-white/80 rounded-xl flex items-center justify-between border border-white shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{row.emoji}</span>
                        <div className="text-right">
                          <span className="block text-[10px] font-black text-gray-800 leading-tight">{row.name}</span>
                          <span className="text-[8px] text-gray-400">الكمية: {row.qty}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-primary-dark font-mono">{row.price} د.ل</span>
                    </div>
                  ))}
                </div>
                <div className="bg-primary-dark text-white p-3 rounded-2xl flex items-center justify-between text-[10px] font-bold">
                  <span>المجموع التقديري</span>
                  <span className="text-sm font-black text-primary-pale font-mono">20.00 د.ل</span>
                </div>
                <p className="text-[8px] text-gray-400 text-center leading-relaxed">
                  حساب تراكمي فوري بعملة متجرك — يصل عميلك إلى الكاشير دون مفاجآت
                </p>
                <div className="flex items-center justify-center gap-1.5 text-[8px] font-bold text-primary-dark bg-white/70 border border-primary-light/40 rounded-full px-2.5 py-1.5">
                  <span className="relative inline-flex w-6 h-3.5 rounded-full bg-primary-dark shrink-0">
                    <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-white" />
                  </span>
                  ميزة اختيارية — بيد إدارة المتجر تفعيلها أو إيقافها
                </div>
              </div>
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* AI add-ons — the dark band borrows the viewfinder's own atmosphere */}
      <section className="max-w-6xl mx-auto px-6 pb-24 md:pb-28">
        <div className="reveal relative rounded-[2.5rem] bg-gray-950 text-white p-8 md:p-14 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(53,133,142,0.35)_0%,transparent_50%),radial-gradient(circle_at_10%_90%,rgba(125,167,140,0.2)_0%,transparent_45%)]" />
          <div className="absolute left-0 right-0 h-[2px] bg-emerald-400/70 shadow-[0_0_20px_#10b981] animate-laser opacity-40 pointer-events-none" style={{ top: '0%' }} />

          <div className="relative">
            <div className="max-w-2xl text-right mb-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-primary-pale">
                <Sparkles className="w-3.5 h-3.5" />
                إضافات الذكاء الاصطناعي — حصرياً في الباقة الاحترافية
                <span className="text-[10px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">قريباً</span>
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-black mt-6 leading-tight tracking-tight">
                كل عملية مسح... فرصة بيع جديدة
              </h2>
              <p className="text-base md:text-lg text-white/70 mt-4 font-medium leading-relaxed">
                لا يكتفي باركودي بعرض السعر؛ بل يقرأ ما بين يدي عميلك ويقترح عليه ما يليق به. يمسح العميل عبوة نوتيلا، فتظهر له وصفات شهية تدخل فيها — فيعود إلى الرفوف ليشتري مكوّناتها من متجرك.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {aiFeatures.map((feat) => (
                <div key={feat.title} className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-sm p-6 text-right hover:bg-white/10 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-primary-pale/20 text-primary-pale flex items-center justify-center">
                      <feat.icon className="w-5.5 h-5.5" />
                    </div>
                    <span className="text-[10px] font-black bg-white/10 border border-white/20 text-white/80 px-2.5 py-1 rounded-full">قريباً</span>
                  </div>
                  <h3 className="text-lg font-black mb-2 font-display">{feat.title}</h3>
                  <p className="text-xs text-white/60 font-medium leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing — two plans, LYD */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 pb-24 md:pb-28 scroll-mt-20">
        <div className="max-w-2xl mb-14 text-right">
          <Eyebrow>خطط الأسعار</Eyebrow>
          <h2 className="font-display text-3xl md:text-5xl font-black text-gray-950 mt-5 leading-tight tracking-tight">
            ابدأ مجاناً، وأسعار واضحة دون تكاليف خفية
          </h2>
          <p className="text-base md:text-lg text-gray-500 mt-4 font-medium leading-relaxed">
            جرّب باركودي مجاناً حتى 7 أيام، ثم اختر ما يناسب حجم متجرك. الأسعار بالدينار الليبي.
          </p>
        </div>

        {/* Billing cycle toggle — applies to باقة الانطلاق */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-xs font-black text-gray-500 ml-2">دورة الفوترة:</span>
          {billingOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setBillingCycle(option.id)}
              className={`px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
                billingCycle === option.id
                  ? 'bg-primary-dark text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{option.label}</span>
              {option.tag && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    billingCycle === option.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {option.tag}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {pricePlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border p-7 flex flex-col justify-between transition-all duration-300 ${
                plan.popular
                  ? 'border-primary-main ring-4 ring-primary-main/10 bg-white md:-translate-y-2'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {plan.comingSoon && (
                <span className="absolute -top-3 left-6 bg-gray-950 text-white text-[10px] font-black px-3.5 py-1.5 rounded-full shadow-sm">
                  قريباً
                </span>
              )}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-gray-950 font-display">{plan.name}</h3>
                  <span className="text-xs text-gray-400 font-bold block mt-1">{plan.badge}</span>
                </div>

                <p className="text-xs text-gray-500 font-medium leading-relaxed min-h-[48px]">{plan.description}</p>

                <div className="pb-5 border-b border-gray-100 space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-950 font-mono tracking-tight">{plan.price}</span>
                    <span className="text-xs text-gray-400 font-bold">{plan.period}</span>
                    {plan.priceSave && (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mr-1">
                        {plan.priceSave}
                      </span>
                    )}
                  </div>
                  {plan.priceNote && (
                    <p className="text-[11px] text-gray-400 font-bold">{plan.priceNote}</p>
                  )}
                </div>

                <ul className="space-y-3 text-xs text-gray-700 font-medium">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <span className="w-4.5 h-4.5 rounded-full bg-primary-pale text-primary-dark flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {plan.aiAddons.length > 0 && (
                  <div className="rounded-2xl border border-primary-light/50 bg-gradient-to-l from-primary-pale/60 to-white p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Sparkles className="w-4 h-4 text-primary-dark" />
                      <span className="text-xs font-black text-primary-dark">إضافات الذكاء الاصطناعي</span>
                      <span className="text-[10px] font-black bg-gray-950 text-white px-2 py-0.5 rounded-full mr-auto">قريباً</span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-gray-700 font-medium">
                      {plan.aiAddons.map((addon) => (
                        <li key={addon} className="flex items-start gap-2.5">
                          <span className="w-4.5 h-4.5 rounded-full bg-primary-dark text-white flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                          </span>
                          <span>{addon}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {plan.comingSoon ? (
                <span className="mt-8 w-full py-3.5 px-4 rounded-full text-center font-black text-sm block bg-gray-100 text-gray-400 cursor-default select-none">
                  {plan.buttonText}
                </span>
              ) : (
                <a
                  href={whatsappLink(plan.whatsappMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-8 w-full py-3.5 px-4 rounded-full text-center font-black text-sm block transition-all active:scale-[0.99] ${
                    plan.popular
                      ? 'bg-primary-dark text-white hover:bg-primary-dark/90'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {plan.buttonText}
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 border-t border-gray-200 py-24 md:py-28">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-right mb-12">
            <Eyebrow>لديك سؤال؟</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl font-black text-gray-950 mt-5 leading-tight tracking-tight">
              الأسئلة الشائعة
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const open = activeFaq === idx;
              return (
                <div key={faq.q} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setActiveFaq(open ? null : idx)}
                    aria-expanded={open}
                    className="w-full p-5 sm:p-6 text-right font-black text-gray-900 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm md:text-base leading-snug">{faq.q}</span>
                    <Plus className={`w-5 h-5 text-primary-dark shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
                  </button>
                  {open && (
                    <div className="px-5 sm:px-6 pb-6 text-sm text-gray-500 font-medium leading-relaxed border-t border-gray-100 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Closing CTA band */}
          <div className="mt-14 rounded-[2.5rem] bg-gradient-to-tr from-primary-dark to-primary-main text-white p-8 md:p-12 text-center space-y-5">
            <h3 className="font-display text-2xl md:text-3xl font-black leading-tight">هل أنت مستعد لنقلة ذكية في متجرك؟</h3>
            <p className="text-sm md:text-base font-medium text-white/85 max-w-xl mx-auto leading-relaxed">
              تواصل معنا لنجهّز لك حساباً مخصّصاً لمتجرك في دقائق. فريقنا جاهز لتنظيم بضاعتك وتقديم فحص باركود سريع وأنيق.
            </p>
            <div className="pt-1">
              <a
                href={whatsappLink('مرحباً، أرغب في البدء مع باركودي')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-gray-50 font-black px-7 py-3.5 rounded-full transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>تواصل عبر واتساب</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-5 text-xs text-gray-400 font-bold">
          <div className="flex items-center gap-2 text-primary-dark">
            <Store className="w-5 h-5" />
            <span className="text-sm text-gray-800">باركودي · Barcodi</span>
          </div>
          <span>© {new Date().getFullYear()} باركودي. جميع الحقوق محفوظة.</span>
          <div className="flex items-center gap-4 text-gray-500">
            <Link to="/admin" className="hover:text-primary-dark transition-colors">بوابة المشتركين</Link>
            <span>•</span>
            <a
              href={whatsappLink('مرحباً، أحتاج إلى الدعم الفني لباركودي')}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-dark transition-colors"
            >
              الدعم الفني
            </a>
          </div>
        </div>
      </footer>

      <ScrollArrows />
    </div>
  );
}
