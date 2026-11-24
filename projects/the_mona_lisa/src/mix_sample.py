"""The Mona Lisa Heist, sample 0-15.5 s: dramatic SFX + score + VO -> ~/pion/proj13/final/sample_audio.wav (+ sample_sfx_only.wav, no VO).
ElevenLabs credits are used up: everything new is synthesized here (numpy), plus the SFX library of the earlier films (~/pion/proj12/sfx_norm).
A hall reverb (synthetic impulse response) glues the museum sounds; the office stays dry; loudness: VO on top, score under it."""
import os, wave, subprocess, numpy as np
SR, T = 48000, 15.5
N = int(SR * T)
P = os.path.expanduser("~/pion/proj13"); LIB = os.path.expanduser("~/pion/proj12/sfx_norm")
rng = np.random.default_rng(11)
t_ = lambda d: np.arange(int(SR * d)) / SR

def load(path, gain=1.0):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy() * gain
def st(x, pan=0.0): x = np.asarray(x); return np.stack([x * (1 - max(0, pan)), x * (1 + min(0, pan))], 1) if x.ndim == 1 else x
def put(bus, sig, t0, gain=1.0, pan=0.0):
    s = st(sig, pan) * gain; i = int(t0 * SR); n = min(len(s), len(bus) - i)
    if n > 0 and i >= 0: bus[i:i + n] += s[:n]
def lp(x, a):   # one-pole low-pass, a in (0,1]
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y
def hp(x, a): return x - lp(x, a)
def env(n, att, dec): tt = np.arange(n) / SR; return (1 - np.exp(-tt / max(att, 1e-4))) * np.exp(-tt / dec)
def reverb(x, sec=2.2, mix=0.35, damp=0.25):   # synthetic hall IR: decaying filtered noise, early reflections
    n = int(SR * sec); tt = np.arange(n) / SR; ir = rng.standard_normal(n) * np.exp(-tt * 6.9 / sec); ir = lp(ir, damp); ir[:int(0.012 * SR)] = 0
    for d, g in ((0.017, .5), (0.029, .35), (0.041, .28)): ir[int(d * SR)] += g
    ir /= np.sqrt((ir ** 2).sum()) * 2.2
    out = np.zeros_like(x)
    for c in range(2): out[:, c] = np.convolve(x[:, c], ir)[:len(x)] if len(x) < 400000 else fftconv(x[:, c], ir)[:len(x)]
    return x * (1 - mix) + out * mix * 2.2
def fftconv(a, b): n = 1 << int(np.ceil(np.log2(len(a) + len(b)))); return np.fft.irfft(np.fft.rfft(a, n) * np.fft.rfft(b, n), n)

# ---------------- synthesized SFX
def rope_zip(d=0.7, up=False):      # rope running through the descender: band noise whose pitch rises (falls) with speed
    n = int(SR * d); tt = np.arange(n) / SR; u = tt / d; nz = rng.standard_normal(n)
    sp = (u ** 1.5) if not up else (1 - (1 - u) ** 2); out = np.zeros(n); s = 0.0
    for i in range(n): a = 0.02 + 0.25 * sp[i]; s += a * (nz[i] - s); out[i] = s
    whine = np.sin(2 * np.pi * np.cumsum(300 + 1400 * sp) / SR) * 0.15
    return (hp(out, 0.05) * 2.2 + whine) * np.minimum(1, u * 8) * np.minimum(1, (1 - u) * 14)
def rope_catch():                    # the rope snaps taut: low thump + a twanging string
    tt = t_(1.4); f = 46 + 30 * np.exp(-tt * 20); th = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7) * 1.1
    tw = sum(np.sin(2 * np.pi * h * 98 * tt * (1 + 0.004 * np.sin(2 * np.pi * 5 * tt))) / h for h in (1, 2, 3, 4)) * np.exp(-tt * 3.2) * 0.35
    creak = lp(rng.standard_normal(len(tt)), 0.05) * np.exp(-tt * 9) * 1.2
    return th + tw + creak
