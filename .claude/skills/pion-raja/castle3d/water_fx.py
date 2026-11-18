"""Water effects for the castle scenes: a leak, the left wall bursting, the room flooding, life underwater.

Runs on the composited scene frames (castle_video.py step 3) before the Remotion camera, so the camera zooms,
tilts and blurs the water together with the room. Pion's own alpha (engine frames, same transform as the
composite) keeps the torrent and the debris BEHIND him, while the underwater look covers him too.

Cue lines (in the same cue file as everything else; times in seconds):
  <t> leak [y]                 a crack in the left wall starts to trickle (y = height as a fraction of the frame)
  <t> burst [y]                the left wall breaks open: crack spread, debris, a torrent pouring in
  <t> flood <dur> [ease]       the water rises from the floor until it covers the whole frame (takes <dur> s)
  <t> underwater               already fully under water from t on (scene that starts submerged)
  <t> blub <dur>               big bubbles gush out of his mouth ("blubuk-blubuk")
  <t> ring fail <dur>          a lumpy, absurd bubble ring wobbles out of his mouth and pops almost at once
  <t> ring good <dur>          a perfect bubble ring: out of the mouth, growing, flying at the camera (fills the lens)
  <t> breath <0..1>            bubbles from the mouth while he talks underwater (default 1)
"""
import json
import math
import os
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image

W_CMDS = ("leak", "burst", "flood", "underwater", "blub", "ring", "breath")


def parse(path):
    ev = []
    for line in open(path, encoding="utf-8"):
        w = line.split("#")[0].split()
        if len(w) < 2 or w[1] not in W_CMDS:
            continue
        try:
            t = float(w[0])
        except ValueError:
            continue
        ev.append((t, w[1], w[2:]))
    return sorted(ev, key=lambda e: e[0])


def has_water(path):
    return bool(parse(path))


def sstep(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1) if not np.isscalar(x) else min(1.0, max(0.0, (x - a) / (b - a)))
    return u * u * (3 - 2 * u)


def rng_for(seed):
    return np.random.default_rng(seed)


class Plan:
    """Everything that depends only on time (water level, events), evaluated per frame."""

    def __init__(self, events, SW, SH, fps, n):
        self.SW, self.SH, self.fps, self.n = SW, SH, fps, n
        self.floor = 0.72 * SH
        self.leak = self.burst = self.flood = self.under = None
        self.leak_y = self.burst_y = 0.42
        self.leak_x = self.burst_x = 0.0
        self.blubs, self.rings, self.breath = [], [], [(0.0, 1.0)]
        for t, c, a in events:
            if c == "leak":
                self.leak = t; self.leak_y = float(a[0]) if a else 0.44; self.leak_x = float(a[1]) if len(a) > 1 else 0.0
            elif c == "burst":
                self.burst = t; self.burst_y = float(a[0]) if a else 0.40; self.burst_x = float(a[1]) if len(a) > 1 else 0.0
            elif c == "flood":
                self.flood = (t, float(a[0]) if a else 2.5)
            elif c == "underwater":
                self.under = t
            elif c == "blub":
                self.blubs.append((t, float(a[0]) if a else 1.0))
            elif c == "ring":
                self.rings.append((t, a[0] if a else "good", float(a[1]) if len(a) > 1 else 1.0))
            elif c == "breath":
                self.breath.append((t, float(a[0]) if a else 1.0))

    def level(self, t):
        """Screen y of the still-water surface (SH = nothing yet, < 0 = whole frame under water)."""
        if self.under is not None and t >= self.under:
            return -0.2 * self.SH
        if self.flood is None or t < self.flood[0]:
            if self.leak is not None and t >= self.leak:       # a thin puddle spreading on the floor
                return self.SH * 1.5
            return self.SH * 1.5
        t0, d = self.flood
        u = min(1.0, (t - t0) / d)
        u = 1 - (1 - u) ** 1.6                                  # fast at first (the torrent), slower near the top
        return self.floor + (-0.2 * self.SH - self.floor) * u

    def breath_at(self, t):
        v = 1.0
        for t0, b in self.breath:
            if t >= t0:
                v = b
        return v


# ---------------------------------------------------------------- procedural textures

def caustic_tex(n=512, seed=3):
    """Tileable caustic net (bright thin web), values 0..1."""
    r = rng_for(seed)
    pts = r.random((28, 2)) * n
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    d1 = np.full((n, n), 1e9, np.float32); d2 = np.full((n, n), 1e9, np.float32)
    for ox in (-n, 0, n):
        for oy in (-n, 0, n):
            for p in pts:
                d = np.hypot(xx - p[0] - ox, yy - p[1] - oy)
                m = d < d1
                d2 = np.where(m, d1, np.minimum(d2, d))
                d1 = np.where(m, d, d1)
    e = d2 - d1
    c = np.exp(-e / (n * 0.012))
    return (c / c.max()).astype(np.float32)


