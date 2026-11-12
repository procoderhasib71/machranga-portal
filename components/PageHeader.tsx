import type { LucideIcon } from "lucide-react";

export default function PageHeader({ title, subtitle, Icon, action }: {
  title: string; subtitle?: string; Icon?: LucideIcon; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 rise">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <span className="icon-badge size-11 rounded-2xl"><Icon size={22} /></span>}
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="muted text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** কার্ডের মাথা: icon, শিরোনাম, ডানে লিংক */
export function CardHead({ title, Icon, accent = false, action }: {
  title: string; Icon: LucideIcon; accent?: boolean; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5">
        <span className={`icon-badge ${accent ? "icon-badge-accent" : ""}`}><Icon size={18} /></span>
        <h2 className="font-semibold text-[15px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** ফাঁকা অবস্থা: বটকে কী বলতে হবে সেটা দেখায় */
export function Empty({ text, example }: { text: string; example?: string }) {
  return (
    <div className="rounded-xl px-4 py-5 text-center text-sm" style={{ background: "var(--surface-2)" }}>
      <p className="muted">{text}</p>
      {example && <p className="mt-1.5 font-medium" style={{ color: "var(--brand)" }}>&ldquo;{example}&rdquo;</p>}
    </div>
  );
}
