import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/* Green-screen FX for proj9 (keyed over src/input.mp4):
   BossWords: angry words fly out of the boss's mouth (scene 3.967-6.083 s of the source).
   BossSpit:  boss-POV spit spraying onto Pion's face (scene 6.083-8.35 s of the source).
   Everything is fully opaque (no glow / soft shadow) so it keys cleanly on #00FF00. */

const GREEN = "#00FF00", INK = "#14161c";
const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/* mouth centre in source pixels, tracked by hand from the frames (local seconds from the cut at 3.967 s) */
const mouth = (t: number): [number, number] => {
  const u = interpolate(t, [0.82, 1.0], [0, 1], { ...C, easing: Easing.inOut(Easing.quad) });
  return [lerp(540, 590, u), lerp(612, 596, u)];
};

type Word = { t: number; text: string; x: number; y: number; rot: number; size: number; fill: string; color: string };
const WORDS: Word[] = [
  { t: 0.40, text: "#@%&!!", x: 250, y: 860, rot: -12, size: 0.085, fill: "#e63946", color: "#fffaf0" },
  { t: 0.58, text: "WHERE'S MY REPORT?!", x: 540, y: 225, rot: 4, size: 0.062, fill: "#e63946", color: "#fffaf0" },
  { t: 0.80, text: "LAZY!!", x: 870, y: 480, rot: 10, size: 0.08, fill: "#ffd23f", color: "#d62828" },
  { t: 1.00, text: "UNACCEPTABLE!", x: 420, y: 1030, rot: -5, size: 0.066, fill: "#e63946", color: "#fffaf0" },
  { t: 1.18, text: "NOW!!", x: 190, y: 430, rot: -14, size: 0.085, fill: "#ffd23f", color: "#d62828" },
  { t: 1.36, text: "!!!", x: 900, y: 860, rot: 12, size: 0.1, fill: "#e63946", color: "#fffaf0" },
  { t: 1.55, text: "YOU HEAR ME?!", x: 640, y: 1290, rot: 6, size: 0.066, fill: "#ffd23f", color: "#d62828" },
];

const Burst: React.FC<{ w: Word; t: number; W: number }> = ({ w, t, W }) => {
  const e = t - w.t; if (e < 0) return null;
  const fly = interpolate(e, [0, 0.28], [0, 1], { ...C, easing: Easing.out(Easing.cubic) });
  const [mx, my] = mouth(w.t);
  const arc = Math.sin(fly * Math.PI) * -60;                       // little upward arc on the way out
  const x = lerp(mx, w.x, fly), y = lerp(my, w.y, fly) + arc;
  const sc = e < 0.28 ? lerp(0.12, 1.15, fly) : interpolate(e, [0.28, 0.45], [1.15, 1], { ...C, easing: Easing.out(Easing.back(3)) });
  const fs = W * w.size, tw = Math.max(w.text.length * fs * 0.66, fs * 2.2), bw = tw + fs * 1.6, bh = fs * 2.6;
  const N = 18, path = Array.from({ length: N * 2 }, (_, i) => { const a = i / (N * 2) * Math.PI * 2, r = i % 2 ? 0.78 : 1 + 0.12 * Math.sin(i * 2.7 + w.t * 9); return `${(bw / 2 + Math.cos(a) * bw / 2 * r).toFixed(1)},${(bh / 2 + Math.sin(a) * bh / 2 * r).toFixed(1)}`; }).join(" ");
  const f = t * 60, jx = Math.sin(f * 2.1 + w.t * 7) * W * 0.005, jy = Math.cos(f * 1.7 + w.t * 5) * W * 0.005;
  const cx = Math.min(W - bw * sc / 2 - 12, Math.max(bw * sc / 2 + 12, x));
  return (
    <div style={{ position: "absolute", left: cx + jx, top: y + jy, width: bw, height: bh, translate: "-50% -50%", rotate: `${w.rot * fly + Math.sin(f * 0.9 + w.t) * 2}deg`, scale: String(sc) }}>
      <svg width={bw} height={bh} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <polygon points={path} fill={INK} transform={`translate(0 ${W * 0.012})`} />
        <polygon points={path} fill={w.fill} stroke={INK} strokeWidth={W * 0.008} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter Display', Inter, sans-serif", fontWeight: 900, fontSize: fs, color: w.color,
        WebkitTextStroke: `${W * 0.0045}px ${INK}`, paintOrder: "stroke fill", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{w.text}</div>
    </div>
  );
};

