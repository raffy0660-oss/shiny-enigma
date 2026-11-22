"""proj9: original video 0-8.35 s (60 fps already) + the animation on the white screen, zoom-blur at the join, VO + SFX (ducked)."""
import subprocess, sys
OFF = 8.35
src, sfx = "src/input.mp4", "sfx/sfx_only.wav"; anim, out = sys.argv[1], sys.argv[2]
fc = (f"[0:v]trim=0:{OFF},setpts=PTS-STARTPTS,fps=60,format=yuv420p[a];[1:v]fps=60,format=yuv420p,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v];"
      f"[0:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[vo][vok];[2:a][vok]sidechaincompress=threshold=0.04:ratio=4:attack=15:release=300[s];"
      f"[vo][s]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=11[au]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-i", anim, "-i", sfx, "-filter_complex", fc, "-map", "[v]", "-map", "[au]", "-c:v", "libx264", "-crf", "16", "-preset", "medium",
                "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", "-shortest", out], check=True); print("->", out)
