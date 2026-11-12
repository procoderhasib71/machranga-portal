"use client";
// বটের সাথে যুক্ত করে ঢোকা: কোড দেখায়, Telegram লিংক আর QR দেয়, তারপর অপেক্ষা করে কখন বট approve করে
import QRCode from "qrcode";
import { useEffect, useState } from "react";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || "Machranga_ai_bot";

export default function LinkWithBot({ code, firstTime, onRetry }: { code: string; firstTime: boolean; onRetry: () => void }) {
  const [qr, setQr] = useState("");
  const [state, setState] = useState<"waiting" | "expired" | "ok">("waiting");
  const tgLink = `https://t.me/${BOT}?start=login_${code}`;
  const pretty = `${code.slice(0, 4)}-${code.slice(4)}`;

  useEffect(() => {
    QRCode.toDataURL(tgLink, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(""));
  }, [tgLink]);

  useEffect(() => {
    setState("waiting");
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      try {
        const r = await fetch("/api/auth/poll", { cache: "no-store" }).then((x) => x.json());
        if (r.status === "ok") { setState("ok"); window.location.replace("/"); return; }
        if (r.status === "expired") { setState("expired"); return; }
      } catch { /* নেট গেলে পরের বার আবার */ }
      setTimeout(tick, 2000);
    };
    const t = setTimeout(tick, 2000);
    return () => { alive = false; clearTimeout(t); };
  }, [code]);

  if (state === "expired") {
    return (
      <div className="space-y-4 text-center">
        <p style={{ color: "var(--muted)" }}>কোডের মেয়াদ (১০ মিনিট) শেষ হয়ে গেছে।</p>
        <button onClick={onRetry} className="btn-primary">নতুন কোড নাও</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      {firstTime && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          তোমার Shongi Lab অ্যাকাউন্ট এখনো মাছরাঙা বটের সাথে যুক্ত না। একবার যুক্ত করলেই হবে — এরপর থেকে শুধু লগইনেই ঢুকতে পারবে।
        </p>
      )}
      <a href={tgLink} target="_blank" rel="noopener" className="btn-primary flex items-center justify-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M21.9 4.3 18.6 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.9 13.5l-4.9-1.5c-1.1-.3-1.1-1.1.2-1.6L20.4 3c.9-.3 1.7.2 1.5 1.3z"/></svg>
        Telegram-এ খুলে Start চাপো
      </a>
      {qr && (
        <div className="hidden sm:block">
          <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>কম্পিউটারে থাকলে ফোন দিয়ে QR স্ক্যান করো</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Telegram লিংকের QR কোড" width={180} height={180} className="mx-auto rounded-xl bg-white p-2" />
        </div>
      )}
      <div className="text-sm rounded-xl p-3" style={{ background: "var(--teal-soft)" }}>
        অথবা বটে লেখো: <b className="font-mono tracking-wider" style={{ color: "var(--teal)" }}>/portal {pretty}</b>
        <span className="block mt-1" style={{ color: "var(--muted)" }}>Discord-এ: <span className="font-mono">!portal {pretty}</span></span>
      </div>
      <p className="text-sm flex items-center justify-center gap-2" style={{ color: "var(--muted)" }}>
        <span className="inline-block size-2 rounded-full animate-pulse" style={{ background: "var(--teal)" }} />
        বটে পাঠালেই এখানে নিজে থেকে ঢুকে যাবে…
      </p>
    </div>
  );
}
