"""Remotion layer over the whole film (no captions, user's choice; data text only) -> ~/pion/proj10/final/film_ov.mp4
python3 overlay_film.py [--frames a-b]"""
import json, os, subprocess, sys, glob
P = os.path.expanduser("~/pion/proj10"); REM = os.path.expanduser("~/pion/castle3d/remotion"); CHROME = glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0]
pts = {}
SCENES = ["s12", "s23", "s4", "s5", "s6", "s7", "s78", "s9", "s10", "s1113"]   # only the real scene renders (test/preview dirs like s11_t would overwrite the tracks)
for f in [P + "/out/" + s + "/pts.json" for s in SCENES]:
    for k, v in json.load(open(f)).items(): pts.setdefault(k, {}).update({n: p for n, p in (v or {}).items() if p})
pub = P + "/pub_film"; os.makedirs(pub, exist_ok=True)
os.makedirs(pub + "/fonts", exist_ok=True)
for w in ("800", "900"): subprocess.run(["cp", os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "assets", "fonts", f"montserrat-latin-{w}-normal.woff"), pub + "/fonts/"], check=True)
if os.path.lexists(pub + "/film"): os.remove(pub + "/film")
os.symlink(P + "/film", pub + "/film")
items = [   # big bold data words (type "word" in SceneOverlay.tsx); no captions (user's choice)
  {"type": "word", "t0": 14.08, "t1": 15.32, "at": "clockFace", "dy": -0.2, "text": "11:42", "size": 0.22, "color": "#ffe9a8"},          # scene 3: frozen at exactly 11:42
  {"type": "word", "t0": 24.8, "t1": 27.7, "x": 0.5, "y": 0.13, "text": "DANIEL CROSS", "sub": "MISSING  ·  5 YEARS", "size": 0.12},  # scene 5
  {"type": "word", "t0": 31.1, "t1": 31.8, "x": 0.5, "y": 0.3, "text": "NO BODY", "size": 0.13, "color": "#ff5a5a", "rot": -4},         # scene 6: the three "no"s
  {"type": "word", "t0": 31.92, "t1": 32.6, "x": 0.5, "y": 0.3, "text": "NO BLOOD", "size": 0.13, "color": "#ff5a5a", "rot": 3},
  {"type": "word", "t0": 33.38, "t1": 34.0, "x": 0.5, "y": 0.3, "text": "0 FINGERPRINTS", "size": 0.095, "color": "#ff5a5a", "rot": -3},
  {"type": "word", "t0": 34.74, "t1": 35.8, "x": 0.5, "y": 0.14, "text": "FRIDAY", "size": 0.2, "color": "#ff4a4a"},                     # scene 7
  {"type": "word", "t0": 44.2, "t1": 45.36, "at": "clockFace", "dy": -0.2, "text": "11:42", "size": 0.22, "color": "#ffe9a8"},          # scene 8
]
# captions (user, after v2): 1-2 words in sync with the VO. Narrator = plain (reference style); when the speaking character is ON SCREEN
# the caption carries his name pill ("SUCCIFY") above the text (style of the user's photo). Pion's tracked head point decides it, per scene.
PION_KEY = [((0, 511), "head"), ((924, 1267), "head"), ((2040, 2173), "head"), ((2724, 3031), "head"), ((3258, 4405), "head"),
            ((1260, 1678), "pion0"), ((1674, 2044), "pion0"), ((2166, 2725), "pion2")]   # s23 / s10 (photo world): Pion is not there
def pion_on_screen(f):
    for (a, b), k in PION_KEY:
        if a <= f < b:
            p = pts.get(str(f), {}).get(k)
            return bool(p) and 0.08 < p[0] < 0.92 and 0.04 < p[1] < 0.85 and (len(p) < 3 or p[2] < 1)
    return False
words = []
for seg in json.load(open(os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "vo_stt.json"))):
    for a, b, w in seg["w"]:
        w = w.strip()
        if words and w.startswith(".") and words[-1][2][-1:].isdigit(): words[-1] = [words[-1][0], b, words[-1][2] + ":" + w[1:]]   # "11" ".42." -> "11:42."
        else: words.append([a, b, w])
chunks, i = [], 0
while i < len(words):
    a, b, w = words[i]; txt = w; j = i + 1
    if j < len(words) and not w[-1:] in ".,?!" and len(w) + len(words[j][2]) <= 11 and words[j][0] - b < 0.2: txt += " " + words[j][2]; b = words[j][1]; j += 1
    chunks.append([a, b, txt]); i = j
for k, (a, b, txt) in enumerate(chunks):
    t1 = min(chunks[k + 1][0], b + 0.35) if k + 1 < len(chunks) else b + 0.35
    fr_ = range(int(round(a * 60)), max(int(round(a * 60)) + 1, int(round(t1 * 60))))
    on = sum(pion_on_screen(f) for f in fr_) >= 0.4 * len(fr_)   # speaker visible for >=40% of the chunk (a camera swing landing on him counts)
    items.append({"type": "cap", "t0": round(a, 3), "t1": round(t1, 3), "text": txt.upper().rstrip(".,") if on else txt, **({"name": "SUCCIFY"} if on else {})})
print("captions:", len(chunks), "named:", sum(1 for it in items if it.get("name")))
fr = [a for a in sys.argv if a.startswith("--frames")]
props = {"frames": 4404, "fps": 60, "width": 1080, "height": 1920, "seq": "film", "pts": pts, "items": items, "cuts": [21.05, 27.95, 34.0, 45.4, 54.33], "intro": None}
pj = P + "/props_film.json"; json.dump(props, open(pj, "w"))
OUTN = sys.argv[2] if len(sys.argv) > 2 else "film_ov.mp4"
cmd = ["npx", "remotion", "render", "src/index.ts", "SceneOverlay", P + "/final/" + OUTN, "--props", pj, "--public-dir", pub, "--browser-executable", CHROME, "--concurrency", "3", "--crf", "15", "--log", "error"]
if len(sys.argv) > 1 and sys.argv[1].count("-") == 1 and not sys.argv[1].startswith("--"): cmd += ["--frames", sys.argv[1]]
subprocess.run(cmd, cwd=REM, check=True); print("->", P + "/final/" + OUTN)
