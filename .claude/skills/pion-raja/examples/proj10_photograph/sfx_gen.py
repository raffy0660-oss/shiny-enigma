"""ElevenLabs SFX v3 for "The Photograph" (one request at a time, via the proxy). Saves assets/sfx/<name>.mp3 (repo) + ~/pion/proj10/sfx/<name>.wav.
python3 sfx_gen.py [names...]   (existing mp3s are skipped unless named)"""
import json, sys, subprocess, os, urllib.request
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = REPO + "/assets/sfx"; W = os.path.expanduser("~/pion/proj10/sfx"); os.makedirs(W, exist_ok=True)
SFX = {   # name: (prompt, seconds, prompt_influence, loop)
 "mus_a":      ("instrumental mystery detective music loop, curious sneaky pizzicato strings, soft low piano motif, light ticking clock percussion, upright bass, dark playful investigation mood, no vocals", 30.0, .65, True),
 "mus_b":      ("instrumental suspense thriller music loop, urgent low string ostinato, pulsing timpani heartbeat, ticking clock, rising tension, dark cinematic mystery, no vocals", 30.0, .65, True),
 "mus_c":      ("instrumental eerie reveal music loop, haunting slow music box melody over deep cold drone and dissonant strings, chilling plot twist mood, no vocals", 15.0, .65, True),
 "noir_loop":   ("dark film noir detective jazz loop, muted trumpet, slow upright bass walk, brushed drums, mysterious rainy night, no vocals", 22.0, .55, True),
 "tension_bed": ("suspense thriller underscore, low pulsing synth drone with slow ticking clock and rising strings, ominous", 22.0, .5, True),
 "reveal_bed":  ("eerie dark ambient drone, deep sub bass and cold glassy textures, unsettling horror reveal atmosphere", 20.0, .5, True),
 "env_slide":   ("paper envelope sliding under a wooden door across a wooden floor, swish and soft scrape", 1.2, .7, False),
 "paper":       ("photograph paper picked up and flipped over, crisp paper flutter", 0.8, .7, False),
 "tick_stop":   ("old alarm clock ticking then the ticking suddenly stops, followed by a tiny glass crack", 2.2, .65, False),
 "glass_crack": ("glass cracking sharply, small clock glass splintering", 0.8, .7, False),
 "thunder":     ("close thunder clap with a long deep rumble, stormy night", 3.0, .6, False),
 "lightning":   ("sharp lightning strike crack, electric snap and boom", 1.5, .65, False),
 "siren":       ("police car siren wailing outside an apartment building at night, distant, with rain", 6.0, .55, False),
 "page_tear":   ("calendar page torn off quickly, paper rip", 0.7, .7, False),
 "bass_hit":    ("massive cinematic bass hit impact, deep boom with a dark reverb tail", 2.5, .65, False),
 "shutter":     ("vintage film camera shutter click with a flash bulb pop and high pitched flash charge whine", 1.2, .7, False),
 "glitch":      ("digital data glitch, corrupted computer screen stutter, short bursts of static", 1.0, .65, False),
 "keys":        ("laptop trackpad click and a few keyboard key taps in a quiet room", 1.0, .6, False),
 "heartbeat":   ("slow heavy heartbeat, two deep thumps", 1.6, .65, False),
 "final_tick":  ("single loud clock tick followed by a deep low boom and silence", 2.0, .65, False),
 "hop":         ("soft cartoon wooden chess piece hopping on a wooden floor, small light taps", 1.0, .6, False),
 "magnify":     ("detective magnifying glass sweep, subtle glassy shimmer", 0.8, .55, False),
 "street_rain": ("city street at dusk in light rain, distant traffic, rain on pavement, faint neon buzz", 7.0, .5, False),
 "neon":        ("flickering neon sign electrical buzz and crackle", 2.0, .65, False),
 "dive":        ("magical whoosh diving into a photograph, airy swirl with a soft shimmer", 1.0, .6, False),
 "whoosh2":     ("quick dark whoosh camera fly-by", 0.6, .65, False),
 "door_creak":  ("old apartment door creaking open slowly", 1.5, .65, False),
 "sting":       ("short dramatic orchestral suspense sting, low strings and a brass stab", 1.8, .6, False),
}
def gen(name):
    text, dur, pi, loop = SFX[name]
    body = json.dumps({"text": text, "model_id": "eleven_text_to_sound_v3", "duration_seconds": dur, "prompt_influence": pi, "loop": loop}).encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192", data=body, headers={"Content-Type": "application/json", "xi-api-key": "dummy"})
    with urllib.request.urlopen(req, timeout=240) as r: open(f"{A}/{name}.mp3", "wb").write(r.read())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{A}/{name}.mp3", "-ar", "48000", "-ac", "2", f"{W}/{name}.wav"], check=True)
names = sys.argv[1:] or [n for n in SFX if not os.path.exists(f"{A}/{n}.mp3")]
for n in names:
    try: gen(n); print("ok", n, flush=True)
    except Exception as e: print("ERR", n, e, flush=True)
