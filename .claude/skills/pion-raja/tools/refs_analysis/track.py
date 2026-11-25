import cv2, numpy as np, sys, json
path, out = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(path); fps = cap.get(cv2.CAP_PROP_FPS)
orb = cv2.ORB_create(1500); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
prev = None; rows = []
while True:
    ok, fr = cap.read()
    if not ok: break
    g = cv2.cvtColor(cv2.resize(fr, (360, 640), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
    kp, de = orb.detectAndCompute(g, None)
    r = dict(s=1.0, a=0.0, tx=0.0, ty=0.0, inl=0, diff=0.0, sharp=float(cv2.Laplacian(g, cv2.CV_64F).var()))
    if prev is not None:
        r['diff'] = float(np.mean(cv2.absdiff(g, prev[0])))
        if de is not None and prev[2] is not None and len(kp) > 20:
            m = bf.match(prev[2], de)
            if len(m) > 20:
                A = np.float32([prev[1][x.queryIdx].pt for x in m]); B = np.float32([kp[x.trainIdx].pt for x in m])
                M, inl = cv2.estimateAffinePartial2D(A, B, method=cv2.RANSAC, ransacReprojThreshold=2.0)
                if M is not None:
                    s = float(np.hypot(M[0, 0], M[1, 0])); r.update(s=s, a=float(np.degrees(np.arctan2(M[1, 0], M[0, 0]))), tx=float(M[0, 2]), ty=float(M[1, 2]), inl=int(inl.sum()))
    rows.append(r); prev = (g, kp, de)
json.dump(dict(fps=fps, rows=rows), open(out, 'w'))
print(path.split('/')[-1], len(rows))
