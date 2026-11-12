// বটের পাঠানো এক-বারের কোড → কুকি সেট → ড্যাশবোর্ড। কোড একবারই চলে, ১৫ মিনিটের মধ্যে।
// GET শুধু "ঢুকুন" পেজ দেখায়, কোড খরচ হয় POST এ: Telegram/Discord লিংকের preview বানাতে আগেই GET করে,
// তাতে কোড খরচ হলে ইউজার ট্যাপ করে "মেয়াদ শেষ" পেত। পেজটা নিজেই JS দিয়ে জমা দেয় (preview JS চালায় না),
// আর আগে থেকেই একই অ্যাকাউন্টে লগইন থাকলে সোজা ড্যাশবোর্ড।
import { NextRequest, NextResponse } from "next/server";
import { exec, one } from "@/lib/db";
import { createSession, readSession, SESSION_COOKIE } from "@/lib/sessionToken";
import { publicUrl } from "@/lib/url";

const CODE = /^[A-Za-z0-9_-]{8,64}$/;

function page(code: string): string {
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>মাছরাঙা পোর্টাল</title>
<style>
  :root{--bg:#f6f8f7;--card:#fff;--ink:#16302b;--muted:#5f7470;--line:#e3e9e7;--teal:#0d7a6f}
  @media (prefers-color-scheme:dark){:root{--bg:#0f1a18;--card:#17241f;--ink:#e8f0ee;--muted:#93a8a3;--line:#243530;--teal:#2fb3a5}}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--ink);
       font-family:"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif;padding:16px;box-sizing:border-box}
  .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:32px;max-width:360px;width:100%;text-align:center}
  h1{font-size:22px;margin:8px 0} p{color:var(--muted);line-height:1.6}
  button{margin-top:12px;width:100%;padding:14px;border:0;border-radius:12px;background:var(--teal);color:#fff;font-size:17px;font-weight:600;cursor:pointer}
</style></head><body><form class="card" method="post" action="/login">
  <div style="font-size:44px">🐦</div><h1>মাছরাঙা পোর্টাল</h1>
  <p>তোমার রুটিন আর কাজ, স্বাস্থ্য, পড়াশোনা — সব এক জায়গায়।</p>
  <input type="hidden" name="code" value="${code}">
  <button type="submit">ঢুকুন →</button>
</form><script>document.forms[0].querySelector("button").textContent="ঢুকছি…";document.forms[0].submit();</script></body></html>`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (!CODE.test(code)) return NextResponse.redirect(publicUrl(req, "/signin"));
  const session = await readSession(req.cookies.get(SESSION_COOKIE.name)?.value);
  if (session) {
    const row = await one<{ master_id: string }>("SELECT master_id FROM hermes_portal_codes WHERE code = ?", [code]).catch(() => null);
    if (!row || row.master_id === session.mid) return NextResponse.redirect(publicUrl(req, "/"));
  }
  return new NextResponse(page(code), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const code = String(form?.get("code") ?? "");
  const expired = NextResponse.redirect(publicUrl(req, "/signin"), 303);
  if (!CODE.test(code)) return expired;

  try {
    const row = await one<{ master_id: string; expires_at: string }>(
      "SELECT master_id, expires_at FROM hermes_portal_codes WHERE code = ?", [code]);
    if (!row) return expired;
    // কোডটা আগে মুছি (এক-বারের), তারপর মেয়াদ দেখি
    await exec("DELETE FROM hermes_portal_codes WHERE code = ?", [code]);
    const nowBD = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Dhaka" });   // 'YYYY-MM-DD HH:MM:SS'
    if (row.expires_at < nowBD) return expired;

    const res = NextResponse.redirect(publicUrl(req, "/"), 303);
    res.cookies.set(SESSION_COOKIE.name, await createSession(row.master_id), SESSION_COOKIE.options);
    return res;
  } catch (e) {
    console.error("login ব্যর্থ:", e);
    throw e;
  }
}
