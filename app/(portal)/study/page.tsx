import { requireMasterId } from "@/lib/session";
import { getStudyDays, getStudyTotals } from "@/lib/data";
import { bnDigits } from "@/lib/bn";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const mid = await requireMasterId();
  const [totals, days] = await Promise.all([getStudyTotals(mid, 30), getStudyDays(mid, 14)]);
  const pct = totals.total ? Math.round((totals.correct / totals.total) * 100) : 0;
  const maxDay = Math.max(1, ...days.map((d) => d.total));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📚 পড়াশোনা (MCQ)</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5 text-center">
          <div className="text-3xl font-bold" style={{ color: "var(--teal)" }}>{bnDigits(totals.total)}</div>
          <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>গত ৩০ দিনে প্রশ্ন</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-3xl font-bold" style={{ color: "var(--orange)" }}>{bnDigits(pct)}%</div>
          <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>সঠিকের হার</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-3xl font-bold" style={{ color: "var(--teal)" }}>{bnDigits(days.filter((d) => d.total > 0).length)}</div>
          <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>গত ১৪ দিনে যত দিন দিয়েছ</div>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">দিন ধরে (গত ১৪ দিন)</h2>
        {days.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>এখনো কুইজ দাওনি। বটকে বলো: <b>&quot;১০টা প্রশ্ন দাও&quot;</b> 🙂</p>
        ) : (
          <div className="flex items-end gap-1.5">
            {days.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.total}টা, সঠিক ${d.correct}`}>
                <div className="w-full rounded-t-md relative overflow-hidden"
                  style={{ height: `${Math.max(6, Math.round((d.total / maxDay) * 130))}px`, background: "var(--teal-soft)" }}>
                  <div className="absolute bottom-0 w-full" style={{ height: `${d.total ? Math.round((d.correct / d.total) * 100) : 0}%`, background: "var(--teal)" }} />
                </div>
                <span className="text-[10px]" style={{ color: "var(--muted)" }}>{bnDigits(d.day.slice(8))}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
          গাঢ় অংশ = সঠিক উত্তর। দুর্বল অধ্যায় আর রিভিশনের হিসাব বটে: <b>stats</b> লেখো বা &quot;পড়া ধরো&quot; বলো।
        </p>
      </section>
    </div>
  );
}
