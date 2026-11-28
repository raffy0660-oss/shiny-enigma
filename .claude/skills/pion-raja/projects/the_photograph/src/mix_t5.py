"""Mix the 5 s test: VO + noir drone + rain + lamp click/hum + stamp + whooshes -> final/t5_audio.wav and sfx_only."""
import subprocess, os
P = os.path.expanduser("~/pion/proj10"); S = P + "/sfx/"
ev = [("click", 0.10, -6), ("hum", 0.16, -24), ("stamp", 0.26, -3), ("whoosh", 1.0, -10), ("whoosh", 2.42, -10), ("whoosh", 4.32, -10)]
beds = [("drone", -19), ("rain", -24)]
def run(out, with_vo):
    ins, fc, lab = [], [], []
    if with_vo: ins += ["-t", "5", "-i", P + "/audio/vo.mp3"]; fc.append("[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.0[vo]"); lab.append("[vo]")
    for n, db in beds:
        k = len(ins) // 2 if not with_vo else len(ins) // 4 + 1
    idx = 1 if with_vo else 0
    for n, db in beds:
        ins += ["-i", S + n + ".wav"]; fc.append(f"[{idx}:a]atrim=0:5,afade=t=in:d=0.6,afade=t=out:st=4.6:d=0.4,volume={db}dB[b{idx}]"); lab.append(f"[b{idx}]"); idx += 1
    for n, t, db in ev:
        ins += ["-i", S + n + ".wav"]; fc.append(f"[{idx}:a]adelay={int(t*1000)}|{int(t*1000)},volume={db}dB[e{idx}]"); lab.append(f"[e{idx}]"); idx += 1
    fc.append(f"{''.join(lab)}amix=inputs={len(lab)}:normalize=0,atrim=0:5,alimiter=limit=0.95[out]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fc), "-map", "[out]", "-ar", "48000", out], check=True)
os.makedirs(P + "/final", exist_ok=True)
run(P + "/final/t5_audio.wav", True); run(P + "/final/t5_sfx_only.wav", False); print("ok")
