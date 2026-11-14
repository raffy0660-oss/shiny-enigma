"""Project 1 plan: where the Pion Raja is in every video frame (white screens are rendered separately in the castle).
Writes plan.json (per-frame placement for render.js) and timeline_p1.js (expressions, gestures, effects, shot lights)."""
import json, math
FPS = 30
AN = {k: {int(f): v for f, v in d.items()} for k, d in json.load(open('anchors.json')).items()}
NF = 970

def anc(name, f):
    d = AN[name]; f = min(max(f, min(d)), max(d)); return d[f]
def lerp(a, b, t): return a + (b - a) * t
def sstep(u): return u * u * (3 - 2 * u)
def ease_in(u): return u * u * u
def interp(keys, t, ease=sstep):
    i = 0
    while i < len(keys) - 1 and t >= keys[i + 1][0]: i += 1
    a, b = keys[i], keys[min(i + 1, len(keys) - 1)]
    u = 0 if b is a else min(1, max(0, (t - a[0]) / (b[0] - a[0])))
    u = ease(u)
    return [a[j] + (b[j] - a[j]) * u for j in range(1, len(a))]

# ---- segments: (shot, t0, t1, spec)
#   spec 'stand': anchor, h (px at anchor scale 1), dx/dy offsets (px at scale 1), yaw
#   spec 'keys' : list of (t, x, y, h, rollDeg[, lift]) screen keys (absolute), ease
SEG = []
def stand(s, t0, t1, anchor, h, yaw=0., dx=0., dy=0., tp=False, van=False, **kw):
    SEG.append(dict(s=s, t0=t0, t1=t1, kind='stand', anchor=anchor, h=h, yaw=yaw, dx=dx, dy=dy, tp=tp, van=van, **kw))
def keys(s, t0, t1, ks, yaw=0., tp=False, van=False, ease='smooth', **kw):
    SEG.append(dict(s=s, t0=t0, t1=t1, kind='keys', keys=[k if len(k) > 5 else tuple(k) + (0,) for k in ks], yaw=yaw, tp=tp, van=van, ease=ease, **kw))
def eo(u): return 1 - (1 - u) ** 2
def frames(t0, t1): n = max(2, round((t1 - t0) * FPS)); return [t0 + (t1 - t0) * k / n for k in range(n + 1)]
def hop(s, t0, t1, anchor, h, dx_from=0., dx_to=0., hops=2, height=.5, dx=0., yaw=0., **kw):
    """hop along a tracked surface: from anchor+dx_from to anchor+dx_to (px at scale 1) in `hops` bounces"""
    ks = []
    for t in frames(t0, t1):
        u = (t - t0) / (t1 - t0); x, y, sc, ang = anc(anchor, round(t * FPS)); w = eo(u)
        ks.append((t, x + (dx + dx_from + (dx_to - dx_from) * w) * sc, y, h * sc, -6 * math.sin(math.pi * hops * u), h * sc * height * abs(math.sin(math.pi * hops * u)) * (1 - .35 * u)))
    keys(s, t0, t1, ks, yaw=yaw, ease='lin', physy=True, **kw)
def drop(s, t0, t1, anchor, h, from_lift, dx=0., yaw=0., spin=0., **kw):
    """fall / slide down onto a tracked surface (accelerating), lands at t1"""
    ks = []
    for t in frames(t0, t1):
        u = (t - t0) / (t1 - t0); x, y, sc, ang = anc(anchor, round(t * FPS))
        ks.append((t, x + dx * sc, y - from_lift * (1 - u * u), h * sc, spin * (1 - u), 0))  # screen-space drop (a 3D lift this high would be seen from below)
    keys(s, t0, t1, ks, yaw=yaw, ease='lin', physy=True, noshadow=True, **kw)
RIDES = []
def launch(s, t0, t1, x, y, h, yaw=0.):  # fly up toward the camera: anticipation dip, then grow past the lens
    keys(s, t0, t1, [(t0, x, y, h, 0), (t0 + .08, x, y + .03 * h, h * .97, 0), (t1, 539, 960 + 1500, 3000, -8)], yaw=yaw, ease='in', noshadow=True, pitch=10)

