/**
 * Ambil GOOGLE_REFRESH_TOKEN untuk akun Drive tujuan upload.
 *
 *   node scripts/get-refresh-token.mjs
 *
 * Butuh GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET sudah terisi di .env.local.
 * Jalankan sekali saja — hasilnya tempel ke .env.local, lalu simpan juga di
 * environment variables Vercel.
 */

import http from "node:http";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const PORT = 5175;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// drive.file = akses hanya ke file yang dibuat aplikasi ini sendiri.
// Statusnya non-sensitive, jadi tidak butuh verifikasi Google dan tidak
// diblokir di mode production. Konsekuensinya folder tujuan harus dibuat
// oleh aplikasi — lihat scripts/ensure-folder.mjs.
const SCOPE =
  process.env.DRIVE_SCOPE ?? "https://www.googleapis.com/auth/drive.file";

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
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };
const clientId = env.GOOGLE_CLIENT_ID;
const clientSecret = env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "\n  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET belum ada di .env.local.\n",
  );
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });

console.log("\n  Buka link ini di browser, login pakai akun Drive tujuan:\n");
console.log(`  ${authUrl}\n`);
console.log(
  "  Kalau muncul layar 'Google hasn't verified this app',\n" +
    "  klik Advanced → Go to … (unsafe). Itu normal untuk aplikasi internal.\n",
);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Gagal: ${error ?? "kode tidak diterima"}`);
    server.close();
    process.exit(1);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const json = await tokenRes.json();

  if (!tokenRes.ok || !json.refresh_token) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Gagal menukar kode. Cek terminal.");
    console.error("\n  Gagal:", json, "\n");
    server.close();
    process.exit(1);
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(
    "<body style='font-family:system-ui;padding:3rem'>" +
      "<h2>Berhasil</h2><p>Refresh token sudah tercetak di terminal. " +
      "Tab ini boleh ditutup.</p></body>",
  );

  console.log("\n  Tempel baris ini ke .env.local:\n");
  console.log(`  GOOGLE_REFRESH_TOKEN=${json.refresh_token}\n`);

  server.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`  Menunggu callback di ${REDIRECT_URI} …\n`);
});

// Biar Ctrl+C bersih
createInterface({ input: process.stdin }).on("SIGINT", () => {
  server.close();
  process.exit(0);
});
