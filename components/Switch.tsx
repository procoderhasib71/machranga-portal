"use client";

/** ফোনের মতো চালু/বন্ধ সুইচ */
export default function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors"
      style={{ background: on ? "var(--brand)" : "var(--line)" }}>
      <span className="inline-block size-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? "translateX(24px)" : "translateX(4px)" }} />
    </button>
  );
}
