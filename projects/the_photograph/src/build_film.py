"""Joins the scene renders into one 60 fps frame sequence for the whole film (73.4 s = 4404 frames) in ~/pion/proj10/film:
crossfades at the dissolves, the anonymous photo laid exactly over the Friday crime scene (41.65-43.15 s), black after the last tick.
python3 build_film.py [--check]   (--check: only report missing frames)"""
import os, sys, math, json; import numpy as np; from PIL import Image
LIFT = {"s23", "s10"}   # the world inside the photo: lift gamma + warm it so it matches the photo lying under the desk lamp
LUT = [min(255, int(255 * ((i / 255) ** 0.94) * k)) for k in (1.03, 1.0, 0.95) for i in range(256)]
def load(p): im = Image.open(p).convert("RGB"); return im.point(LUT) if p.split("/")[-2] in LIFT else im
P = os.path.expanduser("~/pion/proj10"); OUT = P + "/film"; os.makedirs(OUT, exist_ok=True); N = 4404
SEG = [("s12", 0, 510), ("s23", 492, 936), ("s4", 924, 1266), ("s5", 1260, 1677), ("s6", 1674, 2043), ("s7", 2040, 2172), ("s78", 2166, 2724), ("s9", 2724, 3030), ("s10", 3018, 3264), ("s1113", 3258, 4404)]
# transition between SEG[i] and SEG[i+1]: ("x", a, b) crossfade over frames a..b, or ("cut", f) = next segment from frame f
TR = [("x", 492, 510), ("x", 924, 936), ("cut", 1263), ("x", 1674, 1677), ("cut", 2040), ("cut", 2166), ("cut", 2724), ("x", 3018, 3030), ("cut", 3260)]
BLACK_FROM = 4400
PHOTO = (2499, 2589); FOV0 = 72.0   # photo overlay frames (C0 camera, fov 72 -> 70.5 linear over 41.65-43.15 s)
src = lambda s, f: f"{P}/out/{s}/{f:05d}.jpg"
def sources(f):   # -> [(path, weight)]
    out = []
    for i, (s, a, b) in enumerate(SEG):
        lo = a if i == 0 else (TR[i - 1][1] if TR[i - 1][0] == "x" else TR[i - 1][1]); hi = b if i == len(SEG) - 1 else (TR[i][2] if TR[i][0] == "x" else TR[i][1] - 1)
        if not (lo <= f <= hi): continue
        w = 1.0
        if i > 0 and TR[i - 1][0] == "x" and f <= TR[i - 1][2]: x0, x1 = TR[i - 1][1], TR[i - 1][2]; w = (f - x0 + 0.5) / (x1 - x0 + 1)
        if i < len(SEG) - 1 and TR[i][0] == "x" and f >= TR[i][1]: x0, x1 = TR[i][1], TR[i][2]; w = 1 - (f - x0 + 0.5) / (x1 - x0 + 1)
        out.append((src(s, f), max(0.0, min(1.0, w))))
    return out
if "--check" in sys.argv:
    miss = {}
    for f in range(N):
        for p, w in sources(f):
            if not os.path.exists(p): miss.setdefault(p.split("/")[-2], []).append(f)
    for k, v in miss.items(): print(k, len(v), "missing", v[0], "...", v[-1])
    print("complete" if not miss else "incomplete"); sys.exit()
photo = Image.open(os.path.dirname(os.path.abspath(__file__)) + "/scene/tex/photo_front.jpg").convert("RGB")
TO = int(sys.argv[sys.argv.index("--to") + 1]) if "--to" in sys.argv else N
for f in range(TO):
    dst = f"{OUT}/{f:05d}.jpg"
    if f >= BLACK_FROM: Image.new("RGB", (1080, 1920), (0, 0, 0)).save(dst, quality=92); continue
    S = sources(f)
    if len(S) == 1 and not (PHOTO[0] <= f <= PHOTO[1]) and S[0][0].split("/")[-2] not in LIFT:
        if os.path.lexists(dst): os.remove(dst)
        os.symlink(S[0][0], dst); continue
    im = load(S[0][0])
    if len(S) > 1: im = Image.blend(im, load(S[1][0]), S[1][1] / (S[0][1] + S[1][1]))
    if PHOTO[0] <= f <= PHOTO[1]:   # the photo laid over the crime scene, matched to the C0 camera (photo = centre 3:4 crop of a fov-72 render)
        u = (f - PHOTO[0]) / (PHOTO[1] - PHOTO[0]); fov = FOV0 - 1.5 * u; s = math.tan(math.radians(FOV0 / 2)) / math.tan(math.radians(fov / 2))
        w, h = int(1200 * s), int(1500 * s); ph = photo.resize((w, h), Image.LANCZOS)
        a = min(1, (f - PHOTO[0]) / 15, (PHOTO[1] - f) / 15) * 0.62
        lay = im.copy(); lay.paste(ph, (540 - w // 2, 960 - h // 2)); im = Image.blend(im, lay, a)
    if os.path.lexists(dst): os.remove(dst)
    im.save(dst, quality=93)
print("film frames:", N)
