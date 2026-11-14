import os
import sys, cv2
from PIL import Image
V = os.environ.get('VIDEO', 'src/input.mp4')  # set VIDEO=path/to/video.mp4
layer_dir, out = sys.argv[1], sys.argv[2]
frames = [int(x) for x in sys.argv[3].split(',')]
scale = float(sys.argv[4]) if len(sys.argv) > 4 else .5
crop = sys.argv[5] if len(sys.argv) > 5 else None  # x0,y0,x1,y1 full-res crop
cap = cv2.VideoCapture(V); want = set(frames); got = {}; f = 0
while want:
    ok, fr = cap.read()
    if not ok: break
    if f in want:
        im = Image.fromarray(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)).convert('RGBA')
        lay = Image.open(f'{layer_dir}/{f:04d}.png').convert('RGBA')
        im.alpha_composite(lay); im = im.convert('RGB')
        im = im.crop(tuple(map(int, crop.split(',')))) if crop else im.crop((0, 270, 1078, 1650))
        got[f] = im.resize((int(im.width * scale), int(im.height * scale))); want.discard(f)
    f += 1
w, h = got[frames[0]].size
sheet = Image.new('RGB', (w * len(frames), h))
for i, fr in enumerate(frames): sheet.paste(got[fr], (i * w, 0))
sheet.save(out)
