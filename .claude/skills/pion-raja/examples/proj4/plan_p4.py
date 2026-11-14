"""Project 4 plan: Pion Raja inside the baby clips (eye focus: between the baby's face and the big arms)."""
import json, math
FPS = 30; NF = 757
AN = {k: {int(f): v for f, v in d.items()} for k, d in json.load(open('anchors.json')).items()}
def anc(name, f):
    d = AN[name]; f = min(max(f, min(d)), max(d)); return d[f]
def lerp(a, b, t): return a + (b - a) * t
frames = {}
def put(f, **kw): frames[f] = kw
def pos(A, f, dx=0, dy=0):
    if isinstance(A, tuple): return A[0] + dx, A[1] + dy, 1.0
    x, y, sc, _ = anc(A, f); return x + dx * sc, y + dy * sc, sc
def stand(f0, f1, A, h, yaw=0., dx=0, dy=0, scmax=9, **kw):
    kw = dict(kw)
    for f in range(f0, f1 + 1):
        x, y, sc = pos(A, f, dx, dy); sc = min(sc, scmax); put(f, x=x, y=y, h=h * sc, roll=0, yaw=yaw, lift=0, **kw)
def drop(f0, f1, A, h, from_px=800, yaw=0., dx=0, dy=0, scmax=9, **kw):
    for f in range(f0, f1 + 1):
        u = (f - f0) / (f1 - f0); x, y, sc = pos(A, f, dx, dy); sc = min(sc, scmax)
        put(f, x=x, y=y - from_px * (1 - u * u), h=h * sc, roll=math.radians(25 * (1 - u)), yaw=yaw, lift=0, physy=True, noshadow=u < 1, **kw)
def launch(f0, f1, A, h, yaw=0., dx=0, dy=0, **kw):
    x0, y0, sc = pos(A, f0, dx, dy)
    for f in range(f0, f1 + 1):
        u = (f - f0) / (f1 - f0); e = u ** 2.2
        put(f, x=lerp(x0, 539, e), y=lerp(y0, 960 + 1500, e), h=lerp(h * sc, 3000, e), roll=math.radians(-8 * e), yaw=yaw, lift=0, noshadow=True, pitch=10, **kw)
def jump(f0, f1, A, h, height=1.1, yaw=0., dx=0, dy=0, **kw):   # startled jump straight up
    for f in range(f0, f1 + 1):
        u = (f - f0) / (f1 - f0); x, y, sc = pos(A, f, dx, dy)
        put(f, x=x, y=y, h=h * sc, roll=math.radians(10 * math.sin(math.pi * 2 * u)), yaw=yaw, lift=h * sc * height * math.sin(math.pi * u), physy=True, noshadow=True, **kw)

def walk(f0, f1, A, h, d0, d1, **kw):   # walk between two offsets on the same anchor (run cycle)
    dist = 0; px = None
    for f in range(f0, f1 + 1):
        u = sstep((f - f0) / (f1 - f0)); x, y, sc = pos(A, f, lerp(d0[0], d1[0], u), lerp(d0[1], d1[1], u)); sc = min(sc, kw.get('scmax', 9)); Hh = h * sc
        if px: ddx, ddy = (x - px[0]) / Hh, (y - px[1]) / Hh; dist += math.hypot(ddx, ddy)
        else: ddx = ddy = 0
        k2 = {k: v for k, v in kw.items() if k != 'scmax'}
        put(f, x=x, y=y, h=Hh, roll=0, yaw=0, lift=0, physy=True, spd=3.0 if f < f1 else 0, dist=dist * 2.2, dx=ddx * FPS, dy=ddy * FPS, **k2); px = (x, y)
def hopto(f0, f1, A, h, d0, d1, height=.8, **kw):
    for f in range(f0, f1 + 1):
        u = (f - f0) / (f1 - f0); x, y, sc = pos(A, f, lerp(d0[0], d1[0], sstep(u)), lerp(d0[1], d1[1], sstep(u))); sc = min(sc, kw.get('scmax', 9))
        k2 = {k: v for k, v in kw.items() if k != 'scmax'}
        put(f, x=x, y=y, h=h * sc, roll=math.radians(-8 * math.sin(math.pi * u)), yaw=0, lift=h * sc * height * math.sin(math.pi * u), physy=True, noshadow=True, **k2)
