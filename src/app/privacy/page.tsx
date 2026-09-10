import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — pantau-upload",
  description:
    "Data apa yang dikumpulkan pantau-upload, bagaimana data Google digunakan, dan bagaimana menghapusnya.",
};

/** Ganti kalau kontaknya pindah. Dipakai juga di consent screen Google. */
const KONTAK = "yogayudhatama48@gmail.com";
const TERAKHIR_DIPERBARUI = "10 September 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="grid size-7 place-items-center rounded-md bg-brand-600 text-[13px] text-white">
              ▶
            </span>
            pantau<span className="-ml-2 text-ink-400">-upload</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">
          Kebijakan Privasi
        </h1>
        <p className="mt-2 text-sm text-ink-400">
          Terakhir diperbarui: {TERAKHIR_DIPERBARUI}
        </p>

        <div className="mt-10 space-y-10">
          <Bagian judul="Tentang aplikasi ini">
            <p>
              pantau-upload adalah alat kerja internal untuk mengelola antrian
              permintaan unggah video ke YouTube. Aplikasi ini tidak terbuka
              untuk umum: hanya alamat email yang sudah didaftarkan lebih dahulu
              oleh administrator yang dapat masuk dan menggunakannya.
            </p>
          </Bagian>

          <Bagian judul="Data yang dikumpulkan">
            <ul className="space-y-2.5">
              <Poin label="Identitas dasar dari Google">
                Nama, alamat email, dan foto profil, diambil saat kamu masuk
                menggunakan akun Google. Dipakai untuk menampilkan siapa
                pengirim tiap permintaan.
              </Poin>
              <Poin label="Isi permintaan">
                Judul, deskripsi, tag, kategori, jadwal tayang yang diinginkan,
                serta catatan dan komentar yang kamu tulis sendiri.
              </Poin>
              <Poin label="Berkas yang diunggah">
                Berkas video yang sudah jadi, rekaman rapat mentah yang belum
                dikonversi, dan gambar sampul — beserta nama, ukuran, dan tipe
                berkasnya.
              </Poin>
              <Poin label="Jejak aktivitas">
                Catatan perubahan status dan waktunya, agar riwayat tiap
                permintaan dapat ditelusuri.
              </Poin>
            </ul>
            <p className="mt-4">
              Aplikasi ini tidak memasang iklan, tidak melakukan pelacakan
              lintas situs, dan tidak membuat profil perilaku pengguna.
            </p>
          </Bagian>

          <Bagian judul="Bagaimana data Google digunakan">
            <p>
              Aplikasi ini meminta izin{" "}
              <code className="rounded bg-ink-850 px-1.5 py-0.5 text-xs text-ink-300">
                https://www.googleapis.com/auth/drive
              </code>{" "}
              terhadap satu akun Google Drive milik administrator, yaitu akun
              tujuan penyimpanan berkas. Izin itu dipakai hanya untuk:
            </p>
            <ul className="mt-3 space-y-2.5">
              <Poin label="Menyimpan berkas">
                Menulis video dan gambar sampul yang diunggah ke satu folder
                yang sudah ditentukan.
              </Poin>
              <Poin label="Membaca keterangan berkas">
                Mengambil nama, ukuran, dan tipe berkas untuk ditampilkan pada
                antrian.
              </Poin>
              <Poin label="Menghapus berkas">
                Menghapus berkas mentah setelah videonya tayang, agar kuota
                penyimpanan tidak menumpuk.
              </Poin>
            </ul>
            <p className="mt-4">
              Berkas dikirim dari peramban kamu langsung ke server Google.
              Berkas tersebut tidak melewati, tidak disalin, dan tidak disimpan
              di server aplikasi ini. Aplikasi ini juga tidak membaca isi Drive
              di luar folder tujuan tersebut.
            </p>
          </Bagian>

          <Bagian judul="Penggunaan Terbatas (Limited Use)">
            <p className="rounded-lg border border-ink-700 bg-ink-850/60 p-4 leading-relaxed">
              Penggunaan dan pemindahan informasi yang diterima aplikasi ini
              dari Google API akan mengikuti{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 underline underline-offset-2"
              >
                Google API Services User Data Policy
              </a>
              , termasuk ketentuan Penggunaan Terbatas di dalamnya. Data
              tersebut tidak digunakan untuk iklan, tidak dijual, dan tidak
              diberikan kepada pihak ketiga selain penyedia layanan yang
              disebut di halaman ini.
            </p>
          </Bagian>

          <Bagian judul="Di mana data disimpan">
            <ul className="space-y-2.5">
              <Poin label="Supabase">
                Basis data dan sesi login. Akses tiap baris dibatasi aturan
                Row Level Security, sehingga seorang PIC hanya dapat melihat
                permintaan miliknya sendiri.
              </Poin>
              <Poin label="Google Drive">
                Berkas video dan gambar sampul, pada akun administrator.
              </Poin>
              <Poin label="Vercel">
                Menjalankan aplikasi web dan mencatat log permintaan teknis
                secara umum.
              </Poin>
            </ul>
          </Bagian>

          <Bagian judul="Berapa lama disimpan">
            <p>
              Data permintaan disimpan selama masih dibutuhkan sebagai arsip
              kerja. Berkas video mentah biasanya dihapus dari Drive segera
              setelah videonya tayang di YouTube. Kamu dapat meminta
              penghapusan data dirimu kapan saja lewat kontak di bawah, dan
              permintaan itu akan diproses bersama seluruh permintaan unggah
              atas namamu.
            </p>
          </Bagian>

          <Bagian judul="Mencabut akses">
            <p>
              Izin yang kamu berikan ke aplikasi ini dapat dicabut sendiri
              melalui{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 underline underline-offset-2"
              >
                halaman izin akun Google
              </a>{" "}
              kapan pun.
            </p>
          </Bagian>

          <Bagian judul="Kontak">
            <p>
              Pertanyaan atau permintaan penghapusan data dapat dikirim ke{" "}
              <a
                href={`mailto:${KONTAK}`}
                className="text-brand-400 underline underline-offset-2"
              >
                {KONTAK}
              </a>
              .
            </p>
          </Bagian>
        </div>

        <div className="mt-14 border-t border-ink-800 pt-6">
          <Link
            href="/"
            className="btn-back"
          >
            ← Kembali ke beranda
          </Link>
        </div>
      </main>
    </div>
  );
}

function Bagian({
  judul,
  children,
}: {
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-medium tracking-tight">{judul}</h2>
      <div className="text-sm leading-relaxed text-ink-300">{children}</div>
    </section>
  );
}

function Poin({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-600" />
      <span>
        <span className="text-ink-100">{label}.</span> {children}
      </span>
    </li>
  );
}
