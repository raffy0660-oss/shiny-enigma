"""proj9 SFX timeline. Local times in the animation (white screen starts at OFF in the video). python3 build_sfx.py sfx_only.wav"""
import os, sys, wave
import numpy as np
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__)); OFF = 8.35; DUR = 38.2667
def load(n):
    w = wave.open(os.path.join(HERE, n + ".wav")); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return x.reshape(-1, w.getnchannels()).mean(1)
def fade(x, a=.005, b=.06):
    n = len(x); e = np.ones(n); na, nb = int(a * SR), int(b * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nb: e[-nb:] *= np.linspace(1, 0, nb)
    return x * e
def seg(x, d): n = int(d * SR); return np.tile(x, n // len(x) + 1)[:n]
E = {k: load(k) for k in ["plane", "landing", "hop", "cloth", "sparkle", "xray", "punch", "wobble", "thud", "whoosh", "pop", "plaza_amb", "gasp", "yell", "ring", "pickup", "cock", "zoom"]}
def phone(x):   # telephone band (300-3400 Hz) + a little grit: the boss down the line
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < 320) | (f > 3300)] = 0; y = np.fft.irfft(X, len(x)); return np.tanh(y * 3) / 3 * 2.2
L = [
    (0.00, E["plane"], -4),                          # fly to Thailand
    (1.05, E["whoosh"], -8), (1.10, fade(seg(E["plaza_amb"], 1.95), .2, .3), -17),
    (1.50, E["landing"], -5),                        # touchdown on the street
    (2.00, E["hop"], -9), (2.33, E["hop"], -10), (2.67, E["hop"], -10),
    (3.00, E["whoosh"], -9),
    (3.32, E["pop"], -9), (3.82, E["zoom"], -13),                            # one photo of him
    (4.76, E["whoosh"], -10),
    (5.80, E["cloth"], -5), (5.92, E["sparkle"], -7), (5.86, E["gasp"], -12), (6.15, E["zoom"], -14), (7.6, E["zoom"], -11),   # the cloth comes off
    (9.36, E["whoosh"], -9), (10.10, E["xray"], -6),                            # here's the trick
    (12.78, E["zoom"], -13), (14.45, E["zoom"], -14), (12.97, E["pop"], -10), (14.43, E["pop"], -10),                              # SOFT CLAY / STEEL FRAME
    (14.95, E["whoosh"], -9),
    (16.12, E["punch"], -2), (16.28, E["wobble"], -6), (16.42, E["zoom"], -12), (18.5, E["zoom"], -13), (20.0, E["zoom"], -13),                           # face caves in, he keeps standing
    (20.76, E["whoosh"], -9), (22.05, E["zoom"], -12), (23.18, E["thud"], -5),   # on your shelf
    (23.85, E["zoom"], -12), (23.95, E["ring"], -6), (24.40, E["pickup"], -7),     # tomorrow: the phone rings
    (24.75, fade(phone(E["yell"][:int(2.3 * SR)]), .005, .3), -4),                                                 # boss yells down the line (gibberish)
    (27.25, E["pop"], -11), (27.55, E["zoom"], -8),                                # "okay" -> zoom in
    (28.18, E["sparkle"], -9), (28.25, E["cock"], -3),                             # the rifle
]
mix = np.zeros(int(DUR * SR) + SR)
for t, x, gdb in L:
    x = fade(np.asarray(x, np.float64)) * 10 ** (gdb / 20); i = int((t + OFF) * SR); mix[i:i + len(x)] += x[:len(mix) - i]
mix = mix[:int(DUR * SR)]; mix = np.tanh(mix * 1.05) / np.tanh(1.05); mix = mix / max(1.0, np.abs(mix).max()) * .97
st = (np.stack([mix, mix], 1) * 32767).astype(np.int16)
w = wave.open(sys.argv[1], "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close(); print("sfx ->", sys.argv[1])
