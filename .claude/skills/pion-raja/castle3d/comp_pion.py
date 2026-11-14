"""Composite the original engine Pion (transparent PNG from react_render.js --png) onto a
Blender background rendered with build_castle.py --proxy --bbox.

The Blender proxy already put Pion's real shadow (and bounce) into the background; this
places the engine Pion exactly over the proxy (bottom aligned, height matched), then
blends it into the plate: light wrap from the blurred background, a touch of the room's
colour in the shadows, and matching grain.

    python3 comp_pion.py --bg bg.png --bbox bg.json --fg pion.png --out final.png
        [--wrap 0.35] [--grain 0.012] [--scale 1.0] [--dx 0] [--dy 0]
"""
import argparse
import json

import numpy as np
from PIL import Image, ImageFilter

ENGINE_H = 4.65   # engine pion height (model units, crown tip to base)
PROXY_H = 4.65    # Blender proxy height: same proportions as the engine (crown not enlarged)


def _box(a, r, axis):
    """Box filter of radius r along one axis (edge-clamped), via cumulative sums."""
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis)
    hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
    lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
    return (hi - lo) / (2 * r + 1)


def _blur(img, r):
    """Float Gaussian-ish blur: three box passes per axis (PIL cannot blur float images)."""
    r = max(1, int(r / 1.7))
    out = img.astype(np.float32)
    for _ in range(3):
        out = _box(_box(out, r, 0), r, 1)
    return out


