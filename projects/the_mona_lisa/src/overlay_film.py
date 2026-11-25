"""Remotion caption layer for the Mona Lisa film (narration captions, 1-2 words, in sync with the VO) -> ~/pion/proj13/final/film_ov.mp4
Word timing: ElevenLabs speech-to-text (audio/stt.json)."""
import json, os, re, subprocess, glob
P = os.path.expanduser("~/pion/proj13"); REM = os.path.expanduser("~/pion/castle3d/remotion"); CHROME = glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0]
HERE = os.path.dirname(os.path.realpath(__file__)); N = 4380
words = []   # word timing from ElevenLabs STT (audio/stt.json)
for seg in json.load(open(P + "/audio/stt.json")):
    for a, b, w in seg["w"]:
        if a < 73.0: words.append([a, min(b, 73.0), w.strip()])
chunks, i = [], 0
while i < len(words):
    a, b, w = words[i]; txt = w; j = i + 1
    if j < len(words) and not w[-1:] in ".,?!" and len(w) + len(words[j][2]) <= 11 and words[j][0] - b < 0.2: txt += " " + words[j][2]; b = words[j][1]; j += 1
    chunks.append([a, b, txt]); i = j
items = [{"type": "cap", "t0": round(a, 3), "t1": round(min(chunks[k + 1][0], b + 0.35) if k + 1 < len(chunks) else b + 0.35, 3), "text": txt} for k, (a, b, txt) in enumerate(chunks)]
print("captions:", len(items), [c["text"] for c in items])
pub = P + "/pub_film"; os.makedirs(pub + "/fonts", exist_ok=True); os.makedirs(pub + "/film", exist_ok=True)
for w in ("800", "900"): subprocess.run(["cp", os.path.join(HERE, "..", "..", "the_photograph", "assets", "fonts", f"montserrat-latin-{w}-normal.woff"), pub + "/fonts/"], check=True)
for f in range(N):
    s, d = f"{P}/out/film_post/{f:05d}.jpg", f"{pub}/film/{f:05d}.jpg"
    if os.path.exists(d): os.remove(d)
    os.link(s, d)
# reference study: clue rings + labels, top time cards, a slammed word, zoom-blur flashes at every location change
items += [
  {"type": "caption", "t0": 0.3, "t1": 2.5, "label": "LOUVRE, PARIS", "text": "02:05 AM"},
  {"type": "word", "t0": 17.1, "t1": 19.6, "text": "UNTOUCHED", "x": 0.5, "y": 0.27, "size": 0.12, "sub": "NO ALARM"},
  {"type": "ring", "t0": 22.95, "t1": 24.35, "x": 0.5, "y": 0.43, "r": 0.14, "label": "THE HOOK", "ly": 0.24},
  {"type": "ring", "t0": 29.3, "t1": 30.45, "x": 0.84, "y": 0.45, "r": 0.15, "label": "BLACK FABRIC", "lx": 0.62, "ly": 0.24},
  {"type": "caption", "t0": 35.0, "t1": 38.2, "label": "3 MINUTES BEFORE", "text": "02:08 AM"},
  {"type": "ring", "t0": 56.05, "t1": 57.45, "x": 0.75, "y": 0.72, "r": 0.2, "label": "SECOND SET", "lx": 0.62, "ly": 0.46},
  {"type": "ring", "t0": 57.85, "t1": 59.4, "x": 0.2, "y": 0.7, "r": 0.19, "label": "PATTERN A", "color": "#22c7b8", "lx": 0.32, "ly": 0.45},
  {"type": "ring", "t0": 58.3, "t1": 59.4, "x": 0.84, "y": 0.09, "r": 0.15, "label": "PATTERN B", "color": "#ff4fa3", "lx": 0.7, "ly": 0.27},
  {"type": "ring", "t0": 66.55, "t1": 67.55, "x": 0.57, "y": 0.52, "r": 0.22, "label": "KEYCARD", "ly": 0.2}]
CUTS = [5.6, 10.8, 24.4, 28.4, 32.4, 35.0, 49.25, 59.45, 65.55, 67.6]
props = {"frames": N, "fps": 60, "width": 1080, "height": 1920, "seq": "film", "pts": {}, "items": items, "cuts": CUTS, "intro": None}
pj = P + "/props_film.json"; json.dump(props, open(pj, "w"))
subprocess.run(["npx", "remotion", "render", "src/index.ts", "SceneOverlay", P + "/final/film_ov.mp4", "--props", pj, "--public-dir", pub, "--browser-executable", CHROME,
                "--concurrency", "3", "--crf", "15", "--log", "error", "--frames", f"0-{N - 1}"], cwd=REM, check=True)
print("->", P + "/final/film_ov.mp4")
