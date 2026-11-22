import json, sys, numpy as np, os
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
CUT = .38
def load(i):
    V = json.load(open(f"/root/pion/refs/an/vis_v{i:02d}.json")); S = json.load(open(f"/root/pion/refs/an/stt_v{i:02d}.json")) if os.path.exists(f"/root/pion/refs/an/stt_v{i:02d}.json") else []
    return V, S
def shots(V):
    cuts = [0] + [k for k in range(1, len(V)) if V[k]["cut"] > CUT and (k - 1 not in [] )] + [len(V)]
    # merge cuts closer than 3 samples (dissolves/flashes)
    m = [cuts[0]]
    for c in cuts[1:]:
        if c - m[-1] >= 3 or c == len(V): m.append(c)
    return m
def analyse(i, plot=True):
    V, S = load(i); t = np.array([r["t"] for r in V]); dt = np.median(np.diff(t)); cs = shots(V)
    words = [(w[0], w[2].strip()) for s in S for w in s["w"]]
    out = {"v": i, "dur": round(float(t[-1]), 1), "fps": round(1 / dt, 1), "shots": []}
    for a, b in zip(cs[:-1], cs[1:]):
        seg = V[a:b]; t0, t1 = seg[0]["t"], seg[-1]["t"] + dt
        zs = [r.get("zs", 1) for r in seg[1:]]; tx = [r.get("tx", 0) for r in seg[1:]]; ty = [r.get("ty", 0) for r in seg[1:]]; rot = [r.get("rot", 0) for r in seg[1:]]
        cz = float(np.prod(zs)) if zs else 1; px = float(np.sum(tx)); py = float(np.sum(ty)); rr = float(np.sum(rot))
        # shake: high-frequency residual of per-frame translation
        sh = float(np.std(np.array(tx) - np.convolve(tx, np.ones(5) / 5, "same"))) if len(tx) > 6 else 0
        # ease: where in the shot the zoom happens (0 = all at start, 1 = all at end)
        lz = np.log(np.array(zs)) if zs else np.zeros(1); cum = np.cumsum(lz); ease = float(np.argmax(np.abs(cum) >= abs(cum[-1]) * .5) / max(1, len(cum))) if abs(cum[-1]) > 1e-3 else None
        L = np.mean([r["L"] for r in seg]); cen = np.mean([r["cen"] for r in seg]); vig = np.mean([r["vig"] for r in seg]); warm = np.mean([r["warm"] for r in seg]); Sat = np.mean([r["S"] for r in seg]); C = np.mean([r["C"] for r in seg])
        mv = "push-in" if cz > 1.025 else "pull-out" if cz < .975 else ""
        if abs(px) > .06: mv += (" " if mv else "") + ("pan-L" if px > 0 else "pan-R")
        if abs(py) > .06: mv += (" " if mv else "") + ("tilt-up" if py > 0 else "tilt-down")
        if abs(rr) > 2: mv += (" " if mv else "") + "roll"
        if not mv: mv = "static/subtle"
        wd = " ".join(w for (wt, w) in words if t0 <= wt < t1)
        out["shots"].append(dict(t0=round(t0, 2), t1=round(t1, 2), len=round(t1 - t0, 2), zoom=round(cz, 3), pan=[round(px, 3), round(py, 3)], roll=round(rr, 1), shake=round(sh, 4), ease=None if ease is None else round(ease, 2), move=mv,
                                 L=round(L, 3), cen=round(cen, 3), vig=round(vig, 3), warm=round(warm, 3), S=round(Sat, 3), C=round(C, 3), words=wd))
    if plot:
        fig, ax = plt.subplots(5, 1, figsize=(16, 11), sharex=True)
        ax[0].plot(t, [r["L"] for r in V], label="luma"); ax[0].plot(t, [r["cen"] for r in V], label="centre"); ax[0].legend(loc="upper right"); ax[0].set_ylabel("light")
        ax[1].plot(t, [r["warm"] for r in V], color="orange", label="warm(R-B)"); ax[1].plot(t, [r["S"] for r in V], color="purple", label="sat"); ax[1].legend(loc="upper right")
        ax[2].plot(t, [r["vig"] for r in V], color="k", label="edge/centre"); ax[2].plot(t, [r["C"] for r in V], color="g", label="contrast"); ax[2].legend(loc="upper right")
        ax[3].plot(t, [np.log(r.get("zs", 1)) * 100 for r in V], label="zoom %/frame"); ax[3].plot(t, [r.get("tx", 0) * 100 for r in V], label="pan x %/frame", alpha=.7); ax[3].legend(loc="upper right"); ax[3].set_ylim(-3, 3)
        for s in out["shots"]:
            for a in ax: a.axvline(s["t0"], color="r", lw=.6, alpha=.5)
        y = 0
        for (wt, w) in words: ax[4].text(wt, (y % 6) / 6, w, fontsize=7); y += 1
        ax[4].set_ylim(0, 1.1); plt.tight_layout(); plt.savefig(f"/root/pion/refs/an/plot_v{i:02d}.png", dpi=70); plt.close()
    json.dump(out, open(f"/root/pion/refs/an/shots_v{i:02d}.json", "w"), indent=0)
    return out
if __name__ == "__main__":
    for i in map(int, sys.argv[1:]):
        o = analyse(i); L = [s["len"] for s in o["shots"]]
        print(f"v{i:02d} dur {o['dur']} fps {o['fps']} shots {len(L)} median {np.median(L):.2f}s mean {np.mean(L):.2f}s  hook(<5s) shots {sum(1 for s in o['shots'] if s['t0'] < 5)}")
