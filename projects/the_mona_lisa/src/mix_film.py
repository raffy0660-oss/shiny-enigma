"""The Mona Lisa Heist, full film 0-73 s: VO (loud: user "VO volume 1000") over a lower SFX + score bed -> ~/pion/proj13/final/film_audio.wav (+ film_sfx_only.wav).
SFX generated with ElevenLabs (audio/el/*.mp3: glass, rope, winch, hall, sting, pen, book, chime, hop, whoosh, two music stems) layered with
synthesized ones (numpy) and the SFX library of the earlier films (~/pion/proj12/sfx_norm). The ElevenLabs music API needs a paid plan.
A hall reverb (synthetic impulse response) glues the museum sounds; the office stays dry; loudness: VO on top, score under it."""
import os, wave, subprocess, numpy as np
SR, T = 48000, 73.0
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

# ---------------- score: ElevenLabs stems (heist, detective, three investigation cues getting darker) + synth drone + booms on the beats
EL = f"{P}/audio/el"; H0 = -0.3   # the film's heist starts 0.3 s into the heist timeline (IN the fall)
def stem(name, t0, t1, fade=1.0):
    x = load(f"{EL}/{name}.mp3"); n = min(len(x), int((t1 - t0) * SR)); x = x[:n]; e = np.ones(n); f = int(fade * SR); e[:f] = np.linspace(0, 1, f); e[-f:] = np.linspace(1, 0, f); return x * e[:, None]
def score():
    out = np.zeros((N, 2)); tt = np.arange(N) / SR; saw = lambda f, x: 2 * ((x * f) % 1.0) - 1
    drone = lp((saw(36.7, tt) + saw(36.9, tt) + 0.6 * saw(55.0, tt)) / 2.6, 0.03)
    dv = np.interp(tt, [0, 0.3, 5.4, 5.6, 10.8, 32, 49, 62, 70, 71.4, 73], [.3, .45, .7, .2, .25, .32, .4, .5, .6, .2, .1]); out += st(drone * dv * 0.4)
    put(out, stem("mus_heist", 0, 5.9, 0.3), 0.0, 0.9); put(out, stem("mus_detective", 0, 11.0, 0.8), 5.5, 0.7)
    put(out, stem("mus_inv1", 0, 20.0, 1.2), 16.2, 0.7); put(out, stem("mus_inv2", 0, 20.0, 1.2), 35.4, 0.72); put(out, stem("mus_inv3", 0, 16.0, 1.2), 55.2, 0.75)
    for t0, g in ((H0 + 0.98, .8), (H0 + 1.92, 1.2), (H0 + 3.02, .8), (4.5, 1.1), (14.96, 1.0), (37.1, 0.9), (47.2, 0.9), (56.2, 0.8), (63.2, 0.9)): put(out, boom(70, 32, 2.4), t0, g)
    put(out, riser(0.9), H0 + 3.0, 0.5)
    return out
