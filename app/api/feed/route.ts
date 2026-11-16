// বটের জন্য খবরের ফিড আনা: কিছু পত্রিকা (জনকণ্ঠ ইত্যাদি) Modal এর সার্ভার আটকায়, কিন্তু এখান থেকে (Google এর সার্ভার) খোলে।
// শুধু নিচের তালিকার ফিড, আর শুধু বটের চাবি (pomodoro sync এর মতোই) দিয়ে — খোলা proxy না।
import { NextRequest, NextResponse } from "next/server";
import { validSyncToken } from "@/lib/pomodoroSync";

const ALLOWED = new Set([
  "https://www.prothomalo.com/feed",
  "https://www.ittefaq.com.bd/feed/",
  "https://samakal.com/rss",
  "https://www.dailyjanakantha.com/rss/rss.xml",
  "https://www.dailyinqilab.com/rss/rss.xml",
]);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36";

export async function GET(req: NextRequest) {
  if (!validSyncToken(req.headers.get("authorization"))) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const u = req.nextUrl.searchParams.get("u") ?? "";
  if (!ALLOWED.has(u)) return NextResponse.json({ ok: false, error: "এই ফিড তালিকায় নেই" }, { status: 400 });
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
    return new NextResponse(await r.text(), { status: r.status, headers: { "Content-Type": "application/xml; charset=utf-8" } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
