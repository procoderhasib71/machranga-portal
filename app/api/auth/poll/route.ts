// ব্রাউজার কয়েক সেকেন্ড পর পর জানতে চায়: বটে কোডটা পাঠানো হয়েছে কিনা
import { NextRequest, NextResponse } from "next/server";
import { bdStamp, finishPending, PENDING_COOKIE, readPending } from "@/lib/pending";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PENDING_COOKIE)?.value;
  const row = await readPending(token);
  if (!row || row.expires_at < bdStamp()) return NextResponse.json({ status: "expired" });
  if (!row.master_id) return NextResponse.json({ status: "waiting" });

  await finishPending(row.token);
  const res = NextResponse.json({ status: "ok" });
  res.cookies.set(SESSION_COOKIE.name, await createSession(row.master_id), SESSION_COOKIE.options);
  res.cookies.delete(PENDING_COOKIE);
  return res;
}
