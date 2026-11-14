import os
import json, sys, cv2
from PIL import Image, ImageDraw
V = os.environ.get('VIDEO', 'src/input.mp4')  # set VIDEO=path/to/video.mp4
P = json.load(open('plan.json'))
frames = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else list(range(0, 584, 15))
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
cap = cv2.VideoCapture(V)
want = set(frames); imgs = {}
f = 0
while want:
    ok, fr = cap.read()
    if not ok: break
    if f in want:
        im = Image.fromarray(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)); d = ImageDraw.Draw(im)
        o = P[f]
        d.rectangle([250, 1292, 830, 1470], outline=(255, 0, 0), width=4)
        if o['vis']:
            x, y, h = o['x'], o['y'], o['h']
            d.rectangle([x - .3 * h, y - h, x + .3 * h, y], outline=(0, 255, 0), width=6)
            d.ellipse([x - .28 * h, y - .07 * h, x + .28 * h, y + .07 * h], outline=(255, 0, 255), width=6)
        d.text((10, 300), f'{f} t={f/30:.2f} s{o["s"]}', fill=(255, 255, 0))
        imgs[f] = im.crop((0, 270, 1078, 1650)).resize((216, 276)); want.discard(f)
    f += 1
rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGB', (216 * cols, 276 * rows))
for i, fr in enumerate(frames):
    sheet.paste(imgs[fr], ((i % cols) * 216, (i // cols) * 276))
    ImageDraw.Draw(sheet).text(((i % cols) * 216 + 4, (i // cols) * 276 + 4), f'{fr/30:.2f}', fill=(255, 255, 0))
sheet.save(sys.argv[1])
