import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { RegisterSW } from "@/components/InstallApp";

const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bengali", weight: ["400", "500", "600", "700"] });
const latin = Inter({ subsets: ["latin"], variable: "--font-latin" });

export const metadata: Metadata = {
  title: "মাছরাঙা পোর্টাল",
  description: "তোমার মাছরাঙা সহকারীর সবকিছু এক জায়গায়: কাজের লিস্ট, রুটিন, স্বাস্থ্য, পড়াশোনা",
  applicationName: "মাছরাঙা",
  appleWebApp: { capable: true, title: "মাছরাঙা", statusBarStyle: "default" },
  icons: { icon: [{ url: "/favicon-48.png", sizes: "48x48", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1311" },
  ],
};

// পেজ আঁকার আগেই সেভ করা theme বসাই, যাতে সাদা ঝলক না দেখায়
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${bengali.variable} ${latin.variable}`}><RegisterSW />{children}</body>
    </html>
  );
}