# pink filler piece in the brick clip, tracked by colour: top-centre of the piece (it grows upward)
PK = {int(k): v for k, v in json.load(open('pink.json')).items() if v}
pk = sorted(PK); xs = {f: (PK[f][3] + PK[f][4]) / 2 for f in pk}; ys = {f: PK[f][1] for f in pk}
AN['P'] = {}
for f in range(372, 427):
    near = [g for g in pk if abs(g - f) <= 2 and g <= 420]
    if not near: near = [420]
    AN['P'][f] = [sum(xs[g] for g in near) / len(near), sum(ys[g] for g in near) / len(near) + 6, 1.0, 0.0]

# Clip A (0 - 3.43): standing on the corner piece; the hand pulls the piece and he gets yanked FORWARD with it
#   (toward the camera: bigger, lower, stumbling), the object turns red -> zap -> blasted off to the LEFT
stand(0, 0.0, 1.45, 'A', 255, yaw=-.15)
EDGE = (733, 877)   # top edge, right tip of the piece the moment it turns red (frames 59-60)
def yanked(t):      # pulled along with the piece: slides to its front edge, toward the camera (grows), stumbling
    f = round(t * FPS); x, y, sc, ang = anc('A', f); u = min(1, max(0, (t - 1.45) / .53)); w = u * u * (3 - 2 * u)
    return (t, lerp(x, EDGE[0], w), lerp(y, EDGE[1], w), 255 * sc * (1 + .2 * w), 9 * math.sin(u * 9) * (1 - u) + 5 * w, 16 * sc * abs(math.sin(u * 3 * math.pi)) * (1 - u))
keys(0, 1.45, 1.98, [yanked(t) for t in frames(1.45, 1.98)], yaw=0., ease='lin')
_, x0, y0, h0, _, _ = yanked(1.98)
#   zapped ON the edge, then flung from that edge up and over the top of the (growing) red object, out to the left
keys(0, 1.98, 2.38, [(1.98, x0, y0, h0, 5), (2.04, x0 + 4, y0 - 6, h0 * 1.02, 10), (2.10, 650, 575, h0 * 1.05, -45),
                     (2.20, 360, 360, h0 * 1.1, -230), (2.38, -300, 300, h0 * 1.15, -560)], yaw=.3, ease='lin', noshadow=True)

# Clip B (3.43 - 5.13): falls from the sky onto the black plate, BONK + dizzy, gets up, cheers, launches to the camera
xb, yb, scb, _ = anc('B', 116)
keys(1, 3.43, 3.87, [(3.43, xb + 40, 100, 300, 25), (3.87, xb, yb, 300, 0)], ease='in', noshadow=True, physy=True)
stand(1, 3.87, 4.75, 'B', 300, yaw=.1, fall=True)
xl, yl, scl, _ = anc('B', 143)
launch(1, 4.75, 5.13, xl, yl, 300 * scl)

# Clip C (7.27 - 10.37): hops in from the right edge next to the crack, watches the strands rain down, points, claps
hop(2, 7.4, 7.9, 'C', 290, dx_from=420, dx_to=0, hops=3, height=.45, yaw=-.6)
stand(2, 7.9, 10.37, 'C', 290, yaw=-.35, physy=True); RIDES.append({'t0': 7.4, 'land': 7.9})
# Clip D (10.37 - 14.23): jumps in from the right onto the pink piece and gets lifted up as it fills the gap
hop(3, 12.3, 12.75, 'P', 280, dx_from=430, dx_to=0, hops=2, height=.55, yaw=-.5)
stand(3, 12.75, 14.23, 'P', 280, yaw=-.25, physy=True); RIDES.append({'t0': 12.3, 'land': 12.75})
# Clip E (14.23 - 17.10): slides down the lamp pole onto its base next to the egg, startled by the crack, points, launches
drop(4, 14.25, 14.58, 'E', 290, 900, dx=-10, yaw=.3, spin=0)
stand(4, 14.58, 16.4, 'E', 290, yaw=.45, dx=40, physy=True); RIDES.append({'t0': 14.25, 'land': 14.58})
xe, ye, sce, _ = anc('E', 492)
launch(4, 16.4, 17.1, xe + 40 * sce, ye, 290 * sce, yaw=.3)
# Clip F (22.03 - 24.80): hops along the windowsill from the right, waves at the pedestrians, points at the guy scanning
hop(5, 23.0, 23.45, 'F', 300, dx_from=330, dx_to=0, hops=2, height=.4, yaw=-.6)
stand(5, 23.45, 24.8, 'F', 300, yaw=-.3, physy=True); RIDES.append({'t0': 23.0, 'land': 23.45})
# Clip G (24.80 - 27.50): hops onto the gate rail, watches the scan, hops away before the cyclist,
#   drops onto the "Claimed" card, cheers, launches to the camera
hop(6, 24.85, 25.25, 'G1', 300, dx_from=480, dx_to=0, hops=2, height=.45, yaw=-.6)
stand(6, 25.25, 25.95, 'G1', 300, yaw=-.45, physy=True); RIDES.append({'t0': 24.85, 'land': 25.25})
hop(6, 25.95, 26.2, 'G1', 300, dx_from=0, dx_to=520, hops=1, height=.6, yaw=.6)
drop(7, 26.55, 26.85, 'G2', 290, 760, yaw=-.2, spin=-20)
stand(7, 26.85, 27.13, 'G2', 290, yaw=-.2, physy=True); RIDES.append({'t0': 26.55, 'land': 26.85})
xg, yg, scg, _ = anc('G2', 814)
launch(7, 27.13, 27.5, xg, yg, 290 * scg)

