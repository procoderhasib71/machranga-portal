import { CalendarCheck, Flame, GraduationCap, Target, Timer } from "lucide-react";
import { requireMasterId } from "@/lib/session";
import { getStudyDays, getStudyTotals } from "@/lib/data";
import { bnDigits, humanDate } from "@/lib/bn";
import { getFocusByDay, getRoutineDays, lastDays, streak } from "@/lib/progress";
import { syncForRequest } from "@/lib/pomodoroSync";
import PageHeader, { CardHead, Empty } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

function minutesBn(m: number): string {
  const h = Math.floor(m / 60), r = Math.round(m % 60);
  return h ? `${bnDigits(h)} ঘ ${r ? `${bnDigits(r)} মি` : ""}`.trim() : `${bnDigits(r)} মিনিট`;
}

function Tile({ label, Icon, value, sub, tone, delay }: {
  label: string; Icon: typeof Flame; value: string; sub: string; tone?: "accent"; delay: number;
}) {
  return (
    <div className="card card-pad rise" style={{ animationDelay: `${delay}ms` }}>
      <p className="eyebrow flex items-center gap-1"><Icon size={14} /> {label}</p>
      <p className="num text-[26px] sm:text-[28px] font-bold mt-1 leading-none" style={{ color: tone === "accent" ? "var(--accent)" : "var(--ink)" }}>{value}</p>
      <p className="text-xs muted mt-1.5">{sub}</p>
    </div>
  );
}

