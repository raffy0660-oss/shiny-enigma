"""Post pass on the rendered frames (out/film -> out/film_post), from the study of the user's detective references:
 1. low-key mysterious grade (user: "not bright - it's a detective story, keep the tension"): teal shadows, warm highlights, S-curve,
    a little less saturation, deep vignette, film grain - the subject stays lit by the scene's own spots
 4. iris spotlight on the tension beats (the frame closes in around the subject) and radial concentration lines on the shock beats
 2. smash zooms: a fast punch-in (0.14 s ease-out) on the key word, held until the next shot
 3. the CCTV footage shot (32.4-35.0) as a POV with a HUD: REC dot, camera name, running timestamp, scanlines, noise, vignette
Shot changes get zoom-blur flashes in the Remotion overlay (cuts), clues get red rings + labels there."""
import os, sys, glob, numpy as np
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont
P = os.path.expanduser("~/pion/proj13"); SRC, DST = f"{P}/out/film", f"{P}/out/film_post"; FPS = 60; W, H = 1080, 1920
os.makedirs(DST, exist_ok=True)
BOUND = [0, 5.6, 7.9, 10.8, 12.4, 14.1, 14.95, 15.75, 19.75, 22.7, 24.4, 28.4, 30.5, 32.4, 35.0, 38.25, 39.05, 43.9, 46.0, 49.25, 54.25, 57.5, 59.45, 62.35, 65.55, 67.6, 73.1]
ZOOM = [(7.14, 0.12), (17.10, 0.10), (22.92, 0.14), (29.28, 0.10), (37.04, 0.08), (42.70, 0.10), (46.38, 0.12), (52.24, 0.10), (56.76, 0.10), (64.44, 0.14), (66.70, 0.10), (71.40, 0.10)]
BW = (24.4, 28.4); CCTV = (32.4, 35.0)
def shot_end(t): return next(b for b in BOUND if b > t + 1e-6)
def zoom_at(t):
    z = 1.0
    for t0, a in ZOOM:
        if t0 <= t < shot_end(t0): k = min(1.0, (t - t0) / 0.14); z = max(z, 1 + a * (1 - (1 - k) ** 3))
    return z
def font(sz):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"):
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()
F1, F2 = font(46), font(38)
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = 1 - 0.55 * np.clip(((XX - W / 2) / (W * 0.62)) ** 2 + ((YY - H * 0.47) / (H * 0.6)) ** 2 - 0.25, 0, 1)
IRIS = [(44.28, 45.65, 0.5, 0.42), (64.0, 65.4, 0.5, 0.38), (71.38, 73.1, 0.5, 0.42)]        # t0, t1, centre x, y (the subject)
LINES = [14.96, 37.1, 47.2, 56.2, 71.4]                                                       # shock beats
def grade(a, t):
    x = a.astype(np.float32) / 255.0
    lum = lambda v: (v * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(-1, keepdims=True)
    x = np.power(np.clip(x, 0, 1), 1.06)                                              # mids a touch lower
    x = x + (x - x * x) * (x - 0.5) * 0.9                                             # S-curve (contrast)
    l = lum(x)
    if not (BW[0] <= t < BW[1] or CCTV[0] <= t < CCTV[1]):
        x = l + (x - l) * 0.9                                                         # a little less colour...
        x = x + np.array([-0.012, 0.018, 0.034], np.float32) * (1 - l) ** 2.2 + np.array([0.03, 0.012, -0.02], np.float32) * l ** 2   # teal shadows, warm highlights
    x = x * VIG[..., None]
    for t0, t1, cx, cy in IRIS:                                                       # iris: the dark closes in on the subject
        if t0 <= t < t1:
            k = min(1, (t - t0) / 0.35) * min(1, (t1 - t) / 0.2); r = (0.62 - 0.22 * k) * W
            d = np.sqrt((XX - cx * W) ** 2 + ((YY - cy * H) * 0.8) ** 2); x = x * (1 - 0.82 * k * np.clip((d - r) / (W * 0.18), 0, 1))[..., None]
    rng = np.random.default_rng(int(t * 997)); x = x + rng.normal(0, 0.018, x.shape[:2]).astype(np.float32)[..., None]   # grain
    return (np.clip(x, 0, 1) * 255).astype(np.uint8)
ANG = np.arctan2(YY - H * 0.45, XX - W / 2); RAD = np.sqrt((XX - W / 2) ** 2 + (YY - H * 0.45) ** 2)
SEEDS = np.random.default_rng(3).random(160)
def lines(im, t):   # radial concentration lines (manga), 0.45 s after a shock beat
    for t0 in LINES:
        e = t - t0
        if 0 <= e < 0.45:
            k = (1 - e / 0.45) ** 1.5; a = np.asarray(im).astype(np.float32)
            idx = ((ANG + np.pi) / (2 * np.pi) * 160).astype(int) % 160; on = (SEEDS[idx] > 0.62) & (np.abs(((ANG + np.pi) / (2 * np.pi) * 160) % 1 - 0.5) < 0.18)
            m = on & (RAD > W * (0.34 + 0.08 * np.sin(idx * 1.7 + e * 30)))
            a[m] = a[m] * (1 - 0.75 * k) + 255 * 0.75 * k; return Image.fromarray(a.clip(0, 255).astype(np.uint8))
    return im
def hud(im, t):
    a = np.asarray(im).astype(np.float32); rng = np.random.default_rng(int(t * 1000))
    a += rng.normal(0, 9, a.shape[:2])[..., None]; a[::4] *= 0.86                     # sensor noise + scanlines
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    s = 5 * 3600 + 2 * 60 + 12 + 60 + (t - CCTV[0]); hh, mm, ss = 2, 5 + int((s - 7332) // 60) if False else 5, 0
    sec = 41 + int(t - CCTV[0]); stamp = f"02:05:{sec:02d}"
    if int(t * 2) % 2 == 0: d.ellipse([70, 120, 110, 160], fill=(235, 40, 40))
    d.text((126, 116), "REC", font=F1, fill=(240, 240, 240)); d.text((70, 186), "CAM 01  GALLERY", font=F2, fill=(225, 225, 225))
    d.text((W - 70, 120), stamp, font=F1, fill=(240, 240, 240), anchor="ra"); d.text((W - 70, 186), "NOV 14", font=F2, fill=(210, 210, 210), anchor="ra")
    for (x0, y0, dx, dy) in ((50, 90, 1, 1), (W - 50, 90, -1, 1), (50, H - 90, 1, -1), (W - 50, H - 90, -1, -1)):   # viewfinder corners
        d.line([(x0, y0), (x0 + 90 * dx, y0)], fill=(230, 230, 230), width=6); d.line([(x0, y0), (x0, y0 + 90 * dy)], fill=(230, 230, 230), width=6)
    return im
def work(f):
    t = f / FPS; src = f"{SRC}/{f:05d}.jpg"
    if not os.path.exists(src): return f
    im = Image.open(src).convert("RGB"); z = zoom_at(t)
    if z > 1.0005: cw, ch = W / z, H / z; im = im.crop(((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2)).resize((W, H), Image.BICUBIC)
    im = Image.fromarray(grade(np.asarray(im), t))
    if CCTV[0] <= t < CCTV[1]: im = hud(im, t)
    im = lines(im, t)
    im.save(f"{DST}/{f:05d}.jpg", quality=93); return None
if __name__ == "__main__":
    n = len(glob.glob(f"{SRC}/*.jpg"))
    with Pool(4) as p: miss = [m for m in p.map(work, range(n), chunksize=40) if m is not None]
    print("post frames:", n, "missing:", miss[:5])
