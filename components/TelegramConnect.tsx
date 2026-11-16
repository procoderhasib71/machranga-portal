"use client";
// Telegram ছাড়া খোলা অ্যাকাউন্টে পরে Telegram যুক্ত করা: বটের `/link কোড` (বট নিজেই ডাটা এক করে)
import { useState } from "react";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || "Machranga_ai_bot";

export default function TelegramConnect({ linked }: { linked: boolean }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (linked) return <p className="text-sm">✅ Telegram যুক্ত আছে। রিমাইন্ডার আর রিপোর্ট বট সেখানেই পাঠায়।</p>;

  const get = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/link-code", { method: "POST" }).then((x) => x.json());
      if (r.ok) setCode(r.code); else setErr(r.error || "কোড আনা যায়নি");
    } catch { setErr("কোড আনা যায়নি, নেট দেখো"); }
    setBusy(false);
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="muted">পোর্টাল Telegram ছাড়াই চলে। তবে রিমাইন্ডার, সকালের প্ল্যান, নামাজ আর রিপোর্টের মেসেজ পেতে মাছরাঙাকে Telegram এ যুক্ত করো।</p>
      {code ? (
        <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--surface-2)" }}>
          <p>Telegram এ মাছরাঙাকে এটা পাঠাও (১০ মিনিট চলবে):</p>
          <p className="num text-xl font-bold tracking-wider" style={{ color: "var(--brand)" }}>/link {code}</p>
          <a className="btn-primary inline-flex" target="_blank" rel="noopener" href={`https://t.me/${BOT}`}>Telegram খোলো</a>
          <p className="text-xs muted">পাঠানোর পর এই পেজ রিফ্রেশ করো। Telegram এ আগের কিছু থাকলে সেটাও এই অ্যাকাউন্টে চলে আসবে।</p>
        </div>
      ) : (
        <button onClick={get} disabled={busy} className="btn-outline">{busy ? "অপেক্ষা করো…" : "Telegram যুক্ত করো"}</button>
      )}
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
    </div>
  );
}
