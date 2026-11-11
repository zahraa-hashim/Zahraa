/* ═══════════════════════════════════════════════════════════
   نصوص الصفحة التعريفية — المصدر الواحد للنص الافتراضي وللمخطط
   ───────────────────────────────────────────────────────────
   يحمّله الملفان:
     • index.html — إذا عمود site_info.landing ما بيه مفتاح، يطلع النص من هنا
     • admin.html — يبني حقول تبويب «نصوص الصفحة» من LANDING_SCHEMA،
                    ويعبّي الفاضي من LANDING_DEFAULTS

   كل نص ثنائي اللغة {ar,en}. إذا ضفت نص جديد بالصفحة:
     ١. ضيفه هنا بـ LANDING_DEFAULTS
     ٢. ضيفه بـ LANDING_SCHEMA حتى يطلع باللوحة
     ٣. استعمله بـ index.html عن طريق L('group.key')
   ماكو شي ثاني — لا عمود جديد ولا SQL.

   أنواع الحقول بالمخطط:
     text  — سطر واحد
     area  — فقرة
     lines — قائمة، كل سطر عنصر (شريط المميزات)
     title — مثل area بس يقبل *كلمة* لتلوين كلمة
   ═══════════════════════════════════════════════════════════ */
(function(){
  var D = {
    nav: {
      services: { ar:'الخدمات',        en:'Services' },
      about:    { ar:'عنّي',           en:'About' },
      plans:    { ar:'الباقات',        en:'Plans' },
      classes:  { ar:'الكلاسات',       en:'Classes' },
      faq:      { ar:'الأسئلة',        en:'FAQ' },
      contact:  { ar:'تواصل',          en:'Contact' },
      food:     { ar:'الأكل',          en:'Recipes' },
      courses:  { ar:'التمارين',       en:'Workouts' },
      cta:      { ar:'اشتركي',         en:'Join now' }
    },
    intro: {
      kicker: { ar:'مدرّبة شخصية · أونلاين وحضوري', en:'Personal trainer · online & in person' },
      title:  { ar:'القوة *تليق* بيچ.', en:'Strong *looks good* on you.' },
      sub:    { ar:'تدريب مصمّم لحياتچ الحقيقية — على أهدافچ، ووقتچ، والنسخة الأقوى منچ اللي ديتبنى.',
                en:'Training built for real life — around your goals, your schedule, and the stronger you in the making.' },
      cta1:   { ar:'ابدئي خطتچ',    en:'Start your plan' },
      ctaClasses:{ ar:'الكلاسات',    en:'Classes' },
      badge:  { ar:'+١٢٠',          en:'120+' },
      badgeSub:{ ar:'متدربة',        en:'women coached' },
      floatT: { ar:'متابعة أسبوعية', en:'Weekly check-ins' },
      floatS: { ar:'ويّاچ خطوة بخطوة', en:'With you every step' }
    },
    marquee: {
      items: { ar:['بدون حرمان','أكل من السوق المحلي','متابعة أسبوعية','مناسب للمبتدئات','تمارين بيت ونادي','نتائج تدوم'],
               en:['No starving','Local-market food','Weekly check-ins','Beginner friendly','Home & gym workouts','Results that last'] }
    },
    services: {
      kicker: { ar:'الخدمات',  en:'Services' },
      title:  { ar:'تدريب مبني *على مقاسچ*', en:'Coaching *built around you*' },
      sub:    { ar:'دعم مرن. نتائج حقيقية. نسخة أقوى وأصح منچ.', en:'Flexible support. Real results. A stronger, healthier you.' }
    },
    about: {
      kicker: { ar:'تعرّفي عليّ', en:'About' },
      title:  { ar:'أهلاً، آني زهراء', en:'Meet Zahraa' },
      sub:    { ar:'خبرة معتمدة. أسلوب عملي. بدون تطرّف.', en:'Certified expertise. A practical approach. No extremes.' },
      sign:   { ar:'زهراء هاشم', en:'Zahraa Hashim' },
      script: { ar:'نساء أقوى\nحياة أحلى', en:'Stronger women\nbrighter lives' },
      quote:  { ar:'صرت أقوى، أثق بنفسي أكثر، وأخيراً ملتزمة.', en:'I feel stronger, more confident, and finally consistent.' },
      quoteBy:{ ar:'سارة', en:'Sara' }
    },
    reviews: {
      kicker: { ar:'آراء المتدربات', en:'Testimonials' },
      title:  { ar:'كلامهن *يحچي*', en:'In *their* words' },
      sub:    { ar:'', en:'' }
    },
    plans: {
      kicker: { ar:'الاشتراك', en:'Plans' },
      title:  { ar:'الباقة اللي *تناسبچ*', en:'The plan that *fits you*' },
      sub:    { ar:'اختاري باقتچ وادفعي بأمان — ونبدي سوية من اليوم.', en:'Pick a plan, pay securely, and we start today.' },
      cta:    { ar:'اشتركي الآن', en:'Subscribe' },
      popular:{ ar:'الأكثر طلباً', en:'Most popular' },
      note:   { ar:'الدفع آمن عن طريق Wayl — بطاقة أو محفظة إلكترونية.', en:'Secure checkout via Wayl — card or e-wallet.' },
      details:{ ar:'التفاصيل', en:'Details' },
      back:   { ar:'رجوع', en:'Back' }
    },
    classes: {
      kicker: { ar:'الكلاسات', en:'Classes' },
      title:  { ar:'تمرّني *ويّانا* بالكلاس', en:'Train *with us* in class' },
      sub:    { ar:'جلسات جماعية بمواعيد ثابتة، طاقة عالية، ومتابعة مباشرة من الكوتش.', en:'Group sessions on a fixed schedule — high energy, coached live.' },
      cta:    { ar:'احجزي مكانچ', en:'Book your spot' },
      popular:{ ar:'الأكثر حجزاً', en:'Most booked' },
      wa:     { ar:'مرحبا كوتش، أريد أحجز بكلاس: {class}', en:'Hi coach, I’d like to book the {class} class' }
    },
    faq: {
      kicker: { ar:'أسئلة', en:'Support' },
      title:  { ar:'الأسئلة المتكررة', en:'Frequently asked questions' },
      sub:    { ar:'أجوبة واضحة، بدون تخمين.', en:'Straight answers. No guesswork.' }
    },
    contact: {
      kicker: { ar:'تواصل', en:'Contact' },
      title:  { ar:'جاهزة *نبدي*؟', en:'Ready to *start*?' },
      sub:    { ar:'راسليني وخلّي نسوي خطة على مقاسچ.', en:'Message me and let’s build a plan around you.' },
      wa:     { ar:'راسليني واتساب', en:'Message on WhatsApp' },
      ig:     { ar:'تابعيني انستغرام', en:'Follow on Instagram' }
    },
    footer: {
      rights: { ar:'كل الحقوق محفوظة', en:'All rights reserved' },
      admin:  { ar:'لوحة التحكم', en:'Admin' }
    },
    form: {
      title:  { ar:'استمارة التقييم الأولي', en:'Initial assessment' },
      sub:    { ar:'جاوبي بدقة حتى نصمم برنامج يناسب هدفچ ومستواچ وحالتچ الصحية.', en:'Answer carefully so we can build a plan around your goal, level and health.' },
      next:   { ar:'التالي', en:'Next' },
      prev:   { ar:'السابق', en:'Back' },
      submit: { ar:'إرسال الاستمارة', en:'Send form' },
      wait:   { ar:'ديرسل…', en:'Sending…' },
      need:   { ar:'جاوبي على الأسئلة المطلوبة (*)', en:'Please answer the required questions (*)' },
      okT:    { ar:'وصلت معلوماتچ', en:'Your answers are in' },
      okS:    { ar:'خطوة أخيرة: دزّي رسالة للكوتش على واتساب حتى نبدي.', en:'Last step: message the coach on WhatsApp so we can start.' },
      waBtn:  { ar:'أرسلي على واتساب', en:'Send on WhatsApp' },
      payBtn: { ar:'متابعة للدفع', en:'Continue to payment' },
      err:    { ar:'ما انحفظت بالموقع — بس تكدرين تدزين كل معلوماتچ على واتساب من الزر تحت.', en:'Could not save on the site — you can still send everything on WhatsApp below.' },
      wa:     { ar:'مرحبا كوتش، آني {name}، قمت بإرسال كافة معلوماتي — الباقة: {plan}', en:'Hi coach, I’m {name}, I’ve sent all my details — plan: {plan}' },
      consent:{ ar:'أوافق على استخدام معلوماتي لغرض التقييم الأولي وإعداد البرنامج المناسب.', en:'I agree to my information being used for the initial assessment and to build my plan.' },
      note:   { ar:'هذه الاستمارة للتقييم الأولي ولا تُعد تشخيصاً طبياً.', en:'This form is an initial assessment, not a medical diagnosis.' }
    },
    pay: {
      title:   { ar:'تأكيد الاشتراك', en:'Confirm subscription' },
      sub:     { ar:'اكتبي اسمچ ورقمچ، وبعدها تنتقلين لصفحة الدفع الآمنة.', en:'Enter your name and number, then continue to secure checkout.' },
      plan:    { ar:'الباقة', en:'Plan' },
      name:    { ar:'الاسم الكامل', en:'Full name' },
      phone:   { ar:'رقم الهاتف (واتساب)', en:'Phone (WhatsApp)' },
      submit:  { ar:'متابعة للدفع', en:'Continue to payment' },
      wait:    { ar:'لحظة…', en:'One moment…' },
      secure:  { ar:'الدفع يتم بصفحة Wayl المشفّرة — ما نشوف ولا نخزن معلومات البطاقة.', en:'Payment happens on Wayl’s encrypted page — we never see or store card details.' },
      okT:     { ar:'وصلنا اشتراكچ 🎉', en:'Subscription received 🎉' },
      okS:     { ar:'راح أتواصل وياچ على الواتساب خلال ٢٤ ساعة حتى نبدي.', en:'I’ll reach out on WhatsApp within 24 hours to get started.' },
      pendT:   { ar:'ديتأكد الدفع…', en:'Confirming payment…' },
      pendS:   { ar:'إذا كمّلتي الدفع، راح يتأكد خلال دقايق وأتواصل وياچ. إذا ما كمّلتيه، تكدرين تحاولين مرة ثانية.', en:'If you completed payment it will be confirmed within minutes and I’ll reach out. If not, you can try again.' },
      failT:   { ar:'الدفع ما كمل', en:'Payment not completed' },
      failS:   { ar:'ما انسحب أي مبلغ. تكدرين تحاولين مرة ثانية أو تراسليني.', en:'Nothing was charged. Try again or message me.' },
      err:     { ar:'صار خطأ بالاتصال — جرّبي مرة ثانية أو راسليني واتساب.', en:'Connection error — try again or message me on WhatsApp.' },
      needName:{ ar:'اكتبي اسمچ', en:'Please enter your name' },
      needPhone:{ ar:'اكتبي رقم صحيح', en:'Please enter a valid number' },
      wa:      { ar:'مرحبا كوتش، أريد أشترك بباقة: {plan}', en:'Hi coach, I’d like to join the {plan} plan' }
    }
  };

  /* مخطط اللوحة — الترتيب هنا هو ترتيب ظهور الأقسام بالصفحة */
  var S = [
    { g:'nav',      t:'شريط التنقل',          icon:'i-menu', f:[
      ['services','رابط الخدمات'],['about','رابط عنّي'],['plans','رابط الباقات'],['classes','رابط الكلاسات'],['faq','رابط الأسئلة'],
      ['contact','رابط التواصل'],['food','رابط صفحة الأكل (إذا شغّالة)'],['courses','رابط صفحة التمارين (إذا شغّالة)'],
      ['cta','زر الاشتراك']]},
    { g:'intro',    t:'بطاقة البداية',         icon:'i-spark', f:[
      ['kicker','السطر الصغير فوق العنوان'],['title','العنوان الكبير','title'],['sub','الوصف','area'],
      ['cta1','الزر الأول (يودّي للباقات)'],['ctaClasses','الزر الثاني (يودّي للكلاسات)'],['badge','رقم النجمة الدوّارة'],['badgeSub','كلمة تحت الرقم'],
      ['floatT','البطاقة العائمة — العنوان'],['floatS','البطاقة العائمة — السطر الثاني']]},
    { g:'marquee',  t:'الشريط المتحرك',        icon:'i-check-circle', f:[ ['items','المميزات — كل سطر عنصر','lines'] ]},
    { g:'services', t:'قسم الخدمات',           icon:'i-dumbbell', f:[
      ['kicker','السطر الصغير'],['title','العنوان','title'],['sub','الوصف','area']]},
    { g:'about',    t:'قسم تعرّفي عليّ',        icon:'i-user', f:[
      ['kicker','السطر الصغير'],['title','العنوان'],['sub','الوصف'],['sign','التوقيع'],['script','الكتابة المائلة على الصورة','area'],
      ['quote','الاقتباس بالبطاقة الوردية (فاضي = تختفي البطاقة)','area'],['quoteBy','اسم صاحبة الاقتباس']]},
    { g:'reviews',  t:'قسم الآراء',            icon:'i-star', f:[
      ['kicker','السطر الصغير'],['title','العنوان','title'],['sub','الوصف','area']]},
    { g:'plans',    t:'قسم الباقات',           icon:'i-check-circle', f:[
      ['kicker','السطر الصغير'],['title','العنوان','title'],['sub','الوصف','area'],
      ['cta','زر الاشتراك بكل باقة'],['popular','شارة الباقة المميزة'],['note','ملاحظة الدفع تحت الباقات','area'],
      ['details','زر «التفاصيل» اللي يقلب البطاقة (الباقات والكلاسات)'],['back','زر الرجوع بظهر البطاقة']]},
    { g:'classes',  t:'قسم الكلاسات',          icon:'i-users', f:[
      ['kicker','السطر الصغير'],['title','العنوان','title'],['sub','الوصف','area'],
      ['cta','زر الحجز بكل كلاس'],['popular','شارة الكلاس المميز'],['wa','رسالة الواتساب الجاهزة ({class} = اسم الكلاس)','area']]},
    { g:'faq',      t:'قسم الأسئلة',           icon:'i-info', f:[
      ['kicker','السطر الصغير'],['title','العنوان'],['sub','الوصف','area']]},
    { g:'contact',  t:'قسم التواصل',           icon:'i-whatsapp', f:[
      ['kicker','السطر الصغير'],['title','العنوان','title'],['sub','الوصف','area'],['wa','زر الواتساب'],['ig','زر الانستغرام']]},
    { g:'footer',   t:'الفوتر',                icon:'i-book', f:[ ['rights','سطر الحقوق'],['admin','رابط اللوحة'] ]},
    { g:'form',     t:'استمارة التقييم',        icon:'i-edit', f:[
      ['title','عنوان الاستمارة'],['sub','الوصف','area'],['next','زر التالي'],['prev','زر السابق'],['submit','زر الإرسال'],
      ['wait','نص الانتظار'],['need','تنبيه: أسئلة ناقصة'],['okT','بعد الإرسال — العنوان'],['okS','بعد الإرسال — الوصف','area'],
      ['waBtn','زر الواتساب'],['payBtn','زر الدفع (إذا الدفع شغّال)'],['err','رسالة إذا فشل الحفظ','area'],
      ['wa','أول سطر برسالة الواتساب ({name} = الاسم، {plan} = الباقة)','area'],['consent','نص الموافقة','area'],['note','الملاحظة تحت الموافقة','area']]},
    { g:'pay',      t:'نافذة الدفع والرسائل',   icon:'i-lock', f:[
      ['title','عنوان النافذة'],['sub','الوصف','area'],['plan','كلمة «الباقة»'],['name','حقل الاسم'],['phone','حقل الرقم'],
      ['submit','زر المتابعة'],['wait','نص الانتظار'],['secure','ملاحظة الأمان','area'],
      ['okT','نجاح الدفع — العنوان'],['okS','نجاح الدفع — الوصف','area'],
      ['pendT','الدفع قيد التأكيد — العنوان'],['pendS','الدفع قيد التأكيد — الوصف','area'],
      ['failT','فشل الدفع — العنوان'],['failS','فشل الدفع — الوصف','area'],
      ['err','رسالة خطأ الاتصال','area'],['needName','تنبيه: الاسم ناقص'],['needPhone','تنبيه: الرقم غلط'],
      ['wa','رسالة الواتساب الجاهزة ({plan} = اسم الباقة)','area']]}
  ];

  /* قوائم احتياطية — تبين بس إذا القائمة بالداتابيس فاضية تماماً،
     حتى الصفحة ما تطلع ناقصة بأول تشغيل. أول ما تكتبين قائمتچ باللوحة
     هاي تختفي. أشكالها نفس أعمدة site_info (شوف schema.sql). */
  var B = function(ar, en){ return { ar:ar, en:en } };
  var LISTS = {
    stats: [
      { n:B('+120','120+'), l:B('متدربة','clients') },
      { n:B('8','8'),       l:B('سنين خبرة','years coaching') },
      { n:B('4.9★','4.9★'), l:B('التقييم','rating') }
    ],
    creds: [
      { icon:'i-dumbbell', t:B('تدريب شخصي','1:1 personal training'),
        s:B('جلسات مركّزة، برمجة ذكية، ودعم مباشر.','Focused sessions, smart programming, hands-on support.') },
      { icon:'i-calendar', t:B('تدريب أونلاين','Online coaching'),
        s:B('تمارين مخصصة، متابعة أسبوعية، والتزام من أي مكان.','Personalized workouts, weekly check-ins, accountability anywhere.') },
      { icon:'i-salad', t:B('برنامج غذائي','Nutrition plan'),
        s:B('أكل من السوق المحلي، بدون حرمان ولا تطرّف.','Local-market food, no starving and no extremes.') }
    ],
    plans: [
      { name:B('أساسي','Basic'), price:B('35,000','35,000'), unit:B('د.ع / شهر','IQD / month'), amount:35000,
        desc:B('برنامج تمارين شهري','A monthly workout plan'),
        features:{ ar:['برنامج تمارين','متابعة شهرية'], en:['Workout plan','Monthly check-in'] } },
      { featured:true, name:B('متكامل','Complete'), price:B('60,000','60,000'), unit:B('د.ع / شهر','IQD / month'), amount:60000,
        desc:B('تمارين + تغذية + متابعة أسبوعية','Workouts + nutrition + weekly check-ins'),
        features:{ ar:['برنامج تمارين','برنامج غذائي','متابعة أسبوعية','دعم واتساب'], en:['Workout plan','Nutrition plan','Weekly check-ins','WhatsApp support'] } },
      { name:B('٣ شهور','3 months'), price:B('150,000','150,000'), unit:B('د.ع','IQD'), amount:150000,
        desc:B('الباقة المتكاملة لثلاث شهور بسعر أقل','Complete plan for 3 months, for less'),
        features:{ ar:['كل مميزات المتكامل','تعديل البرنامج كل شهر'], en:['Everything in Complete','Monthly plan updates'] } }
    ],
    quotes: [
      { t:B('صرت أقوى، أثق بنفسي أكثر، وأخيراً ملتزمة.','I feel stronger, more confident, and finally consistent.'),
        n:B('سارة','Sara'), r:B('متدربة أونلاين','Online client') }
    ],
    faq: [
      { q:B('شنو الباقة المناسبة إلي؟','Which plan is right for me?'),
        a:B('إذا تبدين من الصفر، المتكامل أحسن بداية لأن بيه متابعة أسبوعية. وإذا عندچ خبرة، الأساسي يكفي.','Starting from scratch? Complete is the best start thanks to weekly check-ins. Experienced? Basic is enough.') },
      { q:B('شكد وقت أحتاج بالأسبوع؟','How much time do I need each week?'),
        a:B('أغلب البرامج ٣–٤ تمارين بالأسبوع، كل وحدة ٣٠–٦٠ دقيقة، ونعدّلها على وقتچ.','Most plans are 3–4 sessions a week, 30–60 minutes each, adjusted to your schedule.') },
      { q:B('لازم أمشي على رجيم قاسي؟','Do I have to follow a strict diet?'),
        a:B('لا. التغذية مرنة وعملية — ماكو أكل ممنوع ولا حرمان.','No. Nutrition is practical and flexible — no banned foods, no starving.') }
    ]
  };

  window.LANDING_DEFAULTS = D;
  window.LANDING_LISTS    = LISTS;
  window.LANDING_SCHEMA   = S;
})();
