"""Project 2 final composite in 4K (2160x3840): source upscaled 2x, Pion overlays, castle/hospital scenes on the white
screens (captions kept), reaction cameos, zoom-blur transitions at the scene changes, SFX mixed over the original audio."""
import subprocess, numpy as np, os, sys, cv2
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pion_raja'))
from integrate import over as integrate_over  # soften + light wrap + grain, measured from the footage
W, H = 2156, 3840; Y0, Y1 = 552, 3300
WHITES = [(112, 204, 'out4k/w1_frames'), (477, 579, 'out4k/w2_frames'), (797, 848, 'out4k/w3_frames')]
CAMEOS = []
TRANS = [205, 477, 580, 797]           # zoom-blur peaks (cut frames)
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out4k/project2_4k_nosfx.mp4'
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', 'src/input.mp4', '-vf', f'scale={W}:{H}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-vf', 'scale=2160:3840:flags=lanczos',
                        '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], stdin=subprocess.PIPE)
def over(fr, path, seed=0):
    if not os.path.exists(path): return
    ov = np.asarray(Image.open(path).convert('RGBA'))[Y0:Y1]
    if ov[..., 3].any(): reg = fr[Y0:Y1].copy(); integrate_over(reg, ov, seed=seed); fr[Y0:Y1] = reg
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
            sc = np.asarray(Image.open(p).convert('RGB')); src = fr[Y0:Y1]
            keep = src.min(2) < 190
            if f == seg[0] or (src.min(2) > 200).mean() < .97: keep[:] = False
            reg = sc[Y0:Y1].copy(); reg[keep] = src[keep]; fr[Y0:Y1] = reg
    else:
        over(fr, f'out4k/vframes/{f:04d}.png', seed=f)
        cm = next((s for s in CAMEOS if s[0] <= f <= s[1]), None)
        if cm: over(fr, f'{cm[2]}/{f - cm[0]:05d}.png', seed=f + 100000)
    for c in TRANS:
        d = f - c + .5
        if abs(d) < 5: zoom_blur(fr, .16 * (1 - abs(d) / 5) ** 1.5)
    enc.stdin.write(fr.tobytes()); f += 1
    if f % 100 == 0: print('frame', f, flush=True)
enc.stdin.close(); enc.wait(); print('done', f, '->', OUT)
