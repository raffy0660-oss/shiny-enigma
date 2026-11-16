"""Camera plan for a finished video (any MP4): the same moves as the engine's `autozoom` cue.

engine/camplan.js plans it from the cue file: smooth eased step zooms (1.18 -> 1.34 -> 1.5x) every N
`word` cues, held until the next key, "!" words straight to 1.5x, a corner offset + dutch angle held for
each lighting mood, and a zoom back out to normal on every mood change. The zoom centres on --focus.

    python3 microzoom.py --in final.mp4 --out final_cam.mp4 --cues cues.txt [--every 3] [--max 1.5]
        [--focus 540,700 | --bbox castle.json]

Upscales the source: render the source bigger than the output (castle3d/castle_video.py does) for sharp zooms.
"""
import argparse
import json
import math
import os
import subprocess

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:format=duration",
                          "-of", "json", path], capture_output=True, text=True).stdout
    j = json.loads(out); s = j["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(num) / float(den), float(j["format"]["duration"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cues", required=True, help="cue file (expressions, `word` lines, optional `autozoom`)")
    ap.add_argument("--every", type=int, default=None)
    ap.add_argument("--max", type=float, default=1.5)
    ap.add_argument("--focus", default=None, help="x,y zoom centre in pixels (default: centre, upper 40 %)")
    ap.add_argument("--bbox", default=None, help="castle3d bbox JSON: centre on Pion's face")
    a = ap.parse_args()
    W, H, fps, dur = probe(a.inp)
    n = int(round(dur * fps))
    cmd = ["node", os.path.join(HERE, "camplan.js"), a.cues, "--sample", str(fps), "--frames", str(n), "--max", str(a.max)]
    if a.every:
        cmd += ["--every", str(a.every)]
    cam = json.loads(subprocess.run(cmd, capture_output=True, text=True, check=True).stdout)["frames"]
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
    f, fsz = 0, W * H * 3
    while True:
        buf = dec.stdout.read(fsz)
        if len(buf) < fsz:
            break
        z, ox, oy, roll = cam[min(f, len(cam) - 1)]
        if abs(z - 1) < 1e-4 and abs(roll) < 1e-3:
            enc.stdin.write(buf)
        else:   # same framing maths as castle3d/remotion/src/PionCastle.tsx
            th = math.radians(roll); c, s = abs(math.cos(th)), abs(math.sin(th))
            S = z * max(c + H / W * s, c + W / H * s)
            al = min(1.2, max(0.0, (1 - 1 / z) / (1 - 1 / 1.5))) * 0.9
            cx = W / 2 + (fx - W / 2) * al + ox * W
            cy = H / 2 + (fy - H / 2) * al + oy * H
            hw, hh = W / 2 / S, H / 2 / S
            bx, by = hw * c + hh * s, hw * s + hh * c
            cx, cy = min(max(cx, bx), W - bx), min(max(cy, by), H - by)
            # output pixel (u,v) -> source: rotate by roll about the frame centre, scale 1/S, centre on (cx, cy)
            ct, st = math.cos(th), math.sin(th)
            A, B = ct / S, st / S
            D, E = -st / S, ct / S
            C = cx - A * W / 2 - B * H / 2
            F = cy - D * W / 2 - E * H / 2
            im = Image.frombuffer("RGB", (W, H), buf, "raw", "RGB", 0, 1)
            enc.stdin.write(im.transform((W, H), Image.AFFINE, (A, B, C, D, E, F), resample=Image.BICUBIC).tobytes())
        f += 1
    enc.stdin.close(); enc.wait(); dec.wait()
    print("RESULT microzoom", a.out, f"{f} frames")


if __name__ == "__main__":
    main()
