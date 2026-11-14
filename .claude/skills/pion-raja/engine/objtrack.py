"""Track a point on a moving object (LK features in a small window, local similarity)."""
import os, cv2, numpy as np, json
V = os.environ.get('VIDEO', 'src/input.mp4')  # set VIDEO=path/to/video.mp4
JOBS = {  # name: (f_from, f_to, x, y, radius)   point given in frame f_from
    'shoulder': (0, 36, 215, 760, 120),
    'stack': (124, 179, 520, 830, 120),
    'apex': (205, 227, 525, 1050, 90),
    'dome': (467, 493, 547, 800, 130),
}
cap = cv2.VideoCapture(V); G = []
while True:
    ok, f = cap.read()
    if not ok: break
    G.append(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY))
res = {}
for name, (a, b, x, y, R) in JOBS.items():
    pt = np.array([x, y], float); sc = 1.0; ang = 0.0; out = {a: [x, y, 1.0, 0.0]}
    for f in range(a, b):
        m = np.zeros_like(G[f]); cv2.circle(m, (int(pt[0]), int(pt[1])), int(R * sc), 255, -1)
        m[1285:1485, 140:940] = 0
        p0 = cv2.goodFeaturesToTrack(G[f], 200, .005, 4, mask=m)
        M = None
        if p0 is not None and len(p0) > 6:
            p1, st, _ = cv2.calcOpticalFlowPyrLK(G[f], G[f + 1], p0, None, winSize=(25, 25), maxLevel=4)
            pb, st2, _ = cv2.calcOpticalFlowPyrLK(G[f + 1], G[f], p1, None, winSize=(25, 25), maxLevel=4)
            ok = (st.ravel() == 1) & (st2.ravel() == 1) & (np.linalg.norm((pb - p0).reshape(-1, 2), axis=1) < 1.5)
            if ok.sum() > 5: M, _ = cv2.estimateAffinePartial2D(p0[ok], p1[ok], method=cv2.RANSAC, ransacReprojThreshold=2.0)
        if M is not None:
            pt = M @ np.array([pt[0], pt[1], 1.0]); sc *= float(np.sqrt(abs(np.linalg.det(M[:2, :2])))); ang += float(np.arctan2(M[1, 0], M[0, 0]))
        out[f + 1] = [float(pt[0]), float(pt[1]), sc, ang]
    res[name] = out
    print(name, {k: [round(v[0]), round(v[1]), round(v[2], 2), round(np.degrees(v[3]), 1)] for k, v in list(out.items())[::3]})
json.dump(res, open('objtrack.json', 'w'))
