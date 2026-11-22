"""Audio for the whole film: VO + noir music bed -> tension bed -> reveal drone, ambiences and ElevenLabs SFX on every action.
-> ~/pion/proj10/final/film_audio.wav and film_sfx_only.wav (everything but the VO)."""
import subprocess, os
P = os.path.expanduser("~/pion/proj10"); S = P + "/sfx/"; D = 73.4
# beds: (name, start, end, dB, fade_in, fade_out, loop)
BEDS = [("noir_loop", 0.0, 34.6, -24, 0.4, 0.5, True), ("rain", 0.0, 21.1, -27, 0.6, 0.4, True), ("hum", 0.16, 21.1, -30, 0.3, 0.4, True),
        ("street_rain", 21.0, 28.0, -23, 0.3, 0.4, True), ("tension_bed", 27.8, 54.6, -25, 1.5, 0.15, True), ("rain", 34.0, 54.5, -25, 0.3, 0.3, True),
        ("siren", 36.05, 42.2, -21, 0.2, 1.5, False), ("reveal_bed", 54.5, 73.38, -20, 0.05, 0.05, True)]
# events: (name, t, dB)
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
def run(out, vo):
    ins, fc, lab = [], [], []; i = 0
    if vo: ins += ["-i", P + "/audio/vo.mp3"]; fc.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{D}[vo]"); lab.append("[vo]"); i += 1
    for n, a, b, db, fi, fo, loop in BEDS:
        ins += (["-stream_loop", "-1"] if loop else []) + ["-i", S + n + ".wav"]; d = b - a
        fc.append(f"[{i}:a]atrim=0:{d:.3f},asetpts=PTS-STARTPTS,afade=t=in:d={fi},afade=t=out:st={max(0, d - fo):.3f}:d={fo},volume={db}dB,adelay={int(a*1000)}|{int(a*1000)}[b{i}]"); lab.append(f"[b{i}]"); i += 1
    for n, t, db in EV:
        ins += ["-i", S + n + ".wav"]; fc.append(f"[{i}:a]volume={db}dB,adelay={int(t*1000)}|{int(t*1000)}[e{i}]"); lab.append(f"[e{i}]"); i += 1
    fc.append(f"{''.join(lab)}amix=inputs={len(lab)}:normalize=0,atrim=0:{D},afade=t=out:st={D - 0.08}:d=0.08,alimiter=limit=0.95[out]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fc), "-map", "[out]", "-ar", "48000", out], check=True)
import re
def lufs(f): o = subprocess.run(["ffmpeg", "-v", "info", "-i", f, "-af", "loudnorm=print_format=summary", "-f", "null", "-"], capture_output=True, text=True).stderr; return float(re.search(r"Input Integrated:\s+(-?[\d.]+)", o).group(1))
os.makedirs(P + "/final", exist_ok=True); A, B = P + "/final/_mix.wav", P + "/final/_sfx.wav"; run(A, True); run(B, False)
g = -14.0 - lufs(A)   # Shorts loudness; the sfx-only stem gets the same gain so it lines up with the mix
for src, dst in [(A, P + "/final/film_audio.wav"), (B, P + "/final/film_sfx_only.wav")]:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", f"volume={g - 1.2:.2f}dB,alimiter=limit=0.8:level=false", "-ar", "48000", dst], check=True); os.remove(src)
print("ok, gain", round(g, 2), "dB ->", lufs(P + "/final/film_audio.wav"), "LUFS")
