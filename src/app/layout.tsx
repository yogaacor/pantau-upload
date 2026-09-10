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
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
