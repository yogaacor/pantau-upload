-- =====================================================================
-- pantau-upload — skema database (jalankan di Supabase SQL Editor)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- allowlist: pra-penetapan peran & divisi.
--
-- Pendaftaran terbuka: siapa pun yang login dengan Google otomatis
-- menjadi PIC. Tabel ini tidak lagi menjadi gerbang masuk, melainkan
-- dipakai untuk menetapkan peran admin (dan divisi) lebih dulu, sebelum
-- orangnya pertama kali login.
-- ---------------------------------------------------------------------
create table if not exists public.allowlist (
  email      text primary key,
  role       text not null default 'pic' check (role in ('pic', 'admin')),
  divisi     text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- profiles: cermin dari auth.users + role
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null,
  full_name  text,
  avatar_url text,
  divisi     text,
  role       text not null default 'pic' check (role in ('pic', 'admin')),
  created_at timestamptz not null default now()
);

-- Akun yang diblokir admin: masih bisa login, tapi tidak bisa membuat
-- atau mengubah apa pun. Dipakai sebagai rem karena pendaftaran terbuka.
alter table public.profiles
  add column if not exists blocked boolean not null default false;

-- ---------------------------------------------------------------------
-- requests: satu baris = satu permintaan upload
-- ---------------------------------------------------------------------
create table if not exists public.requests (
  id               uuid primary key default gen_random_uuid(),
  kode             text unique,
  requester_id     uuid not null references public.profiles (id) on delete cascade,

  -- metadata video
  judul            text not null,
  deskripsi        text,
  tags             text[] not null default '{}',
  kategori         text,
  privacy          text not null default 'public'
                     check (privacy in ('public', 'unlisted', 'private')),
  jadwal_tayang    timestamptz,
  catatan          text,

  -- file video di Drive
  drive_file_id    text,
  drive_file_name  text,
  drive_file_size  bigint,
  drive_mime       text,
  drive_deleted_at timestamptz,

  -- thumbnail (opsional)
  thumb_file_id    text,
  thumb_file_name  text,

  -- checklist kelayakan
  ck_final         boolean not null default false,
  ck_resolusi      boolean not null default false,
  ck_copyright     boolean not null default false,
  ck_audio         boolean not null default false,

  -- hasil
  status           text not null default 'baru'
                     check (status in ('baru', 'diproses', 'revisi', 'selesai', 'ditolak')),
  youtube_url      text,
  youtube_video_id text,
  published_at     timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists requests_requester_idx on public.requests (requester_id);
create index if not exists requests_status_idx    on public.requests (status, created_at desc);

-- Jenis kiriman:
--   'video' — berkas video yang sudah jadi, siap diunggah apa adanya
--   'zoom'  — rekaman Zoom mentah yang belum dikonversi, karena
--             penyimpanan PIC penuh sehingga tidak bisa mengonversi
--             sendiri. Admin yang mengonversi lalu mengunggahnya.
--
-- Ditulis sebagai alter terpisah, bukan bagian create table di atas,
-- supaya berkas ini tetap aman dijalankan ulang pada database yang
-- tabelnya sudah ada.
alter table public.requests
  add column if not exists jenis text not null default 'video';

do $add_jenis_check$
begin
  alter table public.requests
    add constraint requests_jenis_check check (jenis in ('video', 'zoom'));
exception
  when duplicate_object then null;
end
$add_jenis_check$;


-- ---------------------------------------------------------------------
-- request_events: jejak aktivitas + thread komentar
-- ---------------------------------------------------------------------
create table if not exists public.request_events (
  id          bigserial primary key,
  request_id  uuid not null references public.requests (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_name  text,
  type        text not null
                check (type in ('dibuat', 'status', 'komentar', 'file', 'youtube', 'drive_hapus')),
  from_status text,
  to_status   text,
  message     text,
  created_at  timestamptz not null default now()
);

create index if not exists events_request_idx on public.request_events (request_id, created_at);

-- =====================================================================
-- Helper
-- =====================================================================

-- Dipakai di dalam policy. SECURITY DEFINER supaya tidak memicu rekursi
-- RLS ketika policy tabel lain mengecek role di profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not blocked
  );
$fn$;

-- Akun aktif = sudah punya profile dan tidak diblokir. Dipakai pada
-- policy tulis, sehingga akun yang diblokir tidak bisa membuat request
-- baru walau masih bisa login.
create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and not blocked
  );
