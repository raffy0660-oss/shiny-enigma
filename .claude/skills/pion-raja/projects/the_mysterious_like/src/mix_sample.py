"""Audio for the 15 s sample of "The Mysterious Like" -> ~/pion/proj12/final/s15_audio.wav + s15_sfx_only.wav
VO cut list (original -> sample time), music + SFX from the reused library (.claude/skills/pion-raja/projects/the_photograph/assets/sfx; ElevenLabs credits are used up).
Levels (BRIEF_KONTEN): VO -13 LUFS, music -22, SFX -18, limiter."""
import os, re, subprocess
P = os.path.expanduser("~/pion/proj12"); F = P + "/final/"; os.makedirs(F, exist_ok=True)
LIB = os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "..", "the_photograph", "assets", "sfx")
D = 16.6
CUTS = [(0.00, 4.80, 0.00), (22.10, 27.62, 4.80), (58.00, 60.25, 10.32), (63.40, 66.19, 13.17)]   # (from, to, at)
MUSIC = [("mus_b", 0.0, 10.32, 0.2, 0.25, 0), ("drone", 10.32, 13.17, 0.05, 0.3, -2), ("mus_c", 13.0, D, 0.4, 0.6, 0), ("reveal_bed", 13.0, D, 0.3, 0.6, -8)]
SFX = [("hum", 0.0, -14, 4.8), ("rain", 0.0, -16, 4.8), ("hop", 3.36, -10), ("hop", 4.12, -9), ("hop", 4.58, -9), ("whoosh", 3.85, -12),
       ("whoosh2", 4.62, -6), ("glitch", 4.8, -12), ("click", 6.05, -6), ("heartbeat", 6.3, -12),
       ("whoosh", 7.58, -6), ("bass_hit", 7.74, -4), ("whoosh2", 8.48, -6), ("bass_hit", 8.64, -4), ("whoosh", 9.34, -6), ("bass_hit", 9.5, -4), ("bass_hit", 9.6, -2), ("sting", 9.6, -6),
       ("rain", 10.32, -18, 2.9), ("stamp", 11.5, 0), ("bass_hit", 11.5, -1), ("final_tick", 11.66, -4), ("glass_crack", 11.52, -20),
       ("heartbeat", 12.05, -6), ("thunder", 13.3, -16), ("lightning", 14.0, -4), ("thunder", 14.06, -6), ("sting", 14.0, -8), ("bass_hit", 16.0, -10)]
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
mix(F + "s15_audio.wav", ["vo", "music", "sfx"]); mix(F + "s15_sfx_only.wav", ["music", "sfx"])
print("gains", {k: round(v, 1) for k, v in g.items()}, "mix", lufs(F + "s15_audio.wav"), "sfx_only", lufs(F + "s15_sfx_only.wav"))
