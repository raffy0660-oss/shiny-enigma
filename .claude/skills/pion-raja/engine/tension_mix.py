"""tension_mix.py: mix VO + music (+ SFX) the way the 14 detective references are mixed (PANDUAN_TENSION.md sec. 3).

  python3 tension_mix.py --vo vo.wav --music music.wav --stt stt.json [--tension tension.json]
                         [--sfx cues.json] [--cues-out sfx_cues.json] -o mix.wav

What it does (all numbers measured on the separated reference stems):
  - music sits 20.8 dB under the VO during speech (refs 16.7-22.8 dB; ours was 11.9);
  - music plays from the first frame at full level and to the last frame, with no fade-in or swell (refs: first and
    last second within about 1 dB of the median; music present 99.7% of the time);
  - music gets a short hole (-14 dB, 0.3 s) right before the turn words "but", "until", "wait", "then" that start a
    sentence, and on `drop` markers (refs: 0-7 holes of 0.25-0.5 s, clustered at 20-25%, 43-50% and 67-80%);
    "wait" also dips the music 2 dB for a second;
  - the music's low end is thinned (high-pass shelf at 120 Hz, -6 dB) so the sub share falls toward the refs' 40%
    (ours was 78%, a muddy rumble under a thin VO);
  - the VO is compressed to a steady level (refs: 4.8 dB standard deviation in speech; ours 6.4);
  - optional SFX cues are mixed in (refs: ~15 off-beat hits a minute, one every ~4 s); --cues-out writes a
    suggested SFX list (physical verbs in the transcript + light beats with nothing on them) to generate;
  - master: -14 LUFS integrated, -1 dBTP, ends 0.2 s after the last word with a 30 ms tail (no fade).
"""
import argparse, json, re, subprocess, os, tempfile, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 44100
TURN_DROP = {"but", "until", "wait", "then"}
VERBS = re.compile(r"^(drill|saw|slam|smash|crash|break|broke|shatter|pour|scratch|knock|click|grab|pull|push|drop|fall|fell|hit|kick|"
                   r"punch|cut|rip|tear|throw|threw|burn|explode|ring|rang|bang|lock|unlock|open|close|shut|run|ran|climb|jump|"
                   r"stab|shoot|shot|fire|steal|stole|hang|hung|swing|swung|creak|step|walk|type|write|wrote|flip|tap)")

def load(p):
    a, sr = sf.read(p, always_2d=True)
    if sr != SR:
        import librosa; a = librosa.resample(a.T, orig_sr=sr, target_sr=SR).T
    return a.astype(np.float32)

def rms(x): return float(np.sqrt(np.mean(x ** 2) + 1e-12))
def words(p): return [w for w in json.load(open(p))["words"] if w.get("type", "word") == "word"]

def speech_mask(W, n):
    m = np.zeros(n, bool)
    for w in W: m[int(w["start"] * SR):int(w["end"] * SR)] = True
    return m

def ramp_env(n, holes):
    """gain envelope: list of (t, dur, depth_db), 40 ms sine ramps"""
    g = np.ones(n, np.float32); r = int(0.04 * SR)
    for t, d, db in holes:
        a, b = int(t * SR), int((t + d) * SR); k = 10 ** (db / 20)
        if b <= 0 or a >= n: continue
        seg = np.full(max(0, b - a), k, np.float32)
        up = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, r)); seg[:r] = 1 - (1 - k) * up[:len(seg[:r])]; seg[-r:] = k + (1 - k) * up[:len(seg[-r:])]
        g[max(0, a):min(n, b)] = np.minimum(g[max(0, a):min(n, b)], seg[max(0, -a):max(0, -a) + min(n, b) - max(0, a)])
    return g

def compress_vo(vo, W):
    """slow RMS leveller on the VO: pulls loud and quiet words toward the median (ratio ~2.5 above / 1.6 below)"""
    win = int(0.05 * SR); x = vo.mean(1); n = len(x)
    e = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, "same") + 1e-9); m = speech_mask(W, n)
    ref = np.median(20 * np.log10(e[m])); d = 20 * np.log10(e) - ref
    gdb = np.where(d > 0, -d * (1 - 1 / 2.5), -d * (1 - 1 / 1.6)); gdb = np.where(m, gdb, 0)
    gdb = np.clip(np.convolve(gdb, np.ones(win * 2) / (win * 2), "same"), -9, 6)
    return vo * (10 ** (gdb / 20))[:, None]

