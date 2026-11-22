# find cartoon heads (round, bright interior, thick dark outline) at 1 frame/s and measure how light hits them
import cv2, numpy as np, json, sys
out = []
for i in range(1, 15):
    cap = cv2.VideoCapture(f"/root/pion/refs/v/v{i:02d}.mp4"); fps = cap.get(cv2.CAP_PROP_FPS); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    for f in range(int(fps * .5), n, int(fps)):
        cap.set(cv2.CAP_PROP_POS_FRAMES, f); ok, fr = cap.read()
        if not ok: continue
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY); gb = cv2.medianBlur(g, 5)
        cs = cv2.HoughCircles(gb, cv2.HOUGH_GRADIENT, dp=1.5, minDist=60, param1=120, param2=60, minRadius=35, maxRadius=260)
        if cs is None: continue
        for (x, y, r) in np.round(cs[0][:4]).astype(int):
            if x - r < 0 or y - r < 0 or x + r >= fr.shape[1] or y + r >= fr.shape[0]: continue
            yy, xx = np.mgrid[-r:r + 1, -r:r + 1]; d = np.hypot(xx, yy) / r
            patch = fr[y - r:y + r + 1, x - r:x + r + 1].astype(np.float32) / 255; L = patch.mean(2)
            inner = d < .8; ring = (d > .93) & (d < 1.07)
            if L[ring].mean() > .35 or L[inner].mean() < .35: continue          # needs a dark outline and a light face
            if np.percentile(L[inner], 90) - np.percentile(L[inner], 10) > .45: continue  # too busy -> not a plain face
            out.append(dict(v=i, f=f, t=round(f / fps, 2), x=int(x), y=int(y), r=int(r)))
    print("v", i, len([o for o in out if o["v"] == i]), flush=True)
json.dump(out, open("/root/pion/refs/an/heads.json", "w"))
