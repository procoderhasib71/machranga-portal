// মাছরাঙা লোগো: ব্র্যান্ড রঙের গোল টাইলে পাখি
export default function Logo({ size = 36, withText = true, onBrand = false }: { size?: number; withText?: boolean; onBrand?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex items-center justify-center rounded-xl shrink-0"
        style={{ width: size, height: size, background: onBrand ? "rgb(255 255 255 / 0.18)" : "linear-gradient(135deg, var(--brand), var(--brand-strong))", boxShadow: onBrand ? "none" : "var(--shadow)" }}>
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" aria-hidden>
          {/* মাথা আর পিঠ */}
          <path d="M4 14c0-4.4 3.6-8 8-8 2.3 0 4.3 1 5.8 2.5L22 9l-3.2 2.1c.1.6.2 1.2.2 1.9 0 4.4-3.6 8-8 8H5l1.5-2.3C5 17.3 4 15.8 4 14z" fill="#fff" opacity=".95" />
          {/* কমলা বুক */}
          <path d="M7.5 15.5c1.5 2 3.6 2.7 6 2.2-2.6-.4-4.3-1.7-5-3.6z" fill="var(--accent)" />
          <circle cx="14.6" cy="10.2" r="1.15" fill="#0f1f1c" />
        </svg>
      </span>
      {withText && <span className="font-bold text-[17px] tracking-tight" style={{ color: onBrand ? "#fff" : "var(--ink)" }}>মাছরাঙা</span>}
    </span>
  );
}
