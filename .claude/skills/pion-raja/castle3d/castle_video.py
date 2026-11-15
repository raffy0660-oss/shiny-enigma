"""Pion in the 3D castle, as a finished video.

    python3 castle_video.py --cues cues.txt --audio vo.wav --out pion.mp4 [--res 1080x1350] [--samples 48]

One cue file drives everything (same format as reaction mode):
  - expressions pick the lighting mood (engine/moods.json); the room crossfades between moods,
  - `word` cues + `autozoom` drive the camera plan (engine/camplan.js): smooth step zooms, a held corner
    and dutch angle per mood, zoom back out on every mood change,
  - gestures, `acting`, flights etc. move Pion; his floor shadow and the room light on him FOLLOW him.

Steps (results cached in --work, so re-runs only redo what changed):
  1. per mood: clean plate (no Pion shadow), Pion-shadow pass, light pass, Pion's screen box (Blender)
  2. engine Pion frames (transparent) with the mood light cues + his per-frame position (react_render.js)
  3. per frame: plate x moved shadow, Pion x moved relight, light wrap, contact shadow, mood grade, grain
  4. Remotion: camera plan (zoom/corner/roll) with camera motion blur, vignette, audio -> MP4
The scene frames are rendered 1.5x bigger than the output so a 1.5x zoom stays sharp.
"""
import argparse
import json
import math
import os
import shutil
import subprocess
import sys
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import comp_pion as CP        # noqa: E402
import emotion_sheet as ES    # noqa: E402  (PRESETS: engine light cue, relight and grade per mood)

ENGINE = ES.ENGINE
BPY = ES.BPY
MOODS = json.load(open(os.path.join(SKILL, "engine", "moods.json")))["expr_to_mood"]
CROSSFADE = 0.5
CHROME = os.environ.get("PION_CHROME", "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")


def run(cmd, cwd=None):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"failed: {' '.join(map(str, cmd))}\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}")
    return r.stdout


def parse_exprs(path):
    ex, pins = [], []
    for line in open(path, encoding="utf-8"):
        w = line.split("#")[0].split()
        if len(w) >= 2:
            try:
                t = float(w[0])
            except ValueError:
                continue
            if w[1] == "mood" and len(w) > 2:          # `<t> mood X` pins the lighting mood ('auto' releases it)
                pins.append((t, w[2].lower())); continue
            name = w[2] if w[1] == "expr" and len(w) > 2 else w[1]
            if name in MOODS:
                ex.append((t, name))
    pins.sort()
    pin_at = lambda t: ([m for t0, m in pins if t0 <= t + 1e-6] or ["auto"])[-1]
    ex = [(t, "@" + pin_at(t) if pin_at(t) != "auto" else e) for t, e in ex] + [(t, "@" + m) for t, m in pins if m != "auto"]
    ex.sort()
    segs = []
    for t, e in ex:
        m = e[1:] if e.startswith("@") else MOODS[e]
        if not segs or segs[-1][1] != m:
            segs.append((t, m))
    if not segs:
        segs = [(0.0, "hangat")]
    if segs[0][0] > 0:
        segs[0] = (0.0, segs[0][1])
    return segs


def mood_weights(segs, t):
    w = {segs[0][1]: 1.0}
    for i in range(1, len(segs)):
        t0, m = segs[i]
        if t < t0:
            break
        u = min(1.0, (t - t0) / CROSSFADE)
        u = u * u * (3 - 2 * u)
        w = {k: v * (1 - u) for k, v in w.items()}
        w[m] = w.get(m, 0.0) + u
    return {k: v for k, v in w.items() if v > 1e-3}


def engine_cues(src, segs, dst, frame="2.35,6.6"):
    """Static engine camera (the camera moves in Remotion), mood lights timed to the segments."""
    skip = {"autozoom", "zoomauto", "cam", "kamera", "light", "mood"}
    out = [f"frame {frame}", "acting 1"]
    for line in open(src, encoding="utf-8"):
        w = line.split("#")[0].split()
        if not w or w[0] in ("frame", "bg", "light") or (len(w) > 1 and w[1] in skip):
            continue
        out.append(line.rstrip())
    for t, m in segs:
        light = ES.PRESETS[m][1]
        w = light.split(); d = np.array([float(v) for v in w[w.index("dir") + 1:w.index("dir") + 4]])
        pos = np.array([0.0, 3.0, 0.0]) + d / np.linalg.norm(d) * 4.2   # point key fixed in the room, along the mood key: moving changes his light
        out.append(f"{t:.3f} light {light} pos {pos[0]:.2f} {pos[1]:.2f} {pos[2]:.2f} exp {ES.subject_exp(m)}")
    open(dst, "w").write("\n".join(out) + "\n")


