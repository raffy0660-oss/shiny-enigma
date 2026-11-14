import sys, cv2
from PIL import Image, ImageDraw, ImageFont
lay, out = sys.argv[1], sys.argv[2]; frames = [int(x) for x in sys.argv[3].split(',')]; cols = int(sys.argv[4]) if len(sys.argv) > 4 else 8
cap = cv2.VideoCapture('src/input.mp4'); got = {}; i = 0; want = set(frames)
while want:
    ok, fr = cap.read()
    if not ok: break
    if i in want:
        im = Image.fromarray(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)).convert('RGBA')
        try: L = Image.open(f'{lay}/{i:04d}.png').convert('RGBA'); im.alpha_composite(L)
        except FileNotFoundError: pass
        got[i] = im.convert('RGB').crop((0, 276, 1078, 1650)); want.discard(i)
    i += 1
fnt = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf', 34)
w, h = 270, 344; rows = (len(frames) + cols - 1) // cols; S = Image.new('RGB', (w * cols, h * rows))
for k, f in enumerate(frames):
    im = got[f]; ImageDraw.Draw(im).text((10, 10), f'f{f} {f/30:.2f}s', fill='yellow', font=fnt, stroke_width=3, stroke_fill='black'); S.paste(im.resize((w, h)), ((k % cols) * w, (k // cols) * h))
S.save(out)
