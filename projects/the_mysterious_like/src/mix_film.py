"""Audio for the full film "The Mysterious Like" (66.19 s) -> ~/pion/proj12/final/film_audio.wav + film_sfx_only.wav
Full VO (original timing), music + SFX from the reused library (projects/the_photograph/assets/sfx; ElevenLabs credits are used up).
Levels (BRIEF_KONTEN): VO -13 LUFS, music -22, SFX -18, limiter."""
import os, re, subprocess
P = os.path.expanduser("~/pion/proj12"); F = P + "/final/"; os.makedirs(F, exist_ok=True)
LIB = os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "..", "the_photograph", "assets", "sfx")
D = 66.19
CUTS = [(0.0, 66.19, 0.0)]   # the whole VO, original timing
MUSIC = [("mus_a", 0.0, 10.75, 0.3, 0.6, 0), ("mus_b", 10.7, 44.65, 0.6, 0.5, 0), ("tension_bed", 44.6, 58.1, 0.5, 0.4, -2), ("drone", 57.95, 63.5, 0.05, 0.3, 0),
         ("mus_c", 63.3, D, 0.3, 0.6, 0), ("reveal_bed", 63.3, D, 0.3, 0.6, -8)]
SFX = [("hum", 0.0, -14, 10.7), ("rain", 0.0, -17, 10.7), ("whoosh2", 0.16, -8), ("whoosh", 1.0, -15), ("whoosh2", 3.08, -8), ("hop", 3.36, -10), ("hop", 4.12, -9), ("hop", 4.58, -9), ("hop", 5.04, -9),
       ("click", 6.05, -8), ("click", 7.35, -6), ("whoosh", 8.45, -12), ("sting", 8.6, -8), ("neon", 9.5, -12, 1.1),
       ("whoosh2", 10.62, -7), ("rain", 10.7, -19, 6.3), ("keys", 11.4, -15), ("click", 13.1, -3), ("whoosh", 13.0, -14), ("bass_hit", 15.3, -12), ("whoosh2", 16.85, -6), ("glitch", 16.95, -12),
       ("drone", 16.95, -14, 5.2), ("heartbeat", 20.1, -8), ("click", 20.9, -6), ("whoosh", 21.95, -9), ("heartbeat", 22.6, -10),
       ("whoosh", 24.88, -6), ("bass_hit", 25.04, -4), ("whoosh2", 25.78, -6), ("bass_hit", 25.94, -4), ("whoosh", 26.64, -6), ("bass_hit", 26.8, -4), ("bass_hit", 26.9, -2), ("sting", 26.9, -6),
       ("whoosh2", 27.6, -8), ("paper", 28.6, -12), ("whoosh", 30.5, -12), ("magnify", 32.2, -12), ("paper", 33.5, -8), ("paper", 34.4, -8), ("paper", 35.3, -8), ("paper", 36.0, -9), ("bass_hit", 36.4, -8),
       ("page_tear", 38.1, -14), ("page_tear", 38.55, -14), ("page_tear", 39.0, -14), ("page_tear", 39.45, -14), ("whoosh", 39.9, -10), ("sting", 40.5, -12),
       ("keys", 41.0, -12), ("click", 42.0, -8), ("keys", 42.6, -14), ("whoosh", 43.7, -8), ("bass_hit", 44.6, -9), ("whoosh2", 44.55, -6),
       ("rain", 44.6, -20, 1.7), ("drone", 44.6, -12, 13.4), ("door_creak", 45.4, -6), ("hop", 45.86, -10), ("hop", 46.3, -10), ("hop", 46.9, -11), ("hop", 47.4, -11), ("hop", 47.9, -11),
       ("hum", 47.1, -18, 3.1), ("whoosh", 50.1, -14), ("click", 52.85, -10), ("click", 54.08, -2), ("sting", 54.1, -14), ("heartbeat", 54.6, -8), ("heartbeat", 56.3, -7),
       ("whoosh", 57.9, -12), ("stamp", 59.18, 0), ("bass_hit", 59.18, -1), ("final_tick", 59.33, -4), ("keys", 59.24, -11), ("glass_crack", 59.2, -20),
       ("heartbeat", 60.5, -6), ("heartbeat", 61.7, -5), ("heartbeat", 62.8, -4), ("thunder", 63.5, -16), ("lightning", 64.22, -4), ("thunder", 64.28, -6), ("sting", 64.24, -8),
       ("whoosh", 64.26, -14), ("stamp", 64.74, -8), ("glass_crack", 64.76, -9), ("bass_hit", 65.95, -10)]