export default async function StudyPage() {
  const mid = await requireMasterId();
  await syncForRequest(mid);   // রুটিন → কাজ এখনই, Pomodoro উত্তর পাঠানোর পরে
  const days = lastDays(14);
  const week = days.slice(-7);
  const [totals, mcqRows, routine, focus] = await Promise.all([
    getStudyTotals(mid, 30), getStudyDays(mid, 14), getRoutineDays(mid, days),
    getFocusByDay(mid, days).catch(() => ({ linked: false, byDay: new Map<string, number>() })),
  ]);
  const mcqByDay = new Map(mcqRows.map((r) => [r.day, r]));
  const pct = totals.total ? Math.round((totals.correct / totals.total) * 100) : 0;

  const active = (d: string) => (routine.get(d)?.done ?? 0) > 0 || (focus.byDay.get(d) ?? 0) > 0 || (mcqByDay.get(d)?.total ?? 0) > 0;
  const run = streak(days, active);
  const weekRoutine = week.reduce((a, d) => ({ total: a.total + (routine.get(d)?.total ?? 0), done: a.done + (routine.get(d)?.done ?? 0) }), { total: 0, done: 0 });
  const weekFocus = week.reduce((a, d) => a + (focus.byDay.get(d) ?? 0), 0);
  const maxFocus = Math.max(25, ...days.map((d) => focus.byDay.get(d) ?? 0));
  const hasProgress = days.some((d) => (routine.get(d)?.total ?? 0) > 0 || (focus.byDay.get(d) ?? 0) > 0);
  const maxMcq = Math.max(1, ...days.map((d) => mcqByDay.get(d)?.total ?? 0));

  return (
    <div className="space-y-4">
      <PageHeader title="পড়াশোনা" subtitle="রুটিন, Pomodoro আর MCQ — সব পড়ার হিসাব এক জায়গায়" Icon={GraduationCap} />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Tile label="টানা পড়া" Icon={Flame} value={`${bnDigits(run)} দিন`} tone={run ? "accent" : undefined} delay={0}
          sub={run ? "চালিয়ে যাও! 🔥" : "আজ একটু পড়ে শুরু করো"} />
        <Tile label="রুটিন · ৭ দিন" Icon={CalendarCheck} delay={40}
          value={weekRoutine.total ? `${bnDigits(weekRoutine.done)}/${bnDigits(weekRoutine.total)}` : "—"}
          sub={weekRoutine.total ? `${bnDigits(Math.round((weekRoutine.done / weekRoutine.total) * 100))}% ব্লক শেষ` : "রুটিনের কোনো ব্লক নেই"} />
        <Tile label="ফোকাস · ৭ দিন" Icon={Timer} delay={80}
          value={focus.linked ? minutesBn(weekFocus) : "—"}
          sub={focus.linked ? `দিনে গড়ে ${minutesBn(weekFocus / 7)}` : "Pomodoro যুক্ত করলে দেখাবে"} />
        <Tile label="MCQ সঠিক" Icon={Target} delay={120}
          value={totals.total ? `${bnDigits(pct)}%` : "—"}
          sub={totals.total ? `৩০ দিনে ${bnDigits(totals.total)}টা প্রশ্ন` : "এখনো কুইজ দাওনি"} />
      </div>

      <section className="card card-pad rise" style={{ animationDelay: "160ms" }}>
        <CardHead title={focus.linked ? "গত ১৪ দিন · পড়ার সময় আর রুটিন" : "গত ১৪ দিন · রুটিন"} Icon={Timer} />
        {!hasProgress ? (
          <Empty text="এখনো কোনো হিসাব নেই। রুটিনের ব্লক শেষ হলে বট জিজ্ঞেস করবে, ✅ চাপলেই এখানে উঠবে। অথবা বটকে বলো:"
            example="১৫ ডিসেম্বর পরীক্ষা, এই ৫টা অধ্যায়ের পরিকল্পনা বানাও" />
        ) : (
          <>
            <div className="flex items-end gap-1 sm:gap-1.5 h-[160px]">
              {days.map((d) => {
                const mins = focus.byDay.get(d) ?? 0;
                const r = routine.get(d);
                const h = focus.linked
                  ? (mins ? Math.max(8, Math.round((mins / maxFocus) * 120)) : 4)
                  : (r?.total ? Math.max(8, Math.round((r.done / r.total) * 120)) : 4);
                return (
                  <div key={d} className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
                    title={`${humanDate(d)}: ${focus.linked ? `${Math.round(mins)} মিনিট, ` : ""}রুটিন ${r?.done ?? 0}/${r?.total ?? 0}`}>
                    {focus.linked && mins > 0 && <span className="text-[9px] num faint">{bnDigits(Math.round(mins))}</span>}
                    <div className="w-full max-w-7 rounded-md" style={{ height: `${h}px`, background: (focus.linked ? mins : r?.done) ? "var(--brand)" : "var(--surface-2)" }} />
                    <span className="h-3 flex items-center gap-[2px]">
                      {r && Array.from({ length: Math.min(r.total, 4) }, (_, i) => (
                        <span key={i} className="size-[5px] rounded-full" style={{ background: i < r.done ? "var(--accent)" : "var(--line)" }} />
                      ))}
                    </span>
                    <span className="text-[10px] num faint">{bnDigits(d.slice(8))}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs muted">
              {focus.linked && <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: "var(--brand)" }} /> Pomodoro ফোকাস (মিনিট)</span>}
              {!focus.linked && <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: "var(--brand)" }} /> রুটিনের কতটা শেষ</span>}
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: "var(--accent)" }} /> রুটিনের ব্লক শেষ</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: "var(--line)" }} /> বাকি</span>
            </div>
          </>
        )}
      </section>

      <section className="card card-pad rise" style={{ animationDelay: "200ms" }}>
        <CardHead title="MCQ · গত ১৪ দিন" Icon={Target} />
        {totals.total === 0 ? (
          <Empty text="এখনো কুইজ দাওনি। বটকে বলো:" example="প্রাণিবিজ্ঞান থেকে ১০টা প্রশ্ন দাও" />
        ) : (
          <>
            <div className="flex items-end gap-1 sm:gap-1.5 h-[150px]">
              {days.map((d) => {
                const m = mcqByDay.get(d);
                const total = m?.total ?? 0, correct = m?.correct ?? 0;
                return (
                  <div key={d} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full" title={`${d}: ${total}টা, সঠিক ${correct}`}>
                    <div className="w-full max-w-7 rounded-md relative overflow-hidden"
                      style={{ height: total ? `${Math.max(8, Math.round((total / maxMcq) * 124))}px` : "4px", background: total ? "var(--brand-soft)" : "var(--surface-2)" }}>
                      <div className="absolute bottom-0 w-full" style={{ height: `${total ? Math.round((correct / total) * 100) : 0}%`, background: "var(--brand)" }} />
                    </div>
                    <span className="text-[10px] num faint">{bnDigits(d.slice(8))}</span>
                  </div>
                );
              })}
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
