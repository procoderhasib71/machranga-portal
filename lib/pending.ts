// বটের সাথে যুক্ত করে ঢোকা (WhatsApp Web এর মতো): ব্রাউজার একটা ছোট কোড পায়, ইউজার বটে পাঠায়,
// বট hermes_portal_pending এ master_id বসায়, আর এই ব্রাউজার (কুকির গোপন token দিয়ে) ঢুকে যায়।
import { randomBytes, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { exec, one } from "./db";

export const PENDING_COOKIE = "hermes_pending";
const MINUTES = 10;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // 0/O, 1/I বাদ: মুখে বলা বা টাইপ করায় ভুল কম

export function bdStamp(offsetMin = 0): string {
  return new Date(Date.now() + offsetMin * 60000).toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" });
}

/** নতুন কোড বানিয়ে উত্তর দেয়, আর ব্রাউজারের কুকিতে গোপন token বসায়। siteUid: Shongi Lab লগইন থেকে এলে তার uid */
export async function pendingResponse(siteUid: string | null, extra: Record<string, unknown> = {}): Promise<NextResponse> {
  await exec("DELETE FROM hermes_portal_pending WHERE expires_at < ?", [bdStamp()]);
  const token = randomBytes(32).toString("base64url");
  const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  await exec("INSERT INTO hermes_portal_pending (token, code, site_uid, expires_at) VALUES (?, ?, ?, ?)",
    [token, code, siteUid, bdStamp(MINUTES)]);
  const res = NextResponse.json({ ...extra, code, expiresInSec: MINUTES * 60 });
  res.cookies.set(PENDING_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MINUTES * 60 });
  return res;
}

export type PendingRow = { token: string; code: string; master_id: string | null; expires_at: string };

export async function readPending(token: string | undefined): Promise<PendingRow | null> {
  if (!token) return null;
  return one<PendingRow>("SELECT token, code, master_id, expires_at FROM hermes_portal_pending WHERE token = ?", [token]);
}

export async function finishPending(token: string): Promise<void> {
  await exec("DELETE FROM hermes_portal_pending WHERE token = ?", [token]);
}

/** Shongi Lab uid → বটের master_id (Money/AdMCQ/Pomodoro/পোর্টাল যেকোনোটা বটে যুক্ত থাকলে) */
export async function masterIdForUid(uid: string): Promise<string | null> {
  const row = await one<{ master_id: string }>(
    "SELECT master_id FROM hermes_site_links WHERE site_uid = ? ORDER BY linked_at DESC LIMIT 1", [uid]);
  return row?.master_id ?? null;
}
