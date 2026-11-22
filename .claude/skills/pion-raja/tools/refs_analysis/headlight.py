import cv2, numpy as np, json
H = json.load(open("/root/pion/refs/an/heads.json")); res = []
caps = {}
for h in H:
    i = h["v"]; cap = caps.get(i) or caps.setdefault(i, cv2.VideoCapture(f"/root/pion/refs/v/v{i:02d}.mp4"))
    cap.set(cv2.CAP_PROP_POS_FRAMES, h["f"]); ok, fr = cap.read()
    if not ok: continue
    x, y, r = h["x"], h["y"], h["r"]; P = fr[y - r:y + r + 1, x - r:x + r + 1].astype(np.float32)[..., ::-1] / 255
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1] / r; d = np.hypot(xx, yy); L = P @ [.2126, .7152, .0722]
    face = d < .78; ring = (d > .95) & (d < 1.05); rim = (d > .8) & (d < .9)
    # remove eyes/mouth (dark features) from the face sample
    fl = L[face]; keep = fl > np.percentile(fl, 25)
    A = np.c_[np.ones(keep.sum()), xx[face][keep], yy[face][keep]]; coef, *_ = np.linalg.lstsq(A, fl[keep], rcond=None)
    grad = np.hypot(coef[1], coef[2]); ang = np.degrees(np.arctan2(-coef[2], coef[1]))   # direction light comes FROM (screen: 0 = right, 90 = up)
    col = np.median(P[face][keep], 0); frame = fr[..., ::-1].reshape(-1, 3).mean(0) / 255
    hist, _ = np.histogram(fl[keep], bins=24, range=(0, 1)); hs = np.convolve(hist, [1, 2, 1], "same"); peaks = sum(1 for k in range(1, 23) if hs[k] > hs[k - 1] and hs[k] >= hs[k + 1] and hs[k] > .08 * hs.max())
    # rim: rim band on the side away from the light vs face centre
    ux, uy = np.cos(np.radians(ang)), -np.sin(np.radians(ang)); side = (xx * ux + yy * uy)
    rim_dark = L[rim & (side < -.3)].mean() if (rim & (side < -.3)).any() else np.nan; rim_lit = L[rim & (side > .3)].mean() if (rim & (side > .3)).any() else np.nan
    mid_dark = L[face & (side < -.3) & (d < .6)].mean() if (face & (side < -.3) & (d < .6)).any() else np.nan
    spec = float((L[face] > .97).mean())
    res.append(dict(h, faceRGB=[round(float(c), 3) for c in col], frameRGB=[round(float(c), 3) for c in frame], frameL=round(float(frame @ [.2126, .7152, .0722]), 3),
                    shade=round(float(grad), 3), lightdir=round(float(ang)), tones=peaks, rimBack=round(float(rim_dark - mid_dark), 3) if not np.isnan(rim_dark) else None,
                    outline=[round(float(c), 3) for c in np.median(P[ring], 0)], spec=round(spec, 4), faceL=round(float(np.median(fl[keep])), 3)))
json.dump(res, open("/root/pion/refs/an/headlight.json", "w"))
print(len(res))
