"""Reflection in the clock glass (scenes 9-10): the crowned original Pion holding a camera, as a dark silhouette with a thin warm rim (mirrored).
python3 make_reflection.py <engine.png> <outdir> -> refl.png, refl_flash.png (RGBA)"""
import sys, numpy as np; from PIL import Image, ImageDraw, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA").crop((150, 400, 930, 1500)); a = np.array(im)[..., 3].astype(np.float32) / 255
W, H = im.size; cam = (620, 360)   # the hand/phone position in the crop -> draw a camera there
A = Image.fromarray((a * 255).astype(np.uint8)); d = ImageDraw.Draw(A); cx, cy = cam
d.rounded_rectangle((cx - 120, cy - 70, cx + 70, cy + 70), 18, fill=255); d.rectangle((cx - 70, cy - 100, cx - 10, cy - 60), fill=255)   # camera body + top
a = np.array(A).astype(np.float32) / 255
edge = np.clip(np.array(A.filter(ImageFilter.MaxFilter(9))).astype(np.float32) / 255 - np.array(A.filter(ImageFilter.MinFilter(9))).astype(np.float32) / 255, 0, 1)
rgb = np.zeros((H, W, 3), np.float32); rgb[:] = (0.08, 0.1, 0.2); rgb += edge[..., None] * np.array([1.0, 0.78, 0.5]) * 0.9
lens = Image.new("L", (W, H), 0); ImageDraw.Draw(lens).ellipse((cx - 85, cy - 45, cx - 5, cy + 35), fill=255); L = np.array(lens.filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255
rgb = rgb * (1 - L[..., None] * 0.6) + L[..., None] * np.array([0.35, 0.45, 0.7]) * 0.6
alpha = np.clip(a * 0.92 + edge * 0.5, 0, 1)
img = Image.fromarray(np.dstack([np.clip(rgb, 0, 1) * 255, alpha * 255]).astype(np.uint8)).transpose(Image.FLIP_LEFT_RIGHT); img.save(out + "/refl.png")
fl = img.copy(); g = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(g); fx, fy = W - (cx - 40), cy - 80
for r, al in [(260, 40), (160, 90), (90, 170), (45, 255)]: gd.ellipse((fx - r, fy - r, fx + r, fy + r), fill=(255, 250, 235, al))
for ang in range(0, 180, 45):
    v = np.array([np.cos(np.radians(ang)), np.sin(np.radians(ang))]) * 330; gd.line((fx - v[0], fy - v[1], fx + v[0], fy + v[1]), fill=(255, 250, 235, 200), width=8)
g = g.filter(ImageFilter.GaussianBlur(6)); fl.alpha_composite(g); fl.save(out + "/refl_flash.png"); print("ok", W, H)
