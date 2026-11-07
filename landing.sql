-- ══════════════════════════════════════════════════════════
--  الصفحة التعريفية + منصة الدفع
--  آمن يتكرر — نفّذيه بـ Supabase → SQL Editor → Run
--  يحتاج hardening.sql منفّذ قبله (دالة is_admin)
-- ══════════════════════════════════════════════════════════

-- ── ①  نصوص الصفحة التعريفية ──
-- كل نص بالصفحة الرئيسية. الشكل: {"intro":{"title":{"ar":"…","en":"…"}, …}, …}
-- المفاتيح والنص الافتراضي بـ landing-defaults.js. المفتاح الناقص = النص الافتراضي.
alter table public.site_info
  add column if not exists landing jsonb not null default '{}'::jsonb;

-- sections صار بيه ثلاث مفاتيح جديدة «تشتغل بس إذا انشغلت» (الناقص = مطفي):
--   food    — صفحة الأكل (catalog.html#/recipes)
--   courses — صفحة التمارين (catalog.html#/courses)
--   pay     — زر الاشتراك يفتح دفع Wayl بدل واتساب
-- ومفتاح services (قسم الخدمات) — مثل باقي الأقسام: الناقص = ظاهر.
-- ما يحتاج تعديل بالعمود نفسه.

-- ── ②  الطلبات ──
-- كل ضغطة «متابعة للدفع» تسوي صف هنا بحالة pending، ودالة الدفع
-- تحدّثه لـ paid أو failed بعد ما تتأكد من Wayl نفسه.
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  -- مفتاح سري يرجع ويّا الزبونة بالرابط بعد الدفع حتى تكدر تشوف
  -- حالة طلبها هي بس — بدونه أي أحد يخمّن رقم طلب ويشوف حالته
  view_key     uuid not null default gen_random_uuid(),
  plan_index   int  not null,
  plan_name    text not null default '',
  amount       int  not null check (amount > 0),          -- بالدينار
  currency     text not null default 'IQD',
  name         text not null check (char_length(name) between 2 and 80),
  phone        text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  lang         text not null default 'ar',
  status       text not null default 'pending'
               check (status in ('pending','paid','failed','cancelled')),
  wayl_ref     text,          -- referenceId اللي ندزه لـ Wayl (= id)
  wayl_link    text,          -- رابط صفحة الدفع
  wayl_payload jsonb,         -- آخر رد من Wayl — للمراجعة إذا صار خلاف
  contacted    boolean not null default false,  -- الكوتش علّمت إنها تواصلت
  note         text not null default '',
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

drop trigger if exists t_orders_touch on public.orders;
create trigger t_orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

alter table public.orders enable row level security;

-- ⚠️ الطلبات بيها أسماء وأرقام تلفونات — مقفلة على المشرفة بالكامل.
-- ماكو ولا سياسة anon: الزائرة ما تكتب هنا مباشرة أبداً. الكتابة
-- كلها من دالة wayl-checkout بمفتاح السيرفر (service role) اللي
-- يتخطّى RLS، وهو ما يطلع للمتصفح.
drop policy if exists orders_admin_read   on public.orders;
drop policy if exists orders_admin_update on public.orders;
drop policy if exists orders_admin_delete on public.orders;
create policy orders_admin_read   on public.orders for select using (public.is_admin());
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy orders_admin_delete on public.orders for delete using (public.is_admin());

revoke all on public.orders from anon;
grant select, update, delete on public.orders to authenticated;
