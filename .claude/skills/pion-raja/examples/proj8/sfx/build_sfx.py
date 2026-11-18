"""proj8 SFX timeline (local seconds): python3 build_sfx.py sfx_only.wav --dur 5.4"""
import os, sys, wave
import numpy as np
SR = 48000; HERE = os.path.dirname(os.path.abspath(__file__))
def load(n):
    w = wave.open(os.path.join(HERE, n + ".wav")); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return x.reshape(-1, w.getnchannels()).mean(1)
def fade(x, a=.005, b=.06):
    n = len(x); e = np.ones(n); na, nb = int(a * SR), int(b * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nb: e[-nb:] *= np.linspace(1, 0, nb)
    return x * e
def seg(x, d): n = int(d * SR); return np.tile(x, n // len(x) + 1)[:n]
out = sys.argv[1]; dur = float(sys.argv[sys.argv.index("--dur") + 1]) if "--dur" in sys.argv else 5.4
E = {k: load(k) for k in ["plaza_amb", "whoosh", "gasp", "pop", "measure", "counter"]}
amb = seg(E["plaza_amb"], dur); env = np.interp(np.arange(len(amb)) / SR, [0, 1.3, 2.0, dur], [0.45, 0.45, 1.0, 1.0])   # muffled in the close-up, opens up on the reveal
L = [
    (0.0, fade(amb * env, .25, .2), -15),
    (1.30, E["whoosh"], -4),        # camera pulls back
    (1.38, E["gasp"], -9),          # Pion: "kecil"
    (2.00, E["pop"], -5),           # "!" badge slams in
    (2.61, E["measure"], -8), (2.65, E["counter"], -11),   # 77 CM
    (3.70, E["measure"], -8), (3.74, E["counter"], -11),   # 53 CM
]
mix = np.zeros(int(dur * SR) + SR)
for t, x, gdb in L:
    x = fade(np.asarray(x, np.float64)) * 10 ** (gdb / 20); i = int(t * SR); mix[i:i + len(x)] += x[:len(mix) - i]
mix = mix[:int(dur * SR)]; mix = np.tanh(mix * 1.05) / np.tanh(1.05); mix = mix / max(1.0, np.abs(mix).max()) * .97
st = (np.stack([mix, mix], 1) * 32767).astype(np.int16)
w = wave.open(out, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close(); print("sfx ->", out)
