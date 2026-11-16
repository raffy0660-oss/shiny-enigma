"""SFX for proj6 (bubble rings / flood): ElevenLabs takes where we have them, procedural sounds for the rest.
   python3 build_sfx.py out_sfx.wav --dur 37.94
Times are in the FINAL video timeline (white 1 = 4.60-10.50, white 2 = 25.00-37.94)."""
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.expanduser("~/pion/eng_dev"))
import sfx as P  # noqa: E402  procedural library (engine/sfx.py)

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
R = np.random.default_rng(21)


def load(name):
    w = wave.open(os.path.join(HERE, name + ".wav"))
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    x = x.reshape(-1, w.getnchannels()).mean(1)
    return x


def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))


def fade(x, a=.01, b=.08):
    n = len(x); e = np.ones(n)
    na, nb = int(a * SR), int(b * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nb: e[-nb:] *= np.linspace(1, 0, nb)
    return x * e


def norm(x, p=.9):
    return x / (np.max(np.abs(x)) or 1) * p


# ---------------- synthesized water sounds
def drip(f0=1400):
    d = .09; t = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.4 * t / d)) / SR) * np.exp(-t * 55)


def leak(d=6.0):
    n = int(d * SR); t = np.arange(n) / SR
    base = P.bandpass(R.standard_normal(n), 1800, 7000)
    am = 0.55 + 0.25 * np.sin(2 * np.pi * 3.1 * t) + 0.2 * np.sin(2 * np.pi * 7.3 * t + 1)
    x = base * am * 0.35
    for k in range(int(d * 9)):                     # droplets splashing on the floor
        i = int(R.random() * (n - 5000)); s = drip(900 + R.random() * 1600) * (0.3 + 0.7 * R.random())
        x[i:i + len(s)] += s
    x = fade(x, .4, .3)
    return norm(x, .6)


def uw_amb(d=14.0):
    n = int(d * SR); t = np.arange(n) / SR
    brown = np.cumsum(R.standard_normal(n)); brown -= np.convolve(brown, np.ones(4801) / 4801, "same")
    x = lowpass(brown, 380); x = x / (np.max(np.abs(x)) or 1) * .5
    x *= 0.8 + 0.2 * np.sin(2 * np.pi * .23 * t)
    for k in range(int(d * 4)):                     # soft bubble blips
        i = int(R.random() * (n - 8000)); dd = .05 + R.random() * .07; tt = np.arange(int(dd * SR)) / SR
        f0 = 280 + R.random() * 500
        s = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.2 * tt / dd)) / SR) * np.exp(-tt * 30) * (0.08 + 0.12 * R.random())
        x[i:i + len(s)] += s
    return norm(fade(x, .3, .5), .55)


def bubbles(d=1.2, rate=22, lo=350, hi=1100):
    n = int(d * SR); x = np.zeros(n)
    for k in range(int(d * rate)):
        i = int(R.random() * (n - 6000)); dd = .03 + R.random() * .06; tt = np.arange(int(dd * SR)) / SR
        f0 = lo + R.random() * (hi - lo)
        s = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.5 * tt / dd)) / SR) * np.exp(-tt * 40) * (0.4 + 0.6 * R.random())
        x[i:i + len(s)] += s
    return norm(fade(x, .01, .15), .7)


def splashes(d=2.5, rate=7):
    n = int(d * SR); x = np.zeros(n)
    for k in range(int(d * rate)):
        i = int(R.random() * (n - 12000)); dd = .12 + R.random() * .15; m = int(dd * SR); tt = np.arange(m) / SR
        s = P.bandpass(R.standard_normal(m), 300, 3500) * np.minimum(1, tt / .005) * np.exp(-tt * 18)
        x[i:i + m] += s * (0.5 + 0.5 * R.random())
    return norm(lowpass(x, 1800), .7)


def cricket():
    x = np.zeros(int(1.0 * SR))
    for k in range(3):
        d = .045; t = np.arange(int(d * SR)) / SR
        s = np.sin(2 * np.pi * 4300 * t) * np.sin(np.pi * t / d) * (1 + .5 * np.sin(2 * np.pi * 60 * t))
        i = int((.05 + k * .085) * SR); x[i:i + len(s)] += s
    return norm(x, .5)


