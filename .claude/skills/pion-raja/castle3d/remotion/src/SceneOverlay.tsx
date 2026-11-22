import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/* SceneOverlay: frames rendered elsewhere (three.js world / castle video) + explainer graphics locked to 3D points.
   pts[frame][name] = [x, y] (0..1 of the frame), exported by the renderer each frame, so a dimension line stays glued
   to the Sphere while the camera moves. Items:
     dim     : a measuring line between two tracked points, drawn on, with a counting value ("366 FT", "TALL")
     counter : a big counting number pinned above a tracked point ("160,000 SQ FT")
     pop     : a number / word that slams in with a quake on a tracked point ("1", "2", "3")
     caption : a title card at the top ("ALMOST 3 FOOTBALL FIELDS")
   cuts: zoom-blur flashes at shot changes. intro: a video shown before `until` seconds (e.g. the castle shot). */

type P = [number, number, number?];
type Item =
  | { type: "dim"; t0: number; t1: number; a: string; b: string; axis: "v" | "h"; value: number; unit: string; label: string; offset?: number }
  | { type: "counter"; t0: number; t1: number; at: string; value: number; unit: string; label: string; dy?: number }
  | { type: "pop"; t0: number; t1: number; at: string; text: string; size?: number; dx?: number; dy?: number }
  | { type: "caption"; t0: number; t1: number; text: string; label?: string; pos?: "top" | "bottom" }
  | { type: "tag"; t0: number; t1: number; at: string; text: string; dx: number; dy: number; color?: string }
  | { type: "stamp"; t0: number; t1: number; text: string; sub?: string; x: number; y: number; rot?: number; color?: string; size?: number }
  | { type: "rage"; t0: number; t1: number; at: string; text: string; dx: number; dy: number; rot?: number; size?: number };
export type SceneOverlayProps = {
  frames: number; fps: number; width: number; height: number;
  seq: string; seqFrom?: number; intro?: { src: string; until: number } | null;
  pts: Record<string, Record<string, P>>; items: Item[]; cuts: number[]; audio?: string | null;
};

const GOLD = "#f3c75a", INK = "#22130b";
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const fmt = (v: number) => Math.round(v).toLocaleString("en-US");

const usePt = (pts: SceneOverlayProps["pts"], name: string, f: number): P | null => {
  for (let k = f; k >= 0; k--) { const r = pts[String(k)]; if (r && r[name]) return r[name]; }
  return null;
};

const inOut = (f: number, fps: number, t0: number, t1: number) => { const d = Math.min(0.25, (t1 - t0) * 0.3);
  return interpolate(f, [t0 * fps, (t0 + d) * fps, (t1 - d) * fps, t1 * fps], [0, 1, 1, 0], C); };

const Label: React.FC<{ size: number; value: string; unit: string; label: string; scale?: number }> = ({ size, value, unit, label, scale = 1 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", scale: String(scale) }}>
    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: size * 0.3, letterSpacing: "0.2em", color: GOLD,
      textShadow: `0 2px 0 ${INK}, 0 0 10px rgba(0,0,0,.5)`, marginBottom: size * 0.04 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: size * 0.12, padding: `${size * 0.08}px ${size * 0.26}px`, borderRadius: size * 0.22,
      background: "linear-gradient(160deg, rgba(34,19,11,.88), rgba(14,8,5,.86))", border: `${Math.max(3, size * 0.035)}px solid ${GOLD}`,
      boxShadow: `0 ${size * 0.1}px ${size * 0.3}px rgba(0,0,0,.45)` }}>
      <span style={{ fontFamily: "'Inter Display', Inter, sans-serif", fontWeight: 900, fontSize: size, color: "#fffaf0", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</span>
      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: size * 0.42, color: GOLD }}>{unit}</span>
    </div>
  </div>
);