def loudnorm(inp, out):
    j = subprocess.run(["ffmpeg", "-hide_banner", "-i", inp, "-af", "loudnorm=I=-14:TP=-1:LRA=7:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    s = json.loads(j[j.rindex("{"):j.rindex("}") + 1])
    af = (f"loudnorm=I=-14:TP=-1:LRA=7:measured_I={s['input_i']}:measured_TP={s['input_tp']}:measured_LRA={s['input_lra']}:"
          f"measured_thresh={s['input_thresh']}:offset={s['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", inp, "-af", af, "-ar", str(SR), out], check=True)

def suggest_cues(W, P):
    cues = []
    for w in W:
        t = re.sub(r"[^a-z]", "", w["text"].lower())
        if VERBS.match(t): cues.append(dict(t=round(w["start"], 2), kind="verb", word=t, prompt=f"short cartoon sound effect of {t}, punchy, dry"))
    for b in (P or {}).get("beats", []):
        if not any(abs(c["t"] - b["t"]) < 1.2 for c in cues):
            cues.append(dict(t=round(b["t"], 2), kind="beat", prompt="soft mysterious whoosh with a light tick, cartoon detective"))
    for r in (P or {}).get("reveal", []): cues.append(dict(t=round(r, 2), kind="reveal", prompt="bright magical reveal hit with shimmer"))
    return sorted(cues, key=lambda c: c["t"])

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--vo", required=True); ap.add_argument("--music", required=True); ap.add_argument("--stt", required=True)
    ap.add_argument("--tension"); ap.add_argument("--sfx"); ap.add_argument("--cues-out"); ap.add_argument("-o", required=True)
    ap.add_argument("--bed-db", type=float, default=20.8); a = ap.parse_args()
    W = words(a.stt); P = json.load(open(a.tension)) if a.tension else None
    vo = load(a.vo); mu = load(a.music); T = W[-1]["end"] + 0.2; n = int(T * SR)
    vo = np.pad(vo, ((0, max(0, n - len(vo))), (0, 0)))[:n]
    if len(mu) < n: mu = np.concatenate([mu] * (n // len(mu) + 1))
    mu = mu[:n]
    sos = butter(2, 120, "lowpass", fs=SR, output="sos"); mu = mu - 0.5 * sosfilt(sos, mu, axis=0)      # -6 dB low shelf
    vo = compress_vo(vo, W)
    m = speech_mask(W, n); g = rms(vo[m]) / rms(mu[m]) * 10 ** (-a.bed_db / 20); mu = mu * g
    holes = []
    starts = {round(W[i + 1]["start"], 3) for i in range(len(W) - 1) if W[i]["text"].rstrip()[-1:] in ".?!"}
    for w in W:
        t = re.sub(r"[^a-z]", "", w["text"].lower())
        if t in TURN_DROP and round(w["start"], 3) in starts: holes.append((w["start"] - 0.32, 0.32, -14))
        if t == "wait": holes.append((w["start"], 1.0, -2))
    for d in (P or {}).get("drops", []): holes.append((d - 0.35, 0.35, -14))
    mu = mu * ramp_env(n, holes)[:, None]
    mix = vo + mu
    if a.sfx:
        for c in json.load(open(a.sfx)):
            if not c.get("file") or not os.path.exists(c["file"]): continue
            s = load(c["file"]) * 10 ** (c.get("db", -6) / 20); i = int(c["t"] * SR); k = min(len(s), n - i)
            if k > 0: mix[i:i + k] += s[:k]
    tail = int(0.03 * SR); mix[-tail:] *= np.linspace(1, 0, tail)[:, None]
    tmp = tempfile.mktemp(suffix=".wav"); sf.write(tmp, mix, SR, subtype="FLOAT"); loudnorm(tmp, a.o); os.remove(tmp)
    if a.cues_out: json.dump(suggest_cues(W, P), open(a.cues_out, "w"), indent=1)
    print(f"{a.o}: {T:.2f} s, music gain {20 * np.log10(g):+.1f} dB, {len(holes)} music holes/dips")

if __name__ == "__main__":
    main()
