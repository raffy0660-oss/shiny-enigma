import json, numpy as np, sys
for i in range(1, 15):
    V = json.load(open(f"vis_v{i:02d}.json")); S = json.load(open(f"stt_v{i:02d}.json"))
    t = np.array([r["t"] for r in V]); L = np.array([r["L"] for r in V]); cen = np.array([r["cen"] for r in V]); vig = np.array([r["vig"] for r in V]); warm = np.array([r["warm"] for r in V]); Sa = np.array([r["S"] for r in V]); C = np.array([r["C"] for r in V])
    words = [(w[0], w[2].strip()) for s in S for w in s["w"]]
    def at(a, b): return " ".join(w for wt, w in words if a <= wt < b)
    hk = t < 3; body = t >= 3
    # 1-second smoothed
    k = 30; sm = lambda x: np.convolve(np.pad(x, (k // 2, k - 1 - k // 2), mode="edge"), np.ones(k) / k, "valid")
    Ls, Ws = sm(L), sm(warm)
    dL = Ls[k:] - Ls[:-k]; big = []
    for j in np.argsort(-np.abs(dL)):
        if all(abs(t[j] - b) > 3 for b, _ in big): big.append((t[j], dL[j]))
        if len(big) >= 4: break
    dark = t[np.argmin(Ls[k:-k]) + k]
    print(f"v{i:02d} hook L {L[hk].mean():.2f} cen/L {np.mean(cen[hk]/L[hk]):.2f} vig {vig[hk].mean():.2f} warm {warm[hk].mean():+.2f} sat {Sa[hk].mean():.2f} | body L {L[body].mean():.2f} cen/L {np.mean(cen[body]/L[body]):.2f} vig {vig[body].mean():.2f} warm {warm[body].mean():+.2f} sat {Sa[body].mean():.2f} C {C.mean():.2f}")
    print(f"     darkest @{dark:.1f}s [{at(dark-1.5, dark+1.5)}]")
    for tb, d in sorted(big): print(f"     light {'UP  ' if d>0 else 'DOWN'} {d:+.2f} @{tb:.1f}->{tb+1:.1f}s [{at(tb-.5, tb+1.5)}]")
