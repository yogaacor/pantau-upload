/**
 * Siapkan folder tujuan di Drive:
 *   node scripts/ensure-folder.mjs
 *
 * Scope drive.file hanya memberi akses ke berkas yang dibuat aplikasi ini
 * sendiri, jadi foldernya pun harus dibuat dari sini — bukan folder yang
 * sudah ada di Drive. Skrip ini idempoten: kalau foldernya sudah pernah
 * dibuat, ID yang sama dikembalikan, tidak membuat duplikat.
 */

import { readFileSync, writeFileSync } from "node:fs";

const NAMA_FOLDER = process.env.DRIVE_FOLDER_NAME ?? "pantau-upload";
const FOLDER_MIME = "application/vnd.google-apps.folder";

function loadEnv() {
  const env = {};
  for (const file of [".env.local", ".env"]) {
    let raw;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      if (line.trim().startsWith("#")) continue;
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };
const missing = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
].filter((k) => !env[k]);

if (missing.length) {
  console.error(`\n  Env belum lengkap: ${missing.join(", ")}`);
  console.error("  Jalankan dulu: npm run drive:token\n");
  process.exit(1);
}

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  }),
});

if (!tokenRes.ok) {
  console.error("\n  Refresh token ditolak:\n", await tokenRes.text(), "\n");
  process.exit(1);
}

const { access_token } = await tokenRes.json();
const auth = { Authorization: `Bearer ${access_token}` };

// Cari dulu — dengan drive.file, daftar ini hanya berisi berkas milik aplikasi.
const q = encodeURIComponent(
  `mimeType='${FOLDER_MIME}' and name='${NAMA_FOLDER}' and trashed=false`,
);
const cariRes = await fetch(
  `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=10`,
  { headers: auth },
);

if (!cariRes.ok) {
  console.error("\n  Gagal mencari folder:\n", await cariRes.text(), "\n");
  process.exit(1);
}

const { files } = await cariRes.json();
let folder = files?.[0];

if (folder) {
  console.log(`\n  Folder sudah ada: "${folder.name}"`);
} else {
  const buatRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,name",
    {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: NAMA_FOLDER, mimeType: FOLDER_MIME }),
    },
  );

  if (!buatRes.ok) {
    console.error("\n  Gagal membuat folder:\n", await buatRes.text(), "\n");
    process.exit(1);
  }

  folder = await buatRes.json();
  console.log(`\n  Folder dibuat: "${folder.name}"`);
}

console.log(`  ID    : ${folder.id}`);
console.log(`  Buka  : https://drive.google.com/drive/folders/${folder.id}`);

// Tulis balik ke .env.local supaya tidak perlu disalin manual.
try {
  const f = ".env.local";
  let s = readFileSync(f, "utf8");
  if (/^DRIVE_FOLDER_ID=.*$/m.test(s)) {
    s = s.replace(/^DRIVE_FOLDER_ID=.*$/m, `DRIVE_FOLDER_ID=${folder.id}`);
  } else {
    s += `\nDRIVE_FOLDER_ID=${folder.id}\n`;
  }
  writeFileSync(f, s);
  console.log("\n  DRIVE_FOLDER_ID sudah diperbarui di .env.local.\n");
} catch {
  console.log(`\n  Simpan sendiri ke .env.local: DRIVE_FOLDER_ID=${folder.id}\n`);
}
