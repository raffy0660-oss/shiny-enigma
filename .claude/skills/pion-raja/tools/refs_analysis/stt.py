import json, sys, os, subprocess, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=2)
for i in range(1, 16):
    v = f"/root/pion/refs/v/v{i:02d}.mp4"; o = f"/root/pion/refs/an/stt_v{i:02d}.json"
    if os.path.exists(o): continue
    a = np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",v,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout, np.float32)
    segs, info = m.transcribe(a, word_timestamps=True, vad_filter=False)
    out = [{"s": round(s.start, 2), "e": round(s.end, 2), "t": s.text.strip(), "w": [[round(w.start, 2), round(w.end, 2), w.word] for w in s.words]} for s in segs]
    json.dump(out, open(o, "w")); print("done", i, flush=True)