sfx = np.zeros((N, 2)); hall = np.zeros((N, 2)); room = np.zeros((N, 2))
ha = load(f"{EL}/hall_amb.mp3"); amb = np.concatenate([ha] * 9)[:N]; tt = np.arange(N) / SR
hall += amb * np.interp(tt, [0, 5.55, 5.6, 10.8, 10.85, 32.35, 32.4, 73], [1, 1, 0, 0, 1, 1, 0, 0])[:, None] * 0.8
hum = load(f"{LIB}/hum.wav"); hm = np.concatenate([hum] * 14)[:N]; room += hm * np.interp(tt, [0, 32.3, 32.4, 49.2, 49.3, 67.5, 67.6, 73], [0, 0, .5, .5, .35, .35, .5, .5])[:, None]
# heist
put(hall, load(f"{EL}/rope_zip.mp3"), max(0, H0 + 0.3), 1.0); put(hall, load(f"{EL}/rope_catch.mp3"), H0 + 0.96, 1.0); put(hall, rope_catch(), H0 + 0.98, 0.4)
put(hall, load(f"{EL}/flip_whoosh.mp3"), H0 + 1.1, 0.9, pan=-0.2); put(hall, load(f"{LIB}/whoosh2.wav"), H0 + 1.64, 0.3, pan=0.3)
put(hall, load(f"{EL}/glass_shatter.mp3"), H0 + 1.9, 1.2); put(hall, shatter(), H0 + 1.92, 0.4); put(sfx, load(f"{LIB}/bass_hit.wav"), H0 + 1.92, 0.8)
put(hall, creak(0.45), H0 + 2.28, 0.6, pan=0.2); put(hall, load(f"{EL}/flip_whoosh.mp3"), H0 + 2.6, 0.6, pan=0.2); put(hall, load(f"{EL}/winch_up.mp3"), H0 + 2.98, 1.0)
put(sfx, load(f"{EL}/sting.mp3"), 4.45, 0.8)
# office
put(sfx, load(f"{EL}/notif.mp3"), 5.8, 0.7); put(sfx, load(f"{LIB}/stamp.wav"), 7.15, 1.0); put(sfx, load(f"{LIB}/bass_hit.wav"), 7.15, 0.3)
put(sfx, load(f"{LIB}/paper.wav"), 7.97, 0.7); put(sfx, load(f"{EL}/book_open.mp3"), 8.45, 0.8); put(sfx, load(f"{EL}/pen_write.mp3")[:int(1.6 * SR)], 8.9, 0.7); put(sfx, flap(), 10.42, 0.4)
# gallery
for k in range(1, 8): put(hall, load(f"{EL}/hop.mp3"), 10.85 + 0.38 * k - 0.02, 0.5, pan=(0.1 if k % 2 else -0.1))
for tl in (15.95, 16.45, 16.85): put(hall, load(f"{EL}/hop.mp3"), tl - 0.02, 0.5)
put(sfx, load(f"{EL}/sting.mp3"), 14.94, 0.8); put(sfx, load(f"{LIB}/heartbeat.wav"), 15.15, 0.55)
put(sfx, load(f"{EL}/flash_click.mp3"), 16.45, 0.8); put(sfx, load(f"{LIB}/magnify.wav"), 17.1, 0.4); put(sfx, load(f"{EL}/flash_click.mp3"), 19.8, 0.8); put(sfx, load(f"{LIB}/magnify.wav"), 22.9, 0.6)
put(hall, load(f"{EL}/rope_zip.mp3"), 24.5, 0.55); put(sfx, load(f"{EL}/riser.mp3"), 24.4, 0.35)
put(sfx, load(f"{LIB}/magnify.wav"), 28.7, 0.5); put(sfx, load(f"{EL}/sting.mp3")[:int(2.2 * SR)], 30.95, 0.5); put(sfx, load(f"{EL}/book_open.mp3"), 30.5, 0.7); put(sfx, load(f"{EL}/pen_write.mp3")[:int(1.6 * SR)], 30.9, 0.6)
# security
put(room, load(f"{EL}/terminal.mp3"), 32.6, 0.5); put(room, load(f"{EL}/cctv_off.mp3"), 36.95, 1.0); put(room, load(f"{EL}/glitch.mp3"), 37.0, 0.6); put(room, load(f"{EL}/glitch.mp3"), 37.6, 0.5)
put(sfx, load(f"{LIB}/bass_hit.wav"), 37.1, 0.5); put(room, load(f"{EL}/terminal.mp3"), 39.1, 0.6); put(room, load(f"{LIB}/click.wav"), 42.45, 0.6); put(room, load(f"{EL}/glitch.mp3"), 42.45, 0.4)
put(sfx, load(f"{LIB}/heartbeat.wav"), 44.6, 0.5); put(sfx, load(f"{LIB}/stamp.wav"), 47.2, 1.0); put(sfx, load(f"{LIB}/bass_hit.wav"), 47.2, 0.5)
# corridor
put(hall, load(f"{EL}/steps_concrete.mp3"), 49.3, 0.55); put(sfx, load(f"{EL}/flash_click.mp3"), 51.0, 0.8); put(hall, load(f"{EL}/hatch_creak.mp3"), 51.4, 0.7)
put(sfx, load(f"{EL}/flash_click.mp3"), 54.25, 0.8); put(sfx, load(f"{EL}/sting.mp3")[:int(2.5 * SR)], 56.2, 0.6); put(sfx, load(f"{LIB}/magnify.wav"), 57.5, 0.4)
put(hall, load(f"{EL}/rope_zip.mp3"), 59.5, 0.6); put(hall, load(f"{EL}/drop_land.mp3"), 60.3, 0.9)
put(sfx, load(f"{LIB}/heartbeat.wav"), 62.5, 0.6); put(sfx, load(f"{LIB}/heartbeat.wav"), 63.3, 0.6); put(sfx, load(f"{EL}/sting.mp3"), 63.2, 0.7)
put(room, load(f"{EL}/keycard.mp3"), 66.65, 1.0)
put(sfx, load(f"{EL}/riser.mp3"), 67.5, 0.55); put(sfx, load(f"{EL}/reveal_hit.mp3"), 71.38, 1.1); put(sfx, load(f"{LIB}/bass_hit.wav"), 71.38, 0.6)
sfx += reverb(hall, 2.4, 0.3) + reverb(room, 0.8, 0.18)
mus = score()
vo = load(f"{P}/audio/vo.mp3")[:N]; vo = np.pad(vo, ((0, N - len(vo)), (0, 0)))
def write(path, x, norm=True):
    if norm: x = np.tanh(x * 1.0); x /= max(1e-6, np.abs(x).max() / 0.95)
    with wave.open(path, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
os.makedirs(f"{P}/final", exist_ok=True)
def lufs_norm(src, dst, I): subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", f"loudnorm=I={I}:TP=-1.5:LRA=11", "-ar", str(SR), dst], check=True)
write(f"{P}/final/_f_vo.wav", vo); write(f"{P}/final/_f_bed.wav", sfx * 0.85 + mus * 0.55)
lufs_norm(f"{P}/final/_f_vo.wav", f"{P}/final/_f_vo_n.wav", -13); lufs_norm(f"{P}/final/_f_bed.wav", f"{P}/final/_f_bed_n.wav", -21)   # the voice sits ~8 LU above the bed
v = load(f"{P}/final/_f_vo_n.wav")[:N]; b = load(f"{P}/final/_f_bed_n.wav")[:N]; v = np.pad(v, ((0, N - len(v)), (0, 0))); b = np.pad(b, ((0, N - len(b)), (0, 0)))
duck = 1 - 0.35 * np.clip(lp(np.abs(v[:, 0]) * 5, 0.0008), 0, 1)
write(f"{P}/final/_f_mix.wav", v + b * duck[:, None], norm=False)
lufs_norm(f"{P}/final/_f_mix.wav", f"{P}/final/film_audio.wav", -11); lufs_norm(f"{P}/final/_f_bed.wav", f"{P}/final/film_sfx_only.wav", -14)
print("->", f"{P}/final/film_audio.wav")
