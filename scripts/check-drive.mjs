/**
 * Uji koneksi Drive dari ujung ke ujung:
 *   node scripts/check-drive.mjs
 *
 * 1. tukar refresh token jadi access token
 * 2. baca metadata folder tujuan
 * 3. buat file uji kecil di folder itu, lalu hapus lagi
 *
 * Kalau ketiganya lolos, upload dari website pasti jalan.
 */

import { readFileSync } from "node:fs";

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
const need = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "DRIVE_FOLDER_ID",
];

const missing = need.filter((k) => !env[k]);
if (missing.length) {
  console.error(`\n  Env belum lengkap: ${missing.join(", ")}\n`);
  process.exit(1);
}

const ok = (m) => console.log(`  [32m✓[0m ${m}`);
const fail = (m, detail) => {
  console.error(`  [31m✗[0m ${m}`);
  if (detail) console.error(`\n${detail}\n`);
  process.exit(1);
};

console.log("");

// 1. access token ------------------------------------------------------
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

if (!tokenRes.ok) fail("Refresh token ditolak", await tokenRes.text());
const { access_token } = await tokenRes.json();
ok("Refresh token valid");

const auth = { Authorization: `Bearer ${access_token}` };

// 2. folder tujuan -----------------------------------------------------
const folderRes = await fetch(
  `https://www.googleapis.com/drive/v3/files/${env.DRIVE_FOLDER_ID}` +
    "?fields=id,name,mimeType,capabilities(canAddChildren)&supportsAllDrives=true",
  { headers: auth },
);

if (!folderRes.ok) {
  fail(
    "Folder tujuan tidak terbaca — cek DRIVE_FOLDER_ID, atau scope OAuth-nya kurang",
    await folderRes.text(),
  );
}

const folder = await folderRes.json();
ok(`Folder ketemu: "${folder.name}"`);

if (folder.capabilities && folder.capabilities.canAddChildren === false) {
  fail("Akun ini tidak punya izin menambah file ke folder tersebut");
}

// 3. tulis lalu hapus --------------------------------------------------
const boundary = "pantau-upload-check";
const metadata = {
  name: ".pantau-upload-check.txt",
  parents: [env.DRIVE_FOLDER_ID],
};

const body =
  `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
  `${JSON.stringify(metadata)}\r\n` +
  `--${boundary}\r\nContent-Type: text/plain\r\n\r\n` +
  `uji tulis dari pantau-upload\r\n` +
  `--${boundary}--`;

const createRes = await fetch(
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
  {
    method: "POST",
    headers: { ...auth, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  },
);

if (!createRes.ok) fail("Gagal menulis file ke folder", await createRes.text());
const created = await createRes.json();
ok("Berhasil menulis file uji");

const delRes = await fetch(
  `https://www.googleapis.com/drive/v3/files/${created.id}?supportsAllDrives=true`,
  { method: "DELETE", headers: auth },
);

if (!delRes.ok && delRes.status !== 404) {
  fail("Gagal menghapus file uji", await delRes.text());
}
ok("Berhasil menghapus file uji");

console.log("\n  Drive siap dipakai.\n");
