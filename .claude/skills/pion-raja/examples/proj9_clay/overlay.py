"""proj9 Remotion overlay: python3 overlay.py [still f1,f2] -> final/clay_ov.mp4 (scene frames + texts locked to 3D points + zoom-blur cuts)"""
import json, os, subprocess, sys
P = os.path.expanduser("~/pion/proj9"); REM = os.path.expanduser("~/pion/castle3d/remotion"); CHROME = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"
w, fps = os.environ.get("SEQ", "clay"), 60
seq = os.path.join(P, "out", w); n = len([f for f in os.listdir(seq) if f.endswith(".jpg")]); pts = json.load(open(os.path.join(seq, "pts.json")))
pub = os.path.join(P, "pub_" + w); os.makedirs(pub, exist_ok=True)
if not os.path.exists(os.path.join(pub, w)): os.symlink(seq, os.path.join(pub, w))
items = [
    {"type": "caption", "t0": 0.45, "t1": 1.08, "text": "THAILAND", "label": "NEXT STOP", "pos": "top"},
    {"type": "caption", "t0": 4.83, "t1": 6.3, "text": "A FEW DAYS LATER", "pos": "top"},
    {"type": "tag", "t0": 12.95, "t1": 14.98, "at": "clay", "text": "SOFT CLAY", "dx": 0.18, "dy": -0.14, "color": "#f3c75a"},
    {"type": "tag", "t0": 14.15, "t1": 14.98, "at": "frame", "text": "STEEL FRAME", "dx": -0.2, "dy": 0.12, "color": "#5fd3ff"},
    {"type": "pop", "t0": 16.2, "t1": 16.95, "at": "face", "text": "!", "size": 0.12, "dx": 0.06, "dy": -0.08},
    {"type": "tag", "t0": 23.95, "t1": 24.42, "at": "dphone", "text": "📞 BOSS", "dx": 0.16, "dy": -0.12, "color": "#ff4d4d"},
    {"type": "rage", "t0": 24.85, "t1": 27.05, "at": "ear", "text": "#@%&!!", "dx": -0.2, "dy": -0.2, "rot": -8},
    {"type": "rage", "t0": 25.3, "t1": 27.05, "at": "ear", "text": "WHERE'S MY REPORT?!", "dx": 0.0, "dy": -0.33, "rot": 4, "size": 0.06},
    {"type": "rage", "t0": 25.85, "t1": 27.05, "at": "ear", "text": "NYENYENYE!!", "dx": 0.14, "dy": -0.1, "rot": -5},
    {"type": "rage", "t0": 26.35, "t1": 27.05, "at": "ear", "text": "!!!", "dx": -0.24, "dy": 0.02, "rot": 10, "size": 0.09},
    {"type": "caption", "t0": 27.25, "t1": 27.95, "text": "OKAY.", "pos": "top"},
    {"type": "pop", "t0": 29.3, "t1": 29.85, "at": "head", "text": "😏", "size": 0.11, "dx": 0.16, "dy": -0.02},
]
props = {"frames": n, "fps": fps, "width": 1080, "height": 1920, "seq": w, "pts": pts, "items": items, "cuts": [0.02, 1.10, 3.05, 4.80, 9.40, 15.0, 20.81], "intro": None}
pj = os.path.join(P, f"props_{w}.json"); json.dump(props, open(pj, "w")); os.makedirs(os.path.join(P, "final"), exist_ok=True)
if len(sys.argv) > 2 and sys.argv[1] == "still":
    for fr in sys.argv[2].split(","):
        subprocess.run(["npx", "remotion", "still", "src/index.ts", "SceneOverlay", os.path.join(P, "final", f"still_{fr}.png"), "--frame", fr, "--props", pj, "--public-dir", pub, "--browser-executable", CHROME, "--log", "error"], cwd=REM, check=True)
else:
    out = os.path.join(P, "final", f"{w}_ov.mp4")
    subprocess.run(["npx", "remotion", "render", "src/index.ts", "SceneOverlay", out, "--props", pj, "--public-dir", pub, "--browser-executable", CHROME, "--concurrency", "3", "--crf", "14", "--log", "error"], cwd=REM, check=True); print("->", out)
