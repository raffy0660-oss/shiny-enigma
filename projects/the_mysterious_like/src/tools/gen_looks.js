// gen_looks.js: head direction from the SCENE, not guessed. For each Pion segment, the `look <turn> <nod> <tilt>` lines inside the
// windows below are replaced by ones aimed at the real 3D target (her phone as it lies / rises, the victim, the laptop screen, the table...).
// Engine convention (react_render.js): turn + = toward screen right of his front view = world +x when he faces +z (facing 0); nod + = down.
// usage: node gen_looks.js   (rewrites cues/f_*.txt in place; non-look lines are kept)
const fs = require("fs"), path = require("path");
const film = require("../plans/film.js"), CUES = path.join(__dirname, "..", "cues"), FPS = 60, R = 180 / Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = k => k * k * (3 - 2 * k);
function pionOf(F, eng) { if (F.pion && F.pion.eng === eng) return F.pion; return (F.pions || []).find(p => p.eng === eng); }
function head(P) { const a = P.anchor; return [a[0], a[1] + 0.8 * (P.height || 1.03) * (P.squash || 1), a[2]]; }
function phoneAt(F, base) { const S = F.phonePose; if (!S) return base; const k = sm(clamp(S.k ?? 1, 0, 1)), p0 = S.pos0 || base;
  return p0.map((v, i) => v + (S.pos[i] - v) * k + (i === 1 ? Math.sin(Math.PI * k) * (S.arc ?? 0.08) : 0)); }
function aim(h, tg) { const d = tg.map((v, i) => v - h[i]); return [Math.atan2(d[0], d[2]) * R, Math.atan2(-d[1], Math.hypot(d[0], d[2])) * R]; }
// the phone in the engine's `gest hp ... angkat` (t0): grabbed at t0+.32 where it lies, carried to the reading hold in front of his chest in .55 s
const held = (t, t0, from, to) => { const u = sm(clamp((t - t0 - 0.36) / 0.55, 0, 1)); return from.map((v, i) => v + (to[i] - v) * u); };
const VIC_HEAD = [0.75, 0.2, -0.14], VIC_FEET = [0.78, 0.15, 0.86], VIC_PHONE = [0.37, 0.0, -0.08], SCR = [0.05, 0.95, -0.96], TABLE = [60.95, 0.58, -0.2];
const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
// [cue, eng, t0, t1, step, target(t, F) -> [x,y,z] | {turn, nod}, extra(t) -> {dt, dn, tilt}]
const jit = (t, a = 4, b = 3) => ({ dt: a * Math.sin(t * 2.3) + 0.5 * a * Math.sin(t * 5.1), dn: b * Math.sin(t * 1.7 + 1), tilt: 4 * Math.sin(t * 1.3 + 2) });
const W = [
  ["f_pA", "pA", 0.0, 3.34, 0.25, t => t < 2.4 ? lerp3(VIC_HEAD, VIC_FEET, sm(clamp((t - 0.2) / 2.0, 0, 1))) : lerp3(VIC_FEET, VIC_HEAD, sm(clamp((t - 2.4) / 0.9, 0, 1))),
    t => ({ dt: 0, dn: t > 2.9 ? -10 : 0, tilt: 5 * Math.sin(t * 1.6) })],                                         // scans her head -> feet, a beat of thought
  ["f_pA", "pA", 3.34, 4.2, 0.2, () => VIC_HEAD, t => ({ dt: 3 * Math.sin(t * 4), dn: 0, tilt: 3 * Math.sin(t * 3) })],   // hops round her, eyes on her
  ["f_pA", "pA", 4.2, 6.4, 0.12, t => held(t, 5.1, VIC_PHONE, [0.28, 0.4, -0.05]), () => ({ dt: 0, dn: 0, tilt: 0 })],               // the phone: on the floor, rising, beside his face
  ["f_pB", "pB", 16.95, 22.1, 0.3, () => [30.0, 0.0, 0.0], t => (t > 20.1 && t < 20.45 ? { dt: 4, dn: -24, tilt: 0 } : jit(t, 4, 3))],   // her phone on the floor (a jolt on "disturbing")
  ["f_pO1", "pO1", 10.7, 16.95, 0.3, () => SCR, t => (t > 13.3 && t < 13.9 ? { dt: 14, dn: -16, tilt: 5 } : jit(t, 4, 2))],             // reading the screen, a glance away while thinking
  ["f_pO2", "pO2", 32.5, 37.7, 0.25, () => SCR, t => (t > 36.4 && t < 36.9 ? { dt: 6, dn: -24, tilt: 4 } : jit(t * 1.6, 5, 2))],        // typing fast; jolts back on "died"
  ["f_pO3", "pO3", 40.85, 44.6, 0.3, () => SCR, t => jit(t, 4, 2)],
  ["f_pH", "pH", 47.0, 50.1, 0.3, () => TABLE, t => jit(t, 4, 3)],                                                                          // the table of phones
  ["f_pH2", "pH2", 52.85, 54.0, 0.1, t => held(t, 52.85, [59.85, 0.29, -0.13], [59.88, 0.4, 0.06]), t => ({ dt: 0, dn: -16, tilt: 3 * Math.sin(t * 3) })],   // high lens here: less nod or the hat hides his face                       // his own phone coming up beside his face
];
const byCue = {};
for (const [cue, eng, t0, t1, step, tgt, ex] of W) {
  const L = (byCue[cue] = byCue[cue] || { win: [], lines: [] }); L.win.push([t0, t1]);
  for (let t = t0; t < t1 - 1e-6; t += step) { const F = film.frame(Math.round(t * FPS)), P = pionOf(F, eng); if (!P) continue;
    const g = tgt(t, F), [tu0, no0] = Array.isArray(g) ? aim(head(P), g) : [g.turn, g.nod], e = ex(t), tu = tu0 - (P.yaw || 0), no = no0 * 0.85;   // relative to his body; the eyes take ~15% of the nod
    L.lines.push([t, clamp(tu + e.dt, -62, 62), clamp(no + e.dn, -22, 55), e.tilt]); } }
for (const [cue, L] of Object.entries(byCue)) {
  const f = path.join(CUES, cue + ".txt"), keep = fs.readFileSync(f, "utf8").split("\n").filter(l => { const m = l.match(/^([\d.]+)\s+look\b/); return !(m && L.win.some(([a, b]) => +m[1] >= a - 1e-6 && +m[1] < b - 1e-6)); });
  const add = L.lines.map(([t, a, b, c]) => `${t.toFixed(2)} look ${a.toFixed(0)} ${b.toFixed(0)} ${c.toFixed(0)}`);
  const head = keep.filter(l => /^0 /.test(l)), body = keep.filter(l => l.trim() && !/^0 /.test(l)).concat(add).sort((p, q) => parseFloat(p) - parseFloat(q));
  fs.writeFileSync(f, head.concat(body).join("\n") + "\n"); console.log(cue, L.lines.length, "looks:", add.slice(0, 3).join(" | "), "...", add.slice(-2).join(" | "));
}
