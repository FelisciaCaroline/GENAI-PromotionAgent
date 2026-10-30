import type { Metadata } from "next";
import { DM_Serif_Display, Inter, Space_Mono } from "next/font/google";
import "./globals.css";

const display = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "promo. | Asisten AI Promosi untuk UMKM",
  description: "Tulis satu kalimat, dapatkan jadwal posting, caption multi-bahasa, naskah TikTok, dan poster produk.",
  openGraph: { title: "promo. | Asisten AI Promosi untuk UMKM", description: "Satu kalimat jadi kampanye promo lengkap.", type: "website", locale: "id_ID" },
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%23F9C6D6'/><text x='16' y='23' font-size='20' text-anchor='middle' font-family='serif'>p</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
