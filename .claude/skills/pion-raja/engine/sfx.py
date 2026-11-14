"""Procedural cartoon sound effects (no samples, no downloads) + a mixer.
   python3 sfx.py events.txt out_sfx.wav [--dur S] [--mix original.mp4 out_mix.m4a] [--gain-db -3] [--duck 0.7]
   events.txt lines:  <time s> <sound> [gain]      e.g.  "1.98 zap 0.9"    '#' = comment
   python3 sfx.py --demo demo.wav   writes every sound one after another (to audition them)."""
import numpy as np, sys, wave, subprocess, os
SR = 48000
rng = np.random.default_rng(7)

def t_(d): return np.arange(int(d * SR)) / SR
def env_ad(n, a=.005, d=None, curve=4.0):
    t = np.arange(n) / SR; d = d or n / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-curve * t / d); return e
def chirp(f0, f1, d, shape='exp'):
    t = t_(d); u = t / d
    f = f0 * (f1 / f0) ** u if shape == 'exp' else f0 + (f1 - f0) * u
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def noise(d): return rng.standard_normal(int(d * SR))
def bandpass(x, lo, hi):  # FFT brick-wall with soft edges
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + ((lo / np.maximum(f, 1)) ** 4)) * 1 / (1 + (f / hi) ** 4); return np.fft.irfft(X * m, len(x))
def sweep_filter(x, f0, f1, q=.25):  # moving band-pass via short overlapping blocks
    n, hop, out = len(x), 1024, np.zeros(len(x)); win = np.hanning(2048)
    for i in range(0, n, hop):
        seg = x[i:i + 2048]
        if len(seg) < 2048: seg = np.pad(seg, (0, 2048 - len(seg)))
        u = i / n; fc = f0 * (f1 / f0) ** u
        y = bandpass(seg * win, fc * (1 - q), fc * (1 + q)); e = min(n, i + 2048) - i; out[i:i + e] += y[:e]
    return out
def norm(x, peak=.9): m = np.max(np.abs(x)) or 1; return x / m * peak

def woosh(d=.45, up=True):
    x = sweep_filter(noise(d), 300 if up else 2500, 2500 if up else 300, .35); t = t_(d)
    return norm(x * np.sin(np.pi * t / d) ** 1.5, .8)
def boing(d=.55, f=180):
    t = t_(d); fr = f * (1 + .9 * np.exp(-t * 9) * np.sin(2 * np.pi * 11 * t)) * (1 + .5 * t)
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(fr) / SR); return norm(x * env_ad(len(t), .004, d, 3.5), .85)
def bonk(d=.35):
    t = t_(d); body = np.sin(2 * np.pi * np.cumsum(420 * np.exp(-t * 7) + 160) / SR) * np.exp(-t * 14)
    click = bandpass(noise(d), 1500, 6000) * np.exp(-t * 90); wood = np.sin(2 * np.pi * 820 * t) * np.exp(-t * 30) * .5
    return norm(body + .6 * click + wood, .95)
def zap(d=.4):
    t = t_(d); saw = 2 * ((t * (110 + 60 * np.sin(2 * np.pi * 37 * t))) % 1) - 1
    buzz = np.sign(np.sin(2 * np.pi * 58 * t)) * .4 + saw + .5 * bandpass(noise(d), 2000, 9000) * (rng.random(len(t)) > .7)
    return norm(np.tanh(2.5 * buzz) * env_ad(len(t), .002, d, 2.2) * (1 + .5 * np.sin(2 * np.pi * 23 * t)), .8)
def ting(d=.9, f=2093):
    t = t_(d); x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (3 + 2 * k)) for k, a in [(1, 1), (2.76, .4), (5.4, .2)])
    return norm(x * np.minimum(1, t / .002), .7)
def sparkle(d=.7):
    x = np.zeros(int(d * SR))
    for i in range(9):
        s = ting(.35, 1800 + 1600 * rng.random()) * (.5 + .5 * rng.random()); o = int(i * d / 11 * SR); x[o:o + len(s)] += s[:len(x) - o]
    return norm(x, .6)
def pop(d=.12):
    t = t_(d); return norm(np.sin(2 * np.pi * np.cumsum(900 * np.exp(-t * 40) + 300) / SR) * np.exp(-t * 35), .8)
def clap1(d=.15):
    t = t_(d); return bandpass(noise(d), 900, 5000) * (np.exp(-t * 50) + .5 * np.exp(-((t - .012) * 400) ** 2))
