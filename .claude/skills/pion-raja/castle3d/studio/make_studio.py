"""Prepare the browser studio for one cue file, then serve it.

    python3 make_studio.py --cues cues.txt --audio vo.wav [--port 8765] [--no-serve]

1. castle.glb + scene.json (export_studio.py, once; reused after that)
2. engine Pion frames for these cues with the mood lights (same engine cue file as castle_video.py),
   packed as a transparent WebM (VP9 alpha) + the audio + the cue text
3. a static server on the skill folder: open http://localhost:<port>/castle3d/studio/
"""
import argparse
import http.server
import json
import os
import shutil
import socketserver
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
C3D = os.path.dirname(HERE)
SKILL = os.path.dirname(C3D)
sys.path.insert(0, C3D)
import castle_video as CV   # noqa: E402  (engine_cues, parse_exprs, ENGINE, BPY)


def run(cmd, cwd=None):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"failed: {' '.join(map(str, cmd))}\n{r.stdout[-1500:]}\n{r.stderr[-1500:]}")
    return r.stdout


class RangeHandler(http.server.SimpleHTTPRequestHandler):
    """Static files with HTTP Range support: browsers need it to seek in the Pion video and the audio."""

    def send_head(self):
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        try:
            a, b = rng.replace("bytes=", "").split("-")
            start = int(a) if a else max(0, size - int(b))
            end = int(b) if a and b else size - 1
        except ValueError:
            return super().send_head()
        end = min(end, size - 1)
        if start > end:
            self.send_error(416); return None
        f = open(path, "rb"); f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        n = getattr(self, "_remaining", None)
        if n is None:
            return super().copyfile(source, outputfile)
        while n > 0:
            chunk = source.read(min(65536, n))
            if not chunk:
                break
            outputfile.write(chunk); n -= len(chunk)
        self._remaining = None

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cues", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-serve", action="store_true")
    ap.add_argument("--reexport", action="store_true", help="rebuild castle.glb even if it exists")
    a = ap.parse_args()
    assets = os.path.join(HERE, "assets")
    os.makedirs(assets, exist_ok=True)
    if a.reexport or not os.path.isfile(os.path.join(assets, "castle.glb")):
        print("exporting castle.glb ...", flush=True)
        run([CV.BPY, os.path.join(HERE, "export_studio.py"), "--", "--out", assets])
    cues = os.path.abspath(a.cues)
    segs = CV.parse_exprs(cues)
    work = os.path.join(assets, "work"); os.makedirs(work, exist_ok=True)
    ecue = os.path.join(work, "engine_cues.txt")
    CV.engine_cues(cues, segs, ecue)
    print("engine Pion ...", flush=True)
    eng = os.path.join(work, "eng")
    run(["node", "react_render.js", "--audio", os.path.abspath(a.audio), "--cues", ecue, "--out", eng,
         "--png", "--blur", "1", "--bg", "black", "--size", "540x960"], cwd=CV.ENGINE)
    run(["ffmpeg", "-v", "error", "-y", "-framerate", "30", "-i", os.path.join(eng + "_frames", "%05d.png"),
         "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30", "-row-mt", "1",
         "-auto-alt-ref", "0", os.path.join(assets, "pion.webm")])
    run(["ffmpeg", "-v", "error", "-y", "-i", os.path.abspath(a.audio), "-c:a", "libmp3lame", "-q:a", "3", os.path.join(assets, "audio.mp3")])
    shutil.copy(cues, os.path.join(assets, "cues.txt"))
    track = json.load(open(eng + "_track.json"))
    json.dump({"fps": track["fps"], "frames": len(track["frames"]), "engine_frame": [540, 960], "segs": segs},
              open(os.path.join(assets, "timeline.json"), "w"))
    shutil.rmtree(eng + "_frames", ignore_errors=True)
    print("studio assets ready", flush=True)
    if a.no_serve:
        return
    os.chdir(SKILL)

    class Quiet(RangeHandler):
        def log_message(self, *args):
            pass
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", a.port), Quiet) as srv:
        print(f"RESULT studio http://localhost:{a.port}/castle3d/studio/", flush=True)
        srv.serve_forever()


if __name__ == "__main__":
    main()
