"""Track anchor points on surfaces (LK features in a window around the point, local similarity via RANSAC).
Each job: name: (f_ref, f_start, f_end, x, y, R, maskside) -- point given in frame f_ref, tracked backward to f_start
and forward to f_end. maskside: ignore features left ('L') / right ('R') of the point (hands, moving objects)."""
import cv2, numpy as np, json, sys
JOBS = {
  'A': (20, 0, 41, 470, 1050, 110, None),
  'B': (60, 42, 77, 580, 1000, 110, None),
  'C': (95, 78, 117, 560, 950, 110, None),
  'D': (230, 213, 254, 640, 1080, 100, None),
  'E': (280, 255, 310, 650, 1000, 100, None),
  'F': (335, 311, 363, 600, 1250, 110, None),
  'G': (440, 429, 474, 560, 1050, 110, None),
  'H': (500, 475, 531, 650, 1250, 110, None),
  'I': (560, 532, 586, 560, 1200, 110, None),
  'J': (600, 587, 630, 420, 980, 90, None),
  'K': (660, 631, 683, 420, 1250, 100, None),
}
cap = cv2.VideoCapture('src/input.mp4'); G = []
while True:
    ok, f = cap.read()
    if not ok: break
    G.append(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY))
def step(fa, fb, pt, R, side):
    m = np.zeros_like(G[fa]); cv2.circle(m, (int(pt[0]), int(pt[1])), int(R), 255, -1)
    m[:276] = 0; m[1650:] = 0; m[1340:1480, 250:830] = 0  # black bars + caption zone
    if side == 'L': m[:, :max(0, int(pt[0] - 50))] = 0
    if side == 'R': m[:, int(pt[0] + 50):] = 0
    p0 = cv2.goodFeaturesToTrack(G[fa], 300, .004, 4, mask=m)
    if p0 is None or len(p0) < 6: return None
    p1, st, _ = cv2.calcOpticalFlowPyrLK(G[fa], G[fb], p0, None, winSize=(25, 25), maxLevel=4)
    pb, st2, _ = cv2.calcOpticalFlowPyrLK(G[fb], G[fa], p1, None, winSize=(25, 25), maxLevel=4)
    ok = (st.ravel() == 1) & (st2.ravel() == 1) & (np.linalg.norm((pb - p0).reshape(-1, 2), axis=1) < 1.5)
    if ok.sum() < 5: return None
    M, inl = cv2.estimateAffinePartial2D(p0[ok], p1[ok], method=cv2.RANSAC, ransacReprojThreshold=2.0)
    return M
res = {}
for name, (fr, fs, fe, x, y, R, side) in JOBS.items():
    out = {fr: [float(x), float(y), 1.0, 0.0]}
    for d, rng_ in ((1, range(fr, fe)), (-1, range(fr, fs, -1))):
        pt = np.array([x, y], float); sc = 1.0; ang = 0.0
        for f in rng_:
            M = step(f, f + d, pt, R * sc, side)
            if M is not None:
                pt = M @ np.array([pt[0], pt[1], 1.0]); sc *= float(np.sqrt(abs(np.linalg.det(M[:2, :2])))); ang += float(np.arctan2(M[1, 0], M[0, 0]))
            else: print('  lost', name, f)
            out[f + d] = [float(pt[0]), float(pt[1]), sc, ang]
    res[name] = {int(k): v for k, v in sorted(out.items())}
    ks = sorted(out); print(name, ' '.join(f'{k}:({out[k][0]:.0f},{out[k][1]:.0f},{out[k][2]:.2f})' for k in ks[::max(1, len(ks) // 8)]))
json.dump(res, open('anchors.json', 'w'))
