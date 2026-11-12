"use client";
// ড্যাশবোর্ডের "আজকের রুটিন": প্রতিটা ব্লকের পাশে টিক — শেষ করলে কাজের লিস্ট আর Pomodoro তেও শেষ হয়
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { humanTime } from "@/lib/bn";

export type TodayBlock = {
  id: number; start_time: string; end_time: string | null; title: string; note: string | null;
  todoId: number | null; done: boolean; live: boolean; past: boolean;
};

export default function RoutineToday({ blocks }: { blocks: TodayBlock[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = (b: TodayBlock) =>
    b.todoId && start(async () => {
      await fetch("/api/todo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: b.done ? "reopen" : "complete", id: b.todoId }),
      });
      router.refresh();
    });

  return (
    <ol className="relative space-y-1">
      <span className="absolute left-[13px] top-4 bottom-4 w-px" style={{ background: "var(--line)" }} />
      {blocks.map((b) => (
        <li key={b.id} className="relative flex items-start gap-3 py-1.5" style={{ opacity: b.past && !b.live && !b.done ? 0.6 : 1 }}>
          <button type="button" disabled={pending || !b.todoId} onClick={() => toggle(b)}
            aria-label={b.done ? `${b.title}: আবার খোলো` : `${b.title}: শেষ`} title={b.done ? "আবার খোলো" : "শেষ হলে চাপো"}
            className="relative z-10 mt-0.5 size-[27px] shrink-0 rounded-full border-2 flex items-center justify-center transition-colors hover:bg-[var(--brand-soft)] disabled:cursor-default"
            style={{
              borderColor: b.done || b.live ? "var(--brand)" : "var(--faint)",
              background: b.done ? "var(--brand)" : "var(--surface)",
            }}>
            {b.done ? <Check size={15} strokeWidth={3} style={{ color: "var(--brand-ink)" }} />
              : b.live ? <span className="size-2.5 rounded-full" style={{ background: "var(--brand)" }} /> : null}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs num muted">
              {humanTime(b.start_time)}{b.end_time ? ` – ${humanTime(b.end_time)}` : ""}
              {b.live && !b.done && <span className="chip text-[11px] py-0 ml-2">এখন</span>}
            </p>
            <p className={`text-[15px] leading-snug ${b.live ? "font-semibold" : ""} ${b.done ? "line-through faint" : ""}`}>{b.title}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
