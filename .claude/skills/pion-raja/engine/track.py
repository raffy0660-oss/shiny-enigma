"""Per-shot planar tracking (similarity transform) around the area where the pion stands.
Output: track.json  {shots:[{f0,f1,A:[[a,b,tx,c,d,ty],...]}]}  mapping shot-first-frame coords -> frame coords (full res)."""
import cv2, numpy as np, json, sys
V = sys.argv[1]
OUT = sys.argv[2]
FPS = 30
# (f0, f1 inclusive, track centre in first-frame coords, radius, extra static masks [x0,y0,x1,y1])
SHOTS = [
    (0, 66, (780, 1120), 560, []),
    (67, 123, (820, 1150), 560, []),
    (124, 179, (820, 1080), 560, []),
    (180, 204, (860, 1050), 520, []),
    (205, 227, (800, 1150), 560, []),
    (228, 297, (840, 1080), 560, []),
    (298, 340, (860, 1000), 600, []),
    (341, 384, (480, 950), 520, []),
    (385, 437, (300, 1000), 420, [(0, 1420, 1078, 1650)]),
    (438, 466, (900, 1150), 520, []),
    (467, 493, (900, 1150), 520, []),
    (494, 583, (780, 1150), 560, [(310, 880, 770, 1040)]),
]
S = 0.5  # work at half res
cap = cv2.VideoCapture(V)
frames = []
while True:
    ok, fr = cap.read()
    if not ok: break
    g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
    frames.append(cv2.resize(g, None, fx=S, fy=S, interpolation=cv2.INTER_AREA))
print('frames', len(frames))
h, w = frames[0].shape
res = []
for (f0, f1, c, R, extra) in SHOTS:
    A = np.eye(3)
    As = [A.copy()]
    cen = np.array([c[0], c[1], 1.0])
    bad = 0
    for f in range(f0, f1):
        cc = A @ cen
        mask = np.zeros((h, w), np.uint8)
        cv2.circle(mask, (int(cc[0] * S), int(cc[1] * S)), int(R * S), 255, -1)
        mask[:int(290 * S), :] = 0; mask[int(1640 * S):, :] = 0
        mask[int(1285 * S):int(1485 * S), int(140 * S):int(940 * S)] = 0
        for (x0, y0, x1, y1) in extra: mask[int(y0 * S):int(y1 * S), int(x0 * S):int(x1 * S)] = 0
        p0 = cv2.goodFeaturesToTrack(frames[f], 500, 0.008, 5, mask=mask)
        M = None
        if p0 is not None and len(p0) > 12:
            p1, st, _ = cv2.calcOpticalFlowPyrLK(frames[f], frames[f + 1], p0, None, winSize=(21, 21), maxLevel=4)
            pb, st2, _ = cv2.calcOpticalFlowPyrLK(frames[f + 1], frames[f], p1, None, winSize=(21, 21), maxLevel=4)
            fb = np.linalg.norm((pb - p0).reshape(-1, 2), axis=1)
            good = (st.ravel() == 1) & (st2.ravel() == 1) & (fb < 1.0)
            if good.sum() > 10:
                M, inl = cv2.estimateAffinePartial2D(p0[good], p1[good], method=cv2.RANSAC, ransacReprojThreshold=1.2, maxIters=4000, confidence=0.995)
                if M is not None and inl.sum() < 10: M = None
        if M is None:
            bad += 1; M = np.array([[1, 0, 0], [0, 1, 0]], float)
        M = M.copy(); M[:, 2] /= S
        step = np.vstack([M, [0, 0, 1]])
        A = step @ A
        As.append(A.copy())
    sc = [float(np.sqrt(abs(np.linalg.det(a[:2, :2])))) for a in As]
    print(f'shot {f0}-{f1}: fails={bad} scale {sc[0]:.2f}->{sc[-1]:.2f} min {min(sc):.2f} max {max(sc):.2f}')
    res.append({'f0': f0, 'f1': f1, 'A': [[a[0, 0], a[0, 1], a[0, 2], a[1, 0], a[1, 1], a[1, 2]] for a in As]})
json.dump({'shots': res}, open(OUT, 'w'))
