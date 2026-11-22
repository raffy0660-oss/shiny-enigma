"""Remotion layer over the whole film (no captions, user's choice; data text only) -> ~/pion/proj10/final/film_ov.mp4
python3 overlay_film.py [--frames a-b]"""
import json, os, subprocess, sys, glob
P = os.path.expanduser("~/pion/proj10"); REM = os.path.expanduser("~/pion/castle3d/remotion"); CHROME = glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0]
pts = {}
for f in sorted(glob.glob(P + "/out/*/pts.json")):
    if "/prev" in f or "test" in f or f.endswith("s23_t/pts.json"): continue
    for k, v in json.load(open(f)).items(): pts.setdefault(k, {}).update({n: p for n, p in (v or {}).items() if p})
pub = P + "/pub_film"; os.makedirs(pub, exist_ok=True)
if not os.path.exists(pub + "/film"): os.symlink(P + "/film", pub + "/film")
items = [
  {"type": "pop", "t0": 14.08, "t1": 15.3, "at": "clockFace", "text": "11:42", "size": 0.1, "dy": -0.12},          # scene 3: frozen at exactly 11:42
  {"type": "caption", "t0": 24.85, "t1": 27.7, "text": "DANIEL CROSS", "label": "MISSING  ·  5 YEARS", "pos": "top"},   # scene 5
  {"type": "tag", "t0": 31.1, "t1": 31.8, "at": "floor", "text": "NO BODY", "dx": 0.0, "dy": -0.06, "color": "#e04848"},   # scene 6: the three "no"s
  {"type": "tag", "t0": 31.92, "t1": 32.6, "at": "rug", "text": "NO BLOOD", "dx": 0.0, "dy": -0.06, "color": "#e04848"},
  {"type": "tag", "t0": 33.38, "t1": 34.0, "at": "knob", "text": "0 FINGERPRINTS", "dx": -0.05, "dy": -0.08, "color": "#e04848"},
  {"type": "pop", "t0": 34.74, "t1": 35.75, "at": "cal", "text": "FRIDAY", "size": 0.11, "dy": -0.2},              # scene 7
  {"type": "pop", "t0": 44.2, "t1": 45.35, "at": "clockFace", "text": "11:42", "size": 0.1, "dy": -0.12},           # scene 8
]
fr = [a for a in sys.argv if a.startswith("--frames")]
props = {"frames": 4404, "fps": 60, "width": 1080, "height": 1920, "seq": "film", "pts": pts, "items": items, "cuts": [21.05, 27.95, 34.0, 45.4, 54.33], "intro": None}
pj = P + "/props_film.json"; json.dump(props, open(pj, "w"))
cmd = ["npx", "remotion", "render", "src/index.ts", "SceneOverlay", P + "/final/film_ov.mp4", "--props", pj, "--public-dir", pub, "--browser-executable", CHROME, "--concurrency", "3", "--crf", "15", "--log", "error"]
if len(sys.argv) > 1 and sys.argv[1].count("-") == 1 and not sys.argv[1].startswith("--"): cmd += ["--frames", sys.argv[1]]
subprocess.run(cmd, cwd=REM, check=True); print("->", P + "/final/film_ov.mp4")
