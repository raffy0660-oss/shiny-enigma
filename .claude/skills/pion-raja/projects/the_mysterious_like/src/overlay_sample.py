"""Remotion caption layer for the sample (narration = plain captions, 1-2 words in sync with the VO cut list) -> ~/pion/proj12/final/s15_ov.mp4"""
import json, os, subprocess, glob
P = os.path.expanduser("~/pion/proj12"); REM = os.path.expanduser("~/pion/castle3d/remotion"); CHROME = glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0]
HERE = os.path.dirname(os.path.realpath(__file__)); N = 996
CUTS = [(0.00, 4.80, 0.00), (22.10, 27.62, 4.80), (58.00, 60.25, 10.32), (63.40, 66.19, 13.17)]
pub = P + "/pub_s15"; os.makedirs(pub + "/fonts", exist_ok=True); os.makedirs(pub + "/film", exist_ok=True)
for w in ("800", "900"): subprocess.run(["cp", os.path.join(HERE, "..", "..", "the_photograph", "assets", "fonts", f"montserrat-latin-{w}-normal.woff"), pub + "/fonts/"], check=True)
for f in range(N):   # hardlinks (Remotion drops symlinked frames)
    s, d = f"{P}/out/s15/{f:05d}.jpg", f"{pub}/film/{f:05d}.jpg"
    if os.path.exists(d): os.remove(d)
    os.link(s, d)
words = []
for seg in json.load(open(P + "/audio/stt.json")):
    for a, b, w in seg["w"]:
        for c0, c1, at in CUTS:
            if a >= c0 - 0.02 and b <= c1 + 0.05: words.append([a - c0 + at, min(b, c1) - c0 + at, w.strip()])
chunks, i = [], 0
while i < len(words):
    a, b, w = words[i]; txt = w; j = i + 1
    if j < len(words) and not w[-1:] in ".,?!" and len(w) + len(words[j][2]) <= 11 and words[j][0] - b < 0.2: txt += " " + words[j][2]; b = words[j][1]; j += 1
    chunks.append([a, b, txt]); i = j
items = []
for k, (a, b, txt) in enumerate(chunks):
    t1 = min(chunks[k + 1][0], b + 0.35) if k + 1 < len(chunks) else b + 0.35
    items.append({"type": "cap", "t0": round(a, 3), "t1": round(t1, 3), "text": txt})
print("captions:", len(items), [c["text"] for c in items])
props = {"frames": N, "fps": 60, "width": 1080, "height": 1920, "seq": "film", "pts": {}, "items": items, "cuts": [4.8, 7.74, 8.64, 9.5, 10.32, 12.0, 13.17], "intro": None}
pj = P + "/props_s15.json"; json.dump(props, open(pj, "w"))
subprocess.run(["npx", "remotion", "render", "src/index.ts", "SceneOverlay", P + "/final/s15_ov.mp4", "--props", pj, "--public-dir", pub, "--browser-executable", CHROME,
                "--concurrency", "3", "--crf", "15", "--log", "error", "--frames", f"0-{N - 1}"], cwd=REM, check=True)
print("->", P + "/final/s15_ov.mp4")
