import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

/* Cast sheet for the detective series: characters are engine renders (trimmed transparent PNGs, same pixels-per-unit),
   all text is drawn here. Top: detective + partner + victim under a desk lamp. Bottom: the suspects in a police line-up. */

export type CastChar = { img: string; w: number; h: number; role: string; name: string; color: string };
export type CastSheetProps = { top: CastChar[]; suspects: CastChar[]; k: number };

const INK = "#0e1118", PAPER = "#f3ead7", FONT = "'Inter Display', Inter, sans-serif";

const Tag: React.FC<{ c: CastChar; big?: boolean }> = ({ c, big }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 10 }}>
    <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: big ? 26 : 22, letterSpacing: "0.22em", color: c.color, textShadow: `0 2px 0 ${INK}` }}>{c.role}</div>
    <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: big ? 44 : 34, color: PAPER, lineHeight: 1, WebkitTextStroke: `2px ${INK}`, paintOrder: "stroke fill", whiteSpace: "nowrap" }}>{c.name}</div>
  </div>
);

const Char: React.FC<{ c: CastChar; k: number }> = ({ c, k }) => (
  <Img src={staticFile(c.img)} style={{ width: c.w * k, height: c.h * k, display: "block" }} />
);

export const CastSheet: React.FC<CastSheetProps> = ({ top, suspects, k }) => {
  const lines = Array.from({ length: 9 }, (_, i) => i);
  return (
    <AbsoluteFill style={{ background: INK }}>
      {/* ---- top: office under a lamp */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1010, overflow: "hidden",
        background: "radial-gradient(ellipse 70% 55% at 50% 52%, #4a3a2a 0%, #2a2119 45%, #14110e 100%)" }}>
        {/* venetian-blind light stripes */}
        {Array.from({ length: 7 }, (_, i) => <div key={i} style={{ position: "absolute", left: -200, top: 210 + i * 70, width: 1500, height: 26, background: "rgba(255,214,150,0.07)", rotate: "-14deg" }} />)}
        <div style={{ position: "absolute", top: 54, width: "100%", textAlign: "center" }}>
          <div style={{ display: "inline-block", fontFamily: FONT, fontWeight: 900, fontSize: 30, letterSpacing: "0.35em", color: "#e2c27a", border: "4px solid #e2c27a", padding: "6px 18px 6px 28px", rotate: "-2deg" }}>CASE FILE</div>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 92, color: PAPER, lineHeight: 1.05, marginTop: 14, WebkitTextStroke: `3px ${INK}`, paintOrder: "stroke fill" }}>THE CAST</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "space-around", alignItems: "flex-end" }}>
          {top.map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: i === 1 ? 420 : 300 }}>
              <Char c={c} k={k * (i === 1 ? 1.22 : 1)} />
              <Tag c={c} big={i === 1} />
            </div>
          ))}
        </div>
      </div>
      {/* ---- bottom: police line-up */}
      <div style={{ position: "absolute", left: 0, top: 1010, width: 1080, height: 910, overflow: "hidden", background: "linear-gradient(#3c4658, #2b3343 70%, #1b2029)" }}>
        {lines.map((i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 120 + i * 70, borderTop: `${i % 2 ? 2 : 4}px solid rgba(235,240,250,${i % 2 ? 0.25 : 0.5})` }}>
            {i % 2 === 0 && <span style={{ position: "absolute", left: 14, top: -34, fontFamily: FONT, fontWeight: 800, fontSize: 24, color: "rgba(235,240,250,0.6)" }}>{8 - i / 2}</span>}
            {i % 2 === 0 && <span style={{ position: "absolute", right: 14, top: -34, fontFamily: FONT, fontWeight: 800, fontSize: 24, color: "rgba(235,240,250,0.6)" }}>{8 - i / 2}</span>}
          </div>
        ))}
        <div style={{ position: "absolute", top: 28, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 40, letterSpacing: "0.3em", color: "#ffd23f", WebkitTextStroke: `2px ${INK}`, paintOrder: "stroke fill" }}>THE SUSPECTS</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 40, display: "flex", justifyContent: "space-around", alignItems: "flex-end" }}>
          {suspects.map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 330 }}>
              <Char c={c} k={k} />
              <div style={{ marginTop: -60, background: "#111", border: "4px solid #f3ead7", padding: "6px 16px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 30, color: "#f3ead7", zIndex: 2 }}>No. {i + 1}</div>
              <Tag c={c} />
            </div>
          ))}
        </div>
        {/* spotlight floor */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 60, background: "linear-gradient(transparent, rgba(0,0,0,0.5))" }} />
      </div>
    </AbsoluteFill>
  );
};
