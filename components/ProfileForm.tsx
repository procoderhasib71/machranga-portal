"use client";
// প্রোফাইল আর নামাজের রিমাইন্ডার: আগে শুধু বটকে বলে বদলানো যেত, এখন এখান থেকেও (একই hermes_users কলাম)
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Switch from "./Switch";

const PRAYERS: [string, string][] = [["Fajr", "ফজর"], ["Dhuhr", "যোহর"], ["Asr", "আসর"], ["Maghrib", "মাগরিব"], ["Isha", "এশা"]];

type Prayer = { prayers: string[]; before: number } | null;
type Props = { name: string; callMe: string; city: string; assistantName: string; prayer: Prayer };

async function post(body: Record<string, unknown>) {
  const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.ok;
}

export default function ProfileForm(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ name: p.name, call_me: p.callMe, city: p.city, assistant_name: p.assistantName });
  const [prayer, setPrayer] = useState<Prayer>(p.prayer);
  const [msg, setMsg] = useState("");

  const dirty = f.name !== p.name || f.call_me !== p.callMe || f.city !== p.city || f.assistant_name !== p.assistantName;

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setMsg("");
      setMsg((await post(f)) ? "✅ সেভ হলো" : "⚠️ সেভ হয়নি, আবার চেষ্টা করো");
      router.refresh();
    });
  };

  const savePrayer = (next: Prayer) => {
    setPrayer(next);
    start(async () => {
      setMsg("");
      setMsg((await post({ prayer_alerts: next })) ? "✅ সেভ হলো" : "⚠️ সেভ হয়নি, আবার চেষ্টা করো");
      router.refresh();
    });
  };

  const field = (key: keyof typeof f, label: string, hint: string, placeholder: string) => (
    <label className="block text-sm font-medium">{label}
      <span className="block text-xs muted font-normal mt-0.5">{hint}</span>
      <input className="field" value={f[key]} placeholder={placeholder} maxLength={key === "city" ? 40 : 30}
        onChange={(e) => setF({ ...f, [key]: e.target.value })} />
    </label>
  );

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "তোমার নাম", "বট আর রিপোর্টে এই নাম", "যেমন: হাসিব")}
          {field("call_me", "বট তোমাকে কী বলে ডাকবে", "ফাঁকা রাখলে নাম ধরে", "যেমন: ভাইয়া")}
          {field("city", "শহর", "নামাজের সময় আর আবহাওয়ার জন্য", "Dhaka")}
          {field("assistant_name", "বটের নাম", "ফাঁকা রাখলে মাছরাঙা", "মাছরাঙা")}
        </div>
        <button type="submit" disabled={!dirty || pending} className="btn-primary">{pending ? "সেভ হচ্ছে…" : "সেভ করো"}</button>
      </form>

      <div className="pt-4 border-t" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-[15px]">🕌 নামাজের রিমাইন্ডার</div>
            <div className="text-xs muted mt-0.5">তোমার শহরের সময় ধরে বট মনে করিয়ে দেয়</div>
          </div>
          <Switch on={!!prayer} label="নামাজের রিমাইন্ডার"
            onChange={(on) => savePrayer(on ? { prayers: PRAYERS.map(([k]) => k), before: prayer?.before ?? 0 } : null)} />
        </div>
        {prayer && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {PRAYERS.map(([k, bn]) => {
                const on = prayer.prayers.includes(k);
                return (
                  <button key={k} type="button" aria-pressed={on}
                    onClick={() => {
                      const list = on ? prayer.prayers.filter((x) => x !== k) : [...prayer.prayers, k];
                      if (list.length) savePrayer({ ...prayer, prayers: list });
                    }}
                    className={`chip ${on ? "chip-accent" : "chip-muted"}`} style={{ cursor: "pointer" }}>{on ? "✓ " : ""}{bn}</button>
                );
              })}
            </div>
            <label className="flex items-center gap-2 text-sm">
              ওয়াক্তের
              <select className="field field-sm" value={prayer.before} onChange={(e) => savePrayer({ ...prayer, before: Number(e.target.value) })}>
                {[0, 5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m === 0 ? "ঠিক সময়ে" : `${m} মিনিট আগে`}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>
      {msg && <p className="text-sm muted">{msg}</p>}
    </div>
  );
}
