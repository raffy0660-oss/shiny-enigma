"""Project 2 final composite in 4K (2160x3840): source upscaled 2x, Pion overlays, castle/hospital scenes on the white
screens (captions kept), reaction cameos, zoom-blur transitions at the scene changes, SFX mixed over the original audio."""
import subprocess, numpy as np, os, sys, cv2
from PIL import Image
W, H = 2156, 3840; Y0, Y1 = 552, 3300
WHITES = [(118, 212, 'out4k/w1_frames'), (364, 428, 'out4k/w2_frames'), (684, 756, 'out4k/w3_frames')]
CAMEOS = []
TRANS = [118, 213, 364, 429, 684]           # zoom-blur peaks (cut frames)
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out4k/project2_4k_nosfx.mp4'
MEME = (383, 428)   # pion recreates the AHAtik meme: black & white, contrast, grain, vignette
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', 'src/input.mp4', '-vf', f'scale={W}:{H}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-vf', 'scale=2160:3840:flags=lanczos',
                        '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
def over(fr, path):
    if not os.path.exists(path): return
    ov = np.asarray(Image.open(path).convert('RGBA'))[Y0:Y1].astype(np.float32); a = ov[..., 3:4] / 255.0
    if a.max() > 0: fr[Y0:Y1] = (ov[..., :3] * a + fr[Y0:Y1].astype(np.float32) * (1 - a) + .5).astype(np.uint8)
def zoom_blur(fr, s):
    reg = fr[Y0:Y1].astype(np.float32); h, w = reg.shape[:2]; acc = reg.copy(); n = 7
    for i in range(1, n):
        k = 1 + s * i / (n - 1); big = cv2.resize(reg, (int(w * k), int(h * k)), interpolation=cv2.INTER_LINEAR)
        y, x = (big.shape[0] - h) // 2, (big.shape[1] - w) // 2; acc += big[y:y + h, x:x + w]
    acc /= n; fr[Y0:Y1] = np.clip(acc, 0, 255).astype(np.uint8)
f = 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
    seg = next((s for s in WHITES if s[0] <= f <= s[1]), None)
    if seg:
        p = f'{seg[2]}/{f - seg[0]:05d}.png'
        if os.path.exists(p):
            im = np.asarray(Image.open(p).convert('RGBA'))[Y0:Y1].astype(np.float32); src = fr[Y0:Y1]
            keep = src.min(2) < 190
            if f == seg[0] or (src.min(2) > 200).mean() < .97: keep[:] = False
            base = src.astype(np.float32)
            a = im[..., 3:4] / 255; reg = im[..., :3] * a + base * (1 - a)
            if MEME[0] <= f <= MEME[1]:
                k = min(1, (f - MEME[0] + 1) / 4); gy = reg @ np.array([.3, .59, .11], np.float32)
                gy = np.clip((gy - 128) * 1.35 + 128, 0, 255); hh, ww = gy.shape
                yy, xx = np.ogrid[:hh, :ww]; vig = 1 - .55 * (((xx - ww / 2) / (ww * .62)) ** 2 + ((yy - hh * .45) / (hh * .62)) ** 2)
                gy = gy * np.clip(vig, .25, 1) + np.random.default_rng(f).normal(0, 9, gy.shape)
                reg = reg * (1 - k) + np.repeat(gy[..., None], 3, 2) * k; keep[:] = False
            reg = np.clip(reg, 0, 255).astype(np.uint8); reg[keep] = src[keep]; fr[Y0:Y1] = reg
    else:
        over(fr, f'out4k/vframes/{f:04d}.png')
        cm = next((s for s in CAMEOS if s[0] <= f <= s[1]), None)
        if cm: over(fr, f'{cm[2]}/{f - cm[0]:05d}.png')
    for c in TRANS:
        d = f - c + .5
        if abs(d) < 5: zoom_blur(fr, .16 * (1 - abs(d) / 5) ** 1.5)
    enc.stdin.write(fr.tobytes()); f += 1
    if f % 100 == 0: print('frame', f, flush=True)
enc.stdin.close(); enc.wait(); print('done', f, '->', OUT)
