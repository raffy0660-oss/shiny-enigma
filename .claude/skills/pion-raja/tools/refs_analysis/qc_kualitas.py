"""QC of a finished video against the numbers measured on the 14 detective references (PANDUAN_KUALITAS.md).

  python3 qc_kualitas.py final.mp4 [--stt stt.json]

Reports brightness, black/white levels, contrast, detail density, camera motion (cuts, % of time moving,
zoom durations, size, curve shape, pull-outs), loudness, and, with --stt (ElevenLabs words json), the
pace / pauses / tail. Each line gets OK or a hint. Needs opencv-python-headless and ffmpeg.
"""
import sys, json, re, subprocess, numpy as np, cv2

REF = dict(luma=(95, 134), black=(13, 37), white=(215, 238), contrast=(46, 63), edges=(5.4, 13.6),
           moving=(67, 96), cuts_per_min=(0, 7), zoom_dur=(0.77, 1.57), zoom_pct=(14, 60), pullout=(15, 50),
           lufs=(-15.1, -14.0), wps=(3.3, 3.9), max_gap=(0, 0.35), first_word=(0.10, 0.24), tail=(0.05, 0.30))
# a detective / night film is allowed to sit darker than the reference average, but not crushed
DARK_OK = dict(luma=(65, 134), black=(10, 37), white=(205, 238))

def check(name, v, rng, unit=""):
    lo, hi = rng; ok = lo <= v <= hi
    print(f"  {'OK ' if ok else '!! '} {name:28} {v:8.2f}{unit:6} reference {lo}-{hi}{unit}")
    return ok

def frames(path):
    cap = cv2.VideoCapture(path); fps = cap.get(cv2.CAP_PROP_FPS)
    while True:
        ok, fr = cap.read()
        if not ok: return
        yield fps, cv2.resize(fr, (360, 640), interpolation=cv2.INTER_AREA)

def main():
    path = sys.argv[1]; stt = sys.argv[sys.argv.index("--stt") + 1] if "--stt" in sys.argv else None
    orb = cv2.ORB_create(1500); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    prev = None; ls, diff, inl = [], [], []; L, B, W, C, E = [], [], [], [], []; i = 0; fps = 30
    for fps, fr in frames(path):
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY); kp, de = orb.detectAndCompute(g, None); s, n = 1.0, 0
        if i % max(1, int(fps)) == 0:
            L.append(g.mean()); B.append(np.percentile(g, 2)); W.append(np.percentile(g, 98)); C.append(g.std()); E.append((cv2.Canny(g, 60, 150) > 0).mean() * 100)
        if prev is not None:
            diff.append(float(np.mean(cv2.absdiff(g, prev[0]))))
            if de is not None and prev[2] is not None:
                m = bf.match(prev[2], de)
                if len(m) > 20:
                    A = np.float32([prev[1][x.queryIdx].pt for x in m]); Bp = np.float32([kp[x.trainIdx].pt for x in m])
                    M, msk = cv2.estimateAffinePartial2D(A, Bp, method=cv2.RANSAC, ransacReprojThreshold=2.0)
                    if M is not None: s, n = float(np.hypot(M[0, 0], M[1, 0])), int(msk.sum())
            ls.append(np.log(s) if n >= 25 and abs(np.log(s)) < 0.08 else 0.0); inl.append(n)
        prev = (g, kp, de); i += 1
    dur = i / fps; k = 30 / fps
    ls, diff, inl = np.array(ls) / k, np.array(diff), np.array(inl)
    cuts = int(((diff > 3 * np.median(diff) + 8) & (inl < 40)).sum())
    w = max(1, int(round(3 / k))); lss = np.convolve(ls, np.ones(w) / w, "same")
    mask = np.abs(lss) > 0.0015; Z = []; j = 0
    while j < len(mask):
        if mask[j]:
            e = j
            while e < len(mask) and mask[max(0, e - 2):e + 1].any(): e += 1
            seg = lss[j:e]; tot = seg.sum()
            if abs(tot) >= 0.04: Z.append(((e - j) / fps, (np.exp(abs(tot)) - 1) * 100, tot < 0))
            j = e
        else: j += 1
    print(f"\n{path}  ({dur:.1f} s, {fps:.0f} fps)\n-- picture")
    check("mean brightness (luma)", np.mean(L), DARK_OK["luma"])
    check("black level (p2)", np.mean(B), DARK_OK["black"]); check("highlights (p98)", np.mean(W), DARK_OK["white"])
    check("contrast (luma std)", np.mean(C), REF["contrast"]); check("detail (edge %)", np.mean(E), REF["edges"], "%")
    print("-- camera")
    check("hard cuts per minute", cuts / dur * 60, REF["cuts_per_min"])
    check("camera moving", np.mean(np.abs(lss) > 0.0004) * 100, REF["moving"], "%")
    long = [z for z in Z if z[0] >= 0.45]
    if long:
        check("long zoom duration (median)", np.median([z[0] for z in long]), REF["zoom_dur"], "s")
        check("long zoom size (median)", np.median([z[1] for z in long]), REF["zoom_pct"], "%")
        check("pull-outs among zooms", 100 * np.mean([z[2] for z in Z]), REF["pullout"], "%")
    short = [z for z in Z if z[0] < 0.45]
    if short: print(f"       short punches: {len(short)}, median {np.median([z[1] for z in short]):.0f}% (reference ~10%)")
    print("-- sound")
    out = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", out)
    if m: check("integrated loudness", float(m[-1]), REF["lufs"], "LUFS")
    if stt:
        wd = [x for x in json.load(open(stt))["words"] if x.get("type") == "word"]
        gaps = [wd[q + 1]["start"] - wd[q]["end"] for q in range(len(wd) - 1)]
        check("first word starts", wd[0]["start"], REF["first_word"], "s")
        check("words per second", len(wd) / (wd[-1]["end"] - wd[0]["start"]), REF["wps"])
        check("longest pause", max(gaps), REF["max_gap"], "s")
        check("silence after last word", dur - wd[-1]["end"], REF["tail"], "s")

if __name__ == "__main__":
    main()