def ray_tex(n=1024, seed=5):
    r = rng_for(seed)
    x = np.zeros(n, np.float32)
    for _ in range(18):
        c, w, a = r.random() * n, 4 + r.random() * 30, 0.3 + r.random() * 0.7
        d = np.minimum(np.abs(np.arange(n) - c), n - np.abs(np.arange(n) - c))
        x += a * np.exp(-(d / w) ** 2)
    return x / x.max()


def noise2(shape, scale, seed):
    r = rng_for(seed)
    small = r.random((max(2, shape[0] // scale), max(2, shape[1] // scale))).astype(np.float32)
    return cv2.resize(small, (shape[1], shape[0]), interpolation=cv2.INTER_CUBIC)


# ---------------------------------------------------------------- drawing helpers (float RGB in 0..1, premultiplied layers)

def over(dst, rgb_p, a):
    """premultiplied layer over dst (in place)"""
    dst *= (1 - a[..., None])
    dst += rgb_p


def over_s(dst, rgb, a):
    """straight-colour layer over dst (in place)"""
    a = a[..., None]
    dst *= (1 - a)
    dst += rgb * a


def soft_circle_layer(H, W, items, ss=1):
    """items: (x, y, r, rgb, alpha, kind) -> (rgb, alpha) layer. kind: 'bubble' | 'dot' | 'foam'."""
    col = np.zeros((H, W, 3), np.float32); al = np.zeros((H, W), np.float32)
    for x, y, r, rgb, a, kind in items:
        if r < 0.6 or x < -r * 2 or y < -r * 2 or x > W + r * 2 or y > H + r * 2:
            continue
        x0, x1 = int(max(0, x - r * 1.6)), int(min(W, x + r * 1.6 + 1)); y0, y1 = int(max(0, y - r * 1.6)), int(min(H, y + r * 1.6 + 1))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d = np.hypot(xx - x, yy - y) / r
        if kind == "bubble":     # clear bubble: bright rim, faint inside, highlight dot
            rim = np.clip(1 - np.abs(d - 0.9) / 0.16, 0, 1) ** 1.2
            inner = np.clip(1 - d, 0, 1) * 0.18
            hl = np.clip(1 - np.hypot(xx - (x - r * .38), yy - (y - r * .38)) / (r * .26), 0, 1) ** 1.5
            edge = np.clip(1 - np.abs(d - 1.02) / 0.07, 0, 1) * 0.55        # thin dark teal ink line
            A = np.clip(rim * 0.85 + inner + hl, 0, 1) * a
            C = np.array(rgb, np.float32)
            sub = col[y0:y1, x0:x1]; sa = al[y0:y1, x0:x1]
            ea = edge * a
            sub[:] = sub * (1 - ea[..., None]) + np.array([.05, .22, .3], np.float32) * ea[..., None]; sa[:] = sa + ea * (1 - sa)
            sub[:] = sub * (1 - A[..., None]) + C * A[..., None]; sa[:] = sa + A * (1 - sa)
        else:
            A = np.clip(1 - d, 0, 1) ** (2.2 if kind == "dot" else 1.0) * a
            sub = col[y0:y1, x0:x1]; sa = al[y0:y1, x0:x1]
            sub[:] = sub * (1 - A[..., None]) + np.array(rgb, np.float32) * A[..., None]; sa[:] = sa + A * (1 - sa)
    return col, al


def ring_layer(H, W, cx, cy, R, ry, wob, t, lumpy, alpha, thick):
    """A bubble ring seen from the front-ish: a glassy torus outline. lumpy: 0 = perfect, 1 = absurd shape."""
    col = np.zeros((H, W, 3), np.float32); al = np.zeros((H, W), np.float32)
    pad = R * 1.9 + thick * 3
    x0, x1 = int(max(0, cx - pad)), int(min(W, cx + pad)); y0, y1 = int(max(0, cy - pad)), int(min(H, cy + pad))
    if x1 <= x0 or y1 <= y0 or alpha <= 0.01:
        return col, al
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    dx, dy = (xx - cx) / R, (yy - cy) / (R * ry)
    th = np.arctan2(dy, dx)
    rr = 1 + wob * 0.04 * np.sin(3 * th + t * 9)
    if lumpy > 0:   # pretzel-ish lumps, a dent and a pointy corner
        rr = rr + lumpy * (0.34 * np.sin(3 * th + 1.3 + t * 7) + 0.22 * np.sin(5 * th - t * 11) + 0.18 * np.cos(2 * th + 0.4))
    d = np.hypot(dx, dy) - rr
    tw = thick / R * (1 + lumpy * 0.6 * np.sin(4 * th + t * 13))
    core = np.clip(1 - np.abs(d) / tw, 0, 1)
    rim = core ** 0.6
    shine = np.clip(1 - np.abs(d + tw * 0.45) / (tw * 0.35), 0, 1) * np.clip(np.sin(th - 2.3) * 1.2, 0, 1)   # highlight on the upper-left of the tube
    ink = np.clip(1 - np.abs(np.abs(d) - tw) / (tw * 0.22), 0, 1) * 0.7
    body = np.array([.82, .96, 1.0], np.float32)
    A = np.clip(rim * (0.62 + 0.25 * lumpy) + shine * 0.9, 0, 1) * alpha
    E = ink * alpha
    sl = (slice(y0, y1), slice(x0, x1))
    col[sl] = np.array([.04, .26, .36], np.float32) * E[..., None]
    al[sl] = E
    col[sl] = col[sl] * (1 - A[..., None]) + (body + shine[..., None] * .2) * A[..., None]
    al[sl] = al[sl] + A * (1 - al[sl])
    return col, al


def band_layer(H, W, cl, ws, rgb, alpha, t, flow, nstreak):
    """A cartoon stream of water along a centre line: filled body, ink outline, lighter core, foam streaks
    flowing along it. cl: [(x, y)], ws: half widths."""
    cl = np.array(cl, np.float32); ws = np.array(ws, np.float32)
    if len(cl) < 2:
        return np.zeros((H, W, 3), np.float32), np.zeros((H, W), np.float32)
    tg = np.gradient(cl, axis=0); tg /= np.maximum(np.linalg.norm(tg, axis=1, keepdims=True), 1e-6)
    nm = np.stack([-tg[:, 1], tg[:, 0]], 1)
    left, right = cl + nm * ws[:, None], cl - nm * ws[:, None]
    body = poly_mask(H, W, np.concatenate([left, right[::-1]]), 1.0)
    core = poly_mask(H, W, np.concatenate([cl + nm * (ws * .15)[:, None], (cl - nm * (ws * .55)[:, None])[::-1]]), 2.0)
    ew = max(2, int(W / 420))
    er = cv2.erode((body > 0.5).astype(np.uint8), np.ones((2 * ew + 1, 2 * ew + 1), np.uint8)).astype(np.float32)
    ink = np.clip(body - cv2.GaussianBlur(er, (0, 0), .8), 0, 1)
    st = np.zeros((H, W), np.uint8)
    n = len(cl)
    for j in range(nstreak):
        ph = (j * 0.618 + t * flow / max(1, n / 20)) % 1.0
        i = min(n - 1, int(ph * (n - 1)))
        off = ((j * 0.37) % 1 - 0.5) * 1.3
        p = cl[i] + nm[i] * ws[i] * off
        ln = max(3.0, ws[i] * (0.9 + (j % 3) * .5))
        ang = math.degrees(math.atan2(tg[i, 1], tg[i, 0]))
        cv2.ellipse(st, (int(p[0] * 4), int(p[1] * 4)), (int(ln * 4), int(max(1.5, ws[i] * .09) * 4)), ang, 0, 360, 255, -1, cv2.LINE_AA, 2)
    streak = cv2.GaussianBlur(st.astype(np.float32) / 255.0, (0, 0), 1.0) * body
    col = np.zeros((H, W, 3), np.float32)
    col[:] = np.array(rgb, np.float32)
    col = col * (1 - core[..., None] * .5) + np.array([.86, .96, 1.0], np.float32) * core[..., None] * .5
    col = col * (1 - streak[..., None]) + streak[..., None]
    a = np.clip(body * alpha, 0, 1)
    col = col * (1 - ink[..., None]) + np.array([.04, .2, .3], np.float32) * ink[..., None]
    a = np.maximum(a, ink)
    return col * a[..., None], a


def poly_mask(H, W, pts, blur=1.2):
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.round(np.array(pts) * 4).astype(np.int32)], 255, lineType=cv2.LINE_AA, shift=2)
    m = m.astype(np.float32) / 255.0
    if blur > 0:
        m = cv2.GaussianBlur(m, (0, 0), blur)
    return m


# ---------------------------------------------------------------- per-frame state

G = {}


def init(plan, track, pion, cfg):
    G.update(plan=plan, track=track, pion=pion, cfg=cfg)
    SW, SH = plan.SW, plan.SH
    G["caus"] = caustic_tex(384)
    G["rays"] = ray_tex(1024)
    r = rng_for(11)
    G["motes"] = r.random((260, 4)).astype(np.float32)                   # x, y, size, phase
    G["amb"] = r.random((40, 4)).astype(np.float32)                      # ambient rising bubbles
    G["debris"] = r.random((34, 6)).astype(np.float32)
    G["crack"] = crack_paths(r, plan)
    G["foam"] = r.random((700, 3)).astype(np.float32)


def crack_paths(r, plan):
    """Jagged crack polylines in the left wall around the breach point (fractions of the frame)."""
    paths = []
    for k in range(9):
        ang = -1.1 + k * 0.28 + r.normal(0, .08)
        p = [(0.0, plan.burst_y + r.normal(0, .01))]
        L = 0.05 + r.random() * 0.14
        for s in range(6):
            a = ang + r.normal(0, .35)
            p.append((p[-1][0] + math.cos(a) * L / 6 * 1.0, p[-1][1] + math.sin(a) * L / 6 * 0.6))
        paths.append(p)
    return paths


def pion_alpha(f):
    """Pion's alpha in scene pixels for frame f (same transform as castle_video.comp_frame)."""
    P = G["pion"]
    if P is None:
        return None
    path = os.path.join(P["dir"], f"{f:05d}.png")
    if not os.path.isfile(path):
        return None
    k, ecx, eb, pcx, py1 = P["xf"]
    SW, SH = G["plan"].SW, G["plan"].SH
    src = Image.open(path).getchannel("A")
    a = src.transform((SW, SH), Image.AFFINE, (1 / k, 0, ecx - pcx / k, 0, 1 / k, eb - py1 / k), resample=Image.BILINEAR)
    return np.asarray(a).astype(np.float32) / 255.0


def UA(a, b):
    """alpha union"""
    return a + b * (1 - a)


def frame(f):
    S = G; P = S["plan"]; SW, SH, fps = P.SW, P.SH, P.fps
    t = f / fps
    path = os.path.join(S["cfg"]["dir"], f"{f:05d}.jpg")
    img = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255.0
    out = img.copy()
    pa = None
    tr = S["track"][f] if f < len(S["track"]) else None
    mouth = tr["mouth"] if tr else None
    lvl = P.level(t)
    yy = None

    # ---------------- above-water events: crack, leak, burst, torrent, debris (behind Pion)
    behind_c = np.zeros_like(out); behind_a = np.zeros((SH, SW), np.float32)
    front_items = []
    if P.leak is not None and t >= P.leak:
        e = t - P.leak
        ly = P.leak_y * SH
        # hairline crack, growing a little
        g = min(1.0, e / 0.6) * (0.35 if P.burst is None or t < P.burst - .6 else 0.35 + 0.65 * sstep(P.burst - .6, P.burst, t))
        crack = np.zeros((SH, SW), np.uint8)
        for pth in S["crack"]:
            pts = [(x * SW + P.leak_x * SW, (y - P.burst_y) * SH + ly) for x, y in pth]
            m = max(2, int(round(len(pts) * g)))
            cv2.polylines(crack, [np.round(np.array(pts[:m]) * 4).astype(np.int32)], False, 255, max(3, SW // 260), cv2.LINE_AA, 2)
        cm = cv2.GaussianBlur(crack.astype(np.float32) / 255.0, (0, 0), 0.8)
        over_s(behind_c, np.array([.07, .04, .03], np.float32) * np.ones_like(out), cm * 0.9); behind_a = UA(behind_a, cm * 0.9)
        if P.burst is None or t < P.burst:
            # a trickle arcing out of the crack and splashing on the floor, puddle spreading
            wob = 1 + 0.18 * math.sin(t * 11) + 0.08 * math.sin(t * 23)
            v0 = SW * 0.09 * wob * min(1.0, e / 0.4)
            cl, ws = [], []
            for i in range(60):
                s_ = i / 59 * 0.6
                x, y = P.leak_x * SW + v0 * s_ - SW * 0.004, ly + 0.5 * (SH * 2.2) * s_ * s_
                cl.append((x, y)); ws.append(SW * (0.006 + 0.01 * s_))
                if y > P.floor + 0.035 * SH:
                    break
            c2, a2 = band_layer(SH, SW, cl, ws, (.62, .84, .97), .92, t, 2.2, 10)
            over(behind_c, c2, a2); behind_a = UA(behind_a, a2)
            items = []
            r = rng_for(f)
            hx = cl[-1][0]
            for i in range(18):                            # splash where it lands
                a_ = r.random() * math.pi
                d = r.random() * SW * 0.035
                items.append((hx + math.cos(a_) * d, P.floor + 0.035 * SH - math.sin(a_) * d * .7, SW * (0.003 + 0.003 * r.random()), (.9, .97, 1), .85, "dot"))
            c2, a2 = soft_circle_layer(SH, SW, items)
            over(behind_c, c2, a2); behind_a = UA(behind_a, a2)
            pud = min(1.0, e / 3.0)
            if pud > 0:
                if yy is None:
                    yy, xx = np.mgrid[0:SH, 0:SW].astype(np.float32)
                cxp, cyp = SW * (0.10 + P.leak_x), P.floor + 0.045 * SH
                d = ((xx - cxp) / (SW * (0.08 + 0.22 * pud))) ** 2 + ((yy - cyp) / (SH * (0.012 + 0.02 * pud))) ** 2
                pm = np.clip(1.15 - d, 0, 1) ** 0.7 * 0.55
                shine = np.clip(1 - np.abs(d - 0.6) / 0.25, 0, 1) * 0.35
                over_s(behind_c, np.array([.42, .62, .72], np.float32) + shine[..., None] * .6, pm); behind_a = UA(behind_a, pm)
    if P.burst is not None and t >= P.burst - 0.05:
        e = t - P.burst
        by = P.burst_y * SH
        hr = SW * 0.16
        # the hole: dark rough opening at the left edge (only visible above the water)
        r = rng_for(99)
        ang = np.linspace(-math.pi / 2, math.pi / 2, 24)
        rad = hr * (0.75 + 0.35 * r.random(24)) * sstep(0, 0.12, e)
        bx = P.burst_x * SW
        hole = [(bx + max(0, math.cos(a)) * rr - 6, by + math.sin(a) * rr * 1.25) for a, rr in zip(ang, rad)] + [(-10, by + hr * 1.3), (-10, by - hr * 1.3)]
        if rad.max() > 2:
            hm = poly_mask(SH, SW, hole, 1.0)
            over_s(behind_c, np.array([.05, .1, .14], np.float32) * np.ones_like(out), hm * 0.95); behind_a = UA(behind_a, hm * 0.95)
        # torrent: a thick, roaring column of water arcing out of the hole, foam streaks racing along it
        if e >= 0:
            k = sstep(0, 0.22, e)
            v0 = SW * (0.62 + 0.05 * math.sin(t * 7))
            cl, ws = [], []
            for i in range(80):
                s_ = (i / 79) * 0.8
                x, y = bx + v0 * s_ - SW * 0.02, by + 0.5 * SH * 2.0 * s_ * s_
                cl.append((x, y)); ws.append(hr * k * (0.55 + 0.9 * s_) * (1 + 0.06 * math.sin(s_ * 30 - t * 25)))
                if y > max(lvl, 0) + SH * 0.03 or y > SH * 1.08:
                    break
            if len(cl) > 2 and k > 0.01:
                c2, a2 = band_layer(SH, SW, cl, ws, (.55, .8, .96), .95, t, 3.5, 70)
                over(behind_c, c2, a2); behind_a = UA(behind_a, a2)
            items = []
            r = rng_for(f * 7 + 1)
            # spray where it hits the water / floor, plus droplets thrown off the column
            hx, hy = cl[-1]
            for i in range(110):
                a_ = r.random() * math.pi
                d = r.random() ** 0.6 * SW * 0.26 * k
                items.append((hx + math.cos(a_) * d, min(hy, SH) - math.sin(a_) * d * 0.8, SW * (0.004 + 0.011 * r.random()), (.93, .99, 1), .85, "dot"))
            for i in range(40):
                j = int(r.random() * (len(cl) - 1))
                items.append((cl[j][0] + r.normal(0, ws[j] * 1.1), cl[j][1] + r.normal(0, ws[j] * 0.8), SW * (0.003 + 0.006 * r.random()), (.95, 1, 1), .8, "dot"))
            c2, a2 = soft_circle_layer(SH, SW, items)
            over(behind_c, c2, a2); behind_a = UA(behind_a, a2)
            # debris: wall chunks flying out, tumbling, sinking once they hit the water
            for i, (rx, ry, rs, rv, rr2, rc) in enumerate(S["debris"]):
                te = e - rx * 0.08
                if te < 0:
                    continue
                vx = SW * (0.5 + 1.1 * rv); vy = -SH * (0.25 + 0.5 * ry)
                x = bx + vx * te; y = by + (ry - 0.5) * hr * 1.4 + vy * te + 0.5 * SH * 2.6 * te * te
                if y > lvl:   # in the water: slow sinking drift
                    y = min(y, SH * 0.98)
                if x > SW * 1.1 or te > 2.5:
                    continue
                sz = SW * (0.012 + 0.03 * rs)
                rot = te * (4 + 8 * rr2) * (1 if i % 2 else -1)
                pts = []
                for q in range(5):
                    a = rot + q / 5 * math.pi * 2 + rc
                    pts.append((x + math.cos(a) * sz * (0.7 + 0.4 * ((q * 37 + i) % 5) / 5), y + math.sin(a) * sz * (0.7 + 0.3 * ((q * 13 + i) % 4) / 4)))
                m = poly_mask(SH, SW, pts, 0.8)
                ink = cv2.dilate((m > 0.05).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32) - (m > 0.5)
                ink = np.clip(cv2.GaussianBlur(ink.astype(np.float32), (0, 0), .8), 0, 1)
                stone = np.array([.42, .3, .24], np.float32) * (0.75 + 0.5 * rc)
                over_s(behind_c, np.array([.08, .04, .03], np.float32) * np.ones_like(out), ink); behind_a = UA(behind_a, ink)
                over_s(behind_c, stone * np.ones_like(out), m); behind_a = UA(behind_a, m)
    if behind_a.max() > 0.003:
        pa = pion_alpha(f) if pa is None else pa
        keep = 1 - pa if pa is not None else 1
        a = behind_a * keep
        out = out * (1 - a[..., None]) + np.where(behind_a[..., None] > 1e-4, behind_c / np.maximum(behind_a[..., None], 1e-4), 0) * a[..., None]

    # ---------------- the water body
    if lvl < SH * 1.2:
        if yy is None:
            yy, xx = np.mgrid[0:SH, 0:SW].astype(np.float32)
        slosh = 0.0
        if P.flood is not None:
            e = t - P.flood[0]
            slosh = max(0.0, 1 - e / 3.0) if e > 0 else 0
        xs = np.arange(SW, dtype=np.float32)
        amp = SH * (0.006 + 0.025 * slosh)
        surf = lvl + amp * np.sin(xs / SW * 9.0 - t * 3.1) + amp * 0.6 * np.sin(xs / SW * 23 + t * 4.7) \
            + SH * 0.04 * slosh * np.exp(-((xs / SW - (0.15 + 0.5 * (1 - slosh))) / 0.25) ** 2) * np.sin(t * 5)
        under = np.clip((yy - surf[None, :]) / 3.0 + 0.5, 0, 1)                    # 1 below the surface line
        if under.max() > 0:
            depth = np.clip((yy - surf[None, :]) / (SH * 0.9), 0, 1)
            # refraction: wavy displacement below the surface
            A = SW * 0.0035
            dx = A * (np.sin(yy / SH * 31 + t * 2.3) + 0.6 * np.sin((xx + yy) / SW * 17 - t * 1.7))
            dy = A * 0.8 * (np.sin(xx / SW * 27 + t * 2.0) + 0.5 * np.sin((xx - yy) / SW * 13 + t * 2.9))
            warped = cv2.remap(out, (xx + dx).astype(np.float32), (yy + dy).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            # colour: absorb red, teal haze, a little lighter toward the surface
            tint = np.array([.6, .84, .98], np.float32)
            haze = np.array([.02, .11, .21], np.float32)
            pa = pion_alpha(f) if pa is None else pa          # Pion keeps more of his own colours (readable, appealing)
            keep = (0.4 * cv2.GaussianBlur(pa, (0, 0), 3))[..., None] if pa is not None else 0.0
            wcol = warped * (tint + (1 - tint) * keep) + haze * (0.4 + 0.6 * depth[..., None]) * (1 - keep)
            wcol += np.array([.03, .08, .11], np.float32) * (1 - depth[..., None]) * 0.8
            # caustics (stronger low in the frame: floor, Pion's body), two drifting layers multiplied
            cs = G["caus"]; n = cs.shape[0]
            sc = n / (SW * 0.42)
            u1 = ((xx * sc + t * 22) % n).astype(np.float32); v1 = ((yy * sc * 0.8 + t * 9) % n).astype(np.float32)
            u2 = ((xx * sc * 1.3 - t * 15 + 97) % n).astype(np.float32); v2 = ((yy * sc + t * 13 + 41) % n).astype(np.float32)
            c1 = cv2.remap(cs, u1, v1, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
            c2_ = cv2.remap(cs, u2, v2, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
            caus = np.clip(c1 * 0.6 + c2_ * 0.6, 0, 1.4) ** 1.4 * (0.25 + 0.75 * sstep(0.2, 0.85, yy / SH))
            wcol += caus[..., None] * np.array([.30, .45, .42], np.float32) * 0.42
            # god rays from the surface, slanted, slowly swaying
            rays = G["rays"]; nr = len(rays)
            ri = ((xx + (yy - min(lvl, 0)) * 0.32 + 40 * math.sin(t * .4)) / SW * nr * 0.6 + t * 6) % nr
            rv = rays[ri.astype(np.int32)] * (1 - depth) ** 1.5
            wcol += rv[..., None] * np.array([.22, .33, .3], np.float32) * 0.5
            # suspended motes
            items = []
            for mx, my, ms, mp in G["motes"]:
                x = (mx * SW + 30 * math.sin(t * .7 + mp * 9)) % SW; y = (my * SH - t * SH * 0.01 * (0.3 + ms)) % SH
                items.append((x, y, SW * (0.0012 + 0.0025 * ms), (.8, .95, .95), 0.35 + 0.3 * ms, "dot"))
            mc, ma = soft_circle_layer(SH, SW, items)
            over(wcol, mc, ma * (yy > surf[None, :]))
            wcol = np.clip(wcol, 0, 1)
            # surface: bright wavy line, foam, a darker band right under it (only when it is in frame)
            band = np.exp(-((yy - surf[None, :]) / 3.5) ** 2)
            under_band = np.clip((yy - surf[None, :]) / (SH * 0.03), 0, 1) * np.clip(1 - (yy - surf[None, :]) / (SH * 0.08), 0, 1)
            wcol = wcol * (1 - 0.12 * under_band[..., None])
            out = out * (1 - under[..., None]) + wcol * under[..., None]
            out = out * (1 - band[..., None] * .75) + np.array([.93, 1, 1], np.float32) * band[..., None] * .75
            if 0 < lvl < SH and slosh > 0.05:   # churning foam along the surface while the water rushes in
                items = []
                r = rng_for(f * 3)
                for fx_, fy_, fs in G["foam"][: int(500 * slosh)]:
                    x = fx_ * SW; y = surf[min(SW - 1, int(x))] + (fy_ - 0.3) * SH * 0.02
                    items.append((x + r.normal(0, 3), y, SW * (0.003 + 0.008 * fs), (1, 1, 1), .75 * slosh, "foam"))
                fc, fa = soft_circle_layer(SH, SW, items)
                over(out, fc, fa)

    # ---------------- bubbles (ambient, mouth while talking, blub bursts, rings) -- only under water
    if lvl < SH:
        items = []
        for bx, by_, bs, bp in G["amb"]:
            per = 3.5 + bp * 3
            u = ((t + bp * per) % per) / per
            x = bx * SW + SW * 0.012 * math.sin(t * 3 + bp * 7)
            y = SH * (1.05 - 1.15 * u)
            if y > lvl + 8:
                items.append((x, y, SW * (0.004 + 0.01 * bs), (.9, 1, 1), .8, "bubble"))
        if mouth is not None:
            mx, my = mouth
            if my > lvl + 4:
                # talking: small bubbles leave the mouth with the loudness
                env = S["cfg"]["env"]
                for back in range(0, int(fps * 1.0), 3):
                    g = f - back
                    if g < 0 or g >= len(env) or env[g] < 0.3 or (g // 3) % 3:
                        continue
                    age = back / fps
                    tr2 = S["track"][g] if g < len(S["track"]) else None
                    ox, oy = (tr2["mouth"] if tr2 else mouth)
                    r = rng_for(g)
                    y = oy - SH * 0.11 * age - 0.5 * SH * 0.05 * age * age
                    x = ox + SW * 0.02 * math.sin(age * 6 + g) + r.normal(0, SW * 0.01)
                    rad = SW * (0.004 + 0.006 * env[g]) * (1 + age * 0.4)
                    if y > lvl:
                        items.append((x, y, rad, (.92, 1, 1), max(0.0, 0.9 - age * 0.5) * P.breath_at(t), "bubble"))
            for t0, dur in P.blubs:   # "blubuk-blubuk": big gulps of air
                if not (t0 <= t < t0 + dur + 1.6):
                    continue
                r = rng_for(int(t0 * 100))
                for i in range(int(dur * 16)):
                    tb = t0 + r.random() * dur
                    age = t - tb
                    if age < 0 or age > 1.6:
                        continue
                    k = int((tb - t0) * fps)
                    tr2 = S["track"][min(len(S["track"]) - 1, int(tb * fps))]
                    ox, oy = tr2["mouth"] if tr2 else mouth
                    size = SW * (0.012 + 0.03 * r.random())
                    x = ox + (r.random() - .5) * SW * 0.05 + SW * 0.03 * math.sin(age * 5 + i)
                    y = oy - SH * (0.05 + 0.18 * r.random()) * age - 0.5 * SH * 0.12 * age * age
                    if y > lvl:
                        items.append((x, y, size * (0.6 + 0.6 * min(1, age * 4)), (.95, 1, 1), 0.9 * (1 - age / 1.6), "bubble"))
        if items:
            bc, ba = soft_circle_layer(SH, SW, items)
            over(out, bc, ba)
        for t0, kind, dur in P.rings:
            e = t - t0
            if mouth is None or e < 0 or e > dur + 0.6:
                continue
            tr0 = S["track"][min(len(S["track"]) - 1, int(t0 * fps))]
            ox, oy = tr0["mouth"] if tr0 else mouth
            if kind == "fail":
                # pops out lumpy and wobbling, then bursts into a puff of tiny bubbles
                life = min(dur, 0.42)
                if e < life:
                    u = e / life
                    R = SW * (0.06 + 0.11 * (1 - (1 - u) ** 2))
                    c, a = ring_layer(SH, SW, ox + SW * 0.20 * u, oy + SH * 0.03 * u, R, 0.8, 1, t, 1.0, min(1, u * 6), SW * 0.026)
                    over(out, c, a)
                else:
                    pe = e - life
                    if pe < 0.5:
                        items = []
                        r = rng_for(int(t0 * 1000))
                        R = SW * 0.17
                        for i in range(46):
                            a = r.random() * math.pi * 2
                            d = R * (0.8 + 0.6 * r.random()) * (1 + pe * 2.5)
                            items.append((ox + SW * 0.20 + math.cos(a) * d, oy + SH * 0.03 + math.sin(a) * d * .75 - SH * 0.05 * pe,
                                          SW * (0.004 + 0.006 * r.random()) * (1 - pe), (.95, 1, 1), 1 - pe / 0.5, "bubble"))
                        bc, ba = soft_circle_layer(SH, SW, items)
                        over(out, bc, ba)
            else:
                # perfect ring: leaves the mouth, steadies, then rushes at the camera until it fills the lens
                fly0 = dur * 0.45
                mxn, myn = mouth                                # where his mouth is now (the camera follows his face)
                if e < fly0:
                    u = e / fly0
                    R = SW * (0.035 + 0.075 * (1 - (1 - u) ** 2.2))
                    cx, cy = ox + SW * 0.06 * u, oy + SH * 0.04 * u
                    s, ry = 1.0, 0.5
                else:
                    u = (e - fly0) / max(0.05, dur - fly0)
                    s = math.exp(u * 3.6)
                    R = SW * 0.11 * s
                    k = 1 - (1 - min(1.0, u * 1.3)) ** 2
                    cx = ox + SW * 0.06 + (mxn - ox - SW * 0.06) * k
                    cy = oy + SH * 0.04 + (myn - SH * 0.02 - oy - SH * 0.04) * k
                    ry = 0.5 + 0.48 * k
                alpha = min(1, e * 8) * (1 - sstep(dur - 0.05, dur + 0.5, e))
                c, a = ring_layer(SH, SW, cx, cy, R, ry, 1, t, 0.0, alpha, SW * 0.014 * (s ** 0.92))
                over(out, c, a)
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path, quality=93)
    return f


def apply(cues, frames_dir, fps, n, track_scene, pion, env, jobs=4):
    """frames_dir: composited scene JPGs (edited in place). track_scene: per-frame {'mouth': [x, y], ...} in scene px."""
    ev = parse(cues)
    if not ev:
        return False
    im = Image.open(os.path.join(frames_dir, "00000.jpg"))
    SW, SH = im.size
    plan = Plan(ev, SW, SH, fps, n)
    cfg = {"dir": frames_dir, "env": env}
    init(plan, track_scene, pion, cfg)
    with Pool(jobs) as pool:
        for i, _ in enumerate(pool.imap(frame, range(n), chunksize=2)):
            if (i + 1) % 60 == 0 or i + 1 == n:
                print(f"  water {i + 1}/{n}", flush=True)
    return True
