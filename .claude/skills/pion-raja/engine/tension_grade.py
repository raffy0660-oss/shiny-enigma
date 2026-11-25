"""tension_grade.py: the post grade that goes with tension.py. Low-key and mysterious, but at the light levels
measured on the references (PANDUAN_KUALITAS.md section 2): lifted navy blacks, highlights that reach ~215+, a
soft vignette, and the light beats / turn words / night of the tension timeline. Plus handheld micro-jitter.

  from tension import load, light_at, cam_at, jitter
  from tension_grade import grade
  P = load("tension.json")
  out = grade(img_rgb_uint8, light_at(P, t), t, jitter_px=cam_at(P, t)["jitter_px"])
"""
import numpy as np
from PIL import Image

_cache = {}
def _vig(h, w, corner):
    k = (h, w, corner)
    if k not in _cache:
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        r2 = ((x - w / 2) / (w / 2)) ** 2 * 0.8 + ((y - h * 0.47) / (h / 2)) ** 2 * 0.6
        _cache[k] = (1 - (1 - corner) * np.clip(r2 / 1.4, 0, 1) ** 1.2)[..., None]   # corner of the frame -> `corner`
    return _cache[k]

def grade(img, L, t, jitter_px=0.0, lift=0.045, gamma=0.88, grain=0.006, seed=0, hi=0.9):
    from tension import jitter
    im = Image.fromarray(img) if isinstance(img, np.ndarray) else img
    w, h = im.size
    if jitter_px:                                        # handheld micro-jitter: sub-pixel shift, 0.6% overscan hides the edge
        dx, dy = jitter(t, jitter_px * w / 1080, seed); s = 1.006
        im = im.transform((w, h), Image.AFFINE, (1 / s, 0, (w - w / s) / 2 - dx / s, 0, 1 / s, (h - h / s) / 2 - dy / s), Image.BICUBIC)
    x = np.asarray(im).astype(np.float32) / 255.0
    x = np.power(np.clip(x, 0, 1), gamma)                # open the mids
    x = x * L["gain"]                                    # light arc + beats + turn words + night
    x = x + (x - x * x) * (x - 0.5) * 0.7                # S-curve: contrast without crushing
    x = x + hi * np.clip(x - 0.4, 0, None) ** 2         # highlight expansion: lamps, windows, faces reach ~215+
    x = lift + x * (1 - lift)                            # lifted blacks (p2 ~12-25, never pure black)
    wv = L["warm"] / 255.0 * 0.5
    x = x + np.array([wv, wv * 0.15, -wv], np.float32)   # warm (+) / cool (-)
    if L.get("night", 0) > 0:                            # night = navy blue, a little less colour, not black
        n = L["night"]; l = (x * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(-1, keepdims=True)
        x = x * (1 - 0.25 * n) + l * 0.25 * n + np.array([-0.01, 0.0, 0.035], np.float32) * n
    x = x * _vig(h, w, L.get("vig", 0.79))
    if grain: x = x + np.random.default_rng(int(t * 1000) + seed).normal(0, grain, x.shape[:2]).astype(np.float32)[..., None]
    return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)