/* yelling lines: white wedges radiating from the mouth, flickering in pulses */
const ShoutLines: React.FC<{ t: number }> = ({ t }) => {
  if (t < 0.38) return null;
  const [mx, my] = mouth(t), pulse = Math.floor((t - 0.38) * 9), r = rng(pulse * 31 + 7), on = interpolate(t, [0.38, 0.46], [0, 1], C);
  const lines = Array.from({ length: 10 }, (_, i) => {
    const side = i % 2 ? 1 : -1, deg = -28 + Math.floor(i / 2) * 16 + (r() - 0.5) * 10;   // two fans, left and right of the face
    const a = (side > 0 ? deg : 180 - deg) * Math.PI / 180;
    const r0 = 165 + r() * 25, r1 = r0 + (90 + r() * 120) * on, wd = 9 + r() * 7;
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
    const pts = [[mx + ca * r0 + px * 2, my + sa * r0 + py * 2], [mx + ca * r1 + px * wd, my + sa * r1 + py * wd], [mx + ca * (r1 + 14), my + sa * (r1 + 14)], [mx + ca * r1 - px * wd, my + sa * r1 - py * wd], [mx + ca * r0 - px * 2, my + sa * r0 - py * 2]];
    return <polygon key={i} points={pts.map((p) => p.join(",")).join(" ")} fill="#ffffff" stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
  });
  return <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>{lines}</svg>;
};

export const BossWords: React.FC = () => {
  const f = useCurrentFrame(), { fps, width: W } = useVideoConfig(), t = f / fps;
  return (
    <AbsoluteFill style={{ background: GREEN }}>
      <ShoutLines t={t} />
      {WORDS.map((w, i) => <Burst key={i} w={w} t={t} W={W} />)}
    </AbsoluteFill>
  );
};

/* ---------- spit ---------- */
const FACE = { x: 545, y: 1110, rx: 205, ry: 175 };            // Pion's face in the boss-POV shot (source pixels)
type Drop = { t0: number; dur: number; sx: number; sy: number; tx: number; ty: number; s0: number; s1: number; hit: boolean; seed: number };
const DROPS: Drop[] = (() => {
  const r = rng(90210), out: Drop[] = [];
  const bursts = [{ t: 0.04, n: 20 }, { t: 0.55, n: 14 }, { t: 1.0, n: 16 }];
  for (const b of bursts) for (let i = 0; i < b.n; i++) {
    const hit = r() < 0.5, a = r() * Math.PI * 2, rr = Math.sqrt(r());
    const tx = hit ? FACE.x + Math.cos(a) * FACE.rx * rr * 0.92 : FACE.x + (r() < 0.5 ? -1 : 1) * (640 + r() * 400);
    const ty = hit ? FACE.y + Math.sin(a) * FACE.ry * rr * 0.92 : FACE.y + (r() - 0.6) * 700;
    const big = r() < 0.18;
    out.push({ t0: b.t + r() * 0.16, dur: 0.22 + r() * 0.16, sx: 540 + (r() - 0.5) * 900, sy: 1950 + r() * 250, tx, ty,
      s0: big ? 150 + r() * 90 : 50 + r() * 80, s1: big ? 28 + r() * 12 : 8 + r() * 11, hit, seed: Math.floor(r() * 1e6) });
  }
  return out;
})();