TARGET = {"vo": -13.0, "music": -22.0, "sfx": -18.0}
def ff(*a): subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)
def lufs(f): o = subprocess.run(["ffmpeg", "-v", "info", "-i", f, "-af", "loudnorm=print_format=summary", "-f", "null", "-"], capture_output=True, text=True).stderr; return float(re.search(r"Input Integrated:\s+(-?[\d.]+)", o).group(1))
def peaknorm(n):
    out = P + "/sfx_norm/" + n + ".wav"; os.makedirs(P + "/sfx_norm", exist_ok=True)
    if not os.path.exists(out):
        o = subprocess.run(["ffmpeg", "-v", "info", "-i", f"{LIB}/{n}.mp3", "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
        mx = float(re.search(r"max_volume: (-?[\d.]+)", o).group(1)); ff("-i", f"{LIB}/{n}.mp3", "-af", f"volume={-1.0 - mx:.2f}dB,aresample=48000,aformat=channel_layouts=stereo", out)
    return out
def stem(out, parts):   # parts: (input file, filter for [i:a] -> [s{i}], loop)
    ins, fc = [], []
    for i, (src, f, loop) in enumerate(parts): ins += (["-stream_loop", "-1"] if loop else []) + ["-i", src]; fc.append(f.format(i=i))
    fc.append("".join(f"[s{i}]" for i in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0,atrim=0:{D}[out]")
    ff(*ins, "-filter_complex", ";".join(fc), "-map", "[out]", "-ar", "48000", "-ac", "2", out)
vo = os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "vo.mp3")
stem(F + "_vo.wav", [(vo, f"[{{i}}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.02,afade=t=out:st={b - a - 0.04:.3f}:d=0.04,"
                          f"highpass=f=70,acompressor=threshold=-22dB:ratio=3:attack=8:release=120:makeup=2,adelay={int(at * 1000)}|{int(at * 1000)},apad=whole_dur={D}[s{{i}}]", False) for a, b, at in CUTS])
stem(F + "_music.wav", [(peaknorm(n), f"[{{i}}:a]atrim=0:{b - a:.3f},asetpts=PTS-STARTPTS,afade=t=in:d={fi},afade=t=out:st={max(0, b - a - fo):.3f}:d={fo},volume={db}dB,adelay={int(a * 1000)}|{int(a * 1000)},apad=whole_dur={D}[s{{i}}]", True) for n, a, b, fi, fo, db in MUSIC])
parts = []
for e in SFX:
    n, t, db = e[:3]; dur = e[3] if len(e) > 3 else None
    flt = f"[{{i}}:a]" + (f"atrim=0:{dur},afade=t=out:st={max(0, dur - 0.4):.2f}:d=0.4," if dur else "") + f"volume={db}dB,adelay={int(t * 1000)}|{int(t * 1000)},apad=whole_dur={D}[s{{i}}]"
    parts.append((peaknorm(n), flt, bool(dur)))
stem(F + "_sfx.wav", parts)
g = {k: TARGET[k] - lufs(F + f"_{k}.wav") for k in TARGET}
def mix(out, keys): ff(*sum([["-i", F + f"_{k}.wav"] for k in keys], []), "-filter_complex",
    ";".join(f"[{i}:a]volume={g[k]:.2f}dB[a{i}]" for i, k in enumerate(keys)) + ";" + "".join(f"[a{i}]" for i in range(len(keys))) + f"amix=inputs={len(keys)}:normalize=0,alimiter=limit=0.8:level=false,afade=t=out:st={D - 0.3}:d=0.3[o]", "-map", "[o]", "-ar", "48000", out)
mix(F + "film_audio.wav", ["vo", "music", "sfx"]); mix(F + "film_sfx_only.wav", ["music", "sfx"])
print("gains", {k: round(v, 1) for k, v in g.items()}, "mix", lufs(F + "film_audio.wav"), "sfx_only", lufs(F + "film_sfx_only.wav"))
