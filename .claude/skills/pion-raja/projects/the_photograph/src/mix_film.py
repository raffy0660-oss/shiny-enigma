"""Audio for "The Photograph" (v2, user notes: a fitting mystery backsound + the voice-over much louder, 100 -> 1000).
Three stems, each measured and set to a target loudness, then summed and limited:
  vo    : the voice-over, gentle compression, brought up to -13 LUFS on its own (as loud as it goes without breaking up; raw +20 dB would clip)
  music : mystery score in three parts from ElevenLabs SFX v3 loops (free plan has no Music API):
          A 0-28 s curious pizzicato/piano investigation, B 28-54.6 s suspense ostinato + ticking (through "Then Friday"),
          C 54.6-73.4 s haunting music box over a cold drone ("It was me" -> the end); -24 LUFS (clearly heard, ~11 dB under the voice)
  sfx   : every action + ambiences (rain, street, siren, hum), -26 LUFS
-> ~/pion/proj10/final/film_audio.wav (mix) and film_sfx_only.wav (music + sfx, no voice), true peak <= -1.5 dBTP."""
import subprocess, os, re, json
P = os.path.expanduser("~/pion/proj10"); S = P + "/sfx/"; F = P + "/final/"; D = 73.4
os.makedirs(F, exist_ok=True)
MUSIC = [("mus_a", 0.0, 28.4, 0.3, 0.9), ("mus_b", 27.6, 54.75, 0.8, 0.25), ("mus_c", 54.5, 73.38, 0.06, 0.05), ("reveal_bed", 54.5, 73.38, 0.06, 0.05)]   # name, start, end, fade in, fade out
MUSIC_DB = {"mus_a": 0, "mus_b": 0, "mus_c": 0, "reveal_bed": -9}
AMB = [("rain", 0.0, 21.1, -10, 0.6, 0.4), ("hum", 0.16, 21.1, -16, 0.3, 0.4), ("street_rain", 21.0, 28.0, -6, 0.3, 0.4), ("rain", 34.0, 54.5, -9, 0.3, 0.3), ("siren", 36.05, 42.2, -4, 0.2, 1.5)]
EV = [("click", 0.10, -6), ("whoosh", 1.3, -12), ("whoosh", 2.7, -12), ("whoosh", 4.5, -12), ("whoosh2", 5.05, -10), ("env_slide", 5.42, -6), ("whoosh2", 6.25, -11),
      ("dive", 7.35, -9), ("dive", 8.15, -8), ("whoosh2", 9.05, -12), ("whoosh2", 10.65, -12), ("sting", 11.8, -13), ("tick_stop", 12.3, -7), ("bass_hit", 14.06, -9),
      ("whoosh", 15.42, -11), ("paper", 15.72, -6), ("whoosh2", 17.55, -13), ("whoosh2", 19.2, -12), ("lightning", 20.08, -9), ("thunder", 20.2, -10),
      ("whoosh", 20.95, -9), ("neon", 22.2, -16), ("whoosh2", 23.2, -12), ("whoosh2", 24.45, -12), ("whoosh2", 25.95, -12), ("door_creak", 27.4, -10), ("whoosh", 27.75, -10),
      ("hop", 28.0, -9), ("hop", 28.6, -10), ("magnify", 29.55, -12), ("whoosh2", 30.75, -12), ("hop", 30.9, -10), ("whoosh2", 31.55, -12), ("hop", 31.7, -10),
      ("whoosh2", 32.35, -12), ("hop", 32.5, -10), ("magnify", 33.1, -12), ("lightning", 34.44, -6), ("thunder", 34.5, -7), ("page_tear", 34.52, -6), ("bass_hit", 34.46, -11),
      ("lightning", 35.95, -7), ("whoosh2", 36.95, -12), ("whoosh2", 38.15, -12), ("whoosh2", 39.55, -12), ("heartbeat", 39.9, -10), ("whoosh2", 41.05, -12), ("paper", 41.6, -8),
      ("sting", 41.65, -12), ("whoosh2", 43.4, -12), ("tick_stop", 43.6, -10), ("bass_hit", 44.2, -9), ("whoosh", 45.35, -11), ("whoosh2", 46.2, -13), ("magnify", 48.45, -11),
      ("sting", 48.9, -13), ("dive", 49.3, -9), ("heartbeat", 51.3, -9), ("heartbeat", 52.9, -8), ("shutter", 53.46, -5), ("whoosh2", 54.3, -12), ("bass_hit", 54.56, -5),
      ("heartbeat", 55.0, -10), ("keys", 55.5, -12), ("whoosh2", 57.35, -13), ("glitch", 59.88, -7), ("whoosh2", 61.5, -13), ("keys", 64.4, -12), ("whoosh2", 64.5, -13),
      ("whoosh2", 68.4, -13), ("sting", 68.74, -12), ("whoosh", 70.4, -13), ("whoosh2", 72.45, -11), ("final_tick", 73.08, -5)]
TARGET = {"vo": -13.0, "music": -22.0, "sfx": -18.0}   # v3 (user: some SFX too quiet, make it as lively as possible but still mysterious)
def ff(*a): subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)
def lufs(f): o = subprocess.run(["ffmpeg", "-v", "info", "-i", f, "-af", "loudnorm=print_format=summary", "-f", "null", "-"], capture_output=True, text=True).stderr; return float(re.search(r"Input Integrated:\s+(-?[\d.]+)", o).group(1))
def bed(i, n, a, b, db, fi, fo, loop=True):
    d = b - a; return (["-stream_loop", "-1"] if loop else []) + ["-i", S + n + ".wav"], f"[{i}:a]atrim=0:{d:.3f},asetpts=PTS-STARTPTS,afade=t=in:d={fi},afade=t=out:st={max(0, d - fo):.3f}:d={fo},volume={db}dB,adelay={int(a*1000)}|{int(a*1000)},apad=whole_dur={D}[s{i}]"
