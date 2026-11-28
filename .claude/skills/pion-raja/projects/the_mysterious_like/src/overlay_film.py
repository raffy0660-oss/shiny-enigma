"""Remotion caption layer for the full film (narration = plain captions, 1-2 words in sync with the VO) -> ~/pion/proj12/final/film_ov.mp4  [python3 overlay_film.py a-b out.mp4]"""
import json, os, subprocess, glob
P = os.path.expanduser("~/pion/proj12"); REM = os.path.expanduser("~/pion/castle3d/remotion"); CHROME = glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0]
HERE = os.path.dirname(os.path.realpath(__file__)); N = 3971
import sys; RNG = sys.argv[1] if len(sys.argv) > 1 else f'0-{N - 1}'; OUTN = sys.argv[2] if len(sys.argv) > 2 else 'film_ov.mp4'
CUTS = [(0.0, 66.19, 0.0)]
pub = P + "/pub_film"; os.makedirs(pub + "/fonts", exist_ok=True); os.makedirs(pub + "/film", exist_ok=True)
for w in ("800", "900"): subprocess.run(["cp", os.path.join(HERE, "..", "..", "the_photograph", "assets", "fonts", f"montserrat-latin-{w}-normal.woff"), pub + "/fonts/"], check=True)
for f in range(N):   # hardlinks (Remotion drops symlinked frames)
    s, d = f"{P}/out/film/{f:05d}.jpg", f"{pub}/film/{f:05d}.jpg"
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
import importlib.util; cuts = []
props = {"frames": N, "fps": 60, "width": 1080, "height": 1920, "seq": "film", "pts": {}, "items": items, "cuts": cuts, "intro": None}
pj = P + "/props_film.json"; json.dump(props, open(pj, "w"))
subprocess.run(["npx", "remotion", "render", "src/index.ts", "SceneOverlay", P + "/final/" + OUTN, "--props", pj, "--public-dir", pub, "--browser-executable", CHROME,
                "--concurrency", "3", "--crf", "15", "--log", "error", "--frames", RNG], cwd=REM, check=True)
print("->", P + "/final/" + OUTN)
