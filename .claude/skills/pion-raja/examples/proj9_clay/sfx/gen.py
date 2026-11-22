"""proj9 SFX (ElevenLabs SFX v3, one request at a time): python3 gen.py [names...]"""
import json, sys, subprocess, urllib.request
SFX = {
 "plane":   ("cartoon propeller airplane flying past the camera fast, buzzing engine with a doppler whoosh", 2.0, .6),
 "landing": ("small cartoon airplane wheels touching down on a road, rubber tire squeak and a bouncy boing", 1.0, .65),
 "hop":     ("tiny cartoon hop, light springy boing", 0.5, .7),
 "cloth":   ("fabric sheet pulled off quickly, cloth swish whoosh", 0.8, .7),
 "sparkle": ("magical sparkle reveal shimmer with a bright chime", 1.2, .65),
 "xray":    ("sci-fi x-ray scanner sweep, electric hum rising", 1.5, .6),
 "punch":   ("heavy punch into wet soft clay, squishy splat impact with a deep cartoon thud", 1.0, .7),
 "wobble":  ("cartoon wobble spring boing, heavy object wobbling back and forth", 1.2, .65),
 "ring":    ("smartphone ringing and vibrating on a wooden desk, buzzing vibration with a modern ringtone", 0.6, .7),
 "pickup":  ("picking up a phone from a desk, short plastic click and handling rustle", 0.5, .7),
 "cock":    ("cartoon rifle being cocked, crisp metallic chk-chk rack sound", 0.8, .75),
 "zoom":    ("fast cinematic camera zoom whoosh, short rising swoosh", 0.6, .7),
 "thud":    ("heavy clay statue set down on a wooden shelf, solid thud", 0.6, .7),
}
for n in (sys.argv[1:] or list(SFX)):
    text, dur, pi = SFX[n]
    body = json.dumps({"text": text, "model_id": "eleven_text_to_sound_v3", "duration_seconds": dur, "prompt_influence": pi}).encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", data=body, headers={"Content-Type": "application/json", "xi-api-key": "dummy"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r: open(n + ".mp3", "wb").write(r.read())
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", n + ".mp3", "-ar", "48000", "-ac", "2", n + ".wav"], check=True); print("ok", n, flush=True)
    except urllib.error.HTTPError as e: print("ERR", n, e.code, e.read()[:200], flush=True)
