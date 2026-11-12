"use client";
// পোর্টালে ঢোকা: Shongi Lab অ্যাকাউন্ট (AdMCQ, Money, Pomodoro এর একই লগইন) অথবা সরাসরি Telegram বট দিয়ে।
// নতুন অ্যাকাউন্ট আর পাসওয়ার্ড ভুলে গেলে AdMCQ এর লগইন পেজে (একই অ্যাকাউন্ট, SMS এর ব্যবস্থা ওখানেই)।
import { GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { CalendarClock, GraduationCap, HeartPulse, ListChecks } from "lucide-react";
import LinkWithBot from "@/components/LinkWithBot";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { auth, phoneEmail, toE164 } from "@/lib/firebase";

const ACCOUNT_SITE = "https://app.admcq.com/login";

function authError(err: unknown): string {
  const c = String((err as { code?: string })?.code || "");
  const msg: Record<string, string> = {
    "auth/invalid-credential": "ফোন নম্বর বা পাসওয়ার্ড ভুল।",
    "auth/wrong-password": "ফোন নম্বর বা পাসওয়ার্ড ভুল।",
    "auth/user-not-found": "এই নম্বরে Shongi Lab অ্যাকাউন্ট নেই।",
    "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পরে আবার চেষ্টা করো।",
    "auth/popup-closed-by-user": "Google এর জানালাটা বন্ধ হয়ে গেছে।",
    "auth/unauthorized-domain": "এই ঠিকানা থেকে Google লগইন এখনো চালু হয়নি।",
    "auth/network-request-failed": "ইন্টারনেট সংযোগে সমস্যা।",
  };
  console.error("Auth error:", err);
  return msg[c] ?? `লগইন করা যায়নি, আবার চেষ্টা করো।${c ? ` (${c})` : ""}`;
}

type View = { kind: "form" } | { kind: "link"; code: string; firstTime: boolean };

export default function SignInPage() {
  const [tab, setTab] = useState<"account" | "telegram">("account");
  const [view, setView] = useState<View>({ kind: "form" });
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("out")) {
      signOut(auth).catch(() => {});
      return;
    }
    getRedirectResult(auth).then((r) => r && finish(r.user)).catch((e) => setError(authError(e)));
    // এই ফোন/ব্রাউজারে Shongi Lab এ আগেই লগইন থাকলে (কুকি হারালেও) আবার জিজ্ঞেস না করে ঢুকিয়ে দিই
    const stop = onAuthStateChanged(auth, (user) => {
      stop();
      if (!user) return;
      setLoading(true);
      finish(user).catch(() => {}).finally(() => setLoading(false));
    });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Firebase লগইনের পর সার্ভারে যাচাই: বটে যুক্ত থাকলে সোজা ড্যাশবোর্ড, নইলে একবার যুক্ত করার কোড */
  async function finish(user: User) {
    const r = await fetch("/api/auth/firebase", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: await user.getIdToken() }),
    }).then((x) => x.json());
    if (r.ok) return window.location.replace("/");
    if (r.needLink && r.code) return setView({ kind: "link", code: r.code, firstTime: true });
    throw new Error(r.error || "লগইন করা যায়নি।");
  }

  const run = async (fn: () => Promise<void>) => {
    setError(""); setLoading(true);
    try { await fn(); }
    catch (e) { setError(e instanceof Error && !(e as { code?: string }).code ? e.message : authError(e)); }
    finally { setLoading(false); }
  };

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const number = toE164(phone);
      if (!number) throw new Error("ফোন নম্বরটা ঠিক নেই। ০১ দিয়ে ১১ অঙ্কের নম্বর দাও।");
      const cred = await signInWithEmailAndPassword(auth, phoneEmail(number), password);
      await finish(cred.user);
    });
  };

  const google = () => run(async () => {
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      await finish(cred.user);
    } catch (e) {
      const c = String((e as { code?: string })?.code || "");
      if (c === "auth/popup-blocked" || c === "auth/operation-not-supported-in-this-environment") return signInWithRedirect(auth, provider);
      throw e;
    }
  });

  const telegramOnly = () => run(async () => {
    const r = await fetch("/api/auth/pending", { method: "POST" }).then((x) => x.json());
    setView({ kind: "link", code: r.code, firstTime: false });
  });

  const switchTab = (t: "account" | "telegram") => {
    setTab(t); setError(""); setView({ kind: "form" });
    if (t === "telegram") telegramOnly();
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* কম্পিউটারে বাঁ পাশে ব্র্যান্ডের প্যানেল */}
      <aside className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #0e7c70 0%, #095249 100%)", color: "#fff" }}>
        <div className="absolute -right-24 -bottom-24 size-96 rounded-full opacity-20" style={{ background: "var(--accent)" }} />
        <div className="absolute -left-16 top-1/3 size-56 rounded-full opacity-10 bg-white" />
        <div className="relative"><Logo size={40} onBrand /></div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">তোমার দিনটা,<br />এক জায়গায় গোছানো।</h2>
          <ul className="mt-8 space-y-4 text-[15px]" style={{ color: "rgb(255 255 255 / 0.88)" }}>
            {[
              [ListChecks, "কাজের লিস্ট, বটের সাথে সাথে মেলে"],
              [CalendarClock, "সাপ্তাহিক পড়ার রুটিন, সময়মতো মনে করানো"],
              [HeartPulse, "প্রেশার, সুগার, ঘুম আর মনের চার্ট"],
              [GraduationCap, "MCQ এর অগ্রগতি আর টানা পড়ার হিসাব"],
            ].map(([Icon, text]) => {
              const I = Icon as typeof ListChecks;
              return (
                <li key={text as string} className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl" style={{ background: "rgb(255 255 255 / 0.15)" }}><I size={18} /></span>
                  {text as string}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-sm" style={{ color: "rgb(255 255 255 / 0.7)" }}>Shongi Lab · AdMCQ, Money আর Pomodoro এর একই অ্যাকাউন্ট</p>
      </aside>

      <div className="flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-md w-full space-y-5">
        <div className="space-y-2">
          <div className="lg:hidden mb-6"><Logo size={40} /></div>
          <h1 className="text-[28px] font-bold tracking-tight">পোর্টালে ঢোকো</h1>
          <p className="text-sm muted">তোমার কাজের লিস্ট, রুটিন, স্বাস্থ্য — সব এক জায়গায়</p>
        </div>

        <div role="tablist" className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
          {(["account", "telegram"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => switchTab(t)} className="py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={tab === t ? { background: "var(--surface)", color: "var(--brand)", boxShadow: "var(--shadow)" } : { color: "var(--muted)" }}>
              {t === "account" ? "Shongi Lab অ্যাকাউন্ট" : "Telegram দিয়ে"}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-center rounded-xl p-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}

        {view.kind === "link" ? (
          <LinkWithBot code={view.code} firstTime={view.firstTime}
            onRetry={() => (view.firstTime ? setView({ kind: "form" }) : telegramOnly())} />
        ) : tab === "account" ? (
          <>
            <form onSubmit={login} className="space-y-3">
              <label className="block text-sm font-medium">মোবাইল নম্বর
                <input className="field" type="tel" inputMode="numeric" autoComplete="tel" placeholder="01712345678"
                  value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </label>
              <label className="block text-sm font-medium">পাসওয়ার্ড
                <input className="field" type="password" autoComplete="current-password" placeholder="••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
              <button type="submit" disabled={loading} className="btn-primary btn-block">{loading ? "অপেক্ষা করো…" : "লগইন"}</button>
            </form>
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
              <span className="flex-1 h-px" style={{ background: "var(--line)" }} /> অথবা <span className="flex-1 h-px" style={{ background: "var(--line)" }} />
            </div>
            <button onClick={google} disabled={loading} className="btn-outline btn-block">
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google দিয়ে লগইন
            </button>
            <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
              AdMCQ, Money বা Pomodoro-র একই অ্যাকাউন্ট। অ্যাকাউন্ট নেই বা পাসওয়ার্ড ভুলে গেছ?{" "}
              <a href={ACCOUNT_SITE} className="font-semibold" style={{ color: "var(--teal)" }}>এখানে করো →</a>
            </p>
          </>
        ) : (
          <p className="text-center text-sm" style={{ color: "var(--muted)" }}>কোড আনছি…</p>
        )}
        <div className="flex justify-center pt-2"><div className="w-56"><ThemeToggle /></div></div>
      </div>
      </div>
    </main>
  );
}