def claps(n=4, gap=.25):
    x = np.zeros(int((n * gap + .2) * SR))
    for i in range(n): c = clap1() * (.8 + .2 * rng.random()); o = int(i * gap * SR); x[o:o + len(c)] += c
    return norm(x, .8)
def kaching(d=1.0):
    x = np.zeros(int(d * SR)); t = t_(.25)
    mech = bandpass(noise(.06), 2000, 8000) * np.exp(-t_(.06) * 80); x[:len(mech)] += mech
    for k, (o, f) in enumerate([(.06, 2637), (.12, 3136), (.12, 3951)]):
        s = ting(.8, f) * (.9 - .2 * k); i = int(o * SR); x[i:i + len(s)] += s[:len(x) - i]
    coins = sum(ting(.15, 4000 + 3000 * rng.random()) for _ in range(1));
    for i in range(10): s = ting(.15, 3500 + 3500 * rng.random()) * .25; o = int((.2 + i * .05) * SR); x[o:o + len(s)] += s[:len(x) - o]
    return norm(x, .85)
def beep(d=.12, f=1760):
    t = t_(d); return norm(np.sin(2 * np.pi * f * t) * np.minimum(1, t / .003) * np.minimum(1, (d - t) / .01), .55)
def scan(d=.8):
    x = np.zeros(int(d * SR)); t = t_(d); hum = np.sin(2 * np.pi * (600 + 500 * np.sin(np.pi * 3 * t / d) ** 2) * t) * .25 * np.sin(np.pi * t / d)
    x += hum; b = np.concatenate([beep(.09, 1760), np.zeros(int(.05 * SR)), beep(.14, 2349)]); o = int((d - .3) * SR); x[o:o + len(b)] += b[:len(x) - o]
    return norm(x, .6)
def question(d=.35):
    return norm(chirp(500, 1200, d) * env_ad(int(d * SR), .01, d, 2) * .8 + .3 * chirp(1000, 2400, d) * env_ad(int(d * SR), .01, d, 3), .55)
def think(d=.6):  # "hmm" wobble
    t = t_(d); f = 220 + 15 * np.sin(2 * np.pi * 5 * t); x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return norm(bandpass(x, 150, 1500) * np.sin(np.pi * t / d) ** .6, .45)
def slide_whistle(d=.5, up=False):
    t = t_(d); f = (1600 if not up else 500) * ((500 if not up else 1600) / (1600 if not up else 500)) ** (t / d)
    x = np.sin(2 * np.pi * np.cumsum(f * (1 + .01 * np.sin(2 * np.pi * 6 * t))) / SR) + .08 * noise(d)
    return norm(x * np.sin(np.pi * t / d) ** .4, .55)
def hop(d=.14): return norm(chirp(250, 700, d) * env_ad(int(d * SR), .003, d, 4), .5)
def land(d=.18): t = t_(d); return norm(np.sin(2 * np.pi * np.cumsum(180 * np.exp(-t * 15) + 70) / SR) * np.exp(-t * 20) + .2 * bandpass(noise(d), 300, 2000) * np.exp(-t * 40), .7)
def stretch(d=.5):  # rubbery creak while being yanked
    t = t_(d); f = 140 + 160 * t / d; x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (1 + .3 * np.sin(2 * np.pi * 31 * t))
    return norm(bandpass(x, 200, 2500) * np.sin(np.pi * t / d), .45)
def rumble(d=.6): t = t_(d); return norm(bandpass(noise(d), 40, 300) * np.sin(np.pi * t / d), .7)
def paper(d=.35): t = t_(d); return norm(bandpass(noise(d), 2000, 9000) * (rng.random(len(t)) * .6 + .4) * np.sin(np.pi * t / d) ** .5, .5)
def ohh(d=.7):  # little "ohhh" vocal-ish tone
    t = t_(d); f = 260 * (1 - .15 * t / d); ph = np.cumsum(f) / SR * 2 * np.pi
    x = sum(np.sin(k * ph) * np.exp(-((k * f.mean() - 450) / 250) ** 2) for k in range(1, 12))
    return norm(x * np.minimum(1, t / .05) * np.minimum(1, (d - t) / .2), .5)
def tada(d=1.0):
    x = np.zeros(int(d * SR))
    for o, f in [(0, 523), (.09, 659), (.18, 784), (.27, 1047)]:
        tt = t_(.7); s = (np.sin(2 * np.pi * f * tt) + .4 * np.sign(np.sin(2 * np.pi * f * tt)) * .3) * np.exp(-tt * 4); i = int(o * SR); x[i:i + len(s)] += s[:len(x) - i]
    return norm(x, .6)
