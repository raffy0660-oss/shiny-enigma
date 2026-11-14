"""Remove tracking jitter so the pion stops trembling, without making it slide off the surface.

   python3 smooth_track.py anchors.json            # proj2/proj4 style  {name: {frame: [x, y, scale, angle]}}
   python3 smooth_track.py track.json              # proj1 style        {shots: [{f0, f1, A: [[a, b, tx, c, d, ty], ...]}]}
   options: --out other.json (default: overwrite, raw copy kept as *_raw.json)  --strength 1.0  --report

How: per frame, a weighted local quadratic fit (zero phase: no lag, curves and accelerations are kept).
The window adapts to speed: slow / standing anchors get a wide window (jitter is most visible there), fast moves
a narrow one (so whip pans and real shakes are followed). A robust second pass ignores single-frame spikes.
Jumps bigger than --cut px (scene cut / lost track re-found) split the curve, so nothing is smeared across them.
Scale is smoothed in log space and harder than position: a pion that pulses in size looks fake at once."""
import json, sys, os, math
import numpy as np

def arg(k, d):
    a = sys.argv
    return a[a.index('--' + k) + 1] if '--' + k in a else d

def local_quad(y, sig, robust=True, near=None, floor=.5):
    """y: (n,) samples; sig: (n,) gaussian sigma (frames) per output frame.
    near(i, a, b) -> extra weights for samples a..b-1 seen from frame i (bilateral term), or None."""
    n = len(y); out = y.astype(float).copy()
    if n < 4: return out
    w_rob = np.ones(n)
    for it in range(2 if robust else 1):
        for i in range(n):
            s = max(.5, sig[i]); r = int(math.ceil(2.5 * s)); a, b = max(0, i - r), min(n, i + r + 1)
            x = np.arange(a, b) - i; w = np.exp(-.5 * (x / s) ** 2) * w_rob[a:b]
            if near is not None: w = w * near(i, a, b)
            w[x == 0] = max(w[x == 0].max(initial=0), 1e-3)                # the frame itself always counts
            m = w > 1e-4
            if m.sum() < 3: continue
            xm, wm = x[m], w[m]
            X = np.stack([np.ones_like(xm), xm, xm * xm], 1).astype(float)
            if m.sum() < 5 or xm.min() == 0 or xm.max() == 0: X = X[:, :2]  # too few / one-sided samples: local line
            WX = X * wm[:, None]
            try: beta = np.linalg.solve(X.T @ WX + 1e-9 * np.eye(X.shape[1]), WX.T @ y[a:b][m])
            except np.linalg.LinAlgError: continue
            out[i] = beta[0]
        if robust:  # Tukey biweight on the residuals: one-frame spikes get ~zero weight in the second pass
            res = np.abs(y - out); mad = max(np.median(res) * 1.4826, floor); u = res / (6 * mad)  # floor = expected noise, so clean data is never thrown away
            w_rob = np.where(u < 1, (1 - u * u) ** 2, 0.0)
    return out

def segments(P, cut):
    d = np.linalg.norm(np.diff(P[:, :2], axis=0), axis=1) if len(P) > 1 else np.zeros(0)
    edges = [0] + [i + 1 for i, v in enumerate(d) if v > cut] + [len(P)]
    return [(edges[k], edges[k + 1]) for k in range(len(edges) - 1)]

def smooth_track(P, strength=1.0, cut=60.0, pos_cols=(0, 1), log_cols=(2,), ang_cols=(3,)):
    """P: (n, k) per-frame samples of one anchor. Returns smoothed copy."""
    P = np.asarray(P, float); Q = P.copy()
    for a, b in segments(P, cut):
        S = P[a:b].copy(); n = len(S)
        for i in range(1, n - 1):  # one-frame tracking spike: both neighbours agree, this frame jumps away from them
            pc = list(pos_cols); mid = (S[i - 1, pc] + S[i + 1, pc]) / 2; dev = np.linalg.norm(S[i, pc] - mid)
            if dev > 4 and dev > np.linalg.norm(S[i + 1, pc] - S[i - 1, pc]): S[i] = (S[i - 1] + S[i + 1]) / 2
        if n < 4: continue
        sp = np.zeros(n)
        if n > 1:
            v = np.linalg.norm(np.diff(S[:, list(pos_cols)], axis=0), axis=1); sp[1:] += v; sp[:-1] += v; sp[1:-1] /= 2
        sp = np.convolve(sp, np.ones(5) / 5, mode='same')               # speed, px / frame
        sig = strength * np.clip(4.0 / (1 + sp / 4.0), .8, 4.0)        # still: sigma 4 frames, 12 px/frame: sigma 1
        XY = S[:, list(pos_cols)]
        # bilateral term: samples far (in px) from this frame's own position barely count. A still anchor right before
        # a sudden move, or a frozen (duplicated) video frame inside a move, then keeps its true position instead of
        # sliding toward the neighbours. Jitter (1-2 px) stays well inside the 6 px tolerance and is averaged out.
        near = lambda i, a_, b_: np.exp(-.5 * (np.linalg.norm(XY[a_:b_] - XY[i], axis=1) / (6.0 * strength)) ** 2)
        for c in pos_cols: Q[a:b, c] = local_quad(S[:, c], sig, near=near)
        for c in log_cols:
            if c < S.shape[1]: Q[a:b, c] = np.exp(local_quad(np.log(np.maximum(S[:, c], 1e-6)), sig * 1.6, near=near, floor=.004))
        for c in ang_cols:
            if c < S.shape[1]: Q[a:b, c] = local_quad(np.unwrap(S[:, c]), sig * 1.6, near=near, floor=.004)
    return Q

def jitter(P):
    P = np.asarray(P, float)
    if len(P) < 3: return 0.0
    acc = np.diff(P[:, :2], 2, axis=0); return float(np.sqrt((acc ** 2).sum(1).mean()))

if __name__ == '__main__':
    src = sys.argv[1]; out = arg('out', src); strength = float(arg('strength', 1.0)); cut = float(arg('cut', 60))
    D = json.load(open(src))
    if out == src: json.dump(D, open(os.path.splitext(src)[0] + '_raw.json', 'w'))
    if 'shots' in D:   # similarity matrices per frame: smooth each parameter (tx, ty in px; a, b, c, d as scale/rotation)
        for sh in D['shots']:
            A = np.asarray(sh['A'], float)
            if len(A) < 4: continue
            P = np.stack([A[:, 2], A[:, 5], A[:, 0], A[:, 1], A[:, 3], A[:, 4]], 1)
            Q = smooth_track(P, strength, cut, pos_cols=(0, 1), log_cols=(), ang_cols=(2, 3, 4, 5))
            print(f"shot {sh.get('f0')}-{sh.get('f1')}: jitter {jitter(P):.2f} -> {jitter(Q):.2f} px, max shift {np.abs(Q[:, :2] - P[:, :2]).max():.2f} px")
            sh['A'] = [[q[2], q[3], q[0], q[4], q[5], q[1]] for q in Q]
    else:
        for name, d in D.items():
            fs = sorted(d, key=int); P = np.array([d[f] for f in fs], float)
            Q = smooth_track(P, strength, cut)
            print(f"{name}: jitter {jitter(P):.2f} -> {jitter(Q):.2f} px, scale wobble {np.diff(P[:, 2], 2).std():.4f} -> {np.diff(Q[:, 2], 2).std():.4f}, max shift {np.abs(Q[:, :2] - P[:, :2]).max():.2f} px")
            D[name] = {str(f): [float(v) for v in q] for f, q in zip(fs, Q)}
    json.dump(D, open(out, 'w')); print('->', out)
