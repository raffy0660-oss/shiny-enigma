"""proj8 (Mona Lisa demo) Remotion overlay: python3 overlay.py [still f1,f2]  -> final/mona_ov.mp4
Scene frames in out/mona/ (render_scene.js) + pts.json. Times are local seconds (VO starts at 0.25 s)."""
import json, os, subprocess, sys
P = os.path.expanduser("~/pion/proj8")
REM = os.path.expanduser("~/pion/castle3d/remotion")
CHROME = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"
w, fps = "mona", 60
seq = os.path.join(P, "out", w)
n = len([f for f in os.listdir(seq) if f.endswith(".jpg")])
pts = json.load(open(os.path.join(seq, "pts.json")))
pub = os.path.join(P, "pub_" + w); os.makedirs(pub, exist_ok=True)
link = os.path.join(pub, w)
if not os.path.exists(link): os.symlink(seq, link)
END = n / fps + 0.5                                   # graphics hold to the last frame (no fade-out)
items = [
    {"type": "caption", "t0": 1.45, "t1": END, "text": "MONA LISA", "label": "UKURAN ASLINYA:", "pos": "top"},                 # "kecil banget!"
    {"type": "pop", "t0": 2.02, "t1": 2.62, "at": "pcorner", "text": "!", "size": 0.11, "dx": 0.05, "dy": -0.03},                                                    # lands with the camera
    {"type": "dim", "t0": 2.61, "t1": END, "a": "pbl", "b": "ptl", "axis": "v", "value": 77, "unit": "CM", "label": "TINGGI", "offset": -0.045},   # "tujuh puluh tujuh"
    {"type": "dim", "t0": 3.70, "t1": END, "a": "pbl", "b": "pbr", "axis": "h", "value": 53, "unit": "CM", "label": "LEBAR", "offset": 0.03},      # "lima puluh tiga"
]
props = {"frames": n, "fps": fps, "width": 1080, "height": 1920, "seq": w, "pts": pts, "items": items, "cuts": [1.62], "intro": None}
pj = os.path.join(P, "props_mona.json"); json.dump(props, open(pj, "w"))
os.makedirs(os.path.join(P, "final"), exist_ok=True)
if len(sys.argv) > 2 and sys.argv[1] == "still":
    for fr in sys.argv[2].split(","):
        subprocess.run(["npx", "remotion", "still", "src/index.ts", "SceneOverlay", os.path.join(P, "final", f"still_{fr}.png"), "--frame", fr,
                        "--props", pj, "--public-dir", pub, "--browser-executable", CHROME, "--log", "error"], cwd=REM, check=True)
else:
    out = os.path.join(P, "final", "mona_ov.mp4")
    subprocess.run(["npx", "remotion", "render", "src/index.ts", "SceneOverlay", out, "--props", pj, "--public-dir", pub,
                    "--browser-executable", CHROME, "--concurrency", "3", "--crf", "14", "--log", "error"], cwd=REM, check=True)
    print("->", out)
