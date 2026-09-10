export type Role = "pic" | "admin";

export type Status = "baru" | "diproses" | "revisi" | "selesai" | "ditolak";

export type Privacy = "public" | "unlisted" | "private";

/**
 * Jenis kiriman.
 * - `video` — berkas video sudah jadi, tinggal diunggah apa adanya
 * - `zoom`  — rekaman Zoom mentah yang belum dikonversi; admin yang
 *             mengonversinya dulu sebelum diunggah
 */
export type Jenis = "video" | "zoom";

export type EventType =
  | "dibuat"
  | "status"
  | "komentar"
  | "file"
  | "youtube"
  | "drive_hapus";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  divisi: string | null;
  role: Role;
  blocked: boolean;
  created_at: string;
};

export type RequestRow = {
  id: string;
  kode: string | null;
  requester_id: string;

  jenis: Jenis;
  judul: string;
  deskripsi: string | null;
  tags: string[];
  kategori: string | null;
  privacy: Privacy;
  jadwal_tayang: string | null;
  catatan: string | null;

  drive_folder_id: string | null;

  drive_file_id: string | null;
  drive_file_name: string | null;
  drive_file_size: number | null;
  drive_mime: string | null;
  drive_deleted_at: string | null;

  /** Berkas kedua, hanya dipakai kiriman Zoom (…_02.zoom). */
  file2_id: string | null;
  file2_name: string | null;
  file2_size: number | null;

  thumb_file_id: string | null;
  thumb_file_name: string | null;

  ck_final: boolean;
  ck_resolusi: boolean;
  ck_copyright: boolean;
  ck_audio: boolean;

  status: Status;
  youtube_url: string | null;
  youtube_video_id: string | null;
  published_at: string | null;

  created_at: string;
  updated_at: string;
};

export type RequestWithRequester = RequestRow & {
  requester: Pick<Profile, "id" | "full_name" | "email" | "divisi"> | null;
};

export type RequestEvent = {
  id: number;
  request_id: string;
  actor_id: string | null;
  actor_name: string | null;
  type: EventType;
  from_status: Status | null;
  to_status: Status | null;
  message: string | null;
  created_at: string;
};

export const STATUS_LABEL: Record<Status, string> = {
  baru: "Baru",
  diproses: "Diproses",
  revisi: "Perlu revisi",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

/** Tailwind classes per status — dipakai di badge dan filter. */
export const STATUS_STYLE: Record<Status, string> = {
  baru: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  diproses: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  revisi: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  selesai: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  ditolak: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/30",
};

export const STATUS_ORDER: Status[] = [
  "baru",
  "diproses",
  "revisi",
  "selesai",
  "ditolak",
];

export const JENIS_LABEL: Record<Jenis, string> = {
  video: "Video jadi",
  zoom: "Zoom mentah",
};

export const JENIS_STYLE: Record<Jenis, string> = {
  video: "bg-brand-500/10 text-brand-400 ring-brand-500/30",
  zoom: "bg-violet-500/10 text-violet-300 ring-violet-500/30",
};

/**
 * Ekstensi yang diterima untuk kiriman Zoom mentah.
 *
 * Rekaman Zoom yang belum dikonversi berbentuk `.zoom` (mis.
 * `double_click_to_convert_01.zoom`) dan browser melaporkannya tanpa
 * mime video, jadi penyaringan harus lewat ekstensi. Beberapa format
 * lain ikut diterima karena hasil rekaman lokal Zoom bisa bermacam
 * bentuk, termasuk ketika PIC mengarsipkan seluruh foldernya.
 */
/**
 * Nama berkas yang diharapkan dari rekaman Zoom lokal yang belum
 * dikonversi. Ditampilkan sebagai petunjuk di form upload, dan namanya
 * dipertahankan apa adanya di Drive karena konverter Zoom bergantung
 * pada penamaan ini.
 */
export const ZOOM_FILES = [
  "double_click_to_convert_01.zoom",
  "double_click_to_convert_02.zoom",
] as const;

export const ZOOM_EXT = [
  ".zoom",
  ".mp4",
  ".m4a",
  ".m4v",
  ".mov",
  ".mkv",
  ".avi",
  ".zip",
] as const;

export const PRIVACY_LABEL: Record<Privacy, string> = {
  public: "Publik",
  unlisted: "Tidak terdaftar",
  private: "Privat",
};
