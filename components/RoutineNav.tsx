"use client";
// রুটিনের ট্যাব (আজ/সপ্তাহ/পরিকল্পনা আর বার): চাপলেই ট্যাব বদলে যায় আর সার্ভারের উত্তরের অপেক্ষায় কঙ্কাল দেখায়।
import { BookOpen, Columns3, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition } from "react";
import { DAY_BN, DAY_ORDER } from "@/lib/bn";

type Ctx = { go: (href: string, key: string, kind: "view" | "day") => void; pending: boolean; kind: "view" | "day" | null; target: string | null };
const NavCtx = createContext<Ctx | null>(null);
const useNav = () => useContext(NavCtx)!;

export function NavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const [kind, setKind] = useState<"view" | "day" | null>(null);
  const go = (href: string, key: string, k: "view" | "day") => {
    setTarget(key); setKind(k);
    start(() => router.push(href, { scroll: false }));
  };
  return <NavCtx.Provider value={{ go, pending, kind, target }}>{children}</NavCtx.Provider>;
}

const TABS = [["today", "/routine", Sun, "আজ"], ["week", "/routine?view=week", Columns3, "সপ্তাহ"], ["plans", "/routine?view=plans", BookOpen, "পরিকল্পনা"]] as const;

export function ViewTabs({ current }: { current: string }) {
  const { go, pending, kind, target } = useNav();
  const active = pending && kind === "view" && target ? target : current;
  return (
    <nav className="seg max-w-md -mt-3" aria-label="রুটিনের ভাগ">
      {TABS.map(([key, href, Icon, label]) => (
        <button key={key} type="button" aria-pressed={active === key} onClick={() => active !== key && go(href, key, "view")}>
          <span className="inline-flex items-center justify-center gap-1.5"><Icon size={15} /> {label}</span>
        </button>
      ))}
    </nav>
  );
}

/** নতুন ট্যাব আসার আগ পর্যন্ত কঙ্কাল */
export function ViewBody({ children }: { children: React.ReactNode }) {
  const { pending, kind } = useNav();
  if (pending && kind === "view") return <ViewSkeleton />;
  return <>{children}</>;
}

export function DayTabs({ selected, todayCode, counts }: { selected: string; todayCode: string; counts: Record<string, string> }) {
  const { go, pending, kind, target } = useNav();
  const active = pending && kind === "day" && target ? target : selected;
  return (
    <nav className="grid grid-cols-7 gap-1" aria-label="বার">
      {DAY_ORDER.map((c) => (
        <button key={c} type="button" onClick={() => c !== active && go(`/routine?view=week&day=${c}`, c, "day")} aria-pressed={c === active}
          className="rounded-xl py-2 text-center text-xs font-semibold transition-colors"
          style={c === active ? { background: "var(--brand)", color: "var(--brand-ink)" } : { background: "var(--surface-2)", color: c === todayCode ? "var(--brand)" : "var(--muted)" }}>
          {DAY_BN[c]}
          <span className="block text-[10px] font-medium num opacity-80 mt-0.5">{counts[c]}</span>
        </button>
      ))}
    </nav>
  );
}

/** বার বদলের সময় শুধু সেই বারের তালিকা কঙ্কাল */
export function DayBody({ children }: { children: React.ReactNode }) {
  const { pending, kind } = useNav();
  if (pending && kind === "day") return <ListSkeleton rows={4} />;
  return <>{children}</>;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="লোড হচ্ছে">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="prow" style={{ background: "var(--surface-2)" }}>
          <span className="skeleton size-[27px] rounded-full shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <span className="skeleton block h-2.5 w-28 rounded" />
            <span className="skeleton block h-4 rounded-md" style={{ width: `${78 - i * 12}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ViewSkeleton() {
  return (
    <div className="card card-pad" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="flex items-center justify-between mb-3">
        <span className="skeleton block h-6 w-40 rounded-lg" />
        <span className="skeleton block h-6 w-16 rounded-full" />
      </div>
      <span className="skeleton block h-1.5 w-full rounded-full mb-5" />
      <ListSkeleton rows={5} />
    </div>
  );
}
