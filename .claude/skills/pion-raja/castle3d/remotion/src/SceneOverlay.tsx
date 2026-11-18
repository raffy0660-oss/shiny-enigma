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
  | { type: "caption"; t0: number; t1: number; text: string; label?: string; pos?: "top" | "bottom" };
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

const inOut = (f: number, fps: number, t0: number, t1: number) =>
  interpolate(f, [t0 * fps, t0 * fps + 0.25 * fps, t1 * fps - 0.25 * fps, t1 * fps], [0, 1, 1, 0], C);

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
        : it.type === "pop" ? <Pop key={i} it={it} pts={P.pts} /> : <Caption key={i} it={it} />)}
    </AbsoluteFill>
  );
};
