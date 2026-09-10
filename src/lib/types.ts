export type Role = "pic" | "admin";

export type Status = "baru" | "diproses" | "revisi" | "selesai" | "ditolak";

export type Privacy = "public" | "unlisted" | "private";

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

  judul: string;
  deskripsi: string | null;
  tags: string[];
  kategori: string | null;
  privacy: Privacy;
  jadwal_tayang: string | null;
  catatan: string | null;

  drive_file_id: string | null;
  drive_file_name: string | null;
  drive_file_size: number | null;
  drive_mime: string | null;
  drive_deleted_at: string | null;

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

export const PRIVACY_LABEL: Record<Privacy, string> = {
  public: "Publik",
  unlisted: "Tidak terdaftar",
  private: "Privat",
};
