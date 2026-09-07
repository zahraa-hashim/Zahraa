-- ════════════════════════════════════════════════════════════════
--  programs.sql — جدول برامج المتمرنين (خانة «كتابة كورسات» باللوحة)
--
--  ⚠️ لازم ينفّذ على Supabase مرة وحدة (SQL Editor). آمن يتكرر.
--
--  ⚠️⚠️ فرق جوهري عن `recipes` و`courses`:
--  هذا الجدول **ما بيه ولا سياسة anon**. البيانات شخصية — اسم المتمرن
--  ووزنه وطوله وتاريخ بدايته. القراءة والكتابة للمشرفة فقط عبر
--  public.is_admin(). البرامج ما تنعرض بالموقع العام أبداً؛ مخرَجها
--  الوحيد ورقة A4 تنطبع PDF وتنرسل يدوياً للمشترك.
-- ════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
--  ①  الجدول
-- ═══════════════════════════════════════════════════════════

create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),

  -- 'training' برنامج تمارين · 'nutrition' برنامج غذائي
  kind        text not null default 'training'
              constraint programs_kind_ck check (kind in ('training','nutrition')),

  title       text not null,

  -- بيانات المتمرن:
  -- {"name":"…","height":"170 سم","weight":"138 كغم","start":"2026-09-07",
  --  "daysPerWeek":4,"coach":"زهراء هاشم","weeks":8}
  trainee     jsonb not null default '{}'::jsonb,

  -- تصميم الورقة المطبوعة:
  -- {"logo":"…","logoPos":"right","cover":true,"coverImage":"…",
  --  "accent":"#B07D62","mono":false,"footer":"…","pageNum":true,
  --  "logCols":3,"showEn":true,"showVideo":true,"density":"comfy"}
  design      jsonb not null default '{}'::jsonb,

  -- محتوى البرنامج — الشكل يختلف حسب kind، شوف التعليق بالأسفل
  content     jsonb not null default '{}'::jsonb,

  -- قالب جاهز يتنسخ منه بدل ما ينكتب البرنامج من الصفر كل مرة
  is_template boolean not null default false,

  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- الجدول ينمشي عليه بالترتيب اليدوي ثم الأحدث — نفس نمط recipes/courses
create index if not exists programs_order_idx on public.programs (sort_order, created_at desc);
create index if not exists programs_kind_idx  on public.programs (kind);

-- ═══════════════════════════════════════════════════════════
--  ②  شكل content
-- ═══════════════════════════════════════════════════════════
--
--  kind = 'training'
--  {
--    "days": [{
--      "label":  "DAY 1",
--      "title":  "الجزء العلوي",
--      "kind":   "gym",            -- gym | bodyweight | cardio
--      "muscles":["صدر","ظهر","كتف"],
--      "rows":   [{"n":"ضغط الصدر بالجهاز","en":"BENCH PRESS MACHINE",
--                  "m":"الصدر","sets":"3","reps":"12","v":"https://…"}],
--      "note":   "الراحة بين الجولات: ٦٠ ثانية"
--    }],
--    "stretch": true               -- يضيف صفحتَي الإطالات الجاهزة
--  }
--
--  يوم kind = 'cardio' يستعمل نفس rows بحقول مختلفة:
--    {"n":"جهاز المشي","en":"TREADMILL","m":"سرعة ٤ · ارتفاع ٣","reps":"نص ساعة"}
--
--  kind = 'nutrition'
--  {
--    "meals":   [{"title":"الفطور","sub":"الوجبة الأولى",
--                 "rows":[{"n":"بيض مقلي أو مسلوق","m":"البروتين","reps":"٣–٤ بيضات"}],
--                 "note":"قبل التمرين: موزة واحدة"}],
--    "habits":  ["تناول الخضروات قبل كل وجبة أساسية"],
--    "tracker": true               -- جدول المتابعة الأسبوعية
--  }
--
--  ملاحظة: نفس سبب `ingredients` و`moves` — الشكل يتغيّر حسب النوع
--  وما ننبحث جوّاه بالـSQL، فـ jsonb أنسب من جداول منفصلة.

-- ═══════════════════════════════════════════════════════════
--  ③  updated_at تلقائياً — نفس ترايكر باقي الجداول
-- ═══════════════════════════════════════════════════════════

drop trigger if exists t_programs_touch on public.programs;
create trigger t_programs_touch
  before update on public.programs
  for each row execute function public.touch_updated_at();

-- ═══════════════════════════════════════════════════════════
--  ④  الصلاحيات — مشرفة فقط، بدون anon نهائياً
-- ═══════════════════════════════════════════════════════════

alter table public.programs enable row level security;

drop policy if exists programs_admin_all on public.programs;

-- ⚠️ ماكو policy لـ anon ولا لـ authenticated غير المشرفة.
-- الجدول مقفل بالكامل: مافي صف يطلع لأي أحد إلا المشرفة.
create policy programs_admin_all on public.programs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════
--  ⑤  مجلد تخزين جديد: media/programs/
-- ═══════════════════════════════════════════════════════════
--
--  ⚠️ سياسة التخزين بـ schema.sql تحصر الرفع بأربع مجلدات
--  ('recipes','courses','site','avatar'). بدون التحديث هذا أي رفع
--  لمجلد programs **ينرفض من السيرفر بصمت** — الشعارات وأغلفة
--  البرامج ما تنرفع أبداً.
--
--  السياستان تنبنيان من جديد بنفس نص schema.sql + المجلد الخامس.

drop policy if exists media_admin_insert on storage.objects;
create policy media_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and public.is_admin()
    and (storage.foldername(name))[1] in ('recipes','courses','site','avatar','programs')
  );

drop policy if exists media_admin_update on storage.objects;
create policy media_admin_update on storage.objects
  for update to authenticated
  using  (bucket_id = 'media' and public.is_admin())
  with check (
    bucket_id = 'media'
    and public.is_admin()
    and (storage.foldername(name))[1] in ('recipes','courses','site','avatar','programs')
  );

-- ═══════════════════════════════════════════════════════════
--  ⑥  التصميم الافتراضي — ينحفظ بـ site_info
-- ═══════════════════════════════════════════════════════════
--
--  حتى ما تعيد الكوتش ضبط الشعار والألوان بكل برنامج جديد.
--  أي برنامج جديد يفتح بهذا التصميم، وتقدر تعدّله له لحاله.
--  محفوظ بالداتابيس مو localStorage حتى ينمشي بين تلفونها ولابتوبها.

alter table public.site_info
  add column if not exists program_design jsonb not null default '{}'::jsonb;
