"""proj7 final: source footage (30 -> 60 fps) with the two Pion scenes on the white screens, zoom-blur cuts, VO + SFX."""
import subprocess, sys
import cv2, numpy as np
W, H, FPS = 1080, 1920, 60
SRC = "src/input.mp4"
W1, W2 = (7.10, 15.00), (21.933, 29.90)
CUTS = [7.10, 15.00, 21.933, 29.90]; TB = 5
def reader(p):
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-i", p, "-vf", f"scale={W}:{H}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        b = pr.stdout.read(n)
        if len(b) < n: return
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
def zb(img, a):
    if a <= .01: return img
    acc = img.astype(np.float32)
    for i in range(1, 8):
        M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, 1 + a * .12 * i / 8); acc += cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    return np.clip(acc / 8 * (1 + .25 * a), 0, 255).astype(np.uint8)
w1, w2, sfx, out = sys.argv[1:5]
src = list(reader(SRC)); s1, s2 = reader(w1), reader(w2)
dur = len(src) / 30; total = int(round(dur * FPS))
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", SRC, "-i", sfx,
    "-filter_complex", "[1:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[vo][vok];[2:a][vok]sidechaincompress=threshold=0.04:ratio=4:attack=15:release=300[s];[vo][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]",
    "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
last = None
for f in range(total):
    t = f / FPS
    if W1[0] <= t < W1[1]: fr = next(s1, last); last = fr
    elif W2[0] <= t < W2[1]: fr = next(s2, last); last = fr
    else: fr = src[min(len(src) - 1, int(t * 30 + 1e-6))]
    for c in CUTS:
        d = abs(t - c) * FPS
        if d < TB: fr = zb(fr, (1 - d / TB) ** 1.5)
    enc.stdin.write(np.ascontiguousarray(fr).tobytes())
enc.stdin.close(); enc.wait(); print("->", out)
