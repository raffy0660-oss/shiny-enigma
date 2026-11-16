"""Final assembly: creator footage (30 -> 60 fps) with the Pion scenes on the white screens, zoom-blur cuts, audio.
   python3 assemble.py w1.mp4 w2.mp4 sfx_only.wav out.mp4"""
import subprocess
import sys

import cv2
import numpy as np

W, H, FPS = 1078, 1920, 60
SRC = "src/input.mp4"
W1 = (4.60, 10.50)            # white 1 in the source
W2 = (25.00, 35.34)           # white 2 in the source; its Pion scene runs on past the end (tail)
TAIL = 2.60
CUTS = [4.60, 10.50, 25.00]   # zoom-blur transitions
TB = 5                        # frames each side of a cut


def reader(path, w=W, h=H):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={w}:{h}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = w * h * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            return
        yield np.frombuffer(b, np.uint8).reshape(h, w, 3)


def zoom_blur(img, amt):
    if amt <= 0.01:
        return img
    acc = img.astype(np.float32)
    n = 8
    for i in range(1, n):
        s = 1 + amt * 0.12 * i / n
        M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, s)
        acc += cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    out = acc / n
    return np.clip(out * (1 + 0.25 * amt), 0, 255).astype(np.uint8)   # a little flash at the cut


def main():
    w1, w2, sfx, out = sys.argv[1:5]
    src = list(reader(SRC))                       # 30 fps source frames
    s1, s2 = reader(w1), reader(w2)
    total = int(round((W2[1] + TAIL) * FPS))
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-i", SRC, "-i", sfx, "-filter_complex",
                            f"[1:a]apad=pad_dur={TAIL + 1},atrim=0:{W2[1] + TAIL},aresample=48000,aformat=channel_layouts=stereo,asplit=2[vo][vok];[2:a][vok]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=350:makeup=1[s];[vo][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]",
                            "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    last_pion = None
    for f in range(total):
        t = f / FPS
        if W1[0] <= t < W1[1]:
            fr = next(s1, last_pion); last_pion = fr
        elif t >= W2[0]:
            fr = next(s2, last_pion); last_pion = fr
        else:
            fr = src[min(len(src) - 1, int(t * 30 + 1e-6))]
        for c in CUTS:
            d = abs(t - c) * FPS
            if d < TB:
                fr = zoom_blur(fr, (1 - d / TB) ** 1.5)
        enc.stdin.write(np.ascontiguousarray(fr).tobytes())
    enc.stdin.close(); enc.wait()
    print("->", out)


if __name__ == "__main__":
    main()
