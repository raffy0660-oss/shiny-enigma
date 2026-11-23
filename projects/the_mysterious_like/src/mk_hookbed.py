"""Hook backsound (0-10.9 s) for "The Mysterious Like", synthesized (ElevenLabs credits used up) -> ~/pion/proj12/audio/hook_bed.wav
Layers: heartbeat sub pulse that speeds up, a dissonant drone that swells, a soft clock tick, a boom on "found dead" (3.34),
a riser into the hard cut to the office (10.7). Mixed as its own stem in mix_film.py so it sits clearly under the VO."""
import os, wave, numpy as np
SR, D = 48000, 10.9
t = np.arange(int(SR * D)) / SR
rng = np.random.default_rng(7)
out = np.zeros((len(t), 2))

def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR); n = min(len(sig), len(t) - i)
    if n <= 0: return
    out[i:i + n, 0] += sig[:n] * gain * (1 - max(0, pan)); out[i:i + n, 1] += sig[:n] * gain * (1 + min(0, pan))

def thump(f0=58, f1=38, dur=0.42, k=1.0):   # kick / heartbeat: pitch drop, fast attack
    tt = np.arange(int(SR * dur)) / SR; f = f1 + (f0 - f1) * np.exp(-tt * 18); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 9) * (1 - np.exp(-tt * 400)) * k

def lowpass(x, a):   # one-pole
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y

# 1) heartbeat (lub-dub), interval 0.86 s -> 0.5 s
tb = 0.15
while tb < 10.45:
    p = tb / 10.45; iv = 0.86 - 0.36 * p
    add(thump(k=0.9), tb, 0.55 + 0.35 * p); add(thump(52, 36, 0.32, 0.7), tb + 0.2 * iv / 0.86 * 0.86 * 0.3, 0.4 + 0.3 * p)
    tb += iv
# 2) drone: A1 + E2 saws (detuned) + a high minor-second cluster, swelling
def saw(f): return 2 * ((t * f) % 1.0) - 1
dr = (saw(55) + saw(55.4) + 0.7 * saw(82.4) + 0.7 * saw(82.9)) / 3.4
dr = lowpass(dr, 0.02)
hi = (np.sin(2 * np.pi * 220 * t) + np.sin(2 * np.pi * 233.1 * t) + 0.5 * np.sin(2 * np.pi * 440.6 * t + np.sin(2 * np.pi * 0.3 * t))) / 2.5
env = np.clip(t / 1.2, 0, 1) * (0.35 + 0.65 * (t / D) ** 1.4)
trem = 0.85 + 0.15 * np.sin(2 * np.pi * 3.2 * t)
out[:, 0] += (dr * 0.5 + hi * 0.16 * np.clip((t - 2.0) / 6, 0, 1)) * env * trem
out[:, 1] += (dr * 0.5 + hi * 0.16 * np.clip((t - 2.0) / 6, 0, 1) * np.sin(2 * np.pi * 0.2 * t + 1) ** 2) * env * trem
# 3) clock tick (soft, panned), every 0.5 s
for k in range(int(10.4 / 0.5)):
    tt = np.arange(int(SR * 0.03)) / SR; tick = rng.standard_normal(len(tt)) * np.exp(-tt * 260) * np.sin(2 * np.pi * 3200 * tt)
    add(tick, 0.1 + k * 0.5, 0.10, 0.4 if k % 2 else -0.4)
# 4) booms: opening + "found dead" (3.34) + sub drop
for tb_, g in ((0.0, 1.0), (3.34, 1.1)):
    add(thump(70, 28, 1.6, 1.0), tb_, g)
    nn = rng.standard_normal(int(SR * 1.2)); add(lowpass(nn, 0.05) * np.exp(-np.arange(len(nn)) / SR * 3) * 0.8, tb_, 0.5 * g)
# 5) riser 8.4 -> 10.68 (noise sweep + rising tone), hard stop before the cut
r0, r1 = 8.4, 10.68; n = int((r1 - r0) * SR); tt = np.arange(n) / SR; u = tt / (r1 - r0)
nz = rng.standard_normal(n); a = 0.01 + 0.25 * u ** 2; ys = np.empty(n); s = 0.0
for i in range(n): s += a[i] * (nz[i] - s); ys[i] = s
tone = np.sin(2 * np.pi * np.cumsum(180 + 700 * u ** 2) / SR)
ris = (ys * 1.4 + tone * 0.25) * u ** 1.6
ris[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
add(ris, r0, 0.9, 0)
# master: soft clip, normalise, fade the tail
out = np.tanh(out * 1.2); out /= np.abs(out).max() / 0.89
out[int(10.69 * SR):] *= 0.0
o = os.path.expanduser("~/pion/proj12/audio/hook_bed.wav")
with wave.open(o, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype("<i2").tobytes())
print("->", o)