def sstep(u): return u * u * (3 - 2 * u)

H = 300
D = dict(det=1)
L, R = -270, 270   # left / right of the baby (px at anchor scale 1)
# ---------- clip 1 (f0-117): hook - starts 2x big on the blanket, bounces down; then runs over to the flexing arm, hops across
for f in range(0, 24):
    x, y, sc = pos('A', f, 0, 80); u = f / FPS
    k = 1 + .85 * math.exp(-7 * u) * math.cos(14 * u)
    put(f, x=x, y=y, h=H * sc * k, roll=0, yaw=-.15, lift=0, sq=.12 * math.exp(-7 * u) * math.sin(14 * u))
walk(24, 41, 'A', H, (0, 80), (R, 60))                       # runs toward the right arm as it flexes
stand(42, 56, 'B', H, yaw=-.5, dx=L + 30, dy=150); walk(57, 77, 'B', H, (L + 30, 150), (R - 30, 160))
hopto(78, 88, 'C', H, (R - 40, 160), (L + 60, 170)); stand(89, 104, 'C', H, yaw=.45, dx=L + 60, dy=170); launch(105, 117, 'C', H, dx=L + 60, dy=170)
# ---------- clip 2 (f213-363): detective investigation, moving around the baby
drop(213, 221, 'D', H, yaw=-.5, dx=R - 60, dy=110, **D); stand(222, 236, 'D', H, yaw=-.5, dx=R - 60, dy=110, **D); walk(237, 254, 'D', H, (R - 60, 110), (L + 40, 150), **D)
stand(255, 275, 'E', H, yaw=.5, dx=L + 50, dy=150, **D); hopto(276, 288, 'E', H, (L + 50, 150), (R - 40, 120), **D); stand(289, 310, 'E', H, yaw=-.5, dx=R - 40, dy=120, **D)
stand(311, 325, 'F', H, yaw=.4, dx=L + 40, dy=40, **D); walk(326, 340, 'F', H, (L + 40, 40), (R - 50, 60), **D); jump(341, 352, 'F', H, 1.2, dx=R - 50, dy=60, **D); launch(353, 363, 'F', H, dx=R - 50, dy=60, **D)
# ---------- clip 3 (f429-683)
drop(429, 437, 'G', H, yaw=-.3, dx=R - 80, dy=60, scmax=1.05, still=1, **D); stand(438, 452, 'G', H, yaw=-.4, dx=R - 80, dy=60, scmax=1.05, still=1, **D)
walk(453, 474, 'G', H, (R - 80, 60), (-40, 150), scmax=1.05, still=1, **D)
stand(475, 495, 'H', H, yaw=.4, dx=L + 50, dy=-30, **D); hopto(496, 507, 'H', H, (L + 50, -30), (R - 30, -20), **D); stand(508, 531, 'H', H, yaw=-.4, dx=R - 30, dy=-20, **D)
stand(532, 556, 'I', H, yaw=.5, dx=L + 40, dy=60, **D); walk(557, 586, 'I', H, (L + 40, 60), (R - 30, 40), **D)
stand(587, 605, (780, 1320), H, yaw=-.4, **D); walk(606, 630, (780, 1320), H, (0, 0), (-480, -20), **D)
stand(631, 650, (300, 1300), H, yaw=.35, **D); hopto(651, 664, (300, 1300), H, (0, 0), (420, 20), **D); stand(665, 670, (720, 1320), H, yaw=-.3, **D); launch(671, 683, (720, 1320), H, **D)

for f, d in frames.items():   # keep the whole pion on screen while it stands / walks
    if d.get('pitch') is None: m = d['h'] * .42; d['x'] = min(max(d['x'], 30 + m), 1048 - m)
SHOT = [(0, 41), (42, 77), (78, 117), (213, 254), (255, 310), (311, 363), (429, 474), (475, 531), (532, 586), (587, 630), (631, 683)]
out = []
for f in range(NF):
    s = next((k for k, (a, b) in enumerate(SHOT) if a <= f <= b), 0)
    o = {'f': f, 's': s, 'vis': False, 'x': 0, 'y': 0, 'h': 100, 'yaw': 0, 'roll': 0, 'rx': 0, 'ry': 0, 'rh': 1, 'arr': SHOT[s][0] / FPS, 'van': None,
         'tpIn': False, 'pitch': None, 'fallT': None, 'noshadow': False, 'physy': False, 'track': True, 'spd': 0, 'dx': 0, 'dy': 0, 'dist': 0}
    if f in frames: o.update(vis=True, **frames[f]); o.update(rx=o['x'], ry=o['y'], rh=o['h'])
    out.append(o)