out = []
for f in range(NF):
    t = f / FPS
    o = {'f': f, 's': 0, 'vis': False, 'x': 0, 'y': 0, 'h': 100, 'yaw': 0, 'roll': 0, 'rx': 0, 'ry': 0, 'rh': 1, 'arr': 0, 'van': None,
         'tpIn': False, 'pitch': None, 'fallT': None, 'noshadow': False, 'physy': False, 'track': True, 'spd': 0, 'dx': 0, 'dy': 0, 'dist': 0}
    cur = None
    for i, g in enumerate(SEG):
        if g['t0'] - 1e-6 <= t < g['t1'] - 1e-6: cur = (i, g)
    if cur:
        i, g = cur
        if g['kind'] == 'stand':
            x, y, sc, ang = anc(g['anchor'], f); x += g['dx'] * sc; y += g['dy'] * sc; h = g['h'] * sc; roll = ang; lift = 0
        else:
            ez = {'smooth': sstep, 'in': ease_in, 'lin': lambda u: u}[g['ease']]
            x, y, h, rl, lift = interp(g['keys'], t, ez); roll = math.radians(rl)
        # the chain of segments in one shot keeps physics continuous unless it is a teleport
        prev = SEG[i - 1] if i else None
        arr = g['t0']
        if prev and prev['s'] == g['s'] and abs(prev['t1'] - g['t0']) < 1e-6 and not g['tp']:
            j = i
            while j > 0 and SEG[j - 1]['s'] == g['s'] and abs(SEG[j - 1]['t1'] - SEG[j]['t0']) < 1e-6 and not SEG[j]['tp']: j -= 1
            arr = SEG[j]['t0']
        o.update(s=g['s'], vis=True, x=x, y=y, h=h, rx=x, ry=y, rh=h, roll=roll, yaw=g['yaw'], arr=arr, tpIn=g['tp'] and arr == g['t0'],
                 van=g['t1'] if g['van'] else None, pitch=g.get('pitch'), noshadow=g.get('noshadow', False), physy=g.get('physy', False),
                 fallT=4.0 if g.get('fall') else None, lift=lift)
    out.append(o)
json.dump(out, open('plan.json', 'w'))

