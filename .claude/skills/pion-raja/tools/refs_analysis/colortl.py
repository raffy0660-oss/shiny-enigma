import cv2, numpy as np, sys, json
path, out = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(path); fps = cap.get(5); R = []
while True:
    ok, fr = cap.read()
    if not ok: break
    f = cv2.resize(fr, (180, 320), interpolation=cv2.INTER_AREA).astype(np.float32)
    b, g, r = f[..., 0], f[..., 1], f[..., 2]; y = 0.114 * b + 0.587 * g + 0.299 * r
    hsv = cv2.cvtColor(f.astype(np.uint8), cv2.COLOR_BGR2HSV)
    c = y[100:220, 45:135].mean(); cor = np.mean([y[:50, :30].mean(), y[:50, -30:].mean(), y[-50:, :30].mean(), y[-50:, -30:].mean()])
    lap = cv2.Laplacian(cv2.resize(fr, (360, 640)).astype(np.uint8)[..., 1], cv2.CV_64F)
    R.append(dict(l=float(y.mean()), warm=float((r - b).mean()), sat=float(hsv[..., 1].mean()), vig=float(cor / max(c, 1)),
                  sc=float(lap[200:440, 90:270].var()), st=float(lap[0:120].var()), p98=float(np.percentile(y, 98)), p2=float(np.percentile(y, 2))))
json.dump(dict(fps=fps, rows=R), open(out, 'w')); print('ok', path.split('/')[-1])
