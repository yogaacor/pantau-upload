import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan akses dev tools dari IP lokal di jaringan
  allowedDevOrigins: ["192.168.18.75", "localhost:3000", "127.0.0.1:3000"],
  // Akar proyek ditetapkan eksplisit supaya Turbopack tidak ikut membaca
  // package-lock.json milik folder di atasnya.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