const Dim: React.FC<{ it: Extract<Item, { type: "dim" }>; pts: SceneOverlayProps["pts"] }> = ({ it, pts }) => {
  const f = useCurrentFrame(), { fps, width: W, height: H } = useVideoConfig();
  const a = usePt(pts, it.a, f), b = usePt(pts, it.b, f); if (!a || !b) return null;
  const op = inOut(f, fps, it.t0, it.t1); if (op <= 0) return null;
  const draw = interpolate(f, [it.t0 * fps, it.t0 * fps + 0.55 * fps], [0, 1], { ...C, easing: ease });
  const v = interpolate(f, [it.t0 * fps, it.t0 * fps + 0.9 * fps], [0, it.value], { ...C, easing: Easing.out(Easing.cubic) });
  const off = (it.offset ?? 0.05);
  let x1 = a[0] * W, y1 = a[1] * H, x2 = b[0] * W, y2 = b[1] * H;
  if (it.axis === "v") { const x = (x1 + x2) / 2 + off * W; x1 = x2 = x; } else { const y = Math.max(y1, y2) + off * H; y1 = y2 = y; }
  const xe = x1 + (x2 - x1) * draw, ye = y1 + (y2 - y1) * draw, tick = W * 0.03, sw = Math.max(5, W * 0.006);
  const nx = it.axis === "v" ? 1 : 0, ny = it.axis === "v" ? 0 : 1;
  const mx = (x1 + xe) / 2, my = (y1 + ye) / 2, size = W * 0.085;
  const pop = interpolate(f, [it.t0 * fps + 0.2 * fps, it.t0 * fps + 0.55 * fps], [0.6, 1], { ...C, easing: Easing.out(Easing.back(2.2)) });
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {[[INK, sw * 2.2], ["#fff6d8", sw]].map(([c, w], i) => (
          <g key={i} stroke={c as string} strokeWidth={w as number} strokeLinecap="round">
            <line x1={x1} y1={y1} x2={xe} y2={ye} strokeDasharray={`${W * 0.03} ${W * 0.018}`} />
            <line x1={x1 - nx * tick} y1={y1 - ny * tick} x2={x1 + nx * tick} y2={y1 + ny * tick} />
            {draw > 0.98 ? <line x1={x2 - nx * tick} y1={y2 - ny * tick} x2={x2 + nx * tick} y2={y2 + ny * tick} /> : null}
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", left: it.axis === "v" ? x2 : (x1 + x2) / 2, top: it.axis === "v" ? Math.min(y1, y2) - size * 1.15 : y1 + size * 1.05,
        translate: "-50% -50%" }}>
        <Label size={size} value={fmt(v)} unit={it.unit} label={it.label} scale={pop} />
      </div>
    </AbsoluteFill>
  );
};

const Counter: React.FC<{ it: Extract<Item, { type: "counter" }>; pts: SceneOverlayProps["pts"] }> = ({ it, pts }) => {
  const f = useCurrentFrame(), { fps, width: W, height: H } = useVideoConfig();
  const p = usePt(pts, it.at, f); const op = inOut(f, fps, it.t0, it.t1); if (!p || op <= 0) return null;
  const v = interpolate(f, [it.t0 * fps, it.t0 * fps + 1.3 * fps], [0, it.value], { ...C, easing: Easing.out(Easing.cubic) });
  const land = it.t0 * fps + 1.3 * fps, kick = f > land && f < land + 0.3 * fps ? Math.sin((f - land) * 1.9) * (1 - (f - land) / (0.3 * fps)) * 0.06 : 0;
  const sc = interpolate(f, [it.t0 * fps, it.t0 * fps + 0.35 * fps], [0.5, 1], { ...C, easing: Easing.out(Easing.back(2)) }) + kick;
  const size = W * 0.12;
  return (
    <div style={{ position: "absolute", left: p[0] * W, top: (p[1] + (it.dy ?? -0.14)) * H, translate: "-50% -50%", opacity: op }}>
      <Label size={size} value={fmt(v)} unit={it.unit} label={it.label} scale={sc} />
    </div>
  );
};

