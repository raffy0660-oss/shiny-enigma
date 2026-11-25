"""tension.py: turn a VO transcript into a tension timeline, using the patterns measured on the 14 detective
references (PANDUAN_TENSION.md). One JSON drives the 3D plan (camera), the post grade (light) and the mix (audio).

  python3 tension.py plan stt.json [--markers markers.txt] -o tension.json
  python3 tension.py chart tension.json chart.png        # picture of the timeline, to check before rendering

In code (post pass):
  from tension import load, light_at, cam_at
  P = load("tension.json"); L = light_at(P, t)    # {gain, warm, vig}  (multiply / add in the grade)
  C = cam_at(P, t)                                 # {speed, jitter_px, push}  (camera modifiers)

Markers file (optional, one per line, time in seconds or a word index "w37"):
  12.4 night        # day -> night switch on this word (otherwise found from the words "night", "midnight", "dark")
  30.0 day          # back to day
  41.2 reveal       # the payoff: white lift + warm, music hit
  25.0 drop         # music drop-out (1 s) right before the next sentence

Measured rules it applies (see the guide for the numbers):
  - a light / tone change at sentence starts, about every 3.6 s (refs: 10.9 per minute, 2x more often on a
    sentence start than chance), each change about 22-30 luma levels, alternating warmer / cooler;
  - a light arc over the runtime: 1.00 1.06 1.06 1.00 0.92 0.93 0.91 1.05 1.04 1.05 (dark middle, light pivot);
  - a warmth arc: warm open, cool middle, a warm spike at 70-80 % (the "you see" explanation), cool end;
  - turn words: "but" dims (-6) and cools (-3); "then" cools (-8) and pushes in; "until" doubles the camera
    speed for 2 s; "wait" warms (+15) and pushes in; "night" drops the light (-30) and turns it blue;
  - handheld micro-jitter ~0.76 px per frame at 360 px width (2.3 px at 1080), banking roll during moves;
  - a soft vignette (corner / centre luma 0.79, not 0.40).
"""
import json, re, sys, math

ARC_L = [1.00, 1.06, 1.06, 1.00, 0.92, 0.93, 0.91, 1.05, 1.04, 1.05]
ARC_W = [8.0, -3.3, -0.5, -4.1, -7.3, -3.7, 3.3, 20.0, -4.2, -8.1]          # R-B units (0-255 scale)
TURN = {  # word -> (luma delta, warmth delta, camera speed multiplier, push-in, seconds)
    "but": (-6, -3, 1.4, 0.0, 2.0), "then": (-1.5, -7.6, 1.35, 0.04, 2.0), "until": (6, 5, 2.2, 0.0, 2.0),
    "wait": (5.6, 15, 0.8, 0.06, 1.5), "nobody": (0, -12, 1.0, 0.0, 1.5), "everyone": (-3, 4, 0.55, 0.05, 2.0),
}
NIGHT_WORDS = {"night", "midnight", "dark", "tonight"}; DAY_WORDS = {"morning", "sunrise", "day", "dawn"}

def words(stt):
    return [x for x in json.load(open(stt))["words"] if x.get("type", "word") == "word"]

def interp(arc, u):
    x = min(max(u, 0), 0.9999) * len(arc) - 0.5; i = int(math.floor(x)); f = x - i
    a = arc[max(0, min(len(arc) - 1, i))]; b = arc[max(0, min(len(arc) - 1, i + 1))]
    return a + (b - a) * (0.5 - 0.5 * math.cos(math.pi * f))

def plan(stt, markers=None):
    W = words(stt); T = W[-1]["end"] + 0.2
    starts = [W[0]["start"]] + [W[i + 1]["start"] for i in range(len(W) - 1) if W[i]["text"].rstrip()[-1:] in ".?!"]
    # light beats: every sentence start, plus clause starts when a sentence runs longer than 4.5 s
    clause = [W[i + 1]["start"] for i in range(len(W) - 1) if W[i]["text"].rstrip()[-1:] in ",;:"]
    beats = []
    for i, s in enumerate(starts):   # sentence starts at least 2.8 s apart (refs: a change every ~3.6 s, 10.9/min)
        if not beats or s - beats[-1] >= 2.8: beats.append(s)
        nxt = starts[i + 1] if i + 1 < len(starts) else T
        for c in clause:             # a long sentence (> 6 s) gets an extra beat on a clause start
            if nxt - s > 6.0 and beats[-1] + 3.0 < c < nxt - 2.0: beats.append(c)
    beats = sorted(set(round(b, 3) for b in beats))
    B = []
    for k, t in enumerate(beats):     # alternate: bright-warm / dim-cool, magnitude ~ +-11 levels around the arc
        s = 1 if k % 2 == 0 else -1
        B.append(dict(t=t, dl=s * 11.0, dw=s * 6.0))
    ev, night = [], []
    mk = []
    if markers:
        for line in open(markers):
            p = line.split("#")[0].split()
            if len(p) < 2: continue
            t = W[int(p[0][1:])]["start"] if p[0].startswith("w") else float(p[0]); mk.append((t, p[1].lower()))
    auto_night = not any(m[1] in ("night", "day") for m in mk)
    for x in W:
        w = re.sub(r"[^a-z']", "", x["text"].lower())
        if w in TURN: dl, dw, sp, push, d = TURN[w]; ev.append(dict(t=x["start"], word=w, dl=dl, dw=dw, speed=sp, push=push, dur=d))
        if auto_night and w in NIGHT_WORDS: mk.append((x["start"], "night"))
        if auto_night and w in DAY_WORDS: mk.append((x["start"], "day"))
    state = None
    for t, m in sorted(mk):
        if m == "night" and state != "night": night.append([t, T]); state = "night"
        elif m == "day" and state == "night": night[-1][1] = t; state = "day"
    reveal = [t for t, m in mk if m == "reveal"]; drops = [t for t, m in mk if m == "drop"]
    return dict(T=T, beats=B, events=ev, night=night, reveal=reveal, drops=drops,
                jitter_px_1080=2.3, vignette=0.79, bank_deg_max=13.0)