/* perspective-ish flight: fast and huge near the camera, shrinking as it reaches the face */
const flight = (d: Drop, t: number) => {
  const u = Math.min(1, Math.max(0, (t - d.t0) / d.dur)), w = (1 - u) / (1 + 5 * u);
  return { u, x: d.tx + (d.sx - d.tx) * w, y: d.ty + (d.sy - d.ty) * w, s: d.s1 + (d.s0 - d.s1) * w };
};

const Blob: React.FC<{ x: number; y: number; rx: number; ry: number; rot: number; seed: number }> = ({ x, y, rx, ry, rot, seed }) => {
  const r = rng(seed), N = 9, pts = Array.from({ length: N }, (_, i) => { const a = i / N * Math.PI * 2, k = 0.82 + r() * 0.3; return [Math.cos(a) * rx * k, Math.sin(a) * ry * k]; });
  const d = pts.map((p, i) => { const q = pts[(i + 1) % N], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; return `${i ? "" : `M${((pts[N - 1][0] + p[0]) / 2).toFixed(1)},${((pts[N - 1][1] + p[1]) / 2).toFixed(1)} `}Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)}`; }).join(" ") + "Z";
  const sw = Math.max(2.5, Math.min(rx, ry) * 0.16);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={d} fill="#d8f1ff" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
      <ellipse cx={-rx * 0.32} cy={-ry * 0.3} rx={Math.max(1.5, rx * 0.22)} ry={Math.max(1.2, ry * 0.15)} fill="#ffffff" />
    </g>
  );
};

const Splat: React.FC<{ d: Drop; t: number }> = ({ d, t }) => {
  const e = t - (d.t0 + d.dur); if (e < 0) return null;
  const r = rng(d.seed + 3), s = d.s1, pop = interpolate(e, [0, 0.06, 0.14], [0.3, 1.25, 1], C);
  const sat = Array.from({ length: 3 + Math.floor(r() * 4) }, () => { const a = r() * Math.PI * 2, dist = s * (0.9 + r() * 1.3) * pop; return { x: Math.cos(a) * dist, y: Math.sin(a) * dist, k: 0.18 + r() * 0.25, sd: Math.floor(r() * 1e6) }; });
  const drip = s > 16 ? interpolate(e, [0.15, 1.6], [0, s * (1.2 + r() * 1.4)], { ...C, easing: Easing.in(Easing.quad) }) : 0;
  const rx = s * 1.05 * pop, ry = s * 0.8 * pop;
  return (
    <g transform={`translate(${d.tx} ${d.ty})`}>
      {drip > 1 && <path d={`M${-s * 0.28},0 L${-s * 0.18},${drip} Q0,${drip + s * 0.42} ${s * 0.18},${drip} L${s * 0.28},0 Z`} fill="#d8f1ff" stroke={INK} strokeWidth={Math.max(2.5, s * 0.13)} strokeLinejoin="round" />}
      <Blob x={0} y={0} rx={rx} ry={ry} rot={r() * 360} seed={d.seed} />
      {sat.map((q, i) => <Blob key={i} x={q.x} y={q.y} rx={s * q.k * 1.2} ry={s * q.k} rot={0} seed={q.sd} />)}
    </g>
  );
};

export const BossSpit: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps;
  return (
    <AbsoluteFill style={{ background: GREEN }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {DROPS.filter((d) => d.hit).map((d, i) => <Splat key={"s" + i} d={d} t={t} />)}
        {DROPS.map((d, i) => {
          if (t < d.t0) return null;
          const p = flight(d, t);
          if (p.u >= 1) return null;                                  // hits become splats, misses leave frame
          const q = flight(d, t - 1 / 60), vx = p.x - q.x, vy = p.y - q.y, sp = Math.hypot(vx, vy);
          const stretch = 1 + Math.min(1.6, sp / (p.s * 1.2));
          return <Blob key={i} x={p.x} y={p.y} rx={p.s * 0.5 * stretch} ry={p.s * 0.5} rot={Math.atan2(vy, vx) * 180 / Math.PI} seed={d.seed} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};
