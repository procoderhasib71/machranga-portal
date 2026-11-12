// টিক দিলে পুরো পর্দায় ছোট উৎসব: টিকের জায়গা থেকে কনফেটি ছড়িয়ে নিচে ঝরে পড়ে।
// আজকের সব শেষ হলে বড় উৎসব: ওপর থেকে কনফেটি আর মাঝখানে "আজকের সব শেষ! 🎉"। কোনো লাইব্রেরি নেই, শুধু CSS।
const COLORS = ["#0e7c70", "#3cc2b2", "#e5702a", "#f5925a", "#15803d", "#facc15", "#60a5fa", "#f472b6"];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function celebrate(x: number, y: number, allDone = false) {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  layer.setAttribute("aria-hidden", "true");
  const w = innerWidth, h = innerHeight;
  const pieces = allDone ? 150 : 70;
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement("i");
    const fromTop = allDone && i % 2 === 0;   // বড় উৎসবে অর্ধেক ওপর থেকে বৃষ্টির মতো
    const sx = fromTop ? rand(0, w) : x, sy = fromTop ? -20 : y;
    const size = rand(6, 11);
    p.style.cssText = [
      `left:${sx}px`, `top:${sy}px`, `width:${size}px`, `height:${size * rand(0.4, 1)}px`,
      `background:${COLORS[i % COLORS.length]}`, `border-radius:${Math.random() < 0.35 ? "999px" : "2px"}`,
      `--dx:${fromTop ? rand(-60, 60) : rand(-0.55, 0.55) * w}px`,
      `--dy:${fromTop ? rand(40, 120) : -rand(0.12, 0.45) * h}px`,
      `--fall:${fromTop ? rand(0.7, 1.05) * h : rand(0.25, 0.6) * h}px`,
      `--rot:${rand(-720, 720)}deg`,
      `animation-duration:${rand(1.1, fromTop ? 2.2 : 1.7)}s`,
      `animation-delay:${fromTop ? rand(0, 400) : rand(0, 60)}ms`,
    ].join(";");
    layer.appendChild(p);
  }
  if (allDone) {
    const toast = document.createElement("div");
    toast.className = "confetti-toast";
    toast.textContent = "আজকের সব শেষ! 🎉";
    layer.appendChild(toast);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), allDone ? 2900 : 1900);
}