def relight(rgb, alpha, light_png, size, strength, bands, ref_pct=55, floor=0.5, top=1.4):
    """Multiply the room's light (Blender clay proxy) onto the engine Pion, cel-banded."""
    Lp = Image.open(light_png).convert("RGBA").resize(size, Image.LANCZOS)
    Lf = np.asarray(Lp).astype(np.float32) / 255.0
    # closing (dilate then erode) on the light colour: removes thin dark grooves of the proxy (cape edges, crown
    # band seam) that would otherwise print as dark / red lines across the engine Pion's ermine and face
    n = max(3, (size[0] // 70) | 1)
    try:
        import cv2
        ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
        Lf[..., :3] = cv2.morphologyEx(np.ascontiguousarray(Lf[..., :3]), cv2.MORPH_CLOSE, ker)
    except ImportError:
        rgb8 = Image.fromarray((Lf[..., :3] * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(n)).filter(ImageFilter.MinFilter(n))
        Lf[..., :3] = np.asarray(rgb8).astype(np.float32) / 255.0
    lc, la = Lf[..., :3], Lf[..., 3:4]
    # fill outside the proxy silhouette (engine and proxy outlines differ a little):
    # normalised convolution of the premultiplied light
    r = max(3, size[0] // 60)
    num = _blur((lc * la).astype(np.float32), r)
    den = _blur(la.astype(np.float32), r)
    filled = num / np.maximum(den, 1e-4)
    # far outside the proxy (a lifted crown, a raised arm) the convolution has no samples: fall back to the
    # average light on the body instead of black
    ins = la[..., 0] > 0.5
    avg = lc[ins].mean(0) if ins.any() else np.full(3, 0.5, np.float32)
    cover = np.clip(den / 0.25, 0, 1)
    filled = filled * cover + avg * (1 - cover)
    lc = lc * la + filled * (1 - la)
    lum = lc.mean(-1, keepdims=True)
    inside = (la[..., 0] > 0.5)
    ref = np.percentile(lum[inside], ref_pct) if inside.any() else lum.mean()
    shade = lum / max(ref, 1e-4)
    tint = lc / np.maximum(lum, 1e-4)
    # keep the room's warm cast (torches, candles): only take out half of the average tint
    if inside.any():
        tint = tint / (0.5 + 0.5 * tint[inside].mean(0))
    if bands > 0:  # cel steps with a soft edge
        # smooth first (scaled to the frame) so small dips in the light, like the slightly darker
        # middle of a face lit from above, cannot become a lone dark island after quantising
        shade = _blur(shade.astype(np.float32), max(4, size[0] // 55))
        levels = np.linspace(floor, top, bands)
        step = (top - floor) / max(bands - 1, 1)
        idx = np.clip(np.round((shade - floor) / step), 0, bands - 1).astype(int)
        # majority vote per neighbourhood: islands smaller than ~3 % of the frame width (a dark dot
        # in the middle of the face) take the band around them; big cel shapes keep their edges
        R = max(6, size[0] // 30)
        votes = np.stack([_blur((idx[..., 0] == k).astype(np.float32)[..., None], R)[..., 0] for k in range(bands)], -1)
        idx = votes.argmax(-1)[..., None]
        q = levels[idx]
        shade = _blur(q.astype(np.float32), max(2, size[0] // 360))
    factor = shade * tint
    factor = 1 + (factor - 1) * strength
    # rim: the brightest light (window behind) adds a warm edge, not just a multiply
    rim = np.clip(lum / max(ref, 1e-4) - 1.45, 0, 1) * 0.35 * strength
    out = rgb * factor + rim * tint * 0.6
    return out * alpha + rgb * (1 - alpha)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bg", required=True)
    ap.add_argument("--bbox", required=True)
    ap.add_argument("--fg", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--wrap", type=float, default=0.35)
    ap.add_argument("--grain", type=float, default=0.012)
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--dx", type=float, default=0.0)
    ap.add_argument("--dy", type=float, default=0.0)
    ap.add_argument("--contact", type=float, default=0.75)
    ap.add_argument("--light", default=None, help="light pass PNG from build_castle.py --lightpass")
    ap.add_argument("--relight", type=float, default=1.0, help="how much of the room light goes onto Pion")
    ap.add_argument("--bands", type=int, default=4, help="cel bands for the room light (0 = smooth)")
    ap.add_argument("--ref", type=float, default=55, help="light-pass percentile mapped to 1.0 (high = dramatic, lit side only)")
    ap.add_argument("--floor", type=float, default=0.5, help="darkest cel band")
    ap.add_argument("--top", type=float, default=1.4, help="brightest cel band")
    ap.add_argument("--sat", type=float, default=1.0, help="final grade: saturation")
    ap.add_argument("--tint", default="1,1,1", help="final grade: r,g,b multipliers")
    ap.add_argument("--contrast", type=float, default=1.0, help="final grade: contrast around mid grey")
    a = ap.parse_args()

    bg = Image.open(a.bg).convert("RGB")
    W, H = bg.size
    bb = json.load(open(a.bbox))
    sx = W / bb["W"]                       # bbox may come from a lower-res test render
    x0, x1, y0, y1 = bb["x0"] * sx, bb["x1"] * sx, bb["y0"] * sx, bb["y1"] * sx

    fg = Image.open(a.fg).convert("RGBA")
    al = np.asarray(fg)[..., 3]
    ys, xs = np.nonzero(al > 8)
    fx0, fx1, fy0, fy1 = xs.min(), xs.max(), ys.min(), ys.max()
    crop = fg.crop((fx0, fy0, fx1 + 1, fy1 + 1))
    target_h = (y1 - y0) * ENGINE_H / PROXY_H * a.scale
    k = target_h / crop.size[1]
    crop = crop.resize((max(1, round(crop.size[0] * k)), max(1, round(crop.size[1] * k))), Image.LANCZOS)
    cx = (x0 + x1) / 2 + a.dx
    px = round(cx - crop.size[0] / 2)
    py = round(y1 - crop.size[1] + a.dy)

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(crop, (px, py), crop)
    F = np.asarray(layer).astype(np.float32) / 255.0
    rgb, alpha = F[..., :3], F[..., 3:4]
    B = np.asarray(bg).astype(np.float32) / 255.0

    if a.light:
        rgb = relight(rgb, alpha, a.light, (W, H), a.relight, a.bands, a.ref, a.floor, a.top)
    # light wrap: blurred plate bleeding over the inner edge of the character
    r = max(2, round(W / 90))
    blur_bg = np.asarray(bg.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0
    a_img = Image.fromarray((alpha[..., 0] * 255).astype(np.uint8))
    inner = np.asarray(a_img.filter(ImageFilter.GaussianBlur(r))).astype(np.float32)[..., None] / 255.0
    edge = np.clip(alpha - inner, 0, 1) * 2.0
    rgb = rgb + blur_bg * edge * a.wrap
    # room colour into the character's darks (keeps the toon read, kills the pasted-on look)
    room = blur_bg.reshape(-1, 3).mean(0)
    lum = rgb.mean(-1, keepdims=True)
    rgb = rgb + (room - 0.5 * room.mean()) * 0.10 * (1 - lum)

    # contact shadow under the base (the proxy's cast shadow mostly hides behind the body)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    bw = crop.size[0] * 0.48
    d = ((xx - cx) / bw) ** 2 + ((yy - (y1 - crop.size[1] * 0.012)) / (bw * 0.16)) ** 2
    contact = np.clip(1 - d, 0, 1) ** 1.6 * a.contact
    B = B * (1 - contact[..., None] * np.array([0.92, 0.95, 0.97]))
    out = B * (1 - alpha) + np.clip(rgb, 0, 1) * alpha
    # emotion grade over the whole frame (plate + Pion together, so they stay matched)
    tint = np.array([float(v) for v in a.tint.split(",")], dtype=np.float32)
    g = out.mean(-1, keepdims=True)
    out = g + (out - g) * a.sat
    out = out * tint
    out = 0.5 + (out - 0.5) * a.contrast
    # matching grain over the whole frame
    rng = np.random.default_rng(3)
    out = out + rng.normal(0, a.grain, out.shape[:2])[..., None]
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(a.out)
    print("RESULT comp", a.out, {"pos": (px, py), "size": crop.size})


if __name__ == "__main__":
    main()
