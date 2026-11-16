// সেটিংস থেকে Telegram যুক্ত করা: বটের `/link` কোড বানিয়ে দেয়
import { NextResponse } from "next/server";
import { createLinkCode } from "@/lib/account";
import { getMasterId } from "@/lib/session";

export async function POST() {
  const mid = await getMasterId();
  if (!mid) return NextResponse.json({ ok: false, error: "লগইন নেই" }, { status: 401 });
  return NextResponse.json({ ok: true, code: await createLinkCode(mid) });
}
