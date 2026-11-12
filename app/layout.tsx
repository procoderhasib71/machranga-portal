import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bengali", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "মাছরাঙা পোর্টাল",
  description: "তোমার মাছরাঙা সহকারীর সবকিছু এক জায়গায়: কাজের লিস্ট, রুটিন, স্বাস্থ্য, পড়াশোনা",
};

export const viewport: Viewport = { themeColor: "#0d7a6f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className={bengali.variable}>{children}</body>
    </html>
  );
}
