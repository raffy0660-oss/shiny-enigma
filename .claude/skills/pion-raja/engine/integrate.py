"""Make the rendered Pion sit IN the footage instead of on top of it.

    from integrate import over            # sys.path.insert(0, '../pion_raja') in a project folder
    over(frame_region, rgba_overlay, seed=f)      # in place, both HxW (overlay: HxWx4 uint8, straight alpha)

Three steps, all measured from the footage itself, applied only around the pion (fast at 4K):
  1. soften : the render is razor sharp, phone footage (and a 2x upscale to 4K) is not. A light blur of the
              premultiplied layer matches the footage's sharpness, measured per frame.
  2. wrap   : light wrap. The background colour bleeds a few pixels into the pion's silhouette, the way real
              light wraps around an object. Kills the "sticker" edge.
  3. grain  : the footage's own noise level (estimated per frame) is added to the pion, so both share one texture.
CLI preview:  python3 integrate.py frame.png layer.png out.png   (frame and layer the same size)"""
import numpy as np, cv2

def _sharpness(gray):
    """Footage edge blur (gaussian sigma, px). On the strongest edges only (noise cannot fake those), compare the
    gradient peak before / after an extra 1 px blur: a step blurred by s has peak ~ 1/s, so r = s / sqrt(s^2 + 1)."""
    g = cv2.GaussianBlur(gray.astype(np.float32), (0, 0), .5)
    mag = lambda x: cv2.magnitude(cv2.Sobel(x, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(x, cv2.CV_32F, 0, 1, ksize=3))
    m0 = mag(g); m1 = mag(cv2.GaussianBlur(g, (0, 0), 1.0))
    thr = np.percentile(m0, 99.0)
    if thr < 8: return 1.0                                              # flat region: no edges to judge
    sel = m0 >= thr
    r = float(np.clip(m1[sel].mean() / m0[sel].mean(), .3, .97))
    sig = r / np.sqrt(1 - r * r)
    return float(np.clip(np.sqrt(max(sig * sig - .5 * .5 - .6, 0)), 0, 2.5))  # minus the 0.5 pre-blur and the Sobel's own spread

def _noise(gray):
    """Footage noise sigma (8-bit levels) from the high-pass residual, median-based so edges do not count."""
    g = gray.astype(np.float32)
    hp = g - cv2.GaussianBlur(g, (0, 0), 1.2)
    return float(np.clip(np.median(np.abs(hp)) * 1.4826, 0.0, 12.0))

def over(fr, ov, seed=0, soften=None, wrap=.32, grain=None, scale=None):
    """fr: HxWx3 uint8 (modified in place), ov: HxWx4 uint8 straight alpha. scale: pixels per 1080-wide unit
    (auto from the frame width). soften / grain: None = measured from the footage, a number = forced, 0 = off."""
    a8 = ov[..., 3]
    if not a8.any(): return fr
    H, W = a8.shape; k = scale or W / 1080.0
    ys, xs = np.nonzero(a8)
    m = int(30 * k) + 4
    y0, y1, x0, x1 = max(0, ys.min() - m), min(H, ys.max() + m + 1), max(0, xs.min() - m), min(W, xs.max() + m + 1)
    bg = fr[y0:y1, x0:x1].astype(np.float32); o = ov[y0:y1, x0:x1].astype(np.float32)
    a = o[..., 3:4] / 255.0; rgb = o[..., :3] * a                       # premultiplied
    gray = cv2.cvtColor(fr[y0:y1, x0:x1], cv2.COLOR_RGB2GRAY)
    # 1. soften to the footage's sharpness (the measured blur is in footage pixels at this resolution)
    s = _sharpness(gray) * .85 if soften is None else soften            # 85%: match the footage, keep the cartoon readable
    s = float(np.sqrt(max(s * s - .4 * .4, 0.0)))                      # the render already carries ~0.4 px of antialiasing
    if s > 0.05:
        rgb = cv2.GaussianBlur(rgb, (0, 0), s); a = cv2.GaussianBlur(a, (0, 0), s)[..., None]
    # 2. light wrap: blurred background (pion pixels excluded) bleeds into the silhouette edge
    if wrap > 0:
        r = 9 * k
        inv = 1 - a
        bgb = cv2.GaussianBlur(bg * inv, (0, 0), r) / np.maximum(cv2.GaussianBlur(inv, (0, 0), r)[..., None], 1e-3)
        edge = np.clip(cv2.GaussianBlur(inv, (0, 0), r * .6)[..., None] * 2.0, 0, 1)  # 1 at the silhouette edge, 0 deep inside
        lum = bgb.mean(2, keepdims=True) / 255.0
        w = wrap * edge * (.35 + .65 * lum)                             # bright surroundings wrap more than dark ones
        col = rgb / np.maximum(a, 1e-4)                                 # back to straight colour, mix, premultiply again
        rgb = (col * (1 - w) + bgb * w) * a
    # 3. grain: same noise level and grain size as the footage
    n = _noise(gray) if grain is None else grain
    if n > 0.3:
        rng = np.random.default_rng(seed)
        z = rng.standard_normal(a.shape[:2]).astype(np.float32)
        gs = max(.5, .45 * k)                                           # grain size follows the upscale factor
        z = cv2.GaussianBlur(z, (0, 0), gs); z /= max(z.std(), 1e-6)
        zc = cv2.GaussianBlur(rng.standard_normal(a.shape[:2] + (3,)).astype(np.float32), (0, 0), gs * 1.5)
        zc /= max(zc.std(), 1e-6)
        rgb = rgb + (z[..., None] * .85 + zc * .3) * n * a
    out = rgb + bg * (1 - a)
    fr[y0:y1, x0:x1] = np.clip(out + .5, 0, 255).astype(np.uint8)
    return fr

if __name__ == '__main__':
    import sys
    from PIL import Image
    fr = np.asarray(Image.open(sys.argv[1]).convert('RGB')).copy(); ov = np.asarray(Image.open(sys.argv[2]).convert('RGBA'))
    over(fr, ov); Image.fromarray(fr).save(sys.argv[3]); print('->', sys.argv[3])
