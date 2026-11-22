import json, re, sys, os, numpy as np
def run(i):
    V = json.load(open(f"/root/pion/refs/an/vis_v{i:02d}.json")); S = json.load(open(f"/root/pion/refs/an/stt_v{i:02d}.json"))
    tx = open(f"/root/pion/refs/an/sc_v{i:02d}.txt").read(); sc = np.array([float(x) for x in re.findall(r'scene_score=([\d.]+)', tx)])
    t = np.array([r["t"] for r in V]); n = len(V); fps = 1 / np.median(np.diff(t))
    z = np.array([np.log(r["zs"]) if "zs" in r else np.nan for r in V]); px = np.array([r.get("tx", np.nan) for r in V]); py = np.array([r.get("ty", np.nan) for r in V])
    fail = np.isnan(z); z0 = np.nan_to_num(z); px0 = np.nan_to_num(px); py0 = np.nan_to_num(py)
    m = (np.abs(z0) * 1.0 + np.hypot(px0, py0)) * fps          # screen-fraction per second
    m[fail] = 1.5                                                # tracking lost = motion blur / fast fly
    sm = np.convolve(m, np.ones(5) / 5, "same")
    hard = [k for k in range(1, min(n, len(sc))) if sc[k] > .1]
    words = [(w[0], w[1], w[2].strip()) for s in S for w in s["w"]]
    FAST = .6                                                    # >60% of the frame per second = a transition move
    ev = []; k = 0
    while k < n:
        if sm[k] > FAST:
            a = k
            while k < n and sm[k] > FAST * .6: k += 1
            b = k; seg = slice(a, b)
            ev.append(dict(t0=round(t[a], 2), t1=round(t[min(b, n - 1)], 2), dur=round(t[min(b, n - 1)] - t[a], 2), peak=round(float(sm[seg].max()), 2),
                           zoom=round(float(np.exp(z0[seg].sum())), 2), pan=[round(float(px0[seg].sum()), 2), round(float(py0[seg].sum()), 2)], blur=int(fail[seg].sum()),
                           word=" ".join(w for (a0, a1, w) in words if a0 <= t[a] + .35 and a1 >= t[a] - .1)))
        k += 1
    # holds: slow drift between events
    hold = []; last = 0
    for e in ev + [dict(t0=t[-1], t1=t[-1])]:
        if e["t0"] - last > .3:
            a = np.searchsorted(t, last); b = np.searchsorted(t, e["t0"]); seg = slice(a, b)
            hold.append(dict(t0=round(last, 2), dur=round(e["t0"] - last, 2), drift_zoom_per_s=round(float(z0[seg].sum() / max(.01, e["t0"] - last) * 100), 2), drift_pan_per_s=round(float(np.hypot(px0[seg].sum(), py0[seg].sum()) / max(.01, e["t0"] - last) * 100), 2)))
        last = e["t1"]
    out = dict(v=i, dur=round(float(t[-1]), 1), fps=round(fps, 1), hard_cuts=[round(t[k], 2) for k in hard], events=ev, holds=hold)
    json.dump(out, open(f"/root/pion/refs/an/motion_v{i:02d}.json", "w"), indent=0)
    gaps = np.diff([0] + [e["t0"] for e in ev])
    hd = [h["drift_zoom_per_s"] for h in hold if h["dur"] > .6]
    print(f"v{i:02d} {out['dur']}s fps{out['fps']}: {len(ev)} moves, every {np.median(gaps):.2f}s (median), dur {np.median([e['dur'] for e in ev]):.2f}s, hard cuts {len(hard)}, hold drift zoom {np.median(hd) if hd else 0:+.1f}%/s, "
          f"push {sum(e['zoom']>1.05 for e in ev)} pull {sum(e['zoom']<.95 for e in ev)} pan {sum(abs(e['pan'][0])>.15 for e in ev)} tilt {sum(abs(e['pan'][1])>.15 for e in ev)} blur {sum(e['blur']>0 for e in ev)}")
for i in map(int, sys.argv[1:]): run(i)
