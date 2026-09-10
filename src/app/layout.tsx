import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "pantau-upload",
  description:
    "Antrian permintaan upload video YouTube — dari PIC, lewat Drive, sampai tayang.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
