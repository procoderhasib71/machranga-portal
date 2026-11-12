// ফোনে "হোম স্ক্রিনে যোগ করো" করলে মাছরাঙা আলাদা app এর মতো খোলে (PWA)
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "মাছরাঙা পোর্টাল",
    short_name: "মাছরাঙা",
    description: "কাজের লিস্ট, রুটিন, পড়াশোনা আর স্বাস্থ্য — এক জায়গায়",
    lang: "bn",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f7f6",
    theme_color: "#0e7c70",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "আজকের কাজ", url: "/todo", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "রুটিন", url: "/routine", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
