"""Project 2 plan: Pion Raja inside the footage (clip 1a, 1b and the restaurant clip).
White screens are castle / hospital scenes, the other clips get a reaction cameo (rendered separately)."""
import json, math
FPS = 30; NF = 849
AN = {k: {int(f): v for f, v in d.items()} for k, d in json.load(open('anchors.json')).items()}
def anc(name, f):
    d = AN[name]; f = min(max(f, min(d)), max(d)); return d[f]
def lerp(a, b, t): return a + (b - a) * t
def sstep(u): return u * u * (3 - 2 * u)

frames = {}  # f -> dict
def put(f, **kw): frames[f] = kw

def frames_(t0, t1): n = max(2, round((t1 - t0) * FPS)); return [t0 + (t1 - t0) * k / n for k in range(n + 1)]
def eo(u): return 1 - (1 - u) ** 2
def stand(f0, f1, A, h, dx=0, dy=0, yaw=0., scmin=0, **kw):
    for f in range(f0, f1 + 1):
        x, y, sc, ang = anc(A, f); sc = max(sc, scmin); put(f, x=x + dx * sc, y=y + dy * sc, h=h * sc, roll=ang, yaw=yaw, lift=0, hurt=1, **kw)
def hop(f0, f1, A, h, dx_from, dx_to=0, hops=2, height=.5, dy=0, yaw=0.):
    for f in range(f0, f1 + 1):
        u = (f - f0) / (f1 - f0); x, y, sc, _ = anc(A, f); w = eo(u)
        put(f, x=x + (dx_from + (dx_to - dx_from) * w) * sc, y=y + dy * sc, h=h * sc, roll=math.radians(-6 * math.sin(math.pi * hops * u)),
            yaw=yaw, lift=h * sc * height * abs(math.sin(math.pi * hops * u)) * (1 - .35 * u), hurt=1, physy=True, noshadow=True)
def drop(f0, f1, A, h, from_px, dx=0, dy=0, yaw=0., spin=25):
    for f in range(f0, f1 + 1):
        u = (f - f0) / (f1 - f0); x, y, sc, _ = anc(A, f)
        put(f, x=x + dx * sc, y=y + dy * sc - from_px * (1 - u * u), h=h * sc, roll=math.radians(spin * (1 - u)), yaw=yaw, lift=0, hurt=1, physy=True, noshadow=u < 1)
def launch(f0, f1, A, h, dx=0, dy=0, yaw=0.):   # flies off toward the lens
    x0, y0, sc, _ = anc(A, f0); x0 += dx * sc; y0 += dy * sc
    for f in range(f0, f1 + 1):
        u = (f - f0) / (f1 - f0); e = u ** 2.2
        put(f, x=lerp(x0, 539, e), y=lerp(y0, 960 + 1500, e), h=lerp(h * sc, 3000, e), roll=math.radians(-8 * e), yaw=yaw, lift=0, hurt=1, noshadow=True, pitch=10)

HITS = []
def pos_of(A, f, dx=0, dy=0):
    x, y, sc, _ = anc(A, f); return x + dx * sc, y + dy * sc, sc
def walk(f0, f1, src, dst, h):   # src/dst: (anchor, dx, dy); run cycle driven by spd/dist/dx/dy
    dist = 0; px = None
    for f in range(f0, f1 + 1):
        u = sstep((f - f0) / (f1 - f0)); a = pos_of(src[0], f, *src[1:]); b = pos_of(dst[0], f, *dst[1:])
        x, y, sc = lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u); H = h * sc
        if px: ddx, ddy = (x - px[0]) / H, (y - px[1]) / H; dist += math.hypot(ddx, ddy)
        else: ddx = ddy = 0
        put(f, x=x, y=y, h=H, roll=0, yaw=0, lift=0, hurt=1, physy=True, spd=3.0 if f < f1 else 0, dist=dist * 2.2, dx=ddx * FPS, dy=ddy * FPS); px = (x, y)
def hop_to(f0, f1, src, dst, h, height=.9, spin=0):
    for f in range(f0, f1 + 1):
        u = (f - f0) / (f1 - f0); a = pos_of(src[0], f, *src[1:]); b = pos_of(dst[0], f, *dst[1:]); sc = lerp(a[2], b[2], u)
        put(f, x=lerp(a[0], b[0], sstep(u)), y=lerp(a[1], b[1], sstep(u)) - h * sc * height * math.sin(math.pi * u), h=h * sc, roll=math.radians(spin * math.sin(math.pi * u)),
            yaw=0, lift=0, hurt=1, physy=True, noshadow=True)