# ---------- timeline (expressions, gestures, effects, per-shot camera/light)
E = lambda *a: list(a)
TLX = {
  'expr': [E(0, 'imut'), E(.9, 'penasaran'), E(1.4, 'kaget'), E(1.98, 'kaget'), E(3.43, 'kaget'), E(3.87, 'pusing'), E(4.3, 'datar'), E(4.45, 'senang'),
           E(7.4, 'senang'), E(7.9, 'penasaran'), E(8.0, 'kaget'), E(8.6, 'penasaran'), E(9.4, 'senang'), E(10.0, 'imut'),
           E(12.3, 'senang'), E(12.8, 'penasaran'), E(12.95, 'kaget'), E(13.4, 'senang'),
           E(14.25, 'senang'), E(14.6, 'penasaran'), E(14.8, 'kaget'), E(15.1, 'penasaran'), E(15.75, 'curiga'), E(16.1, 'senang'),
           E(23.0, 'senang'), E(23.9, 'penasaran'), E(24.3, 'sinis'),
           E(24.9, 'penasaran'), E(25.5, 'curiga'), E(26.55, 'kaget'), E(26.85, 'senang'), E(27.0, 'ngakak')],
  'startle': [1.38, 8.0, 12.95, 14.8, 16.37, 27.1],
  'fall': {'hit': 3.87, 'up': 4.3, 'ang': 1.45, 'dirDeg': 200},
  'ride': [{'t0': 3.43, 'land': 3.87}] + RIDES,
  'gest': [
    {'t0': .15, 't1': .85, 'type': 'wave', 'side': 1},
    {'t0': 1.42, 't1': 1.98, 'type': 'up'},
    {'t0': 1.98, 't1': 2.36, 'type': 'up'},
    {'t0': 4.45, 't1': 4.75, 'type': 'cheer'},
    {'t0': 4.75, 't1': 5.13, 'type': 'flyarms'},
    {'t0': 7.95, 't1': 8.5, 'type': 'lookout', 'side': 1},
    {'t0': 8.6, 't1': 9.3, 'type': 'point', 'side': -1, 'tgt': [560, 1080]},
    {'t0': 9.45, 't1': 10.2, 'type': 'clap'},
    {'t0': 12.3, 't1': 12.75, 'type': 'flyarms'},
    {'t0': 12.95, 't1': 13.35, 'type': 'up'},
    {'t0': 13.4, 't1': 14.2, 'type': 'cheer'},
    {'t0': 14.25, 't1': 14.55, 'type': 'up'},
    {'t0': 14.82, 't1': 15.08, 'type': 'up'},
    {'t0': 15.1, 't1': 15.8, 'type': 'point', 'side': 1, 'tgt': [560, 1080]},
    {'t0': 15.85, 't1': 16.4, 'type': 'think', 'side': 1},
    {'t0': 16.4, 't1': 17.1, 'type': 'flyarms'},
    {'t0': 23.15, 't1': 23.85, 'type': 'wave', 'side': -1},
    {'t0': 23.95, 't1': 24.75, 'type': 'point', 'side': -1, 'tgt': [720, 900]},
    {'t0': 25.25, 't1': 25.55, 'type': 'lookout', 'side': -1},
    {'t0': 25.55, 't1': 25.95, 'type': 'point', 'side': -1, 'tgt': [560, 860]},
    {'t0': 26.85, 't1': 27.13, 'type': 'cheer'},
    {'t0': 27.13, 't1': 27.5, 'type': 'flyarms'},
  ],
  'fx': [{'type': 'zap', 't0': 1.98, 't1': 2.16}, {'type': 'twinkle', 't': 2.36, 'x': 70, 'y': 400, 'r': 115}],
  'button': {'x0': 0, 'y0': 0, 'x1': 0, 'y1': 0},
  'fake': {'t0': -99, 't1': -99},
}
SHOT = [  # pitch (deg) of the virtual camera + light per clip
  dict(pitch=30, fov=58, dir=[-.55, .74, .38], key=[1, .92, .82], keyI=.75, shA=.5, exp=1.0),   # A street ledge
  dict(pitch=34, fov=58, dir=[-.5, .78, .38], key=[1, .93, .84], keyI=.72, shA=.45, exp=1.0),   # B plate
  dict(pitch=22, fov=58, dir=[-.5, .8, .35], key=[.95, .97, 1], keyI=.7, shA=.5, exp=1.0),      # C stone crack
  dict(pitch=12, fov=58, dir=[-.6, .72, .35], key=[1, .9, .85], keyI=.72, shA=.45, exp=1.0),    # D bricks
  dict(pitch=38, fov=58, dir=[-.5, .78, .38], key=[.95, .97, 1], keyI=.7, shA=.45, exp=1.0),    # E pole base
  dict(pitch=6, fov=58, dir=[-.55, .75, .38], key=[1, .95, .9], keyI=.72, shA=.35, exp=1.0),    # F windowsill
  dict(pitch=6, fov=58, dir=[-.55, .75, .38], key=[1, .95, .9], keyI=.72, shA=.4, exp=1.0),     # G gate
  dict(pitch=4, fov=58, dir=[-.4, .8, .45], key=[1, 1, 1], keyI=.72, shA=.35, exp=1.0),         # G card
]
open('timeline_p1.js', 'w').write("'use strict';\n/* project 1 timeline (generated by plan_p1.py) */\nconst SHOTCAM = " + json.dumps(SHOT) + ";\nconst TL = " + json.dumps(TLX) + ";\n")
vis = [o['f'] for o in out if o['vis']]
print('visible frames', len(vis), 'of', NF)
