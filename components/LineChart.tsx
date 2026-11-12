// ছোট SVG লাইন চার্ট (server component): লাইব্রেরি ছাড়াই, হালকা আর দুই থিমেই পড়া যায়
import { bnDigits } from "@/lib/bn";

export type Series = { label: string; color: string; points: { x: string; y: number }[] };

export default function LineChart({ series, height = 180, unit = "" }: { series: Series[]; height?: number; unit?: string }) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return <p style={{ color: "var(--muted)" }}>এখনো ডাটা নেই।</p>;

  const xs = [...new Set(all.map((p) => p.x))].sort();
  const ys = all.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min -= pad; max += pad;

  const W = 560, H = height, L = 42, B = 22, T = 8, R = 8;
  const px = (x: string) => xs.length === 1 ? (L + (W - L - R) / 2) : L + ((W - L - R) * xs.indexOf(x)) / (xs.length - 1);
  const py = (y: number) => T + (H - T - B) * (1 - (y - min) / (max - min));
  const ticks = [min + pad, (min + max) / 2, max - pad];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={py(t)} y2={py(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={L - 6} y={py(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{bnDigits(Math.round(t * 10) / 10)}</text>
          </g>
        ))}
        {[xs[0], xs[Math.floor((xs.length - 1) / 2)], xs[xs.length - 1]].filter((v, i, a) => a.indexOf(v) === i).map((x) => (
          <text key={x} x={px(x)} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--muted)">{bnDigits(x.slice(5).replace("-", "/"))}</text>
        ))}
        {series.map((s) => {
          const pts = s.points.filter((p) => Number.isFinite(p.y));
          if (pts.length === 0) return null;
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => <circle key={i} cx={px(p.x)} cy={py(p.y)} r="3" fill={s.color} />)}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-4 mt-1 text-sm" style={{ color: "var(--muted)" }}>
        {series.filter((s) => s.points.length > 0).map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: s.color }} /> {s.label}{unit && ` (${unit})`}
          </span>
        ))}
      </div>
    </div>
  );
}
