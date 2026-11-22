"""Remotion layer over the whole film (no captions, user's choice; data text only) -> ~/pion/proj10/final/film_ov.mp4
python3 overlay_film.py [--frames a-b]"""
import json, os, subprocess, sys, glob
P = os.path.expanduser("~/pion/proj10"); REM = os.path.expanduser("~/pion/castle3d/remotion"); CHROME = glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0]
pts = {}
for f in sorted(glob.glob(P + "/out/*/pts.json")):
    if "/prev" in f or "test" in f or f.endswith("s23_t/pts.json"): continue
    for k, v in json.load(open(f)).items(): pts.setdefault(k, {}).update({n: p for n, p in (v or {}).items() if p})
pub = P + "/pub_film"; os.makedirs(pub, exist_ok=True)
if os.path.lexists(pub + "/film"): os.remove(pub + "/film")
os.symlink(P + "/film", pub + "/film")
items = [   # big bold data words (type "word" in SceneOverlay.tsx); no captions (user's choice)
  {"type": "word", "t0": 14.08, "t1": 15.32, "at": "clockFace", "dy": -0.2, "text": "11:42", "size": 0.22, "color": "#ffe9a8"},          # scene 3: frozen at exactly 11:42
  {"type": "word", "t0": 24.8, "t1": 27.7, "x": 0.5, "y": 0.13, "text": "DANIEL CROSS", "sub": "MISSING  ·  5 YEARS", "size": 0.12},  # scene 5
  {"type": "word", "t0": 31.1, "t1": 31.8, "x": 0.5, "y": 0.8, "text": "NO BODY", "size": 0.13, "color": "#ff5a5a", "rot": -4},         # scene 6: the three "no"s
  {"type": "word", "t0": 31.92, "t1": 32.6, "x": 0.5, "y": 0.8, "text": "NO BLOOD", "size": 0.13, "color": "#ff5a5a", "rot": 3},
  {"type": "word", "t0": 33.38, "t1": 34.0, "x": 0.5, "y": 0.8, "text": "0 FINGERPRINTS", "size": 0.095, "color": "#ff5a5a", "rot": -3},
  {"type": "word", "t0": 34.74, "t1": 35.8, "x": 0.5, "y": 0.14, "text": "FRIDAY", "size": 0.2, "color": "#ff4a4a"},                     # scene 7
  {"type": "word", "t0": 44.2, "t1": 45.36, "at": "clockFace", "dy": -0.2, "text": "11:42", "size": 0.22, "color": "#ffe9a8"},          # scene 8
]
fr = [a for a in sys.argv if a.startswith("--frames")]
props = {"frames": 4404, "fps": 60, "width": 1080, "height": 1920, "seq": "film", "pts": pts, "items": items, "cuts": [21.05, 27.95, 34.0, 45.4, 54.33], "intro": None}
pj = P + "/props_film.json"; json.dump(props, open(pj, "w"))
OUTN = sys.argv[2] if len(sys.argv) > 2 else "film_ov.mp4"
cmd = ["npx", "remotion", "render", "src/index.ts", "SceneOverlay", P + "/final/" + OUTN, "--props", pj, "--public-dir", pub, "--browser-executable", CHROME, "--concurrency", "3", "--crf", "15", "--log", "error"]
if len(sys.argv) > 1 and sys.argv[1].count("-") == 1 and not sys.argv[1].startswith("--"): cmd += ["--frames", sys.argv[1]]
subprocess.run(cmd, cwd=REM, check=True); print("->", P + "/final/" + OUTN)
