import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); w, h = im.size
bg = Image.new('RGBA', (w, h))
top, bot = (206, 199, 197), (192, 185, 183)
for y in range(h):
    t = y / (h - 1); c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)) + (255,)
    bg.paste(c, (0, y, w, y + 1))
Image.alpha_composite(bg, im).convert('RGB').save(dst)
