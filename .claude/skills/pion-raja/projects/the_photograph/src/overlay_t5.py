"""Remotion layer for the 5 s test: scene frames + CASE SOLVED stamp -> final/t5_ov.mp4, then mux audio -> final/t5_test.mp4"""
import json, os, subprocess
P = os.path.expanduser("~/pion/proj10"); REM = os.path.expanduser("~/pion/castle3d/remotion"); CHROME = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"
seq = P + "/out/t5"; n = len([f for f in os.listdir(seq) if f.endswith(".jpg")]); pts = json.load(open(seq + "/pts.json"))
pub = P + "/pub_t5"; os.makedirs(pub, exist_ok=True)
if not os.path.exists(pub + "/t5"): os.symlink(seq, pub + "/t5")
items = [{"type": "stamp", "t0": 0.26, "t1": 1.12, "text": "CASE SOLVED", "x": 0.5, "y": 0.86, "rot": -8, "size": 0.12}]
props = {"frames": n, "fps": 60, "width": 1080, "height": 1920, "seq": "t5", "pts": pts, "items": items, "cuts": [], "intro": None}
pj = P + "/props_t5.json"; json.dump(props, open(pj, "w"))
subprocess.run(["npx", "remotion", "render", "src/index.ts", "SceneOverlay", P + "/final/t5_ov.mp4", "--props", pj, "--public-dir", pub, "--browser-executable", CHROME, "--concurrency", "3", "--crf", "14", "--log", "error"], cwd=REM, check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", P + "/final/t5_ov.mp4", "-i", P + "/final/t5_audio.wav", "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-shortest", P + "/final/t5_test.mp4"], check=True)
print("->", P + "/final/t5_test.mp4")
