// পড়ার অগ্রগতি: রুটিনের কয়টা শেষ (Turso), Pomodoro র ফোকাস মিনিট (Firestore: users/{uid}/sessions), আর টানা পড়ার দিন
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "./firebaseAdmin";
import { query } from "./db";

import { bdDay } from "./progressCalc";

export { lastDays, streak } from "./progressCalc";

export type RoutineDay = { day: string; total: number; done: number };

export async function getRoutineDays(mid: string, days: string[]): Promise<Map<string, RoutineDay>> {
  const rows = await query<RoutineDay>(
    "SELECT routine_date AS day, COUNT(*) AS total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done FROM hermes_todos " +
    "WHERE master_id = ? AND routine_id IS NOT NULL AND routine_date BETWEEN ? AND ? AND status IN ('open', 'done') GROUP BY routine_date",
    [mid, days[0], days.at(-1)!]);
  return new Map(rows.map((r) => [r.day, { day: r.day, total: Number(r.total), done: Number(r.done ?? 0) }]));
}

/** Pomodoro যুক্ত থাকলে দিন ধরে ফোকাস মিনিট; না থাকলে linked: false */
export async function getFocusByDay(mid: string, days: string[]): Promise<{ linked: boolean; byDay: Map<string, number> }> {
  const link = await query<{ site_uid: string }>("SELECT site_uid FROM hermes_site_links WHERE master_id = ? AND site = 'pomodoro'", [mid]);
  const byDay = new Map<string, number>();
  if (!link[0]) return { linked: false, byDay };
  const from = new Date(`${days[0]}T00:00:00+06:00`).toISOString();
  const snap = await getFirestore(adminApp).collection(`users/${link[0].site_uid}/sessions`).where("timestamp", ">=", from).get();
  snap.forEach((doc) => {
    const s = doc.data() as { mode?: string; duration?: number; timestamp?: string };
    if ((s.mode && s.mode !== "pomodoro") || !s.timestamp) return;
    const k = bdDay(new Date(s.timestamp));
    byDay.set(k, (byDay.get(k) ?? 0) + (Number(s.duration) || 0));
  });
  return { linked: true, byDay };
}
