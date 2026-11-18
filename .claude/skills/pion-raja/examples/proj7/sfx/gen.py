import json, sys, subprocess, os, urllib.request, concurrent.futures as cf
SFX = {
 "zoomout":  ("big cinematic whoosh pulling back fast to reveal something enormous, airy and deep", 1.4, .6, False),
 "grow":     ("cartoon character growing giant, rising stretchy magical inflate with a bouncy boing at the end", 1.2, .65, False),
 "measure":  ("quick measuring tape zip extending, metallic and snappy", 0.8, .7, False),
 "counter":  ("fast digital number counter ticking up rapidly then a bright ding", 1.2, .65, False),
 "whoosh":   ("fast smooth whoosh scene transition swoosh", 0.8, .6, False),
 "romance":  ("soft romantic movie moment, gentle warm piano notes and strings swell, nostalgic", 2.5, .55, False),
 "field_amb":("open green field ambience on a sunny day, light breeze, distant birds chirping", 8.0, .5, True),
 "book":     ("magical book glowing open, sparkly shimmer and a page flip", 1.2, .6, False),
 "melt":     ("giant rubbery jelly stretching and squishing flat, cartoon gooey melting sound", 1.8, .65, False),
 "fall":     ("short cartoon falling whistle", 0.5, .7, False),
 "slam":     ("huge heavy impact slamming onto the ground, deep thud with earthquake rumble and debris", 1.4, .7, False),
 "flyup":    ("magical rising whoosh with sparkles, character floating up into the air", 1.1, .6, False),
}
def gen(name):
    text, dur, pi, loop = SFX[name]
    body = json.dumps({"text": text, "model_id": "eleven_text_to_sound_v3", "duration_seconds": dur, "prompt_influence": pi, "loop": loop}).encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192", data=body, headers={"Content-Type": "application/json", "xi-api-key": "dummy"})
    with urllib.request.urlopen(req, timeout=180) as r: open(name + ".mp3", "wb").write(r.read())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", name + ".mp3", "-ar", "48000", "-ac", "2", name + ".wav"], check=True)
    return name
names = sys.argv[1:] or list(SFX)
with cf.ThreadPoolExecutor(1) as ex:
    for fut in cf.as_completed([ex.submit(gen, n) for n in names]):
        try: print("ok", fut.result(), flush=True)
        except Exception as e: print("ERR", e, flush=True)
