"""Final composite: original video + Pion overlay on the clips + castle scenes replacing the white screens.
Keeps the black bars and the burned-in captions (any non-white pixel of a white screen stays on top)."""
import subprocess, numpy as np, os, sys
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pion_raja'))
from integrate import over as integrate_over  # soften + light wrap + grain, measured from the footage
W, H, Y0, Y1 = 1078, 1920, 276, 1650
WHITES = [(154, 217, 'out/w1_frames'), (513, 660, 'out/w2_frames'), (825, 969, 'out/w3_frames')]
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out/final.mp4'
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', 'src/input.mp4', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-i', 'src/input.mp4',
                        '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', '-shortest', OUT], stdin=subprocess.PIPE)
f = 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
    seg = next((s for s in WHITES if s[0] <= f <= s[1]), None)
    if seg:
        p = f'{seg[2]}/{f - seg[0]:05d}.png'
        if os.path.exists(p):
            sc = np.asarray(Image.open(p).convert('RGB'))
            keep = fr[Y0:Y1].min(2) < 190                     # captions / anything that is not the white screen
            if f == seg[0] or (fr[Y0:Y1].min(2) > 200).mean() < .97: keep[:] = False  # cut / half-transition frame: castle only
            reg = sc[Y0:Y1].copy(); reg[keep] = fr[Y0:Y1][keep]; fr[Y0:Y1] = reg
    else:
        p = f'out/vframes/{f:04d}.png'
        if os.path.exists(p):
            ov = np.asarray(Image.open(p).convert('RGBA'))[Y0:Y1]
            if ov[..., 3].any(): reg = fr[Y0:Y1].copy(); integrate_over(reg, ov, seed=f); fr[Y0:Y1] = reg
    enc.stdin.write(fr.tobytes()); f += 1
    if f % 100 == 0: print('frame', f, flush=True)
enc.stdin.close(); enc.wait(); print('done', f, 'frames ->', OUT)