const Pop: React.FC<{ it: Extract<Item, { type: "pop" }>; pts: SceneOverlayProps["pts"] }> = ({ it, pts }) => {
  const f = useCurrentFrame(), { fps, width: W, height: H } = useVideoConfig();
  const p = usePt(pts, it.at, f); const op = interpolate(f, [it.t0 * fps, it.t0 * fps + 2, it.t1 * fps - 0.2 * fps, it.t1 * fps], [0, 1, 1, 0], C); if (!p || op <= 0) return null;   // slams in at full opacity
  const e = (f - it.t0 * fps) / fps;
  const sc = e < 0.12 ? interpolate(e, [0, 0.12], [2.6, 0.85], { ...C, easing: Easing.in(Easing.quad) }) : interpolate(e, [0.12, 0.35], [0.85, 1], { ...C, easing: Easing.out(Easing.back(3)) });
  const q = Math.max(0, 1 - e / 0.4), sx = Math.sin(e * 90) * q * W * 0.012, sy = Math.cos(e * 77) * q * W * 0.01;
  const size = W * (it.size ?? 0.16);
  return (
    <div style={{ position: "absolute", left: (p[0] + (it.dx ?? 0)) * W + sx, top: (p[1] + (it.dy ?? 0)) * H + sy - size * 0.2, translate: "-50% -50%", opacity: op, scale: String(sc),
      width: size * 1.15, height: size * 1.15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(circle at 35% 30%, #fff3c4, ${GOLD} 55%, #c8931f)`, border: `${W * 0.008}px solid ${INK}`,
      boxShadow: `0 ${W * 0.012}px 0 ${INK}, 0 ${W * 0.03}px ${W * 0.05}px rgba(0,0,0,.45)` }}>
      <span style={{ fontFamily: "'Inter Display', Inter, sans-serif", fontWeight: 900, fontSize: size * 0.82, color: INK, lineHeight: 1, marginTop: -size * 0.04 }}>{it.text}</span>
    </div>
  );
};

const Caption: React.FC<{ it: Extract<Item, { type: "caption" }> }> = ({ it }) => {
  const f = useCurrentFrame(), { fps, width: W } = useVideoConfig();
  const op = inOut(f, fps, it.t0, it.t1); if (op <= 0) return null;
  const size = W * 0.075, rise = interpolate(f, [it.t0 * fps, it.t0 * fps + 0.4 * fps], [20, 0], { ...C, easing: ease });
  return (
    <AbsoluteFill style={{ justifyContent: it.pos === "bottom" ? "flex-end" : "flex-start", alignItems: "center", paddingTop: it.pos === "bottom" ? 0 : "9%", paddingBottom: it.pos === "bottom" ? "11%" : 0, opacity: op, translate: `0px ${rise}px` }}>
      {it.label ? <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: size * 0.42, letterSpacing: "0.22em", color: GOLD, textShadow: `0 3px 0 ${INK}, 0 0 12px rgba(0,0,0,.55)` }}>{it.label}</div> : null}
      <div style={{ fontFamily: "'Inter Display', Inter, sans-serif", fontWeight: 900, fontSize: size, color: "#fffaf0", textAlign: "center",
        textShadow: `0 ${size * 0.06}px 0 ${INK}, 0 0 ${size * 0.3}px rgba(0,0,0,.45)`, WebkitTextStroke: `${size * 0.03}px ${INK}`, maxWidth: "90%" }}>{it.text}</div>
    </AbsoluteFill>
  );
};

