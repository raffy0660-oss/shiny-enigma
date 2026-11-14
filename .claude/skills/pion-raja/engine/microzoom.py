"""Micro zoom for a finished video: quick punch-ins every few words (TikTok/Shorts style).

Uses the same rules as the engine's `autozoom` cue: every N words the frame snaps (0.12 s ease-out)
to the next zoom level (cycling 1.07, 1.00, 1.11, 1.035, 1.09, 1.00), pushes in slowly between snaps,
and a word containing "!" punches in harder then settles. The zoom centres on --focus (e.g. Pion's face).

Word times come from a cue file (`<t> word TEXT` lines, the karaoke cues) or --times.

    python3 microzoom.py --in final.mp4 --out final_zoom.mp4 --cues cues.txt [--every 3] [--amt 1.0]
        [--focus 540,700 | --bbox castle.json] [--start 0]

Note: anything burned into the video (subtitles too) zooms with it. For engine renders prefer the
`autozoom` cue: the camera zooms and the karaoke subtitles stay put.
"""
import argparse
import json
import math
import subprocess

import numpy as np
from PIL import Image

LEVELS = [1.07, 1.0, 1.11, 1.035, 1.09, 1.0]


def zoom_keys(marks, every, amt):
    """marks: [(t, text)] sorted. Returns [(t, z, punch)]."""
    keys, n, li = [], 0, 0
    for t, txt in marks:
        n += 1
        if "!" in txt:
            keys.append((t, 1 + 0.16 * amt, True))
            continue
        if (n - 1) % every:
            continue
        keys.append((t, 1 + (LEVELS[li % len(LEVELS)] - 1) * amt, False))
        li += 1
    return keys


def zoom_at(t, keys):
    z = 1.0
    for i, (kt, kz, punch) in enumerate(keys):
        if t < kt:
            break
        te = min(t, keys[i + 1][0]) if i + 1 < len(keys) and keys[i + 1][0] < t else t
        e = te - kt
        u = 1 - (1 - min(1.0, max(0.0, e / 0.12))) ** 3
        tgt = kz
        if punch:
            tgt = (1 + (kz - 1) * 0.5) + (kz - (1 + (kz - 1) * 0.5)) * math.exp(-max(0.0, e - 0.12) / 0.3)
        z = (z + (tgt - z) * u) * (1 + min(0.015, 0.008 * max(0.0, e - 0.12)))
    return z


def read_marks(path, start):
    marks = []
    for line in open(path, encoding="utf-8"):
        line = line.split("#")[0].strip()
        w = line.split()
        if len(w) >= 3 and w[1] in ("word", "kata"):
            try:
                marks.append((float(w[0]) - start, " ".join(w[2:])))
            except ValueError:
                pass
    return sorted(marks)


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate", "-of", "json", path], capture_output=True, text=True).stdout
    s = json.loads(out)["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(num) / float(den)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cues", default=None, help="cue file with `<t> word TEXT` lines")
    ap.add_argument("--times", default=None, help="comma list of word times (s) instead of --cues")
    ap.add_argument("--every", type=int, default=3)
    ap.add_argument("--amt", type=float, default=1.0)
    ap.add_argument("--focus", default=None, help="x,y zoom centre in pixels (default: centre, upper third)")
    ap.add_argument("--bbox", default=None, help="castle3d bbox JSON: zoom centre on Pion's face")
    ap.add_argument("--start", type=float, default=0.0, help="cue time that equals 0 s of this video")
    a = ap.parse_args()

    W, H, fps = probe(a.inp)
    if a.cues:
        marks = read_marks(a.cues, a.start)
    else:
        marks = [(float(v), "") for v in (a.times or "").split(",") if v.strip()]
    keys = zoom_keys(marks, max(1, a.every), a.amt)
    if a.focus:
        fx, fy = (float(v) for v in a.focus.split(","))
    elif a.bbox:
        b = json.load(open(a.bbox)); k = W / b["W"]
        fx, fy = (b["x0"] + b["x1"]) / 2 * k, (b["y0"] + (b["y1"] - b["y0"]) * 0.42) * k
    else:
        fx, fy = W / 2, H * 0.4

    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.inp, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", f"{fps}",
                            "-i", "-", "-i", a.inp, "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-crf", "16",
                            "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", a.out], stdin=subprocess.PIPE)
    n, fsz = 0, W * H * 3
    while True:
        buf = dec.stdout.read(fsz)
        if len(buf) < fsz:
            break
        z = zoom_at(n / fps, keys)
        if abs(z - 1) < 1e-4:
            enc.stdin.write(buf)
        else:
            im = Image.frombuffer("RGB", (W, H), buf, "raw", "RGB", 0, 1)
            cw, ch = W / z, H / z
            x0 = min(max(fx - cw * fx / W, 0), W - cw)   # keep the focus point fixed on screen
            y0 = min(max(fy - ch * fy / H, 0), H - ch)
            im = im.resize((W, H), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))
            enc.stdin.write(im.tobytes())
        n += 1
    enc.stdin.close(); enc.wait(); dec.wait()
    print("RESULT microzoom", a.out, f"{n} frames, {len(keys)} zoom keys")


if __name__ == "__main__":
    main()