def border_hits(frames_dir, thr=8):
    """Frames whose alpha touches the image border (something was cut by the engine camera's window)."""
    hits = []
    for name in sorted(os.listdir(frames_dir)):
        if not name.endswith(".png"):
            continue
        al = np.asarray(Image.open(os.path.join(frames_dir, name)).getchannel("A"))
        if max(al[0].max(), al[-1].max(), al[:, 0].max(), al[:, -1].max()) > thr:
            hits.append(int(name[:-4]))
    return hits


def shift(a, dx, dy):
    """Shift an image array by integer pixels, filling with the edge values."""
    dx, dy = int(round(dx)), int(round(dy))
    if dx == 0 and dy == 0:
        return a
    H, W = a.shape[:2]
    ys = np.clip(np.arange(H) - dy, 0, H - 1)
    xs = np.clip(np.arange(W) - dx, 0, W - 1)
    return a[ys][:, xs]


G = {}   # per-process globals (filled before the Pool forks)


def shifted_crop(a, dx, dy, x0, y0, x1, y1):
    """The crop [y0:y1, x0:x1] of `a` shifted by (dx, dy) px, edge-filled, without touching the rest of `a`."""
    H, W = a.shape[:2]
    ys = np.clip(np.arange(y0, y1) - int(round(dy)), 0, H - 1)
    xs = np.clip(np.arange(x0, x1) - int(round(dx)), 0, W - 1)
    return a[ys[:, None], xs[None, :]]


def grade(c, M):
    sat, tint, con = M["grade"]
    g = c.mean(-1, keepdims=True)
    return 0.5 + ((g + (c - g) * sat) * tint - 0.5) * con


