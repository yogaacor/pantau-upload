/**
 * Helper Google Drive.
 *
 * Server hanya menerbitkan "tiket upload" (resumable session URI); byte
 * file-nya dikirim browser langsung ke Google, tidak lewat server ini.
 * Jadi hosting tidak kena bandwidth walau videonya beberapa GB.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";

type CachedToken = { value: string; expiresAt: number };
let cached: CachedToken | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Env ${name} belum diisi`);
  return value;
}

/** Access token akun Drive pemilik, ditukar dari refresh token. */
export async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Gagal menukar refresh token: ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cached.value;
}

/**
 * Buka sesi upload resumable di folder Drive tujuan.
 * `origin` harus diteruskan supaya Google mengirim header CORS yang benar
 * ke browser yang nanti melakukan PUT.
 */
export async function createResumableSession(opts: {
  name: string;
  mimeType: string;
  size: number;
  origin: string;
  /** Folder tujuan; default folder utama dari DRIVE_FOLDER_ID. */
  parentId?: string;
}): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": opts.mimeType,
      "X-Upload-Content-Length": String(opts.size),
      Origin: opts.origin,
    },
    body: JSON.stringify({
      name: opts.name,
      mimeType: opts.mimeType,
      parents: [opts.parentId || requireEnv("DRIVE_FOLDER_ID")],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Gagal membuka sesi upload Drive: ${await res.text()}`);
  }

  const location = res.headers.get("location");
  if (!location) throw new Error("Google tidak mengembalikan URL sesi upload");
  return location;
}

export async function deleteFile(fileId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `${FILES_URL}/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  // 404 berarti file memang sudah tidak ada — anggap sukses.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Gagal menghapus file Drive: ${await res.text()}`);
  }
}

export type DriveFileMeta = {
  id: string;
  name: string;
  size: number | null;
  mimeType: string;
  trashed: boolean;
};

export async function getFileMeta(fileId: string): Promise<DriveFileMeta | null> {
  const token = await getAccessToken();
  const url =
    `${FILES_URL}/${encodeURIComponent(fileId)}` +
    `?fields=id,name,size,mimeType,trashed&supportsAllDrives=true`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Gagal membaca file Drive: ${await res.text()}`);

  const json = (await res.json()) as {
    id: string;
    name: string;
    size?: string;
    mimeType: string;
    trashed: boolean;
  };

  return {
    id: json.id,
    name: json.name,
    size: json.size ? Number(json.size) : null,
    mimeType: json.mimeType,
    trashed: json.trashed,
  };
}

const FOLDER_MIME = "application/vnd.google-apps.folder";

/**
 * Buat subfolder di dalam folder tujuan dan kembalikan id-nya.
 *
 * Dipakai kiriman Zoom, yang berkasnya harus mempertahankan nama asli
 * (`double_click_to_convert_01.zoom`) supaya konverter Zoom mengenalinya.
 * Tanpa subfolder, kiriman dari banyak PIC akan bertumpuk dengan nama
 * yang persis sama di satu folder.
 */
export async function createSubfolder(name: string): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch(`${FILES_URL}?fields=id&supportsAllDrives=true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: [requireEnv("DRIVE_FOLDER_ID")],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Gagal membuat subfolder Drive: ${await res.text()}`);
  }

  const json = (await res.json()) as { id: string };
  return json.id;
}

export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function driveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function driveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Nama file yang seragam supaya isi folder Drive gampang dibaca:
 *   2026-09-10_Divisi-A_Judul-Video_PU-0007.mp4
 *
 * `tag` dipakai untuk menandai kiriman yang butuh penanganan khusus,
 * mis. ZOOM untuk rekaman mentah yang masih harus dikonversi — supaya
 * kelihatan dari nama berkasnya saja tanpa membuka dashboard.
 */
export function buildFileName(opts: {
  kode: string | null;
  divisi: string | null;
  judul: string;
  originalName: string;
  tag?: string | null;
}): string {
  const tanggal = new Date().toISOString().slice(0, 10);
  const ext = opts.originalName.includes(".")
    ? opts.originalName.slice(opts.originalName.lastIndexOf(".")).toLowerCase()
    : "";

  const slug = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);

  const parts = [tanggal];
  if (opts.tag) parts.push(opts.tag);
  if (opts.divisi) parts.push(slug(opts.divisi));
  parts.push(slug(opts.judul) || "tanpa-judul");
  if (opts.kode) parts.push(opts.kode);

  return parts.join("_") + ext;
}
