import { HeartPulse, Pill, ShieldAlert, Thermometer } from "lucide-react";
import { requireMasterId } from "@/lib/session";
import { getHealthLogs, getMeds, getMoods, type HealthLog } from "@/lib/data";
import { bnDigits, humanDateTime, humanTime } from "@/lib/bn";
import { numericValue, valueText } from "@/lib/health";
import LineChart, { type Series } from "@/components/LineChart";
import PageHeader, { CardHead, Empty } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

function daily(logs: HealthLog[], pick: (l: HealthLog) => number | null): { x: string; y: number }[] {
  // একই দিনে কয়েকবার মাপলে দিনের শেষেরটা
  const byDay = new Map<string, number>();
  for (const l of logs) {
    const v = pick(l);
    if (v !== null) byDay.set(l.logged_at.slice(0, 10), v);
  }
  return [...byDay.entries()].sort().map(([x, y]) => ({ x, y }));
}

export default async function HealthPage() {
  const mid = await requireMasterId();
  const [logs, meds, moods] = await Promise.all([getHealthLogs(mid, 30), getMeds(mid), getMoods(mid, 30)]);
  const of = (m: string) => logs.filter((l) => l.metric === m);

  const charts: { title: string; series: Series[]; unit?: string }[] = [
    {
      title: "🫀 প্রেশার",
      series: [
        { label: "উপরেরটা (sys)", color: "var(--orange)", points: daily(of("bp"), (l) => numericValue(l.value_json, "sys")) },
        { label: "নিচেরটা (dia)", color: "var(--teal)", points: daily(of("bp"), (l) => numericValue(l.value_json, "dia")) },
      ],
    },
    { title: "🩸 সুগার", series: [{ label: "সুগার", color: "var(--orange)", points: daily(of("sugar"), (l) => numericValue(l.value_json)) }], unit: of("sugar").at(-1)?.unit ?? "" },
    { title: "⚖️ ওজন", series: [{ label: "ওজন", color: "var(--teal)", points: daily(of("weight"), (l) => numericValue(l.value_json)) }], unit: "কেজি" },
    { title: "😴 ঘুম", series: [{ label: "ঘুম", color: "var(--teal)", points: daily(of("sleep"), (l) => numericValue(l.value_json)) }], unit: "ঘণ্টা" },
    { title: "🌙 মন (১-৫)", series: [{ label: "মনের অবস্থা", color: "var(--orange)", points: daily(moods.map((m) => ({ metric: "mood", value_json: JSON.stringify({ value: m.score }), unit: null, note: m.note, logged_at: m.logged_at, id: 0 })), (l) => numericValue(l.value_json)) }] },
  ].filter((c) => c.series.some((s) => s.points.length > 0));

  const symptoms = of("symptom").slice(-8).reverse();

  return (
    <div className="space-y-4">
      <PageHeader title="স্বাস্থ্য" subtitle="গত ৩০ দিনের মাপ — তুমি বটকে যা জানিয়েছ" Icon={HeartPulse} />

      {charts.length === 0 && symptoms.length === 0 && (
        <div className="card card-pad max-w-xl">
          <Empty text="এখনো কোনো মাপ নেই। বটকে বলো, চার্ট এখানে নিজে থেকে আসবে:" example="আজ প্রেশার ১৩০/৮৫" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((c, i) => {
          const last = c.series.map((s) => s.points.at(-1)?.y).filter((v) => v !== undefined) as number[];
          return (
            <section key={c.title} className="card card-pad rise" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold">{c.title}</h2>
                {last.length > 0 && (
                  <div className="text-right">
                    <p className="num text-2xl font-bold leading-none">{bnDigits(last.map((v) => Math.round(v * 10) / 10).join("/"))}</p>
                    <p className="text-xs muted mt-1">শেষ মাপ{c.unit ? ` · ${c.unit}` : ""}</p>
                  </div>
                )}
              </div>
              <LineChart series={c.series} unit={c.unit} />
            </section>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {meds.length > 0 && (
          <section className="card card-pad">
            <CardHead title="চালু ওষুধ" Icon={Pill} />
            <ul className="space-y-3">
              {meds.map((m, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <span><b>{m.name}</b>{m.dose && <span className="muted"> · {m.dose}</span>}</span>
                  {m.times && <span className="flex flex-wrap justify-end gap-1">{m.times.split(",").map((t) => <span key={t} className="chip chip-muted num">{humanTime(t.trim())}</span>)}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {symptoms.length > 0 && (
          <section className="card card-pad">
            <CardHead title="উপসর্গ" Icon={Thermometer} accent />
            <ul className="space-y-3">
              {symptoms.map((s) => (
                <li key={s.id}>
                  <p>{valueText("symptom", s.value_json, null)}{s.note && <span className="muted"> — {s.note}</span>}</p>
                  <p className="text-xs muted">{humanDateTime(s.logged_at)}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <p className="text-xs muted flex items-start gap-1.5">
        <ShieldAlert size={14} className="shrink-0 mt-0.5" />
        এটা শুধু তোমার নিজের লেখা মাপের ছবি, রোগ নির্ণয় নয়। প্রেশার {bnDigits("180/120")} বা বেশি হলে আজই ডাক্তার দেখাও।
      </p>
    </div>
  );
}
