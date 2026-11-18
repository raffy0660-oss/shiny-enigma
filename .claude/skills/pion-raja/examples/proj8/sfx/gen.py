"""proj8 SFX (ElevenLabs SFX v3, one request per sound, sequential): python3 gen.py [names...]"""
import json, sys, subprocess, urllib.request
SFX = {
 "plaza_amb": ("busy outdoor city plaza ambience in Paris on a warm evening, crowd murmur of tourists, distant footsteps, pigeons, light breeze", 6.0, .5, True),
 "whoosh":    ("big fast cinematic whoosh as the camera pulls back quickly to reveal a wide scene, airy swoosh", 1.0, .65, False),
 "gasp":      ("cute cartoon character surprised gasp with a bouncy boing", 0.8, .65, False),
 "pop":       ("cartoon badge popping onto the screen, punchy pop with a small heavy thud", 0.6, .7, False),
 "measure":   ("quick measuring tape zip extending, metallic and snappy", 0.7, .7, False),
 "counter":   ("fast digital number counter ticking up rapidly then a bright ding", 1.0, .65, False),
}
def gen(name):
    text, dur, pi, loop = SFX[name]
    body = json.dumps({"text": text, "model_id": "eleven_text_to_sound_v3", "duration_seconds": dur, "prompt_influence": pi, "loop": loop}).encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", data=body, headers={"Content-Type": "application/json", "xi-api-key": "dummy"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r: open(name + ".mp3", "wb").write(r.read())
    except urllib.error.HTTPError as e: print("ERR", name, e.code, e.read()[:200], flush=True); return
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", name + ".mp3", "-ar", "48000", "-ac", "2", name + ".wav"], check=True)
    print("ok", name, flush=True)
for n in (sys.argv[1:] or list(SFX)): gen(n)
