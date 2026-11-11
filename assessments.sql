-- ══════════════════════════════════════════════════════════
--  استمارة التقييم + فيديوهات الكلاسات
--  آمن يتكرر — نفّذيه بـ Supabase → SQL Editor → Run
--  يحتاج hardening.sql منفّذ قبله (دالة is_admin)
-- ══════════════════════════════════════════════════════════

-- ── ①  استمارات التقييم ──
-- كل مشتركة تختار باقة تعبّي الاستمارة، وتنحفظ هنا وتبين بتبويب
-- «الاستمارات» باللوحة. بيها معلومات صحية — مقفلة على المشرفة.
create table if not exists public.assessments (
  id          uuid primary key default gen_random_uuid(),
  plan_index  int,
  plan_name   text not null default '' check (char_length(plan_name) <= 200),
  name        text not null check (char_length(name) between 2 and 80),
  phone       text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  age         int  check (age between 10 and 100),
  sex         text not null default '' check (char_length(sex) <= 40),
  weight      numeric(5,1) check (weight between 20 and 400),
  height      numeric(5,1) check (height between 80 and 250),
  service     text not null default '' check (char_length(service) <= 40),
  goals       text[] not null default '{}' check (cardinality(goals) <= 12),
  -- باقي الأجوبة (الصحة، النشاط، التغذية…) — مفتاح: جواب
  answers     jsonb not null default '{}'::jsonb check (pg_column_size(answers) <= 16000),
  consent     boolean not null check (consent),
  lang        text not null default 'ar' check (lang in ('ar','en')),
  contacted   boolean not null default false,   -- الكوتش علّمت إنها تواصلت
  note        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists assessments_created_idx on public.assessments (created_at desc);

alter table public.assessments enable row level security;

-- الزائرة تكدر «تضيف» استمارة بس — ما تكدر تقرا ولا تعدّل ولا تحذف،
-- حتى استمارتها. القراءة والتعديل للمشرفة حصراً.
drop policy if exists assessments_public_insert on public.assessments;
drop policy if exists assessments_admin_read    on public.assessments;
drop policy if exists assessments_admin_update  on public.assessments;
drop policy if exists assessments_admin_delete  on public.assessments;
create policy assessments_public_insert on public.assessments
  for insert to anon, authenticated
  with check (contacted = false and note = '');
create policy assessments_admin_read   on public.assessments for select using (public.is_admin());
create policy assessments_admin_update on public.assessments for update using (public.is_admin()) with check (public.is_admin());
create policy assessments_admin_delete on public.assessments for delete using (public.is_admin());

revoke all on public.assessments from anon;
grant insert on public.assessments to anon;
grant select, insert, update, delete on public.assessments to authenticated;

-- ── ②  فيديوهات الكلاسات ──
-- باكت منفصل عن الصور: حد ٥٠ ميغا للفيديو (أعلى حد بالخطة المجانية).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists videos_public_read  on storage.objects;
drop policy if exists videos_admin_insert on storage.objects;
drop policy if exists videos_admin_update on storage.objects;
drop policy if exists videos_admin_delete on storage.objects;

create policy videos_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'videos');
create policy videos_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos' and public.is_admin() and (storage.foldername(name))[1] = 'classes');
create policy videos_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'videos' and public.is_admin())
  with check (bucket_id = 'videos' and public.is_admin() and (storage.foldername(name))[1] = 'classes');
create policy videos_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos' and public.is_admin());
