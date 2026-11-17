"""Remotion overlay for proj7: python3 overlay.py w1|w2  -> final/w1.mp4 (scene frames + explainer graphics + cuts).
Expects scene frames in out/<w>/ (render_scene.js) and, for w2, the castle intro video interior/w2i.mp4."""
import json, os, shutil, subprocess, sys

P = os.path.expanduser("~/pion/proj7")
REM = "/home/user/shiny-enigma/.claude/skills/pion-raja/castle3d/remotion"
CHROME = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"
w = sys.argv[1]
fps = 60
seq = os.path.join(P, "out", w)
n = len([f for f in os.listdir(seq) if f.endswith(".jpg")])
pts = json.load(open(os.path.join(seq, "pts.json")))
pub = os.path.join(P, "pub_" + w)
os.makedirs(pub, exist_ok=True)
link = os.path.join(pub, w)
if not os.path.exists(link):
    os.symlink(seq, link)

if w == "w1":
    items = [
        {"type": "dim", "t0": 1.76, "t1": 5.70, "a": "base", "b": "top", "axis": "v", "value": 366, "unit": "FT", "label": "TALL", "offset": 0.0},
        {"type": "dim", "t0": 3.94, "t1": 5.70, "a": "gl", "b": "gr", "axis": "h", "value": 516, "unit": "FT", "label": "WIDE", "offset": 0.02},
    ]
    props = {"frames": n, "fps": fps, "width": 1080, "height": 1920, "seq": w, "pts": pts, "items": items, "cuts": [5.80], "intro": None}
else:
    shutil.copy(os.path.join(P, "interior", "w2i.mp4"), os.path.join(pub, "w2i.mp4"))
    items = [
        {"type": "counter", "t0": 2.62, "t1": 4.95, "at": "sheet", "value": 160000, "unit": "SQ FT", "label": "SCREEN AREA", "dy": -0.16},
        {"type": "pop", "t0": 5.05, "t1": 7.90, "at": "field1", "text": "1"},
        {"type": "pop", "t0": 5.60, "t1": 7.90, "at": "field2", "text": "2"},
        {"type": "pop", "t0": 6.15, "t1": 7.90, "at": "field3", "text": "3"},
        {"type": "caption", "t0": 6.30, "t1": 7.95, "text": "ALMOST 3 FOOTBALL FIELDS", "label": "THAT'S"},
    ]
    props = {"frames": n, "fps": fps, "width": 1080, "height": 1920, "seq": w, "pts": pts, "items": items, "cuts": [1.15],
             "intro": {"src": "w2i.mp4", "until": 1.15}}
pj = os.path.join(P, f"props_{w}.json")
json.dump(props, open(pj, "w"))
os.makedirs(os.path.join(P, "final"), exist_ok=True)
out = os.path.join(P, "final", f"{w}.mp4")
cmd = ["npx", "remotion", "render", "src/index.ts", "SceneOverlay", out, "--props", pj, "--public-dir", pub,
       "--browser-executable", CHROME, "--concurrency", "4", "--log", "error"]
if len(sys.argv) > 2 and sys.argv[2] == "still":
    for fr in sys.argv[3].split(","):
        subprocess.run(["npx", "remotion", "still", "src/index.ts", "SceneOverlay", os.path.join(P, "final", f"{w}_still_{fr}.png"), "--frame", fr,
                        "--props", pj, "--public-dir", pub, "--browser-executable", CHROME, "--log", "error"], cwd=REM, check=True)
else:
    subprocess.run(cmd, cwd=REM, check=True)
print("->", out)
