import json, sys, subprocess, os, urllib.request, concurrent.futures as cf
SFX = {
 # W1
 "leak":      ("small steady water leak trickling out of a crack in a stone castle wall, thin stream splashing onto a marble floor, close and clear", 6.0, .55, False),
 "crack":     ("stone wall cracking under pressure, deep creaking groan and crumbling grit, tension building", 1.6, .6, False),
 "burst":     ("massive stone castle wall bursting open, explosive crash of bricks and debris followed by a huge roaring rush of water", 3.0, .6, False),
 "torrent":   ("powerful torrent of water pouring into a room and flooding it fast, roaring rushing water, churning and sloshing, rising", 4.0, .55, False),
 "blub":      ("cartoon character gurgling underwater in panic, big comedic blub blub blub bubbles, blubuk blubuk", 1.8, .7, False),
 "submerge":  ("sound going muffled as a microphone dives underwater, splash then deep muffled underwater rumble", 1.5, .55, False),
 "flail":     ("cartoon panicked flailing and thrashing in water, frantic splashes and muffled underwater swishes", 2.5, .5, False),
 "uw_amb":    ("calm muffled underwater ambience, soft deep hum, gentle bubbles rising, swimming pool underwater", 14.0, .5, True),
 "whoosh_uw": ("fast underwater whoosh transition swoosh with bubbles", 1.0, .6, False),
 # W2
 "tongue":    ("cartoon tongue sticking out, funny wet blep pop sound", 0.6, .75, False),
 "puff":      ("cartoon cheeks puffing up full of air, rubbery balloon inflating squeak", 0.9, .7, False),
 "zoomout":   ("soft subtle swoosh, gentle air whoosh", 0.7, .6, False),
 "failring":  ("sloppy wobbly cartoon underwater bubble blurp, comedic farty bubble burst that pops instantly", 0.8, .7, False),
 "pop":       ("quick tiny cluster of bubbles popping, comedic", 0.5, .7, False),
 "awkward":   ("comedic awkward moment, single cricket chirp in silence", 1.2, .6, False),
 "angry":     ("cartoon angry steam puff whistle, comedic frustration", 0.9, .6, False),
 "button":    ("satisfying chunky subscribe button click with a bright pop and soft ding", 0.8, .7, False),
 "windup":    ("cartoon wind up anticipation, rising stretchy whoosh getting ready", 1.2, .6, False),
 "ring":      ("magical underwater bubble ring shooting out, smooth airy whoosh with shimmering sparkle, satisfying", 2.0, .6, False),
 "ringcam":   ("big bubble whoosh rushing past the camera, airy swoosh with bubbly splash", 1.2, .6, False),
 "sparkle":   ("bright cartoon sparkle shine ding, cool pose", 0.9, .7, False),
}
SFX.update({
 "burst2":   ("catastrophic dam burst inside a stone castle hall, colossal explosion of bricks, thunderous deep boom, a gigantic wall of water smashing through, cinematic and brutal", 4.0, .7, False),
 "torrent2": ("enormous violent flood of water roaring into a room, massive crashing whitewater, thundering rush, churning, overwhelming and loud, cinematic", 5.0, .7, False),
 "slam":     ("huge heavy water impact slam, massive wave crashing hard against a body, deep and violent splash", 1.5, .75, False),
 "roar_uw":  ("deep violent underwater roar and rumble as a room floods, turbulent bubbles and pressure, muffled thunder", 3.5, .65, False),
})
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
