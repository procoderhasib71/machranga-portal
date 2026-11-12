// বটের পাঠানো এক-বারের কোড → কুকি সেট → ড্যাশবোর্ড। কোড একবারই চলে, ১৫ মিনিটের মধ্যে।
import { NextRequest, NextResponse } from "next/server";
import { exec, one } from "@/lib/db";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const expired = NextResponse.redirect(new URL("/expired", req.url));
  if (!code || code.length > 64) return expired;

  try {
    const row = await one<{ master_id: string; expires_at: string }>(
      "SELECT master_id, expires_at FROM hermes_portal_codes WHERE code = ?", [code]);
    if (!row) return expired;
    // কোডটা আগে মুছি (এক-বারের), তারপর মেয়াদ দেখি
    await exec("DELETE FROM hermes_portal_codes WHERE code = ?", [code]);
    const nowBD = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" });   // 'YYYY-MM-DD HH:MM:SS'
    if (row.expires_at < nowBD) return expired;

    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(SESSION_COOKIE.name, await createSession(row.master_id), SESSION_COOKIE.options);
    return res;
  } catch (e) {
    console.error("login ব্যর্থ:", e);
    throw e;
  }
}