def shatter(d=1.6):                  # glass: a crack, a burst, hundreds of tiny pings, shards tinkling on the floor
    n = int(SR * d); out = np.zeros(n); tt = np.arange(n) / SR
    out += hp(rng.standard_normal(n), 0.6) * np.exp(-tt * 18) * 1.4
    for _ in range(420):
        t0 = abs(rng.normal(0, 0.12)) if rng.random() < 0.6 else 0.25 + rng.random() * 1.1; f = 2200 + rng.random() * 7500; dd = 0.02 + rng.random() * 0.12
        i = int(t0 * SR); m = min(int(dd * SR), n - i)
        if m > 0: out[i:i + m] += np.sin(2 * np.pi * f * np.arange(m) / SR) * np.exp(-np.arange(m) / SR * (30 + rng.random() * 50)) * (0.25 if t0 < 0.25 else 0.12) * rng.random()
    return out
def creak(d=0.45):                   # wood / frame creak
    tt = t_(d); f = 120 + 40 * np.sin(2 * np.pi * 3 * tt) + 25 * rng.standard_normal(len(tt)).cumsum() / SR * 30
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * lp(np.abs(rng.standard_normal(len(tt))), 0.01)
    return lp(s, 0.2) * np.sin(np.pi * tt / d) * 0.8
def ding():                          # case notification
    tt = t_(1.2); return (np.sin(2 * np.pi * 880 * tt) + 0.6 * np.sin(2 * np.pi * 1320 * tt)) * np.exp(-tt * 4.5) * 0.35
def scribble(d):                     # pen on paper
    tt = t_(d); nz = hp(rng.standard_normal(len(tt)), 0.35); m = 0.5 + 0.5 * np.sin(2 * np.pi * (9 + 3 * np.sin(2 * np.pi * 0.7 * tt)) * tt); m = m ** 2
    gate = (np.sin(2 * np.pi * 1.6 * tt) > -0.6).astype(float); return lp(nz, 0.5) * m * lp(gate, 0.002) * 0.5
def flap():                          # book opens
    tt = t_(0.25); return lp(rng.standard_normal(len(tt)), 0.12) * np.exp(-tt * 22) * 1.3 + np.sin(2 * np.pi * 120 * tt) * np.exp(-tt * 30) * 0.5
def boom(f0=60, f1=30, d=2.2, k=1.0):
    tt = t_(d); f = f1 + (f0 - f1) * np.exp(-tt * 8); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.6) * (1 - np.exp(-tt * 300)) * k
def riser(d):
    tt = t_(d); u = tt / d; nz = rng.standard_normal(len(tt)); a = 0.01 + 0.3 * u ** 2; y = np.zeros_like(nz); s = 0.0
    for i in range(len(nz)): s += a[i] * (nz[i] - s); y[i] = s
    return (y * 1.5 + 0.2 * np.sin(2 * np.pi * np.cumsum(150 + 900 * u ** 2) / SR)) * u ** 1.8

# ---------------- score (synth): heist = staccato strings at 140 bpm over a low D, timpani on the actions; then a low pulse + heartbeat
def score():
    out = np.zeros((N, 2)); tt = np.arange(N) / SR
    saw = lambda f, x: 2 * ((x * f) % 1.0) - 1
    drone = (saw(36.7, tt) + saw(36.9, tt) + 0.6 * saw(55.0, tt)) / 2.6; drone = lp(drone, 0.03)
    dv = np.interp(tt, [0, 0.3, 4.4, 4.6, 8.3, 8.5, 13.7, 15.5], [0, .55, .8, .25, .3, .38, .5, .55])
    out[:, 0] += drone * dv * 0.5; out[:, 1] += drone * dv * 0.5
    beat = 60 / 140 / 2
    for k in range(int(4.5 / beat)):   # staccato string 8ths (D minor figure), heist only
        t0 = k * beat; notes = [146.8, 146.8, 174.6, 146.8, 220.0, 146.8, 174.6, 196.0]; f = notes[k % 8]; n = int(0.16 * SR); x = np.arange(n) / SR
        s = (saw(f, x) + 0.5 * saw(f * 2.003, x)) * np.exp(-x * 18) * (0.5 + 0.5 * (k % 2 == 0)); put(out, lp(s, 0.25) * 0.22, t0, pan=(-0.3 if k % 2 else 0.3))
    for t0, g in ((0.0, .8), (1.0, 1.0), (1.92, 1.25), (3.02, .9), (3.9, 1.3)): put(out, boom(70, 32, 2.4, 1.0), t0, g)
    put(out, riser(0.85), 3.05, 0.55)
    pulse = np.sin(2 * np.pi * 55 * tt) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 1.2 * tt))) ; pv = np.interp(tt, [0, 4.6, 4.7, 8.3, 8.4, 15.5], [0, 0, .18, .2, .14, .2]); out[:, 0] += lp(pulse, 0.05) * pv; out[:, 1] += lp(pulse, 0.05) * pv
    tb = load(f"{LIB}/tension_bed.wav"); put(out, tb[:int(11 * SR)] * np.interp(np.arange(min(len(tb), int(11 * SR))) / SR, [0, 1.5, 9, 11], [0, 1, 1, .7])[:, None], 4.5, 0.35)
    return out

