import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  QrCode,
  UploadCloud,
  Smartphone,
  MessageCircle,
  Check,
  HelpCircle,
  Sparkles,
  ShoppingCart,
  ArrowLeft,
  DollarSign,
  Layers,
  ShieldCheck,
  Zap,
  Flame,
  XCircle,
  TrendingUp,
  Award,
  Camera,
  Infinity as InfinityIcon,
  Timer
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

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  useScrollReveal();

  const heroStats = [
    { icon: DollarSign, value: '0$', label: 'تكلفة أجهزة قارئ' },
    { icon: Timer, value: 'ثانية', label: 'لظهور السعر' },
    { icon: InfinityIcon, value: 'لا محدود', label: 'عدد الأصناف' },
    { icon: Smartphone, value: 'بدون تحميل', label: 'يعمل من الكاميرا' },
  ];

  const howItWorks = [
    {
      icon: QrCode,
      title: 'امسح رمز المتجر',
      desc: 'يوجّه الزبون كاميرا هاتفه إلى كود QR المطبوع على الرفوف أو السلال، فيُفتح متجرك فوراً بدون تحميل أي تطبيق.',
    },
    {
      icon: Camera,
      title: 'وجّه الكاميرا للمنتج',
      desc: 'يصوّب الكاميرا نحو باركود أي صنف، ليقرأه النظام في لحظة ويعرض الاسم والسعر والمواصفات بدقة.',
    },
    {
      icon: ShoppingCart,
      title: 'أضف للسلة واحسب',
      desc: 'يضيف الأصناف لسلة ذكية تحسب الإجمالي التقديري فوراً، فيتسوّق بثقة ويصل للكاشير بلا مفاجآت.',
    },
  ];

  const pricePlans = [
    {
      name: "الخطة التجريبية",
      badge: "ابدأ مجاناً",
      price: "0",
      period: "فاتورة مدى الحياة",
      description: "الحل الأمثل لتجربة النظام واختبار فاعليته في متجرك الصغير أو البقالة القريبة.",
      features: [
        "حد أقصى 150 صنف مضاف",
        "رمز QR مخصص للمتجر لطباعته",
        "تعديل وتحديث الأسعار يدوياً",
        "رفع قوائم المنتجات عبر ملف إكسل",
        "سلة تصفح وحساب المجموع للعميل",
        "دعم فني عبر البريد الإلكتروني"
      ],
      popular: false,
      color: "from-blue-400 to-indigo-500",
      buttonText: "ابدأ التجربة المجانية الآن",
      whatsappMsg: "مرحباً، أرغب في تجربة الخطة المجانية لباركودي"
    },
    {
      name: "الخطة الاحترافية (النمو السريع)",
      badge: "الأكثر طلباً",
      price: "19",
      period: "دولار / شهرياً",
      description: "الباقة المثلى للسوبرماركت والمحلات المتوسطة التي تطمح لتقديم تجربة تسوق راقية.",
      features: [
        "حد غير محدود للأصناف والمنتجات",
        "شعار مخصص للمتجر مع تفاصيل الفروع",
        "سلة ذكية تفاعلية مع حاسبة فورية",
        "لوحة مراقبة وإحصاء عدد الزوار فورياً",
        "تقنية الكاش الحركي لسرعة قراءة الباركود",
        "تحديث ذكي فوري للمنتجات المستوردة",
        "دعم فني متكامل عبر واتساب 24/7"
      ],
      popular: true,
      color: "from-emerald-400 to-teal-600",
      buttonText: "اشترك الآن ووفّر الكلفة",
      whatsappMsg: "مرحباً، أرغب في الاشتراك بالخطة الاحترافية لقارئ متجري"
    },
    {
      name: "خطة الشبكات والممتلكات",
      badge: "سرعة قصوى",
      price: "39",
      period: "دولار / شهرياً",
      description: "باقة النخبة للهايبرماركت الكبيرة والمحلات ذات المبيعات والزوار الكثيفين.",
      features: [
        "كل مزايا الباقة الاحترافية والمدرجة",
        "نظام تفويض الصلاحيات والإداريين",
        "تحديث جماعي متعدد للفهارس بلحظات",
        "تحليلات سلوكية تفصيلية لاهتمام الزوار",
        "تخصيص كامل لألوان نظام القارئ",
        "أولوية مطلقة في سيرفرات المعالجة السريعة",
        "مدير حساب مخصص للمتجر لتقديم الاستشارات"
      ],
      popular: false,
      color: "from-amber-400/80 to-orange-600",
      buttonText: "انضم إلى باقة النخبة",
      whatsappMsg: "مرحباً، أرغب في الاستفسار عن باقة النخبة والمحلات الكبيرة لقارئ متجري"
    }
  ];

  const faqs = [
    {
      q: "كيف يوفر التطبيق ميزانية المتجر مقارنة بالحلول التقليدية؟",
      a: "في العادة، يضطر السوبرماركت لشراء وتثبيت أجهزة قارئ أسعار ميكانيكية وربطها بالشبكة السلكية وتوفير خادم محلي لها، وهي تكلفة تتجاوز آلاف الدولارات. مع تطبيقنا، لا تحتاج لشراء أي جهاز! جوال العميل هو القارئ الشخصي الخاص به مباشرة عبر كود QR."
    },
    {
      q: "كيف يساهم النظام في منع بعثرة المنتجات في الرفوف غير المناسبة؟",
      a: "المشكلة الشائعة قديماً هي أن الزبون يأخذ منتجاً معيناً ليذهب به إلى قارئ الأسعار البعيد المثبّت على أحد الجدران، وعندما يكتشف سعره ويريد التراجع، يضعه في أقرب رف أمامه بلا مبالاة مسبباً فوضى عارمة. بفضل 'قارئ متجري'، يستعلم الزبون عن السعر مباشرة وهو واقف أمام المنتج دون أن يبرح مكانه، مما يقضي تماماً على هذه المشكلة الشائعة."
    },
    {
      q: "هل يتطلب من الزبون تحميل أي تطبيق من المتجر لاستخدامه؟",
      a: "مطلقاً! لا يحتاج الزبون لتحميل أي شيء أو تسجيل حساب. كل ما عليه هو توجيه كاميرا هاتفه نحو رمز الـ QR الخاص بمتجركم، ليدخل مباشرة على واجهة ويب سريعة جداً ومخصصة تعرض شعاركم، وتعمل كقارئ متطور عبر كاميرا هاتفه."
    },
    {
      q: "كيف يمكنني رفع بضاعتي ومنتجاتي إلى النظام؟",
      a: "الأمر غاية في السهولة! من خلال لوحة تحكم الإدارة الخاصة بك، تقوم بتنزيل قالب إكسل جاهز، تملأ أسماء المنتجات، أرقام الباركود، والأسعار، ثم ترفعه في ثانية واحدة مباشرة ليصبح متجرك جاهزاً للعمل بلحظات."
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden text-gray-800 font-sans selection:bg-primary-main selection:text-white" dir="rtl">
      
      {/* Dynamic Ambient Blur Blobs for Glassmorphism 2.0 Effect */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary-pale/60 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-[40%] left-[-15%] w-[600px] h-[600px] rounded-full bg-emerald-100/40 blur-[160px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[10%] w-[550px] h-[550px] rounded-full bg-sky-100/50 blur-[140px] pointer-events-none -z-10" />

      {/* Header Sticky Container */}
      <header className="sticky top-0 z-50 bg-white/40 backdrop-blur-md border-b border-white/60 px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 mx-auto max-w-7xl rounded-b-3xl shadow-sm">
        <div className="flex items-center justify-center md:justify-start gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-dark to-primary-main flex items-center justify-center text-white shadow-md shrink-0">
            <Store className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-gray-900 leading-none font-sans">باركودي</h1>
            <span className="text-[10px] text-primary-dark font-bold">بوابة تسوق ذكية متكاملة لخصائص الأسعار</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-4 w-full md:w-auto">
          <Link 
            to="/admin" 
            className="flex items-center justify-center w-full md:w-auto bg-white/60 md:bg-transparent border border-white md:border-transparent shadow-sm md:shadow-none text-gray-700 font-black hover:text-primary-dark py-2.5 px-1 sm:px-3 rounded-xl hover:bg-white/80 transition-all text-xs sm:text-sm"
          >
            <span className="whitespace-nowrap">تسجيل الدخول للإدارة</span>
          </Link>
          <a 
            href="https://wa.me/218945953967" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center justify-center w-full md:w-auto bg-primary-dark hover:bg-primary-dark/90 text-white px-2 sm:px-5 py-2.5 rounded-xl font-bold transition-all shadow-md text-xs sm:text-sm gap-1.5"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">طلب حساب متجر</span>
          </a>
        </div>
      </header>

      {/* Hero Welcome Unit */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-gray-900 text-white border border-gray-800 px-4 py-2 rounded-xl shadow-xl shadow-gray-900/10 mb-6 group">
          <span className="text-[11px] font-black tracking-widest uppercase">الجيل الجديد من حلول البيع بالتجزئة والخدمة الذاتية</span>
        </div>

        <h2 className="text-4xl md:text-6xl font-black text-gray-950 mb-6 leading-[1.2] max-w-4xl mx-auto animate-fade-in-up">
          حوّل جوال عميلك إلى <span className="animate-gradient bg-gradient-to-r from-primary-dark via-primary-main to-primary-dark bg-clip-text text-transparent">جهاز قارئ أسعار</span> متطور وبأقل تكلفة!
        </h2>
        
        <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
          وداعاً للتكاليف الباهظة للأجهزة والشبكات! ارفع قائمة منتجاتك بملف إكسل، واجعل زبائنك يتعرفون على الأسعار فورا من كاميرتهم الخاصة عبر كود QR وبشكل فائق السهولة والسلاسة.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a 
            href="#pricing" 
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-primary-dark to-primary-main text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <span>استعرض باقات الاشتراك</span>
            <ArrowLeft className="w-5 h-5" />
          </a>
          <a 
            href="https://wa.me/218945953967" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white/80 backdrop-blur-md hover:bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-sm"
          >
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span>استشارة مجانية (واتساب)</span>
          </a>
        </div>

        {/* Hero trust / stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto mb-16">
          {heroStats.map((stat, i) => (
            <div
              key={i}
              className="reveal bg-white/60 backdrop-blur-md border border-white/70 rounded-2xl px-4 py-5 flex flex-col items-center gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-pale/70 text-primary-dark flex items-center justify-center mb-1">
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-xl md:text-2xl font-black text-gray-900 leading-none">{stat.value}</span>
              <span className="text-[11px] text-gray-500 font-bold text-center leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Floating Glassmorphic App Feature Mockup Screen */}
        <div className="reveal relative mx-auto max-w-4xl rounded-3xl p-3 bg-gradient-to-tr from-white/30 to-white/60 backdrop-blur-xl border border-white/80 shadow-[0_50px_100px_rgba(35,133,142,0.1)] mb-20 overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-primary-light/50 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-emerald-200/50 blur-2xl pointer-events-none" />
          
          <div className="bg-white/90 rounded-2xl shadow-inner border border-gray-100 overflow-hidden">
             {/* Virtual Dashboard Simulator Bar */}
             <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center text-xs text-gray-400 font-bold">
               <div className="flex items-center gap-2">
                 <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                 <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                 <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
               </div>
             </div>

             <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8 text-right items-center">
               <div className="space-y-4">
                 <div className="inline-block bg-primary-pale text-primary-dark px-3 py-1 rounded-full text-xs font-black">
                   محاكاة تفاعلية
                 </div>
                 <h4 className="text-2xl font-black text-gray-900 leading-snug">
                   واجهة مستخدم ذكية وسريعة تناسب شاشات الهواتف
                 </h4>
                 <p className="text-gray-500 text-sm leading-relaxed">
                   عندما يمسح الزبون الكود المطبوع على الرف أو سلال المشتريات، سيتم نقله في ثانية واحدة لواجهة ويب بصرية تتيح له توجيه الكاميرا إلى أي صنف ليظهر السعر والمواصفات فوراً!
                 </p>
                 
                 <div className="grid grid-cols-2 gap-3 pt-2">
                   <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                     <span className="block text-xl font-black text-primary-dark">100%</span>
                     <span className="text-[10px] text-gray-400 font-bold">متوافق مع الهواتف</span>
                   </div>
                   <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                     <span className="block text-xl font-black text-emerald-600">صفر ثانية</span>
                     <span className="text-[10px] text-gray-400 font-bold">وقت تنزيل التطبيق</span>
                   </div>
                 </div>
               </div>

               <div className="bg-gradient-to-tr from-gray-50 to-gray-100/50 p-6 rounded-2xl border border-gray-200/60 relative">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-200/80 pb-3">
                    <span className="font-black text-sm text-gray-800">سلة التسوق الذكية للزبون</span>
                    <span className="bg-primary-main/20 text-primary-dark text-xs px-2.5 py-0.5 rounded-full font-bold">جولتك الحالية</span>
                  </div>

                  {/* Simulated items in shopping cart */}
                  <div className="space-y-3 mb-4">
                    <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🥛</span>
                        <div className="text-right">
                          <span className="block text-xs font-black text-gray-800">حليب كامل الدسم 1 لتر</span>
                          <span className="text-[10px] text-gray-400 font-mono">628100234561</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-primary-dark">2.50 د.ل</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🍫</span>
                        <div className="text-right">
                          <span className="block text-xs font-black text-gray-800">شوكولاتة بندق داكنة</span>
                          <span className="text-[10px] text-gray-400 font-mono">628100119852</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-primary-dark">1.25 د.ل</span>
                    </div>
                  </div>

                  <div className="bg-primary-dark text-white p-3.5 rounded-xl flex items-center justify-between text-xs font-bold">
                    <span>مجموع المشتريات التقديري</span>
                    <span className="text-sm font-black text-primary-pale">3.75 دينار</span>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* How It Works - 3 simple steps */}
      <section className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-xl text-[11px] font-black tracking-widest uppercase shadow-xl shadow-gray-900/10 border border-gray-800">ثلاث خطوات بسيطة</span>
          <h3 className="text-3xl md:text-4xl font-black text-gray-950 mt-4 mb-6 leading-tight">
            كيف يعمل باركودي؟ بسيط كلمح البصر
          </h3>
          <p className="text-md text-gray-600 font-medium">
            لا أجهزة، لا تطبيقات، ولا تعقيد. ثلاث خطوات فقط تفصل عميلك عن معرفة السعر وإتمام جولته بثقة.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-12 right-[16%] left-[16%] h-0.5 bg-gradient-to-l from-primary-light/0 via-primary-light to-primary-light/0 -z-0" />

          {howItWorks.map((step, i) => (
            <div
              key={i}
              className="reveal relative z-10 bg-white/70 backdrop-blur-md border border-white/70 rounded-3xl p-8 text-center shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300"
            >
              <div className="relative mx-auto mb-6 w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-primary-pale/50 blur-xl" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-primary-dark to-primary-main text-white flex items-center justify-center shadow-lg">
                  <step.icon className="w-10 h-10" />
                </div>
                <span className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-white text-primary-dark font-black text-sm flex items-center justify-center shadow-md border border-primary-light/40">
                  {i + 1}
                </span>
              </div>
              <h4 className="text-xl font-black text-gray-950 mb-3">{step.title}</h4>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Extreme Core Benefits Block - Requested Details */}
      <section className="bg-white/40 backdrop-blur-xl border-y border-white/60 py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-xl text-[11px] font-black tracking-widest uppercase shadow-xl shadow-gray-900/10 border border-gray-800">مقارنة وحلول فريدة</span>
            <h3 className="text-3xl md:text-4xl font-black text-gray-950 mt-4 mb-6 leading-tight">
              لماذا يُعد قارئ متجري الخيار والأول والأكثر ذكاءً؟
            </h3>
            <p className="text-md text-gray-600 font-medium font-sans">
              واجه مشاكل المحل التقليدية وحوّلها إلى تجربة تقنية تفاعلية تبهج عملائك وسهّل الإدارة المالية وتحديثات المخازن فوراً.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Unique Benefit 1: Massive Budget Cost Savings */}
            <div className="reveal bg-white/70 backdrop-blur-md border border-white/60 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all text-right group hover:-translate-y-1 duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-gray-950 mb-3">اقتصادي وموفر للميزانية</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                لا داعي لشراء أجهزة قارئ الأسعار اللاسلكية الباهظة أو توصيل كابلات إيثرنت وشبكات معقدة لكل جدار وصيانة مكلفة. وبذلك يوفر المتجر آلاف الدينارات مستثمراً الهواتف التي يحملها العملاء بالفعل.
              </p>
            </div>

            {/* Unique Benefit 2: Solving Stray Products Shelf Error */}
            <div className="reveal bg-white/70 backdrop-blur-md border border-white/60 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all text-right group hover:-translate-y-1 duration-300">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <XCircle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-gray-950 mb-3">لا بعثرة للمنتجات بعد اليوم</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                وداعاً لوضع المنتجات في غير أماكنها! المشكلة الشائعة قديماً هي قيام العميل بحمل الصنف لقارئ السعر البعيد، وحين يتراجع عن شرائه، يتركه في رف خاطئ مسبباً فوضى وتضارب أسعار. الآن يمكنه الفحص بلحظتها أمام الرف تماماً.
              </p>
            </div>

            {/* Unique Benefit 3: Customer Satisfaction & Ease of Shoppping */}
            <div className="reveal bg-white/70 backdrop-blur-md border border-white/60 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all text-right group hover:-translate-y-1 duration-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-gray-950 mb-3">رضى العملاء وتسهيل تسوقهم</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                تقديم تجربة تسوق حديثة وعالمية تحترم عقلية المستهلك وتوفر له تصفحاً واثقاً وسريعاً ومريحاً للغاية، ما يضمن ولاءه الكامل لعلامتكم التجارية وعودته الدائمة للشراء.
              </p>
            </div>

            {/* Unique Benefit 4: Fast Cloud Excel Spreadsheet Integration */}
            <div className="reveal bg-white/70 backdrop-blur-md border border-white/60 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all text-right group hover:-translate-y-1 duration-300">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-gray-950 mb-3">رفع الإكسل الفوري الذكي</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                هل لديك آلاف السلع والأصناف؟ قم بإدراجها في ملف إكسل وارفعه ليقوم النظام بقراءة وتجاوز الباركودات المكررة والدمج تلقائياً بضغطة زر واحدة بدون عناء الإدخال اليدوي.
              </p>
            </div>

          </div>

          {/* Interactive Feature: Shopping Cart Highlight */}
          <div className="mt-16 bg-gradient-to-tr from-primary-pale/40 to-white/70 backdrop-blur-md border border-white rounded-[2.5rem] p-8 md:p-12 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-12">
             <div className="lg:w-1/2 space-y-6 text-right">
               <div className="inline-flex items-center gap-2 bg-gray-900 text-white border border-gray-800 px-4 py-2 rounded-xl shadow-xl shadow-gray-900/10">
                 <ShoppingCart className="w-4 h-4 text-primary-main" />
                 <span className="text-[11px] font-black tracking-widest uppercase">ميزة سلة المحتويات المضمّنة</span>
               </div>
               <h4 className="text-3xl font-black text-gray-950 leading-tight">
                  مراقبة وحساب المجموع مباشرة من يد العميل أثناء التجول!
               </h4>
               <p className="text-gray-600 text-sm leading-relaxed">
                 عند قيام العميل بمسح الأصناف، يستطيع بلمسة زر إضافتها إلى السلة وتعديل الكميات ليرى إجمالي السعر المتوقع قبل الوصول للكاشير. هذه الميزة تقلل الإحراج عند نقطة الدفع، وتجعل العميل يتخذ قرارات مستنيرة وتزيد من معدلات الشراء.
               </p>
               <ul className="space-y-2 text-xs font-bold text-gray-600">
                 <li className="flex items-center gap-2.5">
                   <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                     <Check className="w-3 h-3" />
                   </div>
                   <span>حساب تراكمي فوري وفق إعدادات العملة المحلية لمحلكم</span>
                 </li>
                 <li className="flex items-center gap-2.5">
                   <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                     <Check className="w-3 h-3" />
                   </div>
                   <span>تعديل الكميات وإضافة السكاكر أو حذفه بسهولة تامة</span>
                 </li>
               </ul>
             </div>

             <div className="lg:w-5/12 w-full flex justify-center transform hover:rotate-1 transition-transform duration-500">
                <div className="w-full max-w-[320px] bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 flex flex-col">
                  {/* Smartphone Simulator Top */}
                  <div className="w-20 h-4 bg-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center relative">
                    <span className="w-2 h-2 rounded-full bg-gray-400 absolute right-1" />
                  </div>

                  {/* Cart Content Interface */}
                  <span className="text-[10px] text-gray-400 font-bold block mb-1">واجهة العميل الخاصة بالمتجر</span>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-black text-gray-900 text-lg">سلة مشترياتي</h5>
                    <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-lg">3 أصناف</span>
                  </div>

                  {/* Simulated list */}
                  <div className="space-y-2.5 flex-1 mb-6">
                    <div className="p-2 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-100">
                       <div className="text-right">
                         <span className="block text-xs font-black text-gray-800">علبة بسكويت بالتمر</span>
                         <span className="text-[9px] text-gray-400">الكمية: 1</span>
                       </div>
                       <span className="text-xs font-black text-primary-dark">2.00 د.ل</span>
                    </div>

                    <div className="p-2 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-100">
                       <div className="text-right">
                         <span className="block text-xs font-black text-gray-800">عصير برتقال طبيعي</span>
                         <span className="text-[9px] text-gray-400">الكمية: 2</span>
                       </div>
                       <span className="text-xs font-black text-primary-dark">3.50 د.ل</span>
                    </div>

                    <div className="p-2 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-100">
                       <div className="text-right">
                         <span className="block text-xs font-black text-gray-800">مياه معدنية 500 مل</span>
                         <span className="text-[9px] text-gray-400">الكمية: 1</span>
                       </div>
                       <span className="text-xs font-black text-primary-dark">0.50 د.ل</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-150 pt-3 flex items-center justify-between text-xs font-black text-gray-800">
                    <span>مجموع السلة الذكي:</span>
                    <span className="text-sm text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">6.00 د.ل</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Pricing Section Grid - Requested Details */}
      <section id="pricing" className="py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-xl text-[11px] font-black tracking-widest uppercase shadow-xl shadow-gray-900/10 border border-gray-800">التأسيس وخطط الأسعار</span>
            <h3 className="text-3xl md:text-4xl font-black text-gray-950 mt-4 mb-6 leading-tight">
               خطط اشتراك شفافة تلائم مختلف الأحجام
            </h3>
            <p className="text-md text-gray-600 font-medium font-sans">
              اختر الخطة التي تناسب احتياجات متجرك اليوم، وقم بالترقية أو التغيير في أي وقت تشاء. بدون تكاليف خفية إضافية.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {pricePlans.map((plan, idx) => (
              <div
                key={idx}
                className={`relative bg-white/70 backdrop-blur-md rounded-[2rem] border p-8 flex flex-col justify-between transition-all duration-300 shadow-sm ${
                   plan.popular 
                     ? 'border-primary-main/80 ring-4 ring-primary-main/10 scale-100 md:scale-105 z-20' 
                     : 'border-white/60 hover:border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-dark to-primary-main text-white font-black text-[11px] px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                    <span>الباقة الأوفر والأنسب</span>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                     <div>
                       <h4 className="text-xl font-black text-gray-950">{plan.name}</h4>
                       <span className="text-xs text-gray-400 font-bold block mt-1">{plan.badge}</span>
                     </div>
                  </div>

                  <p className="text-xs text-gray-500 font-medium leading-relaxed min-h-[48px]">
                    {plan.description}
                  </p>

                  <div className="flex items-baseline gap-2 pb-4 border-b border-gray-100">
                    <span className="text-4xl font-black text-gray-950 font-mono tracking-tight">${plan.price}</span>
                    <span className="text-xs text-gray-400 font-bold">{plan.period}</span>
                  </div>

                  <ul className="space-y-3.5 text-xs text-gray-700 font-medium pt-2">
                     {plan.features.map((feat, fidx) => (
                       <li key={fidx} className="flex items-start gap-2.5">
                         <div className="w-4.5 h-4.5 rounded-full bg-primary-pale/60 text-primary-dark flex items-center justify-center shrink-0 mt-0.5">
                           <Check className="w-3 h-3" />
                         </div>
                         <span>{feat}</span>
                       </li>
                     ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <a 
                    href={`https://wa.me/218945953967?text=${encodeURIComponent(plan.whatsappMsg)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`w-full py-3.5 px-4 rounded-xl text-center font-black text-sm block transition-all hover:shadow shadow-sm active:scale-[0.99] ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-primary-dark to-primary-main text-white hover:brightness-105'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {plan.buttonText}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Section */}
      <section className="bg-white/40 backdrop-blur-xl border-t border-white/60 py-24 relative z-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-xl text-[11px] font-black tracking-widest uppercase shadow-xl shadow-gray-900/10 border border-gray-800">لديك استفسارات؟</span>
            <h3 className="text-2xl md:text-3xl font-black text-gray-950 mt-4">
               الأسئلة الشائعة حول الخدمة
            </h3>
          </div>

          <div className="space-y-4">
             {faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl overflow-hidden transition-all shadow-sm"
                >
                  <button 
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full p-6 text-right font-black text-gray-900 flex items-center justify-between hover:bg-white/30 transition-colors"
                  >
                    <span className="text-sm md:text-base leading-snug">{faq.q}</span>
                    <HelpCircle className={`w-5 h-5 text-primary-main shrink-0 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {activeFaq === idx && (
                    <div className="px-6 pb-6 text-xs md:text-sm text-gray-500 font-medium leading-relaxed border-t border-gray-100/50 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
             ))}
          </div>

          {/* Prompt banner to connect admin */}
          <div className="mt-16 bg-gradient-to-tr from-primary-dark/10 to-emerald-50/50 border border-primary-dark/20 p-8 rounded-[2rem] text-center space-y-4 shadow-sm">
             <h4 className="text-xl font-black text-gray-900">هل أنت مستعد لقيادة ثورة ذكية في سوبرماركت الخاص بك؟</h4>
             <p className="text-xs font-semibold text-gray-500 max-w-xl mx-auto leading-relaxed">
               تواصل معنا وسنوفر لك حساباً مخصصاً لمتجرك في ثوانٍ. فريقنا جاهز لتحويل بضاعتك وتنظيمها لتقديم فحص باركود فائق السرعة والأناقة.
             </p>
             <div className="pt-2">
                <a 
                  href="https://wa.me/218945953967" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-black px-6 py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تكلم معنا عبر واتساب الآن</span>
                </a>
             </div>
          </div>
        </div>
      </section>

      {/* Styled Foot Footer */}
      <footer className="py-12 border-t border-white/60 bg-white/50 backdrop-blur-md text-center relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-400 font-bold">
           <div className="flex items-center gap-2 text-primary-dark">
             <Store className="w-5 h-5" />
             <span className="font-sans text-sm text-gray-800">Barcodi - باركودي</span>
           </div>
           <div>
             <span>&copy; {new Date().getFullYear()}باركودي. جميع الحقوق محفوظة.</span>
           </div>
           <div className="flex items-center gap-4 text-gray-500">
             <Link to="/admin" className="hover:text-primary-dark transition-colors">بوابة المشتركين والعملاء</Link>
             <span>•</span>
             <a href="https://wa.me/218945953967" target="_blank" rel="noopener noreferrer" className="hover:text-primary-dark transition-colors">الدعم الفني والخدمات</a>
           </div>
        </div>
      </footer>

    </div>
  );
}
