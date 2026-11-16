// Shongi Lab অবতার (Focus, Money, AdMCQ এর একই): Firestore এ users/{uid}/profile/avatar।
// পোর্টাল সার্ভারে admin দিয়ে পড়ে; uid পায় বটের hermes_site_links থেকে। না পেলে বা ভুল হলে নামের প্রথম অক্ষর দেখায়।
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "./firebaseAdmin";
import { one } from "./db";

export type Look = { avatar: string; from: string; to: string };

const COLORS: Record<string, [string, string]> = {
  indigo: ["#6366f1", "#8b5cf6"], rose: ["#f43f5e", "#fb923c"], emerald: ["#10b981", "#14b8a6"], sky: ["#0ea5e9", "#6366f1"],
  amber: ["#f59e0b", "#ef4444"], pink: ["#ec4899", "#a855f7"], teal: ["#14b8a6", "#0ea5e9"], slate: ["#475569", "#1e293b"],
};

export async function getAvatar(masterId: string): Promise<Look | null> {
  try {
    const link = await one<{ site_uid: string }>(
      "SELECT site_uid FROM hermes_site_links WHERE master_id = ? ORDER BY linked_at DESC LIMIT 1", [masterId]);
    if (!link?.site_uid) return null;
    const snap = await getFirestore(adminApp).doc(`users/${link.site_uid}/profile/avatar`).get();
    const d = snap.data();
    if (!d?.avatar) return null;
    const [from, to] = COLORS[String(d.avColor)] ?? COLORS.indigo;
    return { avatar: String(d.avatar), from, to };
  } catch { return null; }
}
