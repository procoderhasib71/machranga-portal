"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Switch from "./Switch";

type Props = {
  todoDigest: string; newsTime: string; newsTopics: string; moodCheckin: string;
  weeklyReport: boolean; moneyDigest: boolean; moneyLinked: boolean;
};

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <div className="font-medium text-[15px]">{label}</div>
        {hint && <div className="text-xs muted mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function TimeToggle({ value, defaultTime, onChange, label }: { value: string; defaultTime: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {value && <input type="time" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label={`${label}: সময়`}
        className="field field-sm num" />}
      <Switch on={!!value} onChange={(v) => onChange(v ? defaultTime : "")} label={label} />
    </div>
  );
}

function OnOff({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return <Switch on={value} onChange={onChange} label={label} />;
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
    <div>
      <div className="divide-y divide-[var(--line)]">
        <Row label="🌅 সকালের আজকের প্ল্যান" hint="আজকের রুটিন আর কাজ, প্রতিদিন এই সময়ে এক মেসেজে">
          <TimeToggle label="সকালের আজকের প্ল্যান" value={state.todoDigest} defaultTime="08:00" onChange={(v) => save({ todoDigest: v })} />
        </Row>
        <Row label="📰 প্রতিদিনের খবর" hint="তোমার পছন্দের বিষয়ের ৫-৬টা খবর">
          <TimeToggle label="প্রতিদিনের খবর" value={state.newsTime} defaultTime="08:30" onChange={(v) => save({ newsTime: v })} />
        </Row>
        {state.newsTime && (
          <div className="py-3.5">
            <label className="block font-medium text-[15px]">খবরের বিষয়
              <span className="block text-xs muted font-normal mt-0.5">কমা দিয়ে, যেমন: খেলা, চাকরি, প্রযুক্তি · ফাঁকা থাকলে সব প্রধান খবর</span>
              <input value={state.newsTopics} onChange={(e) => setState({ ...state, newsTopics: e.target.value })}
                onBlur={() => state.newsTopics !== p.newsTopics && save({ newsTopics: state.newsTopics })} placeholder="সব প্রধান খবর"
                className="field text-sm" />
            </label>
          </div>
        )}
        <Row label="🌙 রাতের মন চেক-ইন" hint="রাতে একবার জিজ্ঞেস করি কেমন আছ">
          <TimeToggle label="রাতের মন চেক-ইন" value={state.moodCheckin} defaultTime="21:30" onChange={(v) => save({ moodCheckin: v })} />
        </Row>
        <Row label="📊 সাপ্তাহিক রিপোর্ট" hint="শুক্রবার সকাল ৯টায়, চার্টসহ">
          <OnOff label="সাপ্তাহিক রিপোর্ট" value={state.weeklyReport} onChange={(v) => save({ weeklyReport: v })} />
        </Row>
        {p.moneyLinked && (
          <Row label="💰 টাকার হিসাব" hint="রাত ১০টায় দিনের, শুক্রবারে সপ্তাহের">
            <OnOff label="টাকার হিসাব" value={state.moneyDigest} onChange={(v) => save({ moneyDigest: v })} />
          </Row>
        )}
      </div>
      <p className="pt-2 text-sm h-6 muted" aria-live="polite">{pending ? "সেভ হচ্ছে…" : msg}</p>
    </div>
  );
}
