"""Pion path plan v3.
Segments per shot. mode 'track': keys (t,x,y[,h]) in the coords of the frame at t, stuck to the surface via
tracking, interpolated in reference space (pion RUNS between keys). mode 'screen': keys are raw screen
positions (hand-keyed object/body points). Between segments the pion teleports. 'hide' = teleport out."""
import json, math
import numpy as np
FPS = 30
TR = json.load(open('track.json'))['shots']
HSCALE = 0.86
GAP = 0.2
DOME = [(15.567, 547, 679), (15.667, 547, 779), (15.767, 547, 873), (15.867, 547, 963), (15.967, 547, 1058), (16.067, 547, 1142), (16.167, 547, 1186), (16.267, 547, 1200), (16.367, 547, 1207), (16.47, 547, 1210)]
STACK = [(4.133, 580, 750, 167, -1), (4.233, 554, 752, 190, -1), (4.333, 550, 757, 260, -1), (4.433, 502, 765, 297, -1), (4.533, 450, 768, 380, -1), (4.633, 428, 780, 419, -1), (4.733, 427, 812, 413, -3), (4.833, 427, 838, 413, -2.3), (4.933, 437, 840, 401, -.5), (5.033, 437, 856, 401, -1), (5.133, 437, 870, 401, -2.5), (5.233, 436, 893, 401, -2.5), (5.333, 442, 905, 401, -3), (5.467, 450, 933, 401, -3), (5.6, 450, 955, 401, -2), (5.733, 446, 983, 401, -2), (5.867, 454, 1006, 401, -2), (6.0, 454, 1012, 401, -2)]
APEX = [(6.834, 517, 906), (6.9, 517, 993), (6.967, 494, 1076), (7.033, 500, 1143), (7.1, 500, 1192), (7.167, 494, 1216), (7.267, 500, 1225), (7.367, 500, 1233), (7.467, 485, 1249), (7.6, 483, 1258)]
SHOULDER = [(0.0, 220, 676, 290, -16), (.2, 192, 690, 290, -16), (.4, 164, 679, 290, -15), (.6, 142, 679, 290, -14), (.8, 125, 708, 290, -13), (1.0, 108, 722, 290, -12), (1.17, 96, 735, 290, -12)]
SEG = [
    [dict(mode='screen', t=0.0, h=290, yaw=.3, pitch=14, noshadow=True, keys=SHOULDER),
     dict(mode='track', t=1.34, h=280, yaw=-.4, keys=[(1.34, 820, 1150)])],
    [dict(mode='track', t=2.55, h=290, yaw=-.35, keys=[(2.55, 1000, 1470), (2.95, 1000, 1470), (3.95, 905, 1150, 255)])],
    [dict(mode='screen', t=4.133, h=1, yaw=.15, pitch=24, noshadow=True, keys=STACK)],
    [dict(mode='track', t=6.0, h=270, yaw=-.25, keys=[(6.0, 905, 1120)])],
    [dict(mode='screen', t=6.834, h=258, yaw=0, pitch=16, noshadow=True, physy=True, keys=APEX)],
    [dict(mode='track', t=7.6, h=300, yaw=-.3, keys=[(7.6, 850, 1200), (8.85, 850, 1200), (9.35, 900, 1010, 240)])],
    [dict(mode='track', t=9.933, h=250, yaw=-.4, hide=11.0, keys=[(9.933, 960, 1230), (10.05, 960, 1230), (10.9, 880, 1080)])],
    [dict(mode='track', t=11.366, h=230, yaw=.25, keys=[(11.366, 415, 900), (11.42, 415, 900), (11.82, 372, 1058, 255)], fall=(11.84, -.12, .3))],
    [dict(mode='track', t=12.833, h=250, yaw=.3, keys=[(12.833, 335, 1110), (13.5, 335, 1110), (14.1, 300, 900, 210)])],
    [dict(mode='track', t=14.6, h=240, yaw=.35, hide=15.12, keys=[(14.6, 170, 1185)])],
    [dict(mode='screen', t=15.6, h=235, yaw=0, pitch=16, noshadow=True, physy=True, keys=DOME)],
    [dict(mode='track', t=16.466, h=290, yaw=-.25, keys=[(16.466, 850, 1212)]), dict(mode='track', t=18.02, h=265, yaw=-.15, keys=[(18.02, 830, 702)])],
]

def mat(a): return np.array([[a[0], a[1], a[2]], [a[3], a[4], a[5]], [0, 0, 1.0]])
def frame_A(si, f): s = TR[si]; return mat(s['A'][min(max(f, s['f0']), s['f1']) - s['f0']])
def shot_of(f):
    for i, s in enumerate(TR):
        if s['f0'] <= f <= s['f1']: return i
    return len(TR) - 1
def ease_out(u): return 1 - (1 - u) ** 3
def sstep(u): return u * u * (3 - 2 * u)

