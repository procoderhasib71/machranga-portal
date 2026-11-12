// ড্যাশবোর্ড: এক নজরে আজকের সবকিছু
import Link from "next/link";
import { requireMasterId } from "@/lib/session";
import { getReminders, getRoutine, getSubscription, getTodos, getUser, todaysBlocks, isOverdue, getHealthLogs } from "@/lib/data";
import { bnDigits, humanDate, humanDateTime, humanTime, nowBD, DAY_ORDER } from "@/lib/bn";
import { metricBn, valueText } from "@/lib/health";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const mid = await requireMasterId();
  const [user, todos, routine, reminders, sub, health] = await Promise.all([
    getUser(mid), getTodos(mid), getRoutine(mid), getReminders(mid), getSubscription(mid), getHealthLogs(mid, 7),
  ]);
  const now = nowBD();
  const dayCode = DAY_ORDER[(now.getDay() + 1) % 7];   // JS: রবি=0 → আমাদের ক্রমে
  const blocks = todaysBlocks(routine, dayCode);
  const lastHealth = health.at(-1);
  const name = user?.call_me || user?.name || "বন্ধু";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">আসসালামু আলাইকুম, {name} 👋</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">📝 আজকের কাজ</h2>
            <Link href="/todo" className="text-sm font-medium" style={{ color: "var(--teal)" }}>সব দেখো →</Link>
          </div>
          {todos.open.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>লিস্ট ফাঁকা! বটকে বলো &quot;লিস্টে রাখো...&quot; 🙂</p>
          ) : (
            <ul className="space-y-2">
              {todos.open.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <span>{t.priority ? "❗" : "•"}</span>
                  <span className="flex-1">{t.task}</span>
                  {t.due_date && (
                    <span className="text-sm shrink-0" style={{ color: isOverdue(t.due_date) ? "var(--red)" : "var(--muted)" }}>
                      {humanDate(t.due_date)}
                    </span>
                  )}
                </li>
              ))}
              {todos.open.length > 6 && <li className="text-sm" style={{ color: "var(--muted)" }}>…আরও {bnDigits(todos.open.length - 6)}টা</li>}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">📅 আজকের রুটিন</h2>
            <Link href="/routine" className="text-sm font-medium" style={{ color: "var(--teal)" }}>পুরোটা →</Link>
          </div>
          {blocks.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>আজকের জন্য কিছু নেই। রুটিন বানাতে বটকে বলো।</p>
          ) : (
            <ul className="space-y-2">
              {blocks.slice(0, 6).map((b) => (
                <li key={b.id} className="flex items-center gap-2">
                  <span className="text-sm font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>
                    {humanTime(b.start_time)}{b.end_time ? `–${humanTime(b.end_time)}` : ""}
                  </span>
                  <span className="flex-1">{b.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold mb-3">⏰ পরের রিমাইন্ডার</h2>
          {reminders.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>কোনো রিমাইন্ডার নেই।</p>
          ) : (
            <ul className="space-y-2">
              {reminders.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-start gap-2">
                  <span className="text-sm shrink-0 font-medium" style={{ color: "var(--orange)" }}>{humanDateTime(r.trigger_time)}</span>
                  <span className="flex-1">{r.task}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">🩺 স্বাস্থ্য</h2>
            <Link href="/health" className="text-sm font-medium" style={{ color: "var(--teal)" }}>চার্ট →</Link>
          </div>
          {lastHealth ? (
            <p>
              শেষ মাপ: <b>{metricBn(lastHealth.metric)}</b> — {valueText(lastHealth.metric, lastHealth.value_json, lastHealth.unit)}
              <span className="text-sm block mt-1" style={{ color: "var(--muted)" }}>{humanDateTime(lastHealth.logged_at)}</span>
            </p>
          ) : (
            <p style={{ color: "var(--muted)" }}>গত ৭ দিনে কোনো মাপ নেই। বটকে বলো &quot;আজ প্রেশার ১৩০/৮৫&quot;।</p>
          )}
          {sub && (
            <p className="text-sm mt-3 pt-3 border-t" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
              📋 প্ল্যান: {sub.plan === "trial" ? "ফ্রি ট্রায়াল" : sub.plan} · মেয়াদ {humanDate(sub.expires_at.slice(0, 10))} পর্যন্ত
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