json.dump(out, open('plan.json', 'w'))

E = lambda *a: list(a)
TLX = {
  'expr': [E(0, 'senang'), E(.55, 'penasaran'), E(.95, 'kaget'), E(1.6, 'kaget'), E(2.2, 'ngakak'), E(2.6, 'kaget'),
           E(7.1, 'kaget'), E(7.45, 'curiga'), E(8.5, 'penasaran'), E(9.4, 'curiga'), E(10.37, 'curiga'), E(11.2, 'penasaran'), E(11.37, 'kaget'),
           E(14.3, 'curiga'), E(15.83, 'penasaran'), E(16.6, 'curiga'), E(17.73, 'penasaran'), E(18.0, 'kaget'), E(18.5, 'senang'),
           E(19.57, 'licik'), E(21.03, 'licik'), E(21.9, 'ngakak'), E(22.35, 'licik')],
  'startle': [.95, 11.37, 18.0],
  'fall': {'hit': -99, 'up': -99, 'ang': 0, 'dirDeg': 0},
  'ride': [{'t0': 7.1, 'land': 7.37}, {'t0': 14.3, 'land': 14.57}],
  'gest': [
    {'t0': .97, 't1': 1.4, 'type': 'up'},
    {'t0': 1.55, 't1': 2.4, 'type': 'point', 'side': 1, 'tgt': [930, 720]},
    {'t0': 2.65, 't1': 3.4, 'type': 'facepalm', 'side': -1},
    {'t0': 3.5, 't1': 3.93, 'type': 'flyarms'},
    {'t0': 7.4, 't1': 8.45, 'type': 'magnify', 'side': -1},
    {'t0': 8.5, 't1': 10.33, 'type': 'magnify', 'side': 1},
    {'t0': 10.4, 't1': 11.3, 'type': 'magnify', 'side': 1},
    {'t0': 11.37, 't1': 11.75, 'type': 'up'},
    {'t0': 11.77, 't1': 12.13, 'type': 'flyarms'},
    {'t0': 14.6, 't1': 15.8, 'type': 'magnify', 'side': 1},
    {'t0': 15.9, 't1': 17.0, 'type': 'think', 'side': 1},
    {'t0': 17.05, 't1': 17.7, 'type': 'magnify', 'side': -1},
    {'t0': 18.0, 't1': 19.4, 'type': 'point', 'side': -1, 'tgt': [230, 760]},
    {'t0': 19.6, 't1': 20.9, 'type': 'point', 'side': 1, 'tgt': [760, 1000]},
    {'t0': 21.05, 't1': 22.3, 'type': 'cross'},
    {'t0': 22.37, 't1': 22.8, 'type': 'flyarms'},
  ],
  'fx': [{'type': 'ask', 't0': 7.6, 't1': 8.4}, {'type': 'ask', 't0': 16.0, 't1': 17.0}, {'type': 'aha', 't0': 18.0, 't1': 19.4},
         {'type': 'sweat', 't0': 11.4, 't1': 12.1}],
  'button': {'x0': 0, 'y0': 0, 'x1': 0, 'y1': 0}, 'fake': {'t0': -99, 't1': -99},
}
SHOTCAM = [dict(pitch=22, fov=58, dir=[-.45, .78, .42], key=[1, .96, .9], keyI=.78, shA=.42, exp=1.0) for _ in SHOT]
SHOTCAM[6] = dict(pitch=22, fov=58, dir=[-.45, .78, .42], key=[1, .96, .9], keyI=.78, shA=.42, exp=1.0)
open('timeline_p4.js', 'w').write("'use strict';\n/* project 4 timeline (generated by plan_p4.py) */\nconst SHOTCAM = " + json.dumps(SHOTCAM) + ";\nconst TL = " + json.dumps(TLX) + ";\n")
print('visible', sum(o['vis'] for o in out))
