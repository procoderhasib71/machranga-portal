import { Flame, GraduationCap, Target } from "lucide-react";
import { requireMasterId } from "@/lib/session";
import { getStudyDays, getStudyTotals } from "@/lib/data";
import { bnDigits, nowBD } from "@/lib/bn";
import PageHeader, { CardHead, Empty } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Ring({ pct }: { pct: number }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`সঠিকের হার ${pct}%`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--brand)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 44 44)" />
      <text x="44" y="49" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--ink)">{bnDigits(pct)}%</text>
    </svg>
  );
}

export default async function StudyPage() {
  const mid = await requireMasterId();
  const [totals, rows] = await Promise.all([getStudyTotals(mid, 30), getStudyDays(mid, 14)]);
  const pct = totals.total ? Math.round((totals.correct / totals.total) * 100) : 0;

  // ১৪ দিনের পুরো সারি (ফাঁকা দিনসহ), যাতে বিরতি চোখে পড়ে
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const today = nowBD();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (13 - i));
    const key = iso(d);
    return { day: key, total: byDay.get(key)?.total ?? 0, correct: byDay.get(key)?.correct ?? 0 };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.total));
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].total > 0) streak++;
    else if (i === days.length - 1) continue;   // আজ এখনো না দিলেও গতকাল পর্যন্ত গোনা চলে
    else break;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="পড়াশোনা" subtitle="বটে দেওয়া MCQ এর হিসাব" Icon={GraduationCap} />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
        <div className="card card-pad col-span-2 lg:col-span-1 flex items-center gap-4 rise">
          <Ring pct={pct} />
          <div>
            <p className="eyebrow">সঠিকের হার</p>
            <p className="text-sm muted mt-1">গত ৩০ দিনে {bnDigits(totals.correct)}টা সঠিক, মোট {bnDigits(totals.total)}টার মধ্যে</p>
          </div>
        </div>
        <div className="card card-pad rise" style={{ animationDelay: "60ms" }}>
          <p className="eyebrow flex items-center gap-1"><Target size={14} /> প্রশ্ন</p>
          <p className="num text-[28px] font-bold mt-1 leading-none">{bnDigits(totals.total)}</p>
          <p className="text-xs muted mt-1.5">গত ৩০ দিনে</p>
        </div>
        <div className="card card-pad rise" style={{ animationDelay: "120ms" }}>
          <p className="eyebrow flex items-center gap-1"><Flame size={14} /> টানা পড়া</p>
          <p className="num text-[28px] font-bold mt-1 leading-none" style={{ color: streak ? "var(--accent)" : "var(--ink)" }}>{bnDigits(streak)} দিন</p>
          <p className="text-xs muted mt-1.5">{streak ? "চালিয়ে যাও! 🔥" : "আজ কয়েকটা দিয়ে শুরু করো"}</p>
        </div>
      </div>

      <section className="card card-pad rise" style={{ animationDelay: "180ms" }}>
        <CardHead title="গত ১৪ দিন" Icon={GraduationCap} />
        {totals.total === 0 ? (
          <Empty text="এখনো কুইজ দাওনি। বটকে বলো:" example="প্রাণিবিজ্ঞান থেকে ১০টা প্রশ্ন দাও" />
        ) : (
          <>
            <div className="flex items-end gap-1 sm:gap-1.5 h-[150px]">
              {days.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full"
                  title={`${d.day}: ${d.total}টা, সঠিক ${d.correct}`}>
                  <div className="w-full max-w-7 rounded-md relative overflow-hidden"
                    style={{ height: d.total ? `${Math.max(8, Math.round((d.total / maxDay) * 124))}px` : "4px", background: d.total ? "var(--brand-soft)" : "var(--surface-2)" }}>
                    <div className="absolute bottom-0 w-full" style={{ height: `${d.total ? Math.round((d.correct / d.total) * 100) : 0}%`, background: "var(--brand)" }} />
                  </div>
                  <span className="text-[10px] num faint">{bnDigits(d.day.slice(8))}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs muted">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: "var(--brand)" }} /> সঠিক</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: "var(--brand-soft)" }} /> ভুল</span>
              <span>দুর্বল অধ্যায় আর রিভিশন: বটে <b className="font-mono">/stats</b> বা &ldquo;পড়া ধরো&rdquo;</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