def stem(out, parts):
    ins, fc, lab = [], [], []
    for i, (inp, f) in enumerate(parts): ins += inp; fc.append(f.replace("{i}", str(i)) if "{i}" in f else f); lab.append(f"[s{i}]")
    fc.append(f"{''.join(lab)}amix=inputs={len(lab)}:normalize=0,atrim=0:{D}[out]"); ff(*ins, "-filter_complex", ";".join(fc), "-map", "[out]", "-ar", "48000", "-ac", "2", out)
# ---- v3: every SFX file peak-normalised (so the dB offsets mean the same thing), auto whooshes on every camera fly move, risers before the big turns, hits on the data words
NS = P + "/sfx_norm/"; os.makedirs(NS, exist_ok=True)
def norm(n):
    out = NS + n + ".wav"
    if not os.path.exists(out):
        o = subprocess.run(["ffmpeg", "-v", "info", "-i", S + n + ".wav", "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
        mx = float(re.search(r"max_volume: (-?[\d.]+)", o).group(1)); ff("-i", S + n + ".wav", "-af", f"volume={-1.0 - mx:.2f}dB", out)
    return out
if not os.path.exists(NS + "riser.wav"): ff("-i", S + "whoosh.wav", "-af", "areverse,atempo=0.8,afade=t=in:d=0.5,volume=2dB", NS + "riser.wav")
if not os.path.exists(NS + "riser2.wav"): ff("-i", S + "sting.wav", "-af", "areverse,afade=t=in:d=0.9", NS + "riser2.wav")
PLANS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plans")
js = "const r=[];for(const n of ['s12_office','s23_apt','s4_office','s5_ext','s6_aptB','s7_office','s78_aptC','s9_office','s10_aptA','s1113_office']){const K=require('%s/'+n+'.js').K||[];for(let i=1;i<K.length;i++){if((K[i].ease||'io')!=='io')continue;r.push([K[i-1].t,K[i].t])}}console.log(JSON.stringify(r))" % PLANS
MOVES = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True).stdout)
have = [t for n, t, db in EV if n.startswith("whoosh")]
AUTO = []
for k, (a, b) in enumerate(MOVES):
    t = max(0.0, (a + b) / 2 - 0.32)
    if b - a < 0.25 or any(abs(t - h) < 0.3 for h in have) or t > D - 0.5: continue
    AUTO.append(("whoosh" if k % 2 else "whoosh2", t, -7)); have.append(t)
TURNS = [8.2, 15.4, 21.0, 27.9, 34.46, 36.1, 45.4, 50.3, 54.56, 72.95]
RISE = [("riser" if i % 2 else "riser2", max(0, t - 0.95), -6) for i, t in enumerate(TURNS)]
HITS = [("bass_hit", t, -10) for t in (14.08, 24.8, 31.1, 31.92, 33.38, 34.74, 44.2)] + [("click", t, -4) for t in (14.08, 24.8, 31.1, 31.92, 33.38, 34.74, 44.2)]
EV = EV + AUTO + HITS
print("auto whooshes:", len(AUTO), "risers:", len(RISE))
# stems
ff("-i", P + "/audio/vo.mp3", "-af", f"aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,acompressor=threshold=-22dB:ratio=3:attack=8:release=120:makeup=2,apad=whole_dur={D},atrim=0:{D}", F + "_vo.wav")
stem(F + "_music.wav", [bed(i, n, a, b, MUSIC_DB[n], fi, fo) for i, (n, a, b, fi, fo) in enumerate(MUSIC)])
parts = [bed(i, n, a, b, db, fi, fo, n != "siren") for i, (n, a, b, db, fi, fo) in enumerate(AMB)]
for j, (n, t, db) in enumerate(EV + RISE): i = len(parts); src = NS + n + ".wav" if n.startswith("riser") else norm(n); parts.append((["-i", src], f"[{i}:a]volume={db}dB,adelay={int(t*1000)}|{int(t*1000)},apad=whole_dur={D}[s{i}]"))
stem(F + "_sfx.wav", parts)
g = {k: TARGET[k] - lufs(F + f"_{k}.wav") for k in TARGET}
print("stem gains dB:", {k: round(v, 1) for k, v in g.items()})
mix = lambda out, keys: ff(*sum([["-i", F + f"_{k}.wav"] for k in keys], []), "-filter_complex",
    ";".join(f"[{i}:a]volume={g[k]:.2f}dB[a{i}]" for i, k in enumerate(keys)) + ";" + "".join(f"[a{i}]" for i in range(len(keys))) + f"amix=inputs={len(keys)}:normalize=0,alimiter=limit=0.82:level=false,afade=t=out:st={D - 0.08}:d=0.08[o]",
    "-map", "[o]", "-ar", "48000", out)
mix(F + "film_audio.wav", ["vo", "music", "sfx"]); mix(F + "film_sfx_only.wav", ["music", "sfx"])
print("mix", lufs(F + "film_audio.wav"), "LUFS; sfx_only", lufs(F + "film_sfx_only.wav"), "LUFS")
