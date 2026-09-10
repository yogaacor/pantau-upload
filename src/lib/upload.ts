/**
 * Upload resumable ke Google Drive dari browser.
 *
 * File dipotong per 8 MB dan dikirim langsung ke session URI milik Google.
 * Kalau koneksi putus di tengah, posisi terakhir ditanyakan ulang ke Google
 * lalu upload dilanjutkan dari byte itu — bukan mengulang dari nol.
 */

const CHUNK_SIZE = 8 * 1024 * 1024; // kelipatan 256 KB, syarat dari Google
const MAX_RETRY = 5;

export type UploadProgress = { sent: number; total: number };

export class UploadAbortedError extends Error {
  constructor() {
    super("Upload dibatalkan");
  }
}

type XhrResult = {
  status: number;
  responseText: string;
  range: string | null;
};

function putChunk(
  uploadUrl: string,
  blob: Blob,
  start: number,
  total: number,
  signal: AbortSignal,
  onChunkProgress: (loaded: number) => void,
): Promise<XhrResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader(
      "Content-Range",
      `bytes ${start}-${start + blob.size - 1}/${total}`,
    );

    const onAbort = () => xhr.abort();
    signal.addEventListener("abort", onAbort);

    const cleanup = () => signal.removeEventListener("abort", onAbort);

    xhr.upload.onprogress = (e) => onChunkProgress(e.loaded);
    xhr.onerror = () => {
      cleanup();
      reject(new Error("Koneksi terputus"));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new UploadAbortedError());
    };
    xhr.onload = () => {
      cleanup();
      resolve({
        status: xhr.status,
        responseText: xhr.responseText,
        range: xhr.getResponseHeader("Range"),
      });
    };

    xhr.send(blob);
  });
}

/** Tanya Google sudah sampai byte ke berapa. */
async function queryOffset(uploadUrl: string, total: number): Promise<number> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Range": `bytes */${total}` },
  });

  if (res.status === 200 || res.status === 201) return total;
  if (res.status === 308) {
    const range = res.headers.get("Range");
    if (!range) return 0;
    return Number(range.split("-")[1]) + 1;
  }
  throw new Error(`Gagal memeriksa posisi upload (${res.status})`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function uploadToDrive(opts: {
  file: File;
  uploadUrl: string;
  signal: AbortSignal;
  onProgress: (p: UploadProgress) => void;
}): Promise<{ id: string; name: string }> {
  const { file, uploadUrl, signal, onProgress } = opts;
  const total = file.size;
  let offset = 0;
  let attempt = 0;

  while (offset < total) {
    if (signal.aborted) throw new UploadAbortedError();

    const end = Math.min(offset + CHUNK_SIZE, total);
    const blob = file.slice(offset, end);
    const base = offset;

    try {
      const res = await putChunk(uploadUrl, blob, offset, total, signal, (loaded) =>
        onProgress({ sent: base + loaded, total }),
      );

      if (res.status === 200 || res.status === 201) {
        onProgress({ sent: total, total });
        const json = JSON.parse(res.responseText) as { id: string; name: string };
        return json;
      }

      if (res.status === 308) {
        offset = res.range ? Number(res.range.split("-")[1]) + 1 : end;
        onProgress({ sent: offset, total });
        attempt = 0;
        continue;
      }

      // 4xx selain 308 tidak akan membaik dengan diulang.
      throw new Error(`Upload ditolak Google (${res.status}): ${res.responseText}`);
    } catch (err) {
      if (err instanceof UploadAbortedError || signal.aborted) throw err;
      if (++attempt > MAX_RETRY) throw err;

      await sleep(Math.min(2 ** attempt * 500, 8000));
      offset = await queryOffset(uploadUrl, total);
      onProgress({ sent: offset, total });
    }
  }

  // Semua byte terkirim tapi Google belum mengembalikan metadata.
  throw new Error("Upload selesai tapi Drive tidak mengembalikan data file");
}