def load(p): return json.load(open(p))

def _ease(u): return 0.5 - 0.5 * math.cos(math.pi * min(1, max(0, u)))

def light_at(P, t):
    """gain (multiply), warm (R-B shift, 0-255 units), vig (corner/centre target) at time t"""
    T = P["T"]; base = interp(ARC_L, t / T); warm = interp(ARC_W, t / T) * 0.5
    # beats: a 0.35 s sine move into the beat's offset, held until the next beat
    dl = dw = 0.0
    for b in P["beats"]:
        if t >= b["t"]: k = _ease((t - b["t"]) / 0.35); dl = dl + (b["dl"] - dl) * k; dw = dw + (b["dw"] - dw) * k
    for e in P["events"]:
        if e["t"] <= t < e["t"] + e["dur"]:
            k = _ease((t - e["t"]) / 0.3) * _ease((e["t"] + e["dur"] - t) / 0.5); dl += e["dl"] * k; dw += e["dw"] * k
    nk = 0.0
    for a, b in P["night"]:
        if a <= t: nk = max(nk, _ease((t - a) / 0.5) * (1 - _ease((t - b) / 0.8)) if t < b + 0.8 else 0)
    gain = base * (1 + dl / 110.0) * (1 - 0.27 * nk)
    warm = warm + dw - 22 * nk                                     # night = blue, not black
    for r in P["reveal"]:
        if r <= t < r + 1.2: k = _ease((t - r) / 0.15) * (1 - _ease((t - r - 0.15) / 1.0)); gain *= 1 + 0.35 * k; warm += 12 * k
    return dict(gain=gain, warm=warm, vig=P.get("vignette", 0.79), night=nk)

def cam_at(P, t):
    """speed: multiplier for the camera move in progress; push: extra push-in (fraction of the distance)"""
    sp, push = 1.0, 0.0
    for e in P["events"]:
        a, d = e["t"], e["dur"]
        if a <= t < a + d + 0.4:       # speed: eased in (0.25 s) and back out (0.4 s), never a step
            k = _ease((t - a) / 0.25) * (1 - _ease((t - a - d) / 0.4)); sp *= 1 + (e["speed"] - 1) * k
        if e["push"] and a <= t < a + d + 0.8:   # push: creeps in over the event, then eases back over 0.8 s
            push = max(push, e["push"] * _ease((t - a) / d) * (1 - _ease((t - a - d) / 0.8)))
    return dict(speed=sp, push=push, jitter_px=P.get("jitter_px_1080", 2.3))

def jitter(t, px, seed=0):
    """handheld micro-jitter in px (sum of incommensurate sines, smooth, ~px rms per frame change at 30 fps)"""
    f = lambda a, b, c, p: math.sin(t * a + p) * 0.5 + math.sin(t * b + p * 1.7) * 0.3 + math.sin(t * c + p * 2.3) * 0.2
    return px * f(7.1, 12.9, 19.3, 0.4 + seed) * 2.2, px * f(6.3, 11.7, 17.9, 2.1 + seed) * 2.2

def chart(P, out):
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    ts = [i * P["T"] / 800 for i in range(800)]; L = [light_at(P, t) for t in ts]; C = [cam_at(P, t) for t in ts]
    fig, ax = plt.subplots(3, 1, figsize=(11, 6.5), dpi=120, sharex=True)
    ax[0].plot(ts, [l["gain"] for l in L], c="k"); ax[0].set_ylabel("light gain")
    for a, b in P["night"]: ax[0].axvspan(a, b, color="#36c", alpha=0.12)
    ax[1].plot(ts, [l["warm"] for l in L], c="#d62"); ax[1].axhline(0, c="#999", lw=0.5); ax[1].set_ylabel("warm (+) / cool (-)")
    ax[2].plot(ts, [c["speed"] for c in C], c="#36c", label="camera speed x"); ax[2].plot(ts, [1 + c["push"] * 5 for c in C], c="#3a3", label="push-in"); ax[2].legend(fontsize=8)
    for e in P["events"]:
        for a in ax: a.axvline(e["t"], c="#c33", lw=0.6, alpha=0.6)
        ax[0].text(e["t"], ax[0].get_ylim()[1], e["word"], fontsize=7, rotation=90, va="top", color="#c33")
    for b in P["beats"]: ax[0].axvline(b["t"], c="#999", lw=0.4, ls=":")
    ax[2].set_xlabel("seconds"); plt.tight_layout(); plt.savefig(out)

if __name__ == "__main__":
    a = sys.argv
    if a[1] == "plan":
        mk = a[a.index("--markers") + 1] if "--markers" in a else None; out = a[a.index("-o") + 1] if "-o" in a else "tension.json"
        P = plan(a[2], mk); json.dump(P, open(out, "w"), indent=1)
        print(f"{out}: {len(P['beats'])} light beats ({len(P['beats']) / P['T'] * 60:.1f}/min), {len(P['events'])} turn words, night {P['night']}")
    elif a[1] == "chart": chart(load(a[2]), a[3])
