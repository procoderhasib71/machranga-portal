import { requireMasterId } from "@/lib/session";
import { getHealthLogs, getMeds, getMoods, type HealthLog } from "@/lib/data";
import { bnDigits, humanDateTime, humanTime } from "@/lib/bn";
import { metricBn, numericValue, valueText } from "@/lib/health";
import LineChart, { type Series } from "@/components/LineChart";

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
      <h1 className="text-2xl font-bold">🩺 স্বাস্থ্য <span className="text-base font-normal" style={{ color: "var(--muted)" }}>(গত ৩০ দিন)</span></h1>

      {charts.length === 0 && symptoms.length === 0 && (
        <div className="card p-8 text-center" style={{ color: "var(--muted)" }}>
          এখনো কোনো মাপ নেই। বটকে বলো: <b>&quot;আজ প্রেশার ১৩০/৮৫&quot;</b>, <b>&quot;সুগার ৭.৮&quot;</b>, <b>&quot;৬ ঘণ্টা ঘুমিয়েছি&quot;</b>…
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((c) => (
          <section key={c.title} className="card p-5">
            <h2 className="font-semibold mb-2">{c.title}</h2>
            <LineChart series={c.series} unit={c.unit} />
          </section>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {meds.length > 0 && (
          <section className="card p-5">
            <h2 className="font-semibold mb-3">💊 চালু ওষুধ</h2>
            <ul className="space-y-2">
              {meds.map((m, i) => (
                <li key={i}>
                  <b>{m.name}</b>{m.dose && ` · ${m.dose}`}
                  {m.times && <span className="text-sm block" style={{ color: "var(--muted)" }}>⏰ {m.times.split(",").map((t) => humanTime(t.trim())).join(", ")}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {symptoms.length > 0 && (
          <section className="card p-5">
            <h2 className="font-semibold mb-3">🤒 উপসর্গ</h2>
            <ul className="space-y-2">
              {symptoms.map((s) => (
                <li key={s.id}>
                  {valueText("symptom", s.value_json, null)}{s.note && ` — ${s.note}`}
                  <span className="text-sm block" style={{ color: "var(--muted)" }}>{humanDateTime(s.logged_at)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        ⚠️ এটা শুধু তোমার নিজের লেখা মাপের ছবি — রোগ নির্ণয় নয়। প্রেশার {bnDigits("180/120")} বা বেশি হলে আজই ডাক্তার দেখাও।
      </p>
    </div>
  );
}
