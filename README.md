# pantau-upload

Antrian permintaan upload video YouTube. PIC mengisi request dan mengunggah
videonya lewat website; file-nya masuk langsung ke folder Google Drive admin.
Admin mengerjakan uploadnya manual di YouTube Studio, lalu menempelkan link
hasilnya — PIC melihat statusnya di dashboard.

## Alur

```
PIC buat request ──▶ upload video (browser ──▶ Drive)
                          │
                          ▼
                     status: Baru
                          │
        admin buka file lewat tombol "Buka di Drive"
                          │
                          ▼
                   status: Diproses ──▶ (Perlu revisi ──▶ balik ke PIC)
                          │
        admin upload manual ke YouTube, tempel linknya
                          │
                          ▼
                   status: Selesai ──▶ hapus file mentah dari Drive
```

Yang perlu digarisbawahi: **byte videonya tidak pernah lewat server ini.**
Server hanya menerbitkan *resumable session URI* dari Google, lalu browser PIC
mengirim file langsung ke Drive per potongan 8 MB. Hosting gratisan pun kuat
walau videonya beberapa GB, dan kalau koneksi putus upload dilanjutkan dari
byte terakhir, bukan mengulang dari nol.

## Yang dibutuhkan

- Node.js 20+
- Akun Supabase (gratis) — database + login Google
- Google Cloud project — akses Drive
- Folder Drive tujuan

---

## Setup

### 1. Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql), jalankan.
3. Buka **Project Settings → API**, salin `Project URL` dan `anon public key`.

### 2. Google Cloud (OAuth)

1. Buat project di [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs & Services → Library** → aktifkan **Google Drive API**.
3. **Google Auth Platform** (dulu bernama OAuth consent screen):
   - Audience: External
   - **Branding**: isi nama aplikasi, email, Application home page, dan
     Application privacy policy link (`https://<domainmu>/privacy`), serta
     Authorized domain
   - **Data Access**: tambahkan scope `https://www.googleapis.com/auth/drive.file`
   - **Audience → Publish app** (jangan biarkan di mode Testing — refresh
     token di mode Testing kedaluwarsa tiap 7 hari)

   > Scope `drive.file` dipilih karena statusnya *non-sensitive*: tidak perlu
   > verifikasi Google, dan tidak diblokir di mode production. Scope `drive`
   > penuh berstatus *restricted* — di production Google memblokirnya total
   > sampai aplikasi lolos audit keamanan.

4. **Clients → Create client** → *Web application*.

   Authorized redirect URIs — masukkan ketiganya:

   ```
   https://<PROJECT>.supabase.co/auth/v1/callback
   http://localhost:5175/callback
   ```

5. Salin **Client ID** dan **Client secret**.

### 3. Sambungkan login Google ke Supabase

Di dashboard Supabase: **Authentication → Sign In / Providers → Google** →
aktifkan, tempel Client ID & Client secret yang sama dari langkah 2.

Di **Authentication → URL Configuration**, tambahkan Redirect URL:

```
http://localhost:3000/**
https://<domain-produksi-kamu>/**
```

### 4. Isi environment

```bash
cp .env.example .env.local
```

Isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. `DRIVE_FOLDER_ID` biarkan kosong —
diisi otomatis di langkah 6.

### 5. Ambil refresh token Drive

```bash
npm run drive:token
```

Buka link yang tercetak, login dengan **akun Drive tujuan**, lalu izinkan.
`GOOGLE_REFRESH_TOKEN` yang tercetak tempel ke `.env.local`.

### 6. Buat folder tujuan

```bash
npm run drive:folder
```

Membuat folder bernama `pantau-upload` di Drive akun tersebut dan langsung
menulis ID-nya ke `.env.local`. Aman dijalankan berkali-kali — kalau
foldernya sudah ada, ID yang sama yang dipakai.

Foldernya harus dibuat lewat perintah ini, bukan folder lama yang sudah ada
di Drive: scope `drive.file` hanya memberi akses ke berkas yang dibuat
aplikasi ini sendiri. Setelah jadi, foldernya tetap milikmu — bisa dibuka,
dipindah, atau di-share seperti folder biasa.

Terakhir, pastikan semuanya nyambung:

```bash
npm run drive:check
```

Skrip ini menukar token, membaca folder tujuan, menulis file uji, lalu
menghapusnya lagi. Kalau ketiganya lolos, upload dari website pasti jalan.

### 7. Daftarkan dirimu sebagai admin

Login pertama kali hanya bisa kalau emailmu sudah ada di tabel `allowlist`.
Jalankan di Supabase SQL Editor:

```sql
insert into public.allowlist (email, role, divisi)
values ('email-kamu@gmail.com', 'admin', null);
```

Setelah itu anggota lain bisa kamu tambahkan lewat menu **Anggota** di web.

### 8. Jalankan

```bash
npm run dev
```

Buka http://localhost:3000.

---

## Deploy ke Vercel

1. Push repo ini ke GitHub, import di Vercel.
2. Salin semua isi `.env.local` ke **Settings → Environment Variables**.
3. Tambahkan domain produksi ke:
   - Supabase → Authentication → URL Configuration → Redirect URLs
   - Google Cloud → OAuth client → Authorized redirect URIs (kalau berubah)

---

## Catatan operasional

**Kuota Drive.** File-file ini dimiliki akun Google kamu, jadi memakan jatah
15 GB. Setelah status `Selesai`, tombol **Hapus file dari Drive** muncul di
panel admin — link YouTube-nya tetap tersimpan, yang hilang hanya file
mentahnya. Biasakan membersihkan supaya kuota tidak habis.

**Batas ukuran file.** Default 5 GB per file, diatur lewat `MAX_UPLOAD_BYTES`.

**Kenapa upload YouTube-nya manual.** YouTube Data API hanya memberi kuota
sekitar 6 upload per hari, dan video yang diunggah aplikasi belum terverifikasi
otomatis dikunci jadi *private*. Upload manual lewat YouTube Studio jauh lebih
praktis; yang diotomasi di sini adalah antrian dan pencatatannya.

**Siapa boleh apa.**

| | PIC | Admin |
|---|---|---|
| Buat request | ✓ | ✓ |
| Ubah request | hanya miliknya, saat status Baru / Perlu revisi | ✓ |
| Upload file | hanya miliknya, saat status Baru / Perlu revisi | ✓ |
| Ubah status | — | ✓ |
| Tempel link YouTube | — | ✓ |
| Hapus file Drive | — | ✓, hanya saat status Selesai |
| Kelola anggota | — | ✓ |

Aturan ini dipaksakan dua lapis: di route handler dan lewat Row Level Security
di Postgres, jadi tidak bisa ditembus dari client.

## Struktur

```
src/
  app/
    admin/                antrian admin + kelola anggota
    dashboard/            daftar & pembuatan request milik PIC
    request/[id]/         detail request, upload, riwayat
    api/
      requests/           CRUD request, komentar
      drive/session       terbitkan resumable session URI
      drive/attach        catat fileId setelah upload selesai
      drive/delete        bersihkan file mentah dari Drive
    auth/                 callback OAuth & signout
  components/             UI
  lib/
    google.ts             helper Drive (token, session, hapus)
    upload.ts             upload resumable dari browser
    supabase/             client server, browser, dan proxy
supabase/schema.sql       tabel, trigger, dan policy RLS
scripts/                  ambil refresh token & uji koneksi Drive
```