def dizzy(d=1.0):
    x = np.zeros(int(d * SR))
    for i in range(6): s = ting(.3, [1568, 1976, 2349][i % 3]) * .6; o = int(i * .14 * SR); x[o:o + len(s)] += s[:len(x) - o]
    return norm(x, .5)

def sizzle(d=1.2):
    t = t_(d); crack = bandpass(noise(d), 2500, 9000) * (rng.random(len(t)) > .985) * 3 + bandpass(noise(d), 3000, 8000) * .25
    return norm(crack * np.minimum(1, t / .05) * np.exp(-t * 1.2), .6)
def thud(d=.3): t = t_(d); return norm(np.sin(2 * np.pi * np.cumsum(110 * np.exp(-t * 10) + 45) / SR) * np.exp(-t * 12) + .3 * bandpass(noise(d), 100, 800) * np.exp(-t * 30), .85)
def scribble(d=1.0):
    t = t_(d); x = bandpass(noise(d), 1500, 6000) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 6 * t))) * (rng.random(len(t)) * .5 + .5)
    return norm(x * np.minimum(1, t / .05) * np.minimum(1, (d - t) / .1), .4)
def slap(d=.18):
    t = t_(d); return norm(bandpass(noise(d), 700, 6000) * (np.exp(-t * 55) + .4 * np.exp(-((t - .008) * 300) ** 2)) + .5 * np.sin(2 * np.pi * 180 * t) * np.exp(-t * 40), .95)
def poof(d=.5):
    t = t_(d); return norm(bandpass(noise(d), 150, 2500) * np.minimum(1, t / .01) * np.exp(-t * 7) + .4 * np.sin(2 * np.pi * np.cumsum(220 * np.exp(-t * 6) + 60) / SR) * np.exp(-t * 10), .85)
LIB = dict(poof=poof, slap=slap, sizzle=sizzle, thud=thud, scribble=scribble, woosh=lambda: woosh(), woosh_down=lambda: woosh(.4, False), woosh_long=lambda: woosh(.8), boing=boing, boing_lo=lambda: boing(.6, 120), bonk=bonk, zap=zap,
           ting=ting, sparkle=sparkle, pop=pop, clap=claps, kaching=kaching, scan=scan, beep=beep, question=question, think=think,
           fall=lambda: slide_whistle(.5), rise=lambda: slide_whistle(.45, True), hop=hop, land=land, stretch=stretch, rumble=rumble,
           paper=paper, ohh=ohh, tada=tada, dizzy=dizzy)

def write_wav(path, x):
    x = np.clip(x, -1, 1); st = np.stack([x, x], 1); w = wave.open(path, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes()); w.close()

def render(events, dur):
    out = np.zeros(int(dur * SR) + SR)
    cache = {}
    for t, name, g in events:
        if name not in LIB: print('unknown sound', name); continue
        s = LIB[name]() if name not in ('woosh', 'clap', 'sparkle', 'kaching') else LIB[name]()  # randomised ones re-render
        i = int(t * SR)
        if i < 0 or i >= len(out): continue
        out[i:i + len(s)] += g * s[:len(out) - i]
    out = out[:int(dur * SR)]; return np.tanh(out * 1.1) / np.tanh(1.1)

if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--demo':
        names = list(LIB); x = np.concatenate([np.concatenate([LIB[n](), np.zeros(int(.35 * SR))]) for n in names]); write_wav(a[1], x * .9); print(', '.join(names)); sys.exit()
    ev = []
    for line in open(a[0]):
        line = line.split('#')[0].split()
        if len(line) >= 2: ev.append((float(line[0]), line[1], float(line[2]) if len(line) > 2 else 1.0))
    dur = float(a[a.index('--dur') + 1]) if '--dur' in a else max(t for t, _, _ in ev) + 2
    sfx = render(ev, dur); write_wav(a[1], sfx); print('sfx ->', a[1], len(ev), 'events')
    if '--mix' in a:
        i = a.index('--mix'); src, dst = a[i + 1], a[i + 2]; gdb = float(a[a.index('--gain-db') + 1]) if '--gain-db' in a else -4
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-i', a[1], '-filter_complex',
                        f'[1:a]volume={gdb}dB[s];[0:a][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', dst], check=True)
        print('mix ->', dst)