$fn$;

-- Nomor urut request: PU-0001, PU-0002, ...
create sequence if not exists public.request_kode_seq;

create or replace function public.set_request_kode()
returns trigger
language plpgsql
as $fn$
begin
  if new.kode is null then
    new.kode := 'PU-' || lpad(nextval('public.request_kode_seq')::text, 4, '0');
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_request_kode on public.requests;
create trigger trg_request_kode
  before insert on public.requests
  for each row execute function public.set_request_kode();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists trg_requests_touch on public.requests;
create trigger trg_requests_touch
  before update on public.requests
  for each row execute function public.touch_updated_at();

-- Buat profile otomatis saat user pertama kali login lewat Google.
--
-- Pendaftaran terbuka: email yang tidak dikenal tetap diterima dan
-- langsung menjadi PIC. Kalau emailnya sudah tercantum di allowlist,
-- peran dan divisi dari sana yang dipakai — inilah cara menjadikan
-- seseorang admin sebelum ia pertama kali login.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  entry public.allowlist%rowtype;
begin
  select * into entry from public.allowlist where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, avatar_url, divisi, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             new.email),
    new.raw_user_meta_data ->> 'avatar_url',
    entry.divisi,
    coalesce(entry.role, 'pic')
  )
  on conflict (id) do nothing;

  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.profiles       enable row level security;
alter table public.requests       enable row level security;
alter table public.request_events enable row level security;
alter table public.allowlist      enable row level security;

-- profiles ------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Hanya admin yang boleh mengubah profile — termasuk menaikkan peran dan
-- memblokir. Policy lama mengizinkan setiap orang mengubah barisnya
-- sendiri, yang berarti siapa pun bisa menyetel role-nya menjadi 'admin'.
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- requests ------------------------------------------------------------
drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests
  for select using (requester_id = auth.uid() or public.is_admin());

drop policy if exists requests_insert on public.requests;
create policy requests_insert on public.requests
  for insert with check (requester_id = auth.uid() and public.is_active());

-- PIC hanya boleh mengubah request miliknya selama masih 'baru' atau
-- 'revisi'. Admin bebas.
drop policy if exists requests_update on public.requests;
create policy requests_update on public.requests
  for update
  using (
    public.is_admin()
    or (requester_id = auth.uid() and status in ('baru', 'revisi') and public.is_active())
  )
  with check (
    public.is_admin()
    or (requester_id = auth.uid() and status in ('baru', 'revisi') and public.is_active())
  );

drop policy if exists requests_delete on public.requests;
create policy requests_delete on public.requests
  for delete using (
    public.is_admin()
    or (requester_id = auth.uid() and status = 'baru')
  );

-- request_events ------------------------------------------------------
drop policy if exists events_select on public.request_events;
create policy events_select on public.request_events
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.requests r
      where r.id = request_id and r.requester_id = auth.uid()
    )
  );

drop policy if exists events_insert on public.request_events;
create policy events_insert on public.request_events
  for insert with check (
    actor_id = auth.uid()
    and public.is_active()
    and (
      public.is_admin()
      or exists (
        select 1 from public.requests r
        where r.id = request_id and r.requester_id = auth.uid()
      )
    )
  );

-- allowlist -----------------------------------------------------------
drop policy if exists allowlist_admin on public.allowlist;
create policy allowlist_admin on public.allowlist
  for all using (public.is_admin()) with check (public.is_admin());
