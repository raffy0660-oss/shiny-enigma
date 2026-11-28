"""Anonymous photograph textures from the apartment-A still: front (3:4 image in an aged white border) and back ("Find him before Friday." in handwriting).
python3 make_photo.py <still.jpg> <outdir>   -> photo_front.jpg (1000x1250), photo_back.jpg, photo_back_land.png (engine `paperimg`, 600x400 sheet)"""
import sys, os, random; from PIL import Image, ImageDraw, ImageFont, ImageFilter
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True); random.seed(42)
im = Image.open(src).convert("RGB"); W, H = im.size; ch = int(W / 0.75); y0 = (H - ch) // 2; img = im.crop((0, y0, W, y0 + ch))   # centre 3:4
FW, FH, B, BB = 1000, 1250, 50, 50
def paper(w, h, base=(244, 238, 222)):
    p = Image.new("RGB", (w, h), base); d = ImageDraw.Draw(p)
    for _ in range(4000): x, y = random.randrange(w), random.randrange(h); c = random.randint(-14, 4); d.point((x, y), fill=tuple(max(0, v + c) for v in base))
    for _ in range(5):   # faint stains
        x, y, r = random.randrange(w), random.randrange(h), random.randint(30, 120); st = Image.new("L", (w, h), 0); ImageDraw.Draw(st).ellipse((x - r, y - r, x + r, y + r), fill=28); st = st.filter(ImageFilter.GaussianBlur(25))
        p = Image.composite(Image.new("RGB", (w, h), (200, 170, 120)), p, st)
    return p
front = paper(FW, FH); iw, ih = FW - 2 * B, FH - B - BB; front.paste(img.resize((iw, ih), Image.LANCZOS), (B, B))
d = ImageDraw.Draw(front); d.rectangle((B, B, B + iw - 1, B + ih - 1), outline=(40, 30, 22), width=3); d.rectangle((2, 2, FW - 3, FH - 3), outline=(43, 32, 24), width=8)
front.save(out + "/photo_front.jpg", quality=92)
fonts = [f for f in [os.path.expanduser("~/.local/share/fonts/Caveat-700.ttf"), "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"] if os.path.exists(f)]
def font(sz): return ImageFont.truetype(fonts[0], sz) if fonts else ImageFont.load_default()
def back(w, h, lines, sizes):
    b = paper(w, h, (236, 228, 208)); d = ImageDraw.Draw(b); d.rectangle((2, 2, w - 3, h - 3), outline=(43, 32, 24), width=8)
    y = h * 0.5 - sum(sizes) * 0.62
    for t, sz in zip(lines, sizes):
        f = font(sz); tw = d.textlength(t, font=f); layer = Image.new("RGBA", (w, int(sz * 1.6)), (0, 0, 0, 0)); ImageDraw.Draw(layer).text(((w - tw) / 2, 0), t, font=f, fill=(150, 22, 28, 255))
        layer = layer.rotate(random.uniform(-3, 3), resample=Image.BICUBIC); b.paste(layer, (0, int(y)), layer); y += sz * 1.25
    return b
back(FW, FH, ["Find him", "before", "Friday."], [200, 200, 230]).save(out + "/photo_back.jpg", quality=92)
back(600, 400, ["Find him before", "Friday."], [84, 104]).save(out + "/photo_back_land.png")
print("ok", img.size)
