import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";

/* Term callouts: when Pion says a key term ("trichorrhexis nodosa"), it appears as an elegant on-screen title.
   Small gold label, the term revealed letter by letter (rise + unblur), a gold rule sweeping under it, an optional
   subtitle. Drawn above the camera layer, so zooms and camera blur never touch it.
   Cue (castle_video.py):  <t> callout <dur> "TERM" ["subtitle"] [top|bottom] [label="MEDICAL TERM"] */

export type Callout = { t: number; dur: number; text: string; sub?: string; label?: string; pos?: "top" | "bottom";
  kind?: "term" | "stat"; value?: number; from?: number; prefix?: string; decimals?: number };

const GOLD = "#f3c75a";
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clampOpt = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const CalloutCard: React.FC<{ c: Callout; durationInFrames: number }> = ({ c, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const out = durationInFrames - Math.round(0.3 * fps);                  // exit starts 0.3 s before the end
  const words = c.text.split(" ");
  const nChars = c.text.replace(/ /g, "").length;
  // one line if it fits, else the words wrap: size from the longest word and the whole term
  const longest = Math.max(...words.map((w) => w.length));
  const size = Math.round(Math.min(width * 0.11, (width * 0.86) / (Math.max(longest, Math.min(nChars, 14)) * 0.6)));
  const step = Math.max(0.6, Math.min(1.6, (0.45 * fps) / Math.max(1, nChars)));   // whole reveal ~0.45 s
  let k = 0;
  return (
    <AbsoluteFill
      style={{
        justifyContent: c.pos === "bottom" ? "flex-end" : "flex-start",
        alignItems: "center",
        padding: c.pos === "bottom" ? "0 0 13% 0" : "11% 0 0 0",
        opacity: interpolate(frame, [out, durationInFrames], [1, 0], clampOpt),
        translate: interpolate(frame, [out, durationInFrames], ["0px 0px", "0px -18px"], { ...clampOpt, easing: Easing.in(Easing.cubic) }),
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "88%" }}>
        {/* soft dark plate behind the text: readable on any part of the castle, but no hard box */}
        <div
          style={{
            position: "absolute", inset: "-10% -18%", borderRadius: 40,
            background: "radial-gradient(ellipse at center, rgba(10,6,4,0.55) 0%, rgba(10,6,4,0.32) 45%, rgba(10,6,4,0) 72%)",
            opacity: interpolate(frame, [0, 0.35 * fps], [0, 1], { ...clampOpt, easing: ease }),
          }}
        />
        {c.label ? (
          <div
            style={{
              position: "relative", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: size * 0.24,
              letterSpacing: "0.32em", color: GOLD, textTransform: "uppercase", marginBottom: size * 0.12,
              opacity: interpolate(frame, [0, 0.25 * fps], [0, 1], clampOpt),
              translate: interpolate(frame, [0, 0.35 * fps], ["0px 10px", "0px 0px"], { ...clampOpt, easing: ease }),
            }}
          >
            {c.label}
          </div>
        ) : null}
        <div
          style={{
            position: "relative", display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: size * 0.28,
            fontFamily: "'Inter Display', Inter, sans-serif", fontWeight: 800, fontSize: size, lineHeight: 1.02,
            letterSpacing: "-0.01em", textAlign: "center",
          }}
        >
          {words.map((w, wi) => (
            <span key={wi} style={{ display: "inline-flex", whiteSpace: "nowrap" }}>
              {w.split("").map((ch, ci) => {
                const d = (k++) * step + 0.08 * fps;
                return (
                  <span
                    key={ci}
                    style={{
                      display: "inline-block",
                      color: "#fffaf0",
                      textShadow: `0 ${size * 0.04}px ${size * 0.12}px rgba(0,0,0,0.55), 0 0 ${size * 0.35}px rgba(243,199,90,0.25)`,
                      opacity: interpolate(frame, [d, d + 0.18 * fps], [0, 1], clampOpt),
                      translate: interpolate(frame, [d, d + 0.3 * fps], ["0px 0.35em", "0px 0em"], { ...clampOpt, easing: ease }),
                      filter: `blur(${interpolate(frame, [d, d + 0.22 * fps], [8, 0], clampOpt)}px)`,
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </span>
          ))}
        </div>
        {/* gold rule sweeping left -> right under the term */}
        <div
          style={{
            position: "relative", height: Math.max(3, size * 0.05), marginTop: size * 0.16, borderRadius: 4,
            background: `linear-gradient(90deg, rgba(243,199,90,0) 0%, ${GOLD} 18%, #fff3c4 50%, ${GOLD} 82%, rgba(243,199,90,0) 100%)`,
            width: interpolate(frame, [0.25 * fps, 0.75 * fps], [0, size * Math.min(nChars, 16) * 0.5], { ...clampOpt, easing: ease }),
          }}
        />
        {c.sub ? (
          <div
            style={{
              position: "relative", fontFamily: "Inter, sans-serif", fontWeight: 500, fontStyle: "italic", fontSize: size * 0.3,
              color: "rgba(255,248,232,0.92)", marginTop: size * 0.14, textShadow: "0 2px 8px rgba(0,0,0,0.6)",
              opacity: interpolate(frame, [0.45 * fps, 0.75 * fps], [0, 1], clampOpt),
              translate: interpolate(frame, [0.45 * fps, 0.8 * fps], ["0px 12px", "0px 0px"], { ...clampOpt, easing: ease }),
            }}
          >
            {c.sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* Stat card: a number that counts (e.g. a bank balance draining from $1,250.00 to $0.67), then lands in red with a
   small shake. Cue: <t> stat <dur> "BANK BALANCE" 0.67 [from=1250] [prefix=$] ["subtitle"] [top|bottom] */
const StatCard: React.FC<{ c: Callout; durationInFrames: number }> = ({ c, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const out = durationInFrames - Math.round(0.3 * fps), land = 0.85 * fps;
  const v = interpolate(frame, [0.15 * fps, land], [c.from ?? 1000, c.value ?? 0], { ...clampOpt, easing: Easing.out(Easing.cubic) });
  const dec = c.decimals ?? 2;
  const txt = (c.prefix ?? "$") + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const size = Math.round(width * 0.135), red = interpolate(frame, [land, land + 0.12 * fps], [0, 1], clampOpt);
  const shake = frame > land && frame < land + 0.35 * fps ? Math.sin(frame * 2.9) * (1 - (frame - land) / (0.35 * fps)) * size * 0.06 : 0;
  return (
    <AbsoluteFill style={{ justifyContent: c.pos === "bottom" ? "flex-end" : "flex-start", alignItems: "center",
      padding: c.pos === "bottom" ? "0 0 14% 0" : "10% 0 0 0",
      opacity: interpolate(frame, [out, durationInFrames], [1, 0], clampOpt),
      translate: interpolate(frame, [out, durationInFrames], ["0px 0px", "0px -18px"], { ...clampOpt, easing: Easing.in(Easing.cubic) }) }}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
        padding: `${size * 0.22}px ${size * 0.42}px ${size * 0.26}px`, borderRadius: size * 0.28,
        background: "linear-gradient(160deg, rgba(28,22,18,0.82), rgba(12,9,7,0.78))",
        border: `${Math.max(2, size * 0.02)}px solid rgba(243,199,90,0.55)`,
        boxShadow: `0 ${size * 0.12}px ${size * 0.4}px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,240,200,0.18)`,
        scale: interpolate(frame, [0, 0.35 * fps], [0.86, 1], { ...clampOpt, easing: Easing.spring({ damping: 14 }), output: "perceptual-scale" }),
        opacity: interpolate(frame, [0, 0.2 * fps], [0, 1], clampOpt), translate: `${shake}px 0px` }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: size * 0.2, letterSpacing: "0.3em", color: GOLD,
          textTransform: "uppercase", marginBottom: size * 0.06 }}>{c.text}</div>
        <div style={{ fontFamily: "'Inter Display', Inter, sans-serif", fontWeight: 800, fontSize: size, lineHeight: 1,
          fontVariantNumeric: "tabular-nums", color: `rgb(${Math.round(255 - 0 * red)}, ${Math.round(250 - 170 * red)}, ${Math.round(240 - 175 * red)})`,
          textShadow: `0 ${size * 0.04}px ${size * 0.12}px rgba(0,0,0,0.55)` }}>{txt}</div>
        {c.sub ? <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontStyle: "italic", fontSize: size * 0.2,
          color: "rgba(255,248,232,0.85)", marginTop: size * 0.1,
          opacity: interpolate(frame, [land, land + 0.25 * fps], [0, 1], clampOpt) }}>{c.sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

export const Callouts: React.FC<{ items: Callout[] }> = ({ items }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {items.map((c, i) => (
        <Sequence key={i} name={`Callout: ${c.text}`} from={Math.round(c.t * fps)} durationInFrames={Math.max(1, Math.round(c.dur * fps))} layout="none">
          {c.kind === "stat" ? <StatCard c={c} durationInFrames={Math.max(1, Math.round(c.dur * fps))} />
            : <CalloutCard c={c} durationInFrames={Math.max(1, Math.round(c.dur * fps))} />}
        </Sequence>
      ))}
    </>
  );
};