def interp(keys, t, smooth):
    i = 0
    while i < len(keys) - 1 and t >= keys[i + 1][0]: i += 1
    a, b = keys[i], keys[min(i + 1, len(keys) - 1)]
    u = 0 if b is a else min(1, max(0, (t - a[0]) / (b[0] - a[0])))
    if smooth: u = sstep(u)
    return [a[j] + (b[j] - a[j]) * u for j in range(1, len(a))]

out = []
nfr = TR[-1]['f1'] + 1
for f in range(nfr):
    t = f / FPS; si = shot_of(f); segs = SEG[si]; shot_t0 = TR[si]['f0'] / FPS; shot_t1 = (TR[si]['f1'] + 1) / FPS
    o = {'f': f, 's': si, 'vis': False, 'x': 0, 'y': 0, 'h': 100, 'yaw': 0, 'roll': 0, 'rx': 0, 'ry': 0, 'rh': 1, 'arr': 0, 'van': None,
         'tpIn': False, 'pitch': None, 'fallT': None, 'noshadow': False, 'physy': False}
    cur = None
    for k, sg in enumerate(segs):
        end = segs[k + 1]['t'] - GAP if k + 1 < len(segs) else shot_t1 + 1
        if 'hide' in sg: end = sg['hide']
        if sg['t'] - 1e-6 <= t < end - 1e-6: cur = (k, sg, end)
    if cur:
        k, sg, end = cur
        o.update(vis=True, arr=sg['t'], tpIn=sg['t'] > shot_t0 + 1e-3, van=end if end < shot_t1 else None, yaw=sg['yaw'] * .8,
                 pitch=sg.get('pitch'), noshadow=sg.get('noshadow', False), physy=sg.get('physy', False))
        keys = [(kk[0], kk[1], kk[2], kk[3] if len(kk) > 3 else sg['h'], kk[4] if len(kk) > 4 else 0.0) for kk in sg['keys']]
        if sg['mode'] == 'screen':
            x, y, h, rl = interp(keys, t, False); h *= HSCALE
            o.update(x=x, y=y, h=h, rx=x, ry=y, rh=h, roll=math.radians(rl))
        else:
            ref = []
            for ki, (kt, kx, ky, kh, _r) in enumerate(keys):
                if ki and (kx, ky) == tuple(keys[ki - 1][1:3]): ref.append((kt,) + ref[-1][1:]); continue
                Ai = np.linalg.inv(frame_A(si, round(kt * FPS)))
                p = Ai @ np.array([kx, ky, 1.0]); sc0 = math.sqrt(abs(np.linalg.det(Ai[:2, :2])))
                ref.append((kt, p[0], p[1], kh * HSCALE * sc0))
            rx, ry, rh = interp(ref, t, True)
            if 'fall' in sg:
                th, dx, dur = sg['fall']; o['fallT'] = th
                if t > th: rx += dx * rh * ease_out(min(1, (t - th) / dur))
            A = frame_A(si, f)
            q = A @ np.array([rx, ry, 1.0]); sc = math.sqrt(abs(np.linalg.det(A[:2, :2])))
            o.update(x=float(q[0]), y=float(q[1]), h=float(rh * sc), rx=float(rx), ry=float(ry), rh=float(rh), roll=float(math.atan2(A[1, 0], A[0, 0])), track=True)
    out.append(o)
dist = 0
for i, o in enumerate(out):
    p = out[i - 1] if i else None
    o['spd'] = 0.0; o['dx'] = 0.0; o['dy'] = 0.0
    if p and p['vis'] and o['vis'] and p['arr'] == o['arr'] and o.get('track'):
        dx, dy = (o['rx'] - p['rx']) / o['rh'], (o['ry'] - p['ry']) / o['rh']
        if o.get('fallT') and i / FPS > o['fallT']: dx = dy = 0
        o['spd'] = math.hypot(dx, dy) * FPS; o['dx'] = dx * FPS; o['dy'] = dy * FPS; dist += math.hypot(dx, dy)
    else: dist = 0
    o['dist'] = dist
json.dump(out, open('plan.json', 'w'))
bad = [o['f'] for o in out if o['vis'] and o['y'] + .05 * o['h'] > 1292 and (o['x'] + .31 * o['h'] > 250 and o['x'] - .31 * o['h'] < 830)]
oob = [o['f'] for o in out if o['vis'] and (o['x'] - .3 * o['h'] < 0 or o['x'] + .3 * o['h'] > 1078 or o['y'] - o['h'] < 280 or o['y'] > 1645)]
print('subtitle overlap frames:', bad, '\nout of frame:', oob)
for i in range(1, len(out)):
    a, b = out[i - 1], out[i]
    if a['vis'] and b['vis'] and a['arr'] == b['arr'] and b.get('track'):
        v = math.hypot(b['rx'] - a['rx'], b['ry'] - a['ry']) / b['rh'] * FPS
        if v > 2.6: print('fast', i, round(v, 2))