# ---------------- the cue sheet: (time, source, gain dB, lowpass Hz or None)
def cues():
    torrent, blub, crack, whoosh = load("torrent"), load("blub"), load("crack"), load("whoosh_uw")
    burst = np.zeros(int(3.0 * SR))
    burst[:len(crack)] += crack * .9
    th = P.LIB["thud"](); rb = P.LIB["rumble"]()
    i0 = int(.45 * SR)
    burst[i0:i0 + len(rb)] += rb[:len(burst) - i0] * .9
    for k in range(7):                                   # bricks crashing down
        i = int((.5 + R.random() * 1.6) * SR); s = th * (0.4 + 0.5 * R.random()); burst[i:i + len(s)] += s[:len(burst) - i]
    burst[i0:i0 + len(torrent)] += torrent[:len(burst) - i0] * .8
    sub = lowpass(np.concatenate([torrent[int(1.0 * SR):], np.zeros(SR)]), 700)
    blub_lo = np.interp(np.arange(0, len(blub), .78), np.arange(len(blub)), blub)          # pitched down: sloppy failed ring
    ring = norm(P.LIB["woosh_long"]() * .7 + np.pad(P.LIB["sparkle"](), (int(.15 * SR), 0))[:len(P.LIB["woosh_long"]())] * .5, .8)
    ring = np.concatenate([ring, np.zeros(SR)]); bb = bubbles(1.6, 16); ring[:len(bb)] += bb * .5
    L = [
        # ---- white 1
        (4.60, leak(6.0), -15, None),
        (5.95, crack, -10, None),                        # stress cracks before the break
        (6.78, burst, -3, None),
        (6.92, torrent, -4, None),
        (7.30, sub, -8, None),
        (7.25, splashes(2.8), -10, 1500),
        (7.32, blub, -2, 2600),                          # blubuk-blubuk
        (8.15, blub, -6, 2200),
        (8.70, uw_amb(2.0), -10, None),
        (9.00, bubbles(1.4, 18), -12, 1600),
        (10.30, whoosh, -6, None),                       # into the diver clip
        # ---- white 2 (underwater the whole time)
        (25.00, uw_amb(12.94), -11, None),
        (24.92, whoosh, -8, None),
        (27.30, P.LIB["pop"](), -8, None),               # tongue out (blep)
        (27.32, P.LIB["boing"](), -14, None),
        (28.70, P.LIB["stretch"](), -10, None),          # cheeks puff up
        (29.16, P.LIB["woosh_down"](), -16, None),       # slow zoom out on "aaand"
        (30.08, blub_lo, -4, 2400),                      # sloppy failed ring...
        (30.48, P.LIB["pop"](), -6, None),               # ...pop, gone
        (30.52, bubbles(.5, 30, 600, 1600), -10, None),
        (30.75, cricket(), -12, None),                   # awkward silence
        (31.50, P.LIB["sizzle"](), -14, None),           # steaming mad
        (32.88, P.LIB["bonk"](), -10, None),             # button press
        (32.90, P.LIB["ting"](), -9, None),
        (33.80, P.LIB["stretch"](), -11, None),          # wind-up
        (34.20, P.LIB["rise"](), -14, None),
        (34.55, P.LIB["stretch"](), -13, None),          # breath in
        (35.05, P.LIB["woosh"](), -9, None),             # blow!
        (35.10, ring, -5, None),                         # perfect ring
        (36.60, whoosh, -4, None),                       # ring rushes the lens
        (36.70, bubbles(1.0, 26, 500, 1500), -9, None),
        (35.70, P.LIB["sparkle"](), -9, None),           # pose
        (35.75, P.LIB["ting"](), -12, None),
    ]
    return L


def main():
    out = sys.argv[1]
    dur = float(sys.argv[sys.argv.index("--dur") + 1]) if "--dur" in sys.argv else 37.94
    mix = np.zeros(int(dur * SR) + SR)
    for t, x, gdb, lp in cues():
        x = np.asarray(x, np.float64)
        if lp:
            x = lowpass(x, lp)
        x = fade(x, .003, .05) * 10 ** (gdb / 20)
        i = int(t * SR)
        mix[i:i + len(x)] += x[:len(mix) - i]
    mix = mix[:int(dur * SR)]
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    P.write_wav(out, mix * .95)
    print("sfx ->", out, f"peak {np.max(np.abs(mix)):.2f}")


if __name__ == "__main__":
    main()