def comp_frame(f):
    """Only the region around Pion and his shadow is recomputed; the rest of the frame is the mood's graded
    plate, prepared once (threejs-performance: do the expensive work once, not per frame)."""
    S = G
    SW, SH = S["size"]
    src = Image.open(os.path.join(S["eng_dir"], f"{f:05d}.png")).convert("RGBA")
    k, ecx, eb, pcx, py1 = S["xf"]
    sb0 = src.getchannel("A").getbbox() or (0, 0, 1, 1)          # Pion's box in the engine frame -> scene pixels
    tr, t0r = S["track"][f] or S["track"][0], S["track"][0]
    dgx = (tr["ground"][0] - t0r["ground"][0]) * k
    dbx, dby = (tr["base"][0] - t0r["base"][0]) * k, (tr["base"][1] - t0r["base"][1]) * k
    air = max(0.0, ((tr["ground"][1] - tr["base"][1]) - (t0r["ground"][1] - t0r["base"][1])) * k)
    fade = 1.0 / (1.0 + air / (0.18 * S["pion_h"]))
    r = max(2, SW // 90)
    # region of interest: Pion (+ light-wrap margin), his moved floor shadow, the contact shadow
    ab = ((sb0[0] - ecx) * k + pcx, (sb0[1] - eb) * k + py1, (sb0[2] - ecx) * k + pcx, (sb0[3] - eb) * k + py1)
    boxes = [(ab[0] - 3 * r - 2, ab[1] - 3 * r - 2, ab[2] + 3 * r + 2, ab[3] + 3 * r + 2)]
    sb = S["shadow_box"]
    if sb:
        boxes.append((sb[0] + int(dgx) - 2, sb[1], sb[2] + int(dgx) + 2, sb[3]))
    bw = S["pion_w"] * 0.48
    gx, gy = S["pcx"] + dgx, S["py1"] - S["pion_h"] * 0.012
    boxes.append((gx - bw - 2, gy - bw * 0.16 - 2, gx + bw + 2, gy + bw * 0.16 + 2))
    x0 = int(max(0, min(b[0] for b in boxes))); y0 = int(max(0, min(b[1] for b in boxes)))
    x1 = int(min(SW, max(b[2] for b in boxes))); y1 = int(min(SH, max(b[3] for b in boxes)))
    t = f / S["fps"]
    W = mood_weights(S["segs"], t)
    ws = tuple((m, round(w, 3)) for m, w in sorted(W.items()))   # the plate mix only changes during a crossfade
    gi = f % len(S["grain"])
    cache = S.setdefault("_mix8", {})
    if (ws, gi) not in cache:                                    # graded plate + grain, ready to write
        if len(cache) > 12:
            cache.clear()
        mix = sum(w * S["moods"][m]["graded"] for m, w in W.items())
        cache[(ws, gi)] = (np.clip(mix + S["grain"][gi][..., None], 0, 1) * 255 + 0.5).astype(np.uint8)
    out = cache[(ws, gi)].copy()
    eng = src.transform((x1 - x0, y1 - y0), Image.AFFINE,                    # resample only the crop
                        (1 / k, 0, ecx + (x0 - pcx) / k, 0, 1 / k, eb + (y0 - py1) / k), resample=Image.BICUBIC)
    F = np.asarray(eng).astype(np.float32) / 255.0
    rgb, alpha = F[..., :3], F[..., 3:4]
    a_img = Image.fromarray((alpha[..., 0] * 255).astype(np.uint8))
    inner = np.asarray(a_img.filter(ImageFilter.GaussianBlur(r))).astype(np.float32)[..., None] / 255.0
    edge = np.clip(alpha - inner, 0, 1) * 2.0
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    d = ((xx - gx) / bw) ** 2 + ((yy - gy) / (bw * 0.16)) ** 2
    contact = (np.clip(1 - d, 0, 1) ** 1.6 * 0.75 * fade)[..., None] * np.array([0.92, 0.95, 0.97], np.float32)
    crop = np.zeros((y1 - y0, x1 - x0, 3), np.float32)
    sl = (slice(y0, y1), slice(x0, x1))
    for m, w in W.items():
        M = S["moods"][m]
        sh = 1.0 - (1.0 - shifted_crop(M["shadow"], dgx, 0, x0, y0, x1, y1)) * fade
        plate = M["plate"][sl] * sh[..., None] * (1 - contact)
        p = rgb * shifted_crop(M["factor"], dbx, dby, x0, y0, x1, y1) + shifted_crop(M["add"], dbx, dby, x0, y0, x1, y1)
        p = p + M["blur"][sl] * edge * 0.35
        lum = p.mean(-1, keepdims=True)
        p = p + (M["room"] - 0.5 * M["room"].mean()) * 0.10 * (1 - lum)
        crop += w * grade(plate * (1 - alpha) + np.clip(p, 0, 1) * alpha, M)
    out[sl] = (np.clip(crop + S["grain"][gi][sl][..., None], 0, 1) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(S["out_dir"], f"{f:05d}.jpg"), quality=93)
    return f


def load_mood(work, m, size):
    SW, SH = size
    base = os.path.join(work, f"mood_{m}")
    plate = np.asarray(Image.open(base + "_bg.png").convert("RGB").resize(size, Image.LANCZOS)).astype(np.float32) / 255.0
    wi = np.asarray(Image.open(base + "_sh_with.png").convert("L").resize(size, Image.BICUBIC)).astype(np.float32)
    wo = np.asarray(Image.open(base + "_sh_without.png").convert("L").resize(size, Image.BICUBIC)).astype(np.float32)
    shadow = np.clip((wi + 2.0) / (wo + 2.0), 0, 1)
    shadow = np.asarray(Image.fromarray((shadow * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255.0
    _, light, (ref, fl, top), (sat, tint, con) = ES.PRESETS[m]
    factor, add = CP.relight_maps(base + "_lp.png", size, 1.0, 4, ref, fl, top)
    blur = np.asarray(Image.fromarray((plate * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(2, SW // 90)))).astype(np.float32) / 255.0
    M = {"plate": plate, "shadow": shadow, "factor": factor, "add": add, "blur": blur,
         "room": blur.reshape(-1, 3).mean(0), "grade": (sat, np.array([float(v) for v in tint.split(",")], np.float32), con)}
    M["graded"] = grade(plate, M).astype(np.float32)           # everything outside Pion's region, once per mood
    return M


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cues", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--res", default="1080x1350", help="output size (9:16: 1080x1920)")
    ap.add_argument("--scale", type=float, default=1.5, help="scene frames = output x scale (keeps zooms sharp)")
    ap.add_argument("--samples", type=int, default=48)
    ap.add_argument("--work", default=None)
    ap.add_argument("--novolume", action="store_true")
    ap.add_argument("--blur", type=int, default=6, help="engine motion-blur samples (1 = off)")
    ap.add_argument("--camblur", type=int, default=8, help="Remotion camera motion-blur samples (1 = off)")
    ap.add_argument("--shake", type=float, default=1.0, help="gentle camera shake while the camera moves (0 = off)")
    ap.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2)))
    ap.add_argument("--eframe", default="auto", help="engine framing cy,vh; 'auto' = the window covers the whole scene + margin")
    ap.add_argument("--esize", default=None, help="engine render size (9:16); default keeps Pion at least as sharp as the scene")
    a = ap.parse_args()

    W, H = (int(v) for v in a.res.split("x"))
    SW, SH = int(round(W * a.scale / 2) * 2), int(round(H * a.scale / 2) * 2)
    work = os.path.abspath(a.work or os.path.splitext(a.out)[0] + "_work")
    os.makedirs(work, exist_ok=True)
    cues = os.path.abspath(a.cues)
    segs = parse_exprs(cues)
    moods = sorted({m for _, m in segs})
    print("moods:", segs, flush=True)

    # 1. Blender plates per mood (cached; re-rendered when the castle scripts or the settings change)
    import hashlib
    src_key = hashlib.sha1(b"".join(open(os.path.join(HERE, n), "rb").read() for n in ("build_castle.py", "build_pion.py"))
                           + f"{SW}x{SH}|{a.samples}|{a.novolume}".encode()).hexdigest()[:16]
    for m in moods:
        base = os.path.join(work, f"mood_{m}")
        stamp = base + ".key"
        if all(os.path.isfile(base + s) for s in ("_bg.png", "_lp.png", "_sh_with.png", ".json")) and \
                os.path.isfile(stamp) and open(stamp).read() == src_key:
            continue
        print("blender:", m, flush=True)
        cmd = [BPY, os.path.join(HERE, "build_castle.py"), "--", "--out", base + ".blend", "--render", base + "_bg.png",
               "--samples", str(a.samples), "--res", f"{SW}x{SH}", "--proxy", "--clean", "--bbox", base + ".json",
               "--shadowpass", base + "_sh", "--lightpass", base + "_lp.png", "--mood", "chandelier", "--emotion", m]
        if a.novolume:
            cmd.append("--novolume")
        run(cmd)
        open(stamp, "w").write(src_key)

    # 2. engine Pion frames + track
    # The engine Pion is a 2D layer: whatever leaves the engine camera's window (a lifted crown, an arm, a prop,
    # a second character) is cut by a straight edge. So the window always covers the whole castle scene plus a
    # margin (auto: from the proxy's screen box), its resolution keeps Pion at least as sharp as the scene, and
    # every frame is checked afterwards: anything touching the border -> render again with a wider window.
    bb0 = json.load(open(os.path.join(work, f"mood_{moods[0]}.json")))
    s0 = SW / bb0["W"]
    ppu = (bb0["y1"] - bb0["y0"]) * s0 / CP.PROXY_H                       # scene px per engine unit
    base_y = bb0["base"][1] * s0
    if a.eframe == "auto":
        vh = max(SH / ppu, SW / ppu / (1078 / 1920)) * 1.15
        cy = (base_y - SH / 2) / ppu                                       # scene centre, in units above Pion's base
    else:
        cy, vh = (float(v) for v in a.eframe.split(",")[:2])
    ecue = os.path.join(work, "engine_cues.txt")
    eng = os.path.join(work, "eng")
    for attempt in range(3):
        if a.esize:
            esize = a.esize
        else:                                                              # engine px per unit >= scene px per unit
            eh = int(math.ceil(ppu * vh / 2) * 2); esize = f"{int(round(eh * 1078 / 1920 / 2) * 2)}x{eh}"
        engine_cues(cues, segs, ecue, f"{cy:.3f},{vh:.3f}")
        print(f"engine... frame {cy:.2f},{vh:.2f} size {esize}", flush=True)
        run(["node", "react_render.js", "--audio", os.path.abspath(a.audio), "--cues", ecue, "--out", eng,
             "--png", "--blur", str(a.blur), "--bg", "black", "--jobs", str(a.jobs), "--size", esize], cwd=ENGINE)
        cut = border_hits(eng + "_frames")
        if not cut:
            break
        print(f"  {len(cut)} frames touch the engine border (e.g. {cut[:4]}): widening the window", flush=True)
        vh *= 1.3
    else:
        print("WARNING: frames still touch the engine border:", cut[:8], flush=True)
    track = json.load(open(eng + "_track.json"))
    n, fps = len(track["frames"]), track["fps"]

    # 3. per-frame composite
    bb = json.load(open(os.path.join(work, f"mood_{moods[0]}.json")))
    sx = SW / bb["W"]
    x0, x1, y0, y1 = bb["x0"] * sx, bb["x1"] * sx, bb["y0"] * sx, bb["y1"] * sx
    al = np.asarray(Image.open(os.path.join(eng + "_frames", "00000.png")))[..., 3]
    ys, xs = np.nonzero(al > 8)
    k = (y1 - y0) * CP.ENGINE_H / CP.PROXY_H / (ys.max() - ys.min())
    ecx, eb, pcx = (xs.min() + xs.max()) / 2, ys.max(), (x0 + x1) / 2
    out_dir = os.path.join(work, "public", "scene")
    shutil.rmtree(out_dir, ignore_errors=True); os.makedirs(out_dir)
    print("loading mood maps...", flush=True)
    G.update(size=(SW, SH), eng_dir=eng + "_frames", xf=(k, ecx, eb, pcx, y1), track=track["frames"], segs=segs, fps=fps,
             moods={m: load_mood(work, m, (SW, SH)) for m in moods}, pion_h=(ys.max() - ys.min()) * k,
             pion_w=(xs.max() - xs.min()) * k, pcx=pcx, py1=y1, out_dir=out_dir)
    # Pion's floor shadow lives around his feet: keep it there (the clay passes carry faint noise elsewhere)
    yy0, xx0 = np.mgrid[0:SH, 0:SW]
    near = (np.abs(xx0 - pcx) < 1.6 * G["pion_w"]) & (yy0 > y1 - 0.45 * G["pion_h"])
    sh_any = np.zeros((SH, SW), bool)
    for m in moods:
        Mm = G["moods"][m]
        Mm["shadow"] = np.where(near, Mm["shadow"], 1.0).astype(np.float32)
        sh_any |= Mm["shadow"] < 0.985
    del yy0, xx0
    ys2, xs2 = np.nonzero(sh_any)
    G["shadow_box"] = (int(xs2.min()), int(ys2.min()), int(xs2.max()) + 1, int(ys2.max()) + 1) if len(xs2) else None
    rng = np.random.default_rng(7)                           # film grain: a few precomputed frames, cycled
    G["grain"] = [rng.normal(0, 0.012, (SH, SW)).astype(np.float32) for _ in range(6)]
    print(f"compositing {n} frames...", flush=True)
    with Pool(a.jobs) as pool:
        for i, _ in enumerate(pool.imap(comp_frame, range(n), chunksize=4)):
            if (i + 1) % 60 == 0 or i + 1 == n:
                print(f"  {i + 1}/{n}", flush=True)

    # 4. camera plan + Remotion
    plan = json.loads(run(["node", os.path.join(SKILL, "engine", "camplan.js"), cues, "--sample", str(fps), "--frames", str(n), "--shake", str(a.shake)]))
    h0 = track["frames"][0]["head"]
    focus = [(h0[0] - ecx) * k + pcx, (h0[1] - eb) * k + y1]
    run(["ffmpeg", "-v", "error", "-y", "-i", os.path.abspath(a.audio), "-ar", "48000", "-ac", "2", os.path.join(work, "public", "audio.wav")])
    props = {"frames": n, "fps": fps, "width": W, "height": H, "sceneW": SW, "sceneH": SH, "focus": focus,
             "cam": plan["frames"], "audio": "audio.wav", "camBlur": a.camblur}
    pj = os.path.join(work, "props.json")
    json.dump(props, open(pj, "w"))
    rem = os.path.join(HERE, "remotion")
    if not os.path.isdir(os.path.join(rem, "node_modules")):
        run(["npm", "install", "--no-audit", "--no-fund"], cwd=rem)
    print("remotion render...", flush=True)
    run(["npx", "remotion", "render", "src/index.ts", "PionCastle", os.path.abspath(a.out), "--props", pj,
         "--public-dir", os.path.join(work, "public"), "--browser-executable", CHROME, "--concurrency", str(a.jobs), "--log", "error"], cwd=rem)
    print("RESULT video", os.path.abspath(a.out), flush=True)


if __name__ == "__main__":
    main()