/* tag: a label pill joined to a tracked 3D point by a leader line that draws on (x-ray callouts) */
const Tag: React.FC<{ it: Extract<Item, { type: "tag" }>; pts: SceneOverlayProps["pts"] }> = ({ it, pts }) => {
  const f = useCurrentFrame(), { fps, width: W, height: H } = useVideoConfig();
  const p = usePt(pts, it.at, f); const op = inOut(f, fps, it.t0, it.t1); if (!p || op <= 0) return null;
  const size0 = W * 0.062, hw = (it.text.length * size0 * 0.72 + size0 * 0.84) / 2 + W * 0.04;
  const x0 = p[0] * W, y0 = p[1] * H, x1 = Math.min(W - hw, Math.max(hw, x0 + it.dx * W)), y1 = Math.min(H * 0.92, Math.max(H * 0.08, y0 + it.dy * H));
  const draw = interpolate(f, [it.t0 * fps, it.t0 * fps + 0.35 * fps], [0, 1], { ...C, easing: ease });
  const pop = interpolate(f, [it.t0 * fps + 0.2 * fps, it.t0 * fps + 0.5 * fps], [0.4, 1], { ...C, easing: Easing.out(Easing.back(2.4)) });
  const col = it.color ?? GOLD, size = W * 0.062;
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <line x1={x0} y1={y0} x2={x0 + (x1 - x0) * draw} y2={y0 + (y1 - y0) * draw} stroke={INK} strokeWidth={W * 0.012} strokeLinecap="round" />
        <line x1={x0} y1={y0} x2={x0 + (x1 - x0) * draw} y2={y0 + (y1 - y0) * draw} stroke={col} strokeWidth={W * 0.006} strokeLinecap="round" />
        <circle cx={x0} cy={y0} r={W * 0.012} fill={col} stroke={INK} strokeWidth={W * 0.004} />
      </svg>
      <div style={{ position: "absolute", left: x1, top: y1, translate: "-50% -50%", scale: String(draw > 0.9 ? pop : 0), padding: `${size * 0.18}px ${size * 0.42}px`, borderRadius: size * 0.5,
        background: "linear-gradient(160deg, rgba(34,19,11,.92), rgba(14,8,5,.9))", border: `${W * 0.005}px solid ${col}`, boxShadow: `0 ${size * 0.12}px ${size * 0.35}px rgba(0,0,0,.45)`,
        fontFamily: "'Inter Display', Inter, sans-serif", fontWeight: 900, fontSize: size, color: "#fffaf0", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{it.text}</div>
    </AbsoluteFill>
  );
};

/* rage: a jagged red comic burst with angry text, slams in near a point and keeps trembling (someone yelling down the phone) */
const Rage: React.FC<{ it: Extract<Item, { type: "rage" }>; pts: SceneOverlayProps["pts"] }> = ({ it, pts }) => {
  const f = useCurrentFrame(), { fps, width: W, height: H } = useVideoConfig();
  const p = usePt(pts, it.at, f); const op = interpolate(f, [it.t0 * fps, it.t0 * fps + 2, it.t1 * fps - 0.15 * fps, it.t1 * fps], [0, 1, 1, 0], C); if (!p || op <= 0) return null;
  const e = (f - it.t0 * fps) / fps, sc = e < 0.1 ? interpolate(e, [0, 0.1], [0.2, 1.18], C) : interpolate(e, [0.1, 0.3], [1.18, 1], { ...C, easing: Easing.out(Easing.back(3)) });
  const fs = W * (it.size ?? 0.07), tw = Math.max(it.text.length * fs * 0.66, fs * 2.2), bw = tw + fs * 1.6, bh = fs * 2.6;
  const N = 18, path = Array.from({ length: N * 2 }, (_, i) => { const a = i / (N * 2) * Math.PI * 2, r = i % 2 ? 0.78 : 1 + 0.12 * Math.sin(i * 2.7); return `${(bw / 2 + Math.cos(a) * bw / 2 * r).toFixed(1)},${(bh / 2 + Math.sin(a) * bh / 2 * r).toFixed(1)}`; }).join(" ");
  const jx = Math.sin(f * 2.1 + it.t0) * W * 0.004, jy = Math.cos(f * 1.7 + it.t0) * W * 0.004;
  const x = Math.min(W - bw / 2 - W * 0.02, Math.max(bw / 2 + W * 0.02, (p[0] + it.dx) * W)), y = (p[1] + it.dy) * H;
  return (
    <div style={{ position: "absolute", left: x + jx, top: y + jy, width: bw, height: bh, translate: "-50% -50%", rotate: `${(it.rot ?? 0) + Math.sin(f * 0.9) * 1.5}deg`, scale: String(sc), opacity: op }}>
      <svg width={bw} height={bh} style={{ position: "absolute", inset: 0, overflow: "visible", filter: `drop-shadow(0 ${W * 0.01}px 0 ${INK})` }}>
        <polygon points={path} fill="#e63946" stroke={INK} strokeWidth={W * 0.007} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter Display', Inter, sans-serif", fontWeight: 900, fontSize: fs, color: "#fffaf0",
        WebkitTextStroke: `${W * 0.004}px ${INK}`, paintOrder: "stroke fill", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{it.text}</div>
    </div>
  );
};


/* stamp: a red rubber stamp slammed onto the frame (CASE SOLVED, NO BODY...): overshoot scale, ink texture, fades out */
const Stamp: React.FC<{ it: Extract<Item, { type: "stamp" }> }> = ({ it }) => {
  const f = useCurrentFrame(), { fps, width: W } = useVideoConfig(), e = (f - it.t0 * fps) / fps;
  if (e < 0 || f > it.t1 * fps) return null;
  const sc = e < 0.09 ? interpolate(e, [0, 0.09], [2.4, 0.92], C) : interpolate(e, [0.09, 0.2], [0.92, 1], { ...C, easing: Easing.out(Easing.back(2)) });
  const op = interpolate(f, [it.t0 * fps, it.t0 * fps + 3, it.t1 * fps - 0.18 * fps, it.t1 * fps], [0, 0.94, 0.94, 0], C);
  const col = it.color || "#c8202a", fs = W * (it.size ?? 0.105), id = `ink${Math.round(it.t0 * 100)}`;
  return (
    <div style={{ position: "absolute", left: it.x * W, top: it.y * W * 16 / 9, translate: "-50% -50%", rotate: `${it.rot ?? -10}deg`, scale: String(sc), opacity: op }}>
      <svg width={0} height={0} style={{ position: "absolute" }}><filter id={id}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.35" /><feComposite in="SourceGraphic" operator="in" /></filter></svg>
      <div style={{ filter: `url(#${id})`, border: `${fs * 0.09}px solid ${col}`, outline: `${fs * 0.04}px solid ${col}`, outlineOffset: `${fs * 0.07}px`, borderRadius: fs * 0.12, padding: `${fs * 0.12}px ${fs * 0.35}px`, textAlign: "center" }}>
        <div style={{ fontFamily: "'Inter Display', Inter, sans-serif", fontWeight: 900, fontSize: fs, lineHeight: 1, color: col, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{it.text}</div>
        {it.sub && <div style={{ fontFamily: "'Inter Display', Inter, sans-serif", fontWeight: 800, fontSize: fs * 0.32, color: col, letterSpacing: "0.3em", marginTop: fs * 0.08 }}>{it.sub}</div>}
      </div>
    </div>
  );
};

export const SceneOverlay: React.FC<SceneOverlayProps> = (P) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps;
  const useIntro = P.intro && t < P.intro.until;
  // zoom-blur flash around each cut
  let zb = 0; for (const c of P.cuts) { const d = Math.abs(t - c) * fps; if (d < 6) zb = Math.max(zb, Math.pow(1 - d / 6, 1.5)); }
  const idx = String(f + (P.seqFrom ?? 0)).padStart(5, "0");
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ scale: String(1 + zb * 0.12), filter: zb > 0.01 ? `blur(${zb * 10}px) brightness(${1 + zb * 0.25})` : undefined }}>
        {useIntro ? <OffthreadVideo src={staticFile(P.intro!.src)} muted style={{ width: "100%", height: "100%" }} />
          : <Img src={staticFile(`${P.seq}/${idx}.jpg`)} style={{ width: "100%", height: "100%" }} />}
      </AbsoluteFill>
      {P.items.map((it, i) => it.type === "dim" ? <Dim key={i} it={it} pts={P.pts} /> : it.type === "counter" ? <Counter key={i} it={it} pts={P.pts} />
        : it.type === "pop" ? <Pop key={i} it={it} pts={P.pts} /> : it.type === "tag" ? <Tag key={i} it={it} pts={P.pts} /> : it.type === "rage" ? <Rage key={i} it={it} pts={P.pts} /> : it.type === "stamp" ? <Stamp key={i} it={it} /> : <Caption key={i} it={it} />)}
    </AbsoluteFill>
  );
};
