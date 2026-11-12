"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  todoDigest: string; newsTime: string; newsTopics: string; moodCheckin: string;
  weeklyReport: boolean; moneyDigest: boolean; moneyLinked: boolean;
};

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="font-medium">{label}</div>
        {hint && <div className="text-sm" style={{ color: "var(--muted)" }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function TimeToggle({ value, defaultTime, onChange }: { value: string; defaultTime: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      {value && <input type="time" value={value} onChange={(e) => e.target.value && onChange(e.target.value)}
        className="bg-transparent border rounded-lg px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} />}
      <button type="button" onClick={() => onChange(value ? "" : defaultTime)}
        className="px-3 py-1 rounded-full text-sm font-medium"
        style={value ? { background: "var(--teal-soft)", color: "var(--teal)" } : { background: "var(--line)", color: "var(--muted)" }}>
        {value ? "চালু" : "বন্ধ"}
      </button>
    </div>
  );
}

function OnOff({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="px-3 py-1 rounded-full text-sm font-medium"
      style={value ? { background: "var(--teal-soft)", color: "var(--teal)" } : { background: "var(--line)", color: "var(--muted)" }}>
      {value ? "চালু" : "বন্ধ"}
    </button>
  );
}

export default function SettingsForm(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [state, setState] = useState(p);

  const save = (patch: Partial<Props> & Record<string, unknown>) => {
    const next = { ...state, ...patch } as Props;
    setState(next);
    start(async () => {
      setMsg("");
      const body: Record<string, unknown> = {};
      if ("todoDigest" in patch) body.todo_digest = next.todoDigest;
      if ("newsTime" in patch) body.news_time = next.newsTime;
      if ("newsTopics" in patch) body.news_topics = next.newsTopics;
      if ("moodCheckin" in patch) body.mood_checkin = next.moodCheckin;
      if ("weeklyReport" in patch) body.weekly_report = next.weeklyReport;
      if ("moneyDigest" in patch) body.money_digest = next.moneyDigest;
      const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setMsg(r.ok ? "✅ সেভ হলো" : "⚠️ সেভ হয়নি, আবার চেষ্টা করো");
      router.refresh();
    });
  };

  return (
    <div className="card p-5 divide-y" style={{ borderColor: "var(--line)" }}>
      <Row label="🌅 সকালের কাজের লিস্ট" hint="খোলা কাজ থাকলে প্রতিদিন এই সময়ে পাঠাই">
        <TimeToggle value={state.todoDigest} defaultTime="08:00" onChange={(v) => save({ todoDigest: v })} />
      </Row>
      <Row label="📰 প্রতিদিনের খবর" hint="তোমার পছন্দের বিষয়ের ৫-৬টা খবর">
        <TimeToggle value={state.newsTime} defaultTime="08:30" onChange={(v) => save({ newsTime: v })} />
      </Row>
      {state.newsTime && (
        <Row label="খবরের বিষয়" hint="কমা দিয়ে, যেমন: খেলা, চাকরি, প্রযুক্তি">
          <input value={state.newsTopics} onChange={(e) => setState({ ...state, newsTopics: e.target.value })}
            onBlur={() => save({ newsTopics: state.newsTopics })} placeholder="সব প্রধান খবর"
            className="bg-transparent border rounded-lg px-2 py-1 text-sm w-48" style={{ borderColor: "var(--line)" }} />
        </Row>
      )}
      <Row label="🌙 রাতের মন চেক-ইন" hint="রাতে একবার জিজ্ঞেস করি কেমন আছ">
        <TimeToggle value={state.moodCheckin} defaultTime="21:30" onChange={(v) => save({ moodCheckin: v })} />
      </Row>
      <Row label="📊 সাপ্তাহিক রিপোর্ট" hint="শুক্রবার সকাল ৯টায়, চার্টসহ">
        <OnOff value={state.weeklyReport} onChange={(v) => save({ weeklyReport: v })} />
      </Row>
      {p.moneyLinked && (
        <Row label="💰 টাকার হিসাব" hint="রাত ১০টায় দিনের, শুক্রবারে সপ্তাহের">
          <OnOff value={state.moneyDigest} onChange={(v) => save({ moneyDigest: v })} />
        </Row>
      )}
      <div className="pt-3 text-sm h-6" style={{ color: "var(--muted)" }}>{pending ? "সেভ হচ্ছে…" : msg}</div>
    </div>
  );
}
