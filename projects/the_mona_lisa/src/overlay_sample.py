"""Remotion caption layer for the Mona Lisa sample (narration captions, 1-2 words, in sync with the VO) -> ~/pion/proj13/final/sample_ov.mp4
No word timestamps (ElevenLabs STT credits used up): each phrase is placed between the pauses found in vo.mp3 (ffmpeg silencedetect)
and its words are spread over it by syllable weight."""
import json, os, re, subprocess, glob
P = os.path.expanduser("~/pion/proj13"); REM = os.path.expanduser("~/pion/castle3d/remotion"); CHROME = glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0]
HERE = os.path.dirname(os.path.realpath(__file__)); N = 930
PHRASES = [(0.02, 2.56, "Someone had stolen the Mona Lisa."), (2.64, 3.10, "And now,"), (3.20, 5.31, "I was the one assigned to find it..."),
           (5.67, 6.37, "and uncover"), (6.45, 8.13, "the identity of the thief."), (8.35, 10.41, "When I arrived at the museum,"),
           (10.92, 13.71, "I examined the crime scene."), (14.23, 15.37, "The painting was gone.")]
syl = lambda w: max(1, len(re.findall(r"[aeiouy]+", w.lower().strip(".,!?"))) - (1 if w.lower().strip(".,!?").endswith("e") and len(w) > 3 else 0))
words = []
for a, b, txt in PHRASES:
    ws = txt.split(); wt = [syl(w) + 0.35 for w in ws]; tot = sum(wt); t = a
    for w, k in zip(ws, wt): d = (b - a) * k / tot; words.append([t, t + d, w]); t += d
chunks, i = [], 0
while i < len(words):
    a, b, w = words[i]; txt = w; j = i + 1
    if j < len(words) and not w[-1:] in ".,?!" and len(w) + len(words[j][2]) <= 11 and words[j][0] - b < 0.2: txt += " " + words[j][2]; b = words[j][1]; j += 1
    chunks.append([a, b, txt]); i = j
items = [{"type": "cap", "t0": round(a, 3), "t1": round(min(chunks[k + 1][0], b + 0.35) if k + 1 < len(chunks) else b + 0.35, 3), "text": txt} for k, (a, b, txt) in enumerate(chunks)]
print("captions:", len(items), [c["text"] for c in items])
pub = P + "/pub_sample"; os.makedirs(pub + "/fonts", exist_ok=True); os.makedirs(pub + "/film", exist_ok=True)
for w in ("800", "900"): subprocess.run(["cp", os.path.join(HERE, "..", "..", "the_photograph", "assets", "fonts", f"montserrat-latin-{w}-normal.woff"), pub + "/fonts/"], check=True)
for f in range(N):
    s, d = f"{P}/out/sample/{f:05d}.jpg", f"{pub}/film/{f:05d}.jpg"
    if os.path.exists(d): os.remove(d)
    os.link(s, d)
props = {"frames": N, "fps": 60, "width": 1080, "height": 1920, "seq": "film", "pts": {}, "items": items, "cuts": [], "intro": None}
pj = P + "/props_sample.json"; json.dump(props, open(pj, "w"))
subprocess.run(["npx", "remotion", "render", "src/index.ts", "SceneOverlay", P + "/final/sample_ov.mp4", "--props", pj, "--public-dir", pub, "--browser-executable", CHROME,
                "--concurrency", "3", "--crf", "15", "--log", "error", "--frames", f"0-{N - 1}"], cwd=REM, check=True)
print("->", P + "/final/sample_ov.mp4")
