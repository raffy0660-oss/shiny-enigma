import cv2, numpy as np, json, sys
FPS = 10
def analyse(i):
    p = f"/root/pion/refs/v/v{i:02d}.mp4"; cap = cv2.VideoCapture(p); src = cap.get(cv2.CAP_PROP_FPS); step = 1
    orb = cv2.ORB_create(800); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    rows = []; prev = None; prevH = None; k = 0; fi = 0
    while True:
        ok, fr = cap.read()
        if not ok: break
        if fi % step: fi += 1; continue
        t = fi / src; fi += 1
        sm = cv2.resize(fr, (180, 320), interpolation=cv2.INTER_AREA); g = cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        hsv = cv2.cvtColor(sm, cv2.COLOR_BGR2HSV); b, gg, r = [sm[..., c].astype(np.float32) / 255 for c in range(3)]
        h, w = g.shape; cy, cx = np.mgrid[0:h, 0:w]; d = np.hypot((cx - w / 2) / (w / 2), (cy - h / 2) / (h / 2))
        centre = g[d < .45].mean(); edge = g[d > 1.0].mean()
        hist = cv2.calcHist([hsv], [0, 1], None, [16, 8], [0, 180, 0, 256]); hist = cv2.normalize(hist, None).flatten()
        cut = 0.0 if prevH is None else float(cv2.compareHist(prevH, hist, cv2.HISTCMP_BHATTACHARYYA))
        # brightest blob (where the "spotlight" is)
        bl = cv2.GaussianBlur(g, (0, 0), 12); yx = np.unravel_index(np.argmax(bl), bl.shape)
        rec = dict(t=round(t, 2), L=round(float(g.mean()), 4), C=round(float(g.std()), 4), p5=round(float(np.percentile(g, 5)), 3), p95=round(float(np.percentile(g, 95)), 3),
                   S=round(float(hsv[..., 1].mean() / 255), 4), warm=round(float((r - b).mean()), 4), vig=round(float(edge / max(centre, 1e-3)), 3), cen=round(float(centre), 3),
                   hot=[round(yx[1] / w, 2), round(yx[0] / h, 2)], cut=round(cut, 3))
        # camera motion vs previous sample
        big = cv2.resize(cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY), (360, 640))
        if prev is not None and cut < .45:
            k1, d1 = orb.detectAndCompute(prev, None); k2, d2 = orb.detectAndCompute(big, None)
            if d1 is not None and d2 is not None and len(k1) > 20 and len(k2) > 20:
                m = bf.match(d1, d2)
                if len(m) > 20:
                    a = np.float32([k1[x.queryIdx].pt for x in m]); bb = np.float32([k2[x.trainIdx].pt for x in m])
                    M, inl = cv2.estimateAffinePartial2D(a, bb, method=cv2.RANSAC, ransacReprojThreshold=2.5)
                    if M is not None and inl.sum() > 15:
                        s = float(np.hypot(M[0, 0], M[1, 0])); rot = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
                        rec.update(zs=round(s, 4), tx=round(float(M[0, 2] + (s - 1) * 180) / 360, 4), ty=round(float(M[1, 2] + (s - 1) * 320) / 640, 4), rot=round(rot, 3), inl=int(inl.sum()))
        prev = big; prevH = hist; rows.append(rec)
    json.dump(rows, open(f"/root/pion/refs/an/vis_v{i:02d}.json", "w")); print("vis", i, len(rows), flush=True)
for i in map(int, sys.argv[1:]): analyse(i)