# ---------------- build
sfx = np.zeros((N, 2)); hall = np.zeros((N, 2))
amb = lp(rng.standard_normal(N), 0.004) * 0.6 + 0.02 * np.sin(2 * np.pi * 50 * np.arange(N) / SR)   # museum room tone (hum + air)
av = np.interp(np.arange(N) / SR, [0, 4.6, 4.65, 8.3, 8.35, 15.5], [1, 1, 0, 0, 1, 1]); hall += st(amb * av * 0.25)
put(hall, rope_zip(0.7), 0.32, 0.9); put(hall, rope_catch(), 1.0, 1.0)
put(hall, load(f"{LIB}/whoosh.wav"), 1.12, 0.9, pan=-0.2); put(hall, load(f"{LIB}/whoosh2.wav"), 1.66, 0.35, pan=0.3)   # turn over, arms out
put(hall, load(f"{LIB}/glass_crack.wav"), 1.9, 1.2); put(hall, shatter(), 1.92, 1.1); put(sfx, load(f"{LIB}/bass_hit.wav"), 1.92, 0.9)
put(hall, creak(0.45), 2.28, 0.7, pan=0.2); put(hall, lp(rng.standard_normal(int(0.35 * SR)), 0.3) * np.hanning(int(0.35 * SR)) * 0.5, 2.35, 0.6)   # the panel slides out
put(hall, load(f"{LIB}/whoosh.wav"), 2.62, 0.7, pan=0.2); put(hall, rope_zip(0.8, up=True), 3.0, 1.0); put(hall, load(f"{LIB}/whoosh2.wav"), 3.05, 0.8)
put(sfx, load(f"{LIB}/sting.wav"), 3.88, 0.9)
put(sfx, ding(), 4.78, 0.8); put(sfx, load(f"{LIB}/stamp.wav"), 5.6, 1.1); put(sfx, load(f"{LIB}/bass_hit.wav"), 5.6, 0.35)
put(sfx, load(f"{LIB}/paper.wav"), 6.02, 0.9); put(sfx, flap(), 6.55, 0.9); put(sfx, scribble(1.3), 6.95, 0.75); put(sfx, flap(), 8.1, 0.5)
import importlib.util
for k in range(11): put(hall, load(f"{LIB}/hop.wav")[:int(0.35 * SR)], 8.35 + 0.42 * k + 0.41, 0.42, pan=(0.1 if k % 2 else -0.1))   # landings
put(sfx, load(f"{LIB}/sting.wav"), 13.76, 1.0); put(sfx, boom(64, 30, 2.2), 13.78, 0.9)
hb = load(f"{LIB}/heartbeat.wav"); [put(sfx, hb, 14.0 + 0.78 * k, 0.75 - 0.08 * k) for k in range(2)]
sfx += reverb(hall, 2.4, 0.38)
mus = score()
vo = load(f"{P}/audio/vo.mp3")[:N]; vo = np.pad(vo, ((0, N - len(vo)), (0, 0)))
def write(path, x):
    x = np.tanh(x * 1.0); x /= max(1e-6, np.abs(x).max() / 0.95)
    with wave.open(path, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype("<i2").tobytes())
os.makedirs(f"{P}/final", exist_ok=True)
duck = 1 - 0.45 * np.clip(lp(np.abs(vo[:, 0]) * 6, 0.0008), 0, 1)                                # duck score under the voice
mix = vo * 1.0 + sfx * 0.55 + mus * 0.42 * duck[:, None]
write(f"{P}/final/_s_mix.wav", mix); write(f"{P}/final/_s_sfx.wav", sfx * 0.55 + mus * 0.42)
for a, b in (("_s_mix.wav", "sample_audio.wav"), ("_s_sfx.wav", "sample_sfx_only.wav")):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{P}/final/{a}", "-af", "loudnorm=I=-13:TP=-1.0:LRA=9", "-ar", str(SR), f"{P}/final/{b}"], check=True)
print("->", f"{P}/final/sample_audio.wav")