def stomp(f0, f1, pts, h, period=8, height=.16, word='STOMP!'):   # pts(f) -> (x, y, sc): hopping up and down on a body
    for f in range(f0, f1 + 1):
        x, y, sc = pts(f); ph = ((f - f0) % period) / period; H = h * sc
        lift = H * height * math.sin(math.pi * ph); sq = -.2 * max(0, 1 - ph * 4) if f > f0 else 0
        put(f, x=x, y=y, h=H, roll=math.radians(4 * math.sin(math.pi * 2 * ph)), yaw=0, lift=lift, sq=sq, hurt=1, noshadow=True)
        if (f - f0) % period == 0: HITS.append({'type': 'hit', 't': f / FPS, 'x': x, 'y': y - H * .05, 'r': H * .42, 'text': word, 'rot': -.2 if (f // period) % 2 else .2, 'cut': (f1 + 1) / FPS})

# ---------- clip 1a (f12-63): standing on the tandir rim (bigger: the hook), bumped by the baker's head,
#            thrown high over the hole (clearly visible against the sky), drops right into the hot hole
H1 = 255
STAND = (150, -105)
HOLE = (-20, -150, 190, 36)
def rimpt(f, d):
    x, y, sc, _ = anc('A1', f); return x + d[0] * sc, y + d[1] * sc, sc
BUMP, APEX, INHOLE = 22, 31, 38
LAND0 = 13
x1, y1, sc1 = rimpt(LAND0, STAND)
for f in range(0, LAND0):   # hook: huge pion swoops in from the lens over the blurry opening, shrinks onto the tandir rim
    u = f / LAND0; e = 1 - (1 - u) ** 2.4
    put(f, x=lerp(539, x1, e), y=lerp(960 + 1500, y1, e), h=lerp(3000, H1 * sc1, e), roll=math.radians(25 * (1 - e)), yaw=.35 * e, lift=0, noshadow=True, pitch=lerp(10, 22, e), physy=True)
for f in range(LAND0, BUMP + 1):
    x, y, sc = rimpt(f, STAND); put(f, x=x, y=y, h=H1 * sc, roll=0, yaw=.35, lift=0)
for f in range(BUMP + 1, INHOLE + 1):
    x, y, sc = rimpt(f, STAND); cx, cy, _ = rimpt(f, (HOLE[0] - 40, HOLE[1]))
    if f <= APEX:   # knocked up: arcs high above the hole, tumbling
        u = (f - BUMP) / (APEX - BUMP); px = lerp(x, cx, eo(u)); py = lerp(y, cy - 40 * sc, u) - math.sin(math.pi * .5 * (1 + u)) * 0 - 300 * sc * math.sin(math.pi * u * .5 + 0) * (1 - .0 * u)
        py = lerp(y, cy, u) - 470 * sc * eo(u)
        roll = math.radians(-260 * u)
    else:           # free fall straight down into the hole
        u = (f - APEX) / (INHOLE - APEX); px = cx; py = cy - 470 * sc + (470 * sc + 1.25 * H1 * sc) * u * u; roll = math.radians(-260 - 100 * u)
    put(f, x=px, y=py, h=H1 * sc, roll=roll, yaw=.2, lift=0, occl=[*rimpt(f, HOLE[:2])[:2], HOLE[2] * sc, HOLE[3] * sc] if f > APEX else None, noshadow=True)

# ---------- clip 1b (f88-111): hanging from the pad's lower edge (pad tracked by optical flow), smooth pendulum, flung at the lens
H2 = 290
PAD = AN['PAD']
def pad_grip(tf):   # smooth, sub-frame grip point: centre + radius rotated with the pad, gaussian smoothed
    def raw(f):
        x, y, sc, ang = anc('PAD', f); r = 118 * sc; return x - math.sin(ang) * r * .3, y + math.cos(ang) * r
    fs = range(int(tf) - 3, int(tf) + 5); wsum = 0; gx = gy = 0
    for f in fs:
        w = math.exp(-((f - tf) / 1.6) ** 2); X, Y = raw(min(max(f, 84), 106)); gx += w * X; gy += w * Y; wsum += w
    return gx / wsum, gy / wsum
ang, vel = 0.25, 0.0
SUB = 8
for f in range(86, 105):
    for k in range(SUB):
        tf = f + k / SUB; g0 = pad_grip(tf - 1 / SUB); g1 = pad_grip(tf); g2 = pad_grip(tf + 1 / SUB)
        ax = (g2[0] - 2 * g1[0] + g0[0]) * (FPS * SUB) ** 2
        vel += (-42 * math.sin(ang) - 2.6 * vel - ax / H2 * .55) / (FPS * SUB); ang += vel / (FPS * SUB)
    if f < 88: continue
    gx, gy = pad_grip(f); gy -= 10
    put(f, x=gx + math.sin(ang) * H2 * .89, y=gy + math.cos(ang) * H2 * .89, h=H2, roll=-ang, yaw=0, lift=0, hurt=1, noshadow=True)
fx, fy = frames[104]['x'], frames[104]['y']
for f in range(105, 112):
    u = (f - 104) / 7; e = u ** 2.2
    put(f, x=lerp(fx, 539, e), y=lerp(fy, 960 + 1500, e), h=lerp(H2, 3000, e), roll=math.radians(-30 - 300 * e), yaw=0, lift=0, hurt=1, noshadow=True, pitch=10)

# ---------- clip 2 (f205-255): drops onto the restaurant tandir rim, watches the dive
for f in range(205, 214):   # drops in from above (he flew into the lens at the end of white screen 1), lands on the rim
    x, y, sc, ang = anc('C2', f); u = min(1, (f - 205) / 8)
    put(f, x=x + 20 * sc, y=y - 58 * sc - (1 - u * u) * 700, h=230 * sc, roll=ang + (1 - u) * .6, yaw=.45, lift=0, hurt=1, physy=True, noshadow=u < 1)
SPANK2 = ('B2', -95, 135)
walk(214, 232, ('C2', 20, -58), SPANK2, 230)       # storms over to the man lying across the rim
for f in range(233, 256):
    x, y, sc = pos_of(SPANK2[0], f, *SPANK2[1:]); put(f, x=x, y=y, h=230 * sc, roll=0, yaw=.55, lift=0, hurt=1)
for k in range(9):                                  # every slap lands on the butt
    f = 233 + round(k * .24 * FPS) + 3
    if f > 255: break
    bx, by, bsc = pos_of('B2', f); HITS.append({'type': 'hit', 't': f / FPS, 'x': bx + 15, 'y': by - 10, 'r': 95 * bsc, 'text': 'SLAP!', 'rot': .2 if k % 2 else -.2})
# ---------- clip 3 (f256-302, overhead dark oven): hops in on the cracked stone next to the hole
hop(256, 268, 'C3', 205, 260, -70, hops=2, height=.45, yaw=-.5); stand(269, 279, 'C3', 205, dx=-70, yaw=-.4, physy=True)
hop_to(280, 288, ('C3', -70, 0), ('B3', 0, 0), 205, height=.8)
stomp(289, 302, lambda f: pos_of('B3', f), 205)
# ---------- clip 4 (f303-372, overhead clay oven): drops onto the rim, the red-shirt guy dives in front of him
drop(303, 311, 'C4', 215, 800, dx=-60, dy=-170, yaw=-.4); stand(312, 372, 'C4', 215, dx=-60, dy=-170, yaw=-.45, physy=True, scmin=.85)
# ---------- clip 5 (f373-408): hops onto the bread stack right next to the bakers
hop(373, 384, 'C5', 230, 260, 0, hops=2, height=.5, yaw=-.6); stand(385, 408, 'C5', 230, yaw=-.5, physy=True)
# ---------- clip 6 (f409-476): drops near the fiery oven, sees the giant dough go in, flees toward the lens
for f in range(409, 463):   # standing right on the rim of the fiery hole, beside where the dough goes in
    x, y, sc, ang = anc('R6', f); sc = max(sc, .78); put(f, x=x - 70 * sc, y=min(y - 30 * sc, 1630), h=235 * sc, roll=ang * .5, yaw=-.35, lift=0, hurt=1, physy=True)
x0, y0, h0 = frames[462]['x'], frames[462]['y'], frames[462]['h']
for f in range(463, 477):
    u = (f - 462) / 14; e = u ** 2.2
    put(f, x=lerp(x0, 539, e), y=lerp(y0, 960 + 1500, e), h=lerp(h0, 3000, e), roll=math.radians(-8 * e), yaw=-.2, lift=0, hurt=1, noshadow=True, pitch=10)
# ---------- clip 7 (f580-662): hops onto the bread stack beside the bakers working from outside
hop(580, 592, 'C7', 240, 300, 0, hops=2, height=.45, yaw=-.6); stand(593, 662, 'C7', 240, yaw=-.55, physy=True)
# ---------- clip 8/9 (f663-726): on the mosaic oven rim while the man dives in, hops along when the camera moves
hop(663, 673, 'C8', 260, -320, 0, hops=2, height=.45, yaw=.5); stand(674, 689, 'C8', 260, yaw=.45, physy=True)
hop_to(690, 698, ('C8', 0, 0), ('B8', 0, 0), 260, height=.7)
def butt8(f):
    if f <= 711: return pos_of('B8', f)
    if f >= 713: return pos_of('B9', f)
    a, b = pos_of('B8', f), pos_of('B9', f); u = (f - 711) / 2; return tuple(lerp(a[i], b[i], u) for i in range(3))
stomp(699, 726, butt8, 250)
# ---------- clip 10 (f727-796): drops next to the old baker, then flies toward the lens (into the hospital)
drop(727, 735, 'C10', 250, 750, dx=-40, yaw=-.5); stand(736, 783, 'C10', 250, dx=-40, yaw=-.5, physy=True); launch(784, 796, 'C10', 250, dx=-40, yaw=-.3)
for f, d in frames.items():   # keep the size sane where the track's scale drifts (camera zooms)
    if d.pop('scmin', None): pass

HOLEFX = {}
for f in range(INHOLE - 1, 64):
    cx, cy, sc = rimpt(f, HOLE[:2]); HOLEFX[f] = [cx, cy, HOLE[2] * sc]
SHOT = {s: (a, b) for s, (a, b) in enumerate([(0, 63), (64, 111), (205, 255), (256, 302), (303, 372), (373, 408), (409, 476), (580, 662), (663, 692), (693, 726), (727, 796)])}
out = []
for f in range(NF):
    s = next((k for k, (a, b) in SHOT.items() if a <= f <= b), 0)
    o = {'f': f, 's': s, 'vis': False, 'x': 0, 'y': 0, 'h': 100, 'yaw': 0, 'roll': 0, 'rx': 0, 'ry': 0, 'rh': 1, 'arr': SHOT[s][0] / FPS, 'van': None,
         'tpIn': False, 'pitch': None, 'fallT': None, 'noshadow': False, 'physy': False, 'track': True, 'spd': 0, 'dx': 0, 'dy': 0, 'dist': 0, 'hurt': 0}
    if f in frames:
        d = frames[f]; o.update(vis=True, **d); o.update(rx=o['x'], ry=o['y'], rh=o['h'])
    if f in HOLEFX: o['holeFx'] = HOLEFX[f]
    out.append(o)
json.dump(out, open('plan.json', 'w'))

E = lambda *a: list(a)
TLX = {
  'expr': [E(0, 'senang'), E(.7, 'penasaran'), E(.74, 'kaget'), E(1.25, 'kaget'),
           E(2.93, 'sakit'), E(3.3, 'marah'), E(3.5, 'kaget'),
           E(6.83, 'sakit'), E(7.1, 'marah'), E(7.77, 'ngakak'),
           E(8.53, 'sakit'), E(9.0, 'penasaran'), E(9.25, 'sinis'), E(9.63, 'ngakak'),
           E(10.1, 'sakit'), E(10.5, 'penasaran'), E(10.95, 'kaget'), E(11.35, 'marah'), E(12.0, 'sakit'),
           E(12.43, 'sakit'), E(12.85, 'penasaran'), E(13.3, 'curiga'),
           E(13.63, 'sakit'), E(14.0, 'kaget'), E(14.4, 'sakit'), E(15.3, 'kaget'),
           E(19.33, 'sakit'), E(19.8, 'penasaran'), E(20.9, 'sinis'),
           E(22.1, 'sakit'), E(22.5, 'kaget'), E(22.8, 'marah'), E(23.0, 'sinis'), E(23.3, 'ngakak'),
           E(24.23, 'sakit'), E(24.6, 'curiga'), E(25.6, 'sakit'), E(26.1, 'kaget')],
  'startle': [.74, 10.95, 14.0, 22.5, 26.1],
  'fall': {'hit': -99, 'up': -99, 'ang': 0, 'dirDeg': 0},
  'ride': [{'t0': 0, 'land': .43}, {'t0': 2.93, 'land': 2.9}, {'t0': 6.833, 'land': 7.1}, {'t0': 9.33, 'land': 9.6}, {'t0': 23.0, 'land': 23.27}, {'t0': 8.533, 'land': 8.95}, {'t0': 10.1, 'land': 10.37}, {'t0': 12.43, 'land': 12.8},
           {'t0': 19.33, 'land': 19.73}, {'t0': 22.1, 'land': 22.43}, {'t0': 23.1, 'land': 23.4}, {'t0': 24.23, 'land': 24.5}],
  'gest': [
    {'t0': 0, 't1': .42, 'type': 'flyarms'},
    {'t0': .45, 't1': .72, 'type': 'wave', 'side': 1},
    {'t0': .76, 't1': 1.25, 'type': 'up'},
    {'t0': 2.93, 't1': 3.5, 'type': 'hang'},
    {'t0': 3.5, 't1': 3.75, 'type': 'flyarms'},
    {'t0': 7.77, 't1': 8.5, 'type': 'spank', 'side': 1},
    {'t0': 9.63, 't1': 10.07, 'type': 'cheer'},
    {'t0': 11.0, 't1': 11.3, 'type': 'up'},
    {'t0': 11.35, 't1': 11.95, 'type': 'fist'},
    {'t0': 12.0, 't1': 12.4, 'type': 'facepalm', 'side': 1},
    {'t0': 12.85, 't1': 13.6, 'type': 'think', 'side': 1},
    {'t0': 14.02, 't1': 14.4, 'type': 'up'},
    {'t0': 15.43, 't1': 15.9, 'type': 'flyarms'},
    {'t0': 19.8, 't1': 20.8, 'type': 'think', 'side': 1},
    {'t0': 20.9, 't1': 22.05, 'type': 'cross'},
    {'t0': 22.5, 't1': 22.78, 'type': 'up'},
    {'t0': 22.8, 't1': 23.0, 'type': 'fist'},
    {'t0': 23.3, 't1': 24.2, 'type': 'cheer'},
    {'t0': 24.65, 't1': 25.5, 'type': 'point', 'side': -1, 'tgt': [880, 1300]},
    {'t0': 25.6, 't1': 26.1, 'type': 'facepalm', 'side': 1},
    {'t0': 26.13, 't1': 26.55, 'type': 'flyarms'},
  ],
  'fx': [{'type': 'anger', 't0': 7.1, 't1': 7.77}, {'type': 'anger', 't0': 11.35, 't1': 12.0},
         {'type': 'sweat', 't0': 14.05, 't1': 15.4}, {'type': 'anger', 't0': 22.8, 't1': 23.3}, {'type': 'sweat', 't0': 25.6, 't1': 26.5},
         {'type': 'yell', 't0': 1.0, 't1': 1.9, 'text': 'AAAAA!', 'x': 0, 'y': 0},
         {'type': 'flame', 't0': 1.24, 't1': 2.1, 'f0': 37, 'f1': 63}],
  'button': {'x0': 0, 'y0': 0, 'x1': 0, 'y1': 0}, 'fake': {'t0': -99, 't1': -99},
}
SHOTCAM = [
  dict(pitch=22, fov=58, dir=[-.45, .78, .42], key=[1, .95, .85], keyI=.82, shA=.5, exp=1.0),
  dict(pitch=10, fov=58, dir=[-.45, .78, .42], key=[1, .95, .85], keyI=.82, shA=.4, exp=1.0),
  dict(pitch=14, fov=58, dir=[-.5, .76, .4], key=[1, .97, .92], keyI=.74, shA=.45, exp=1.0),
  dict(pitch=26, fov=58, dir=[-.5, .76, .4], key=[1, .9, .8], keyI=.7, shA=.5, exp=1.0),
  dict(pitch=26, fov=58, dir=[-.5, .76, .4], key=[1, .95, .9], keyI=.78, shA=.45, exp=1.0),
  dict(pitch=32, fov=58, dir=[-.5, .76, .4], key=[1, .97, .95], keyI=.75, shA=.45, exp=1.0),
  dict(pitch=34, fov=58, dir=[-.5, .76, .4], key=[1, .85, .7], keyI=.75, shA=.45, exp=1.0),
  dict(pitch=36, fov=58, dir=[-.5, .76, .4], key=[1, .97, .95], keyI=.75, shA=.45, exp=1.0),
  dict(pitch=12, fov=58, dir=[-.5, .76, .4], key=[1, .97, .92], keyI=.74, shA=.4, exp=1.0),
  dict(pitch=12, fov=58, dir=[-.5, .76, .4], key=[1, .9, .9], keyI=.74, shA=.4, exp=1.0),
  dict(pitch=20, fov=58, dir=[-.5, .76, .4], key=[1, .95, .85], keyI=.74, shA=.45, exp=1.0),
]
TLX['fx'] += HITS
open('timeline_p2.js', 'w').write("'use strict';\n/* project 2 timeline (generated by plan_p2.py) */\nconst SHOTCAM = " + json.dumps(SHOTCAM) + ";\nconst TL = " + json.dumps(TLX) + ";\n")
print('visible', sum(o['vis'] for o in out))
