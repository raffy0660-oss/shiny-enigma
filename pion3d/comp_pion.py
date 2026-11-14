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
PROXY_H = 4.83    # Blender proxy height: its crown is scaled 1.18 in z


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
    # matching grain over the whole frame
    rng = np.random.default_rng(3)
    out = out + rng.normal(0, a.grain, out.shape[:2])[..., None]
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(a.out)
    print("RESULT comp", a.out, {"pos": (px, py), "size": crop.size})


if __name__ == "__main__":
    main()
