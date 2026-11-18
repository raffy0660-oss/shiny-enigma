"""SFX for proj7 (Las Vegas Sphere): python3 build_sfx.py sfx_only.wav --dur 38.8
Times in the final timeline: white 1 = 7.10-15.00, white 2 = 21.933-29.90."""
import os, sys, wave
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))


def load(n):
    w = wave.open(os.path.join(HERE, n + ".wav"))
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return x.reshape(-1, w.getnchannels()).mean(1)


def fade(x, a=.005, b=.06):
    n = len(x); e = np.ones(n); na, nb = int(a * SR), int(b * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nb: e[-nb:] *= np.linspace(1, 0, nb)
    return x * e


def seg(x, d):
    n = int(d * SR)
    return np.tile(x, n // len(x) + 1)[:n]


def main():
    out = sys.argv[1]; dur = float(sys.argv[sys.argv.index("--dur") + 1]) if "--dur" in sys.argv else 38.8
    E = {n: load(n) for n in ["zoomout", "grow", "measure", "counter", "whoosh", "romance", "field_amb", "book", "melt", "fall", "slam", "flyup"]}
    W1, W2 = 7.10, 21.933
    L = [
        (W1, fade(seg(E["field_amb"], 5.8), .3, .25), -15),        # open field, outside the kingdom
        (W1 + 0.70, E["zoomout"], -4),                              # "huge": pull back to the whole Sphere
        (W1 + 1.50, E["grow"], -5),                                  # Pion grows giant
        (W1 + 1.76, E["measure"], -8), (W1 + 1.80, E["counter"], -10),   # 366 FT
        (W1 + 3.94, E["measure"], -8), (W1 + 3.98, E["counter"], -10),   # 516 FT
        (W1 + 5.70, E["whoosh"], -6),                                # cut to The Notebook
        (W1 + 5.80, fade(E["romance"], .05, .5), -9),
        (W1 + 5.80, fade(seg(E["field_amb"], 2.1), .1, .3), -17),
        (W2 + 0.02, E["book"], -9),                                  # the Death Note glows
        (W2 + 1.05, E["whoosh"], -6),                                # out to the Sphere
        (W2 + 1.15, fade(seg(E["field_amb"], 6.8), .2, .3), -16),
        (W2 + 2.50, E["melt"], -4),                                  # the Sphere melts flat
        (W2 + 2.62, E["counter"], -9),                               # 160,000 SQ FT
    ]
    for t0 in (5.05, 5.60, 6.15):                                    # three football fields slam down
        L += [(W2 + t0 - 0.38, E["fall"], -9), (W2 + t0 - 0.02, E["slam"], -2)]
    L += [(W2 + 6.78, E["flyup"], -6)]
    mix = np.zeros(int(dur * SR) + SR)
    for t, x, gdb in L:
        x = fade(np.asarray(x, np.float64)) * 10 ** (gdb / 20); i = int(t * SR)
        mix[i:i + len(x)] += x[:len(mix) - i]
    mix = mix[:int(dur * SR)]
    mix = np.tanh(mix * 1.05) / np.tanh(1.05); mix = mix / max(1.0, np.abs(mix).max()) * .97
    st = (np.stack([mix, mix], 1) * 32767).astype(np.int16)
    w = wave.open(out, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
    print("sfx ->", out)


if __name__ == "__main__":
    main()
