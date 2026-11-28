// shared plan helpers. Times are absolute VO seconds, frames absolute (f = t * 60).
const lerp = (a, b, k) => a + (b - a) * k, L3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), smooth = k => k * k * (3 - 2 * k);
const EASE = { io: k => 0.5 - 0.5 * Math.cos(Math.PI * k), lin: k => k, in: k => k * k, out: k => 1 - (1 - k) * (1 - k), hold: k => 0 };
// camera keys [{ t, pos, tgt, fov, focus, roll?, aperture?, ease }]: ease of key i shapes the segment (i-1 -> i). "io" = a fly move (sine), "lin" = drift
function cam(K, t) { let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++; const a = K[i], b = K[i + 1] || a; let k = b === a ? 0 : clamp((t - a.t) / (b.t - a.t)); k = (EASE[b.ease] || EASE.io)(k);
  return { pos: L3(a.pos, b.pos, k), tgt: L3(a.tgt, b.tgt, k), fov: lerp(a.fov, b.fov, k), focus: lerp(a.focus, b.focus, k), roll: lerp(a.roll || 0, b.roll || 0, k), aperture: lerp(a.aperture ?? 0.0016, b.aperture ?? 0.0016, k) }; }
// scalar keys [[t, v, ease?], ...]
function key(K, t) { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const k = (t - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); const v0 = K[i - 1][1], v1 = K[i][1], e = (EASE[K[i][2]] || EASE.io)(k);
  return Array.isArray(v0) ? L3(v0, v1, e) : lerp(v0, v1, e); } return K[K.length - 1][1]; }
module.exports = { lerp, L3, clamp, smooth, cam, key, EASE };
