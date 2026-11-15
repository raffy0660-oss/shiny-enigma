"""Preview sheet: one frame per emotion lighting preset (engine Pion relit in the castle).

    python3 emotion_sheet.py --out sheet.png [--res 432x540] [--samples 16] [--only marah,sedih]

Per emotion: Blender plate + light pass (build_castle.py --emotion), engine Pion still with
the matching expression and `light` cue (react_render.js), relight + grade (comp_pion.py).
"""
import argparse
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.expanduser(os.environ.get("PION_ENGINE", "~/pion/pion_raja"))   # copy of the skill's engine/ (setup.sh)
BPY = os.environ.get("PION_BPY", "/opt/bpyenv/bin/python")                        # Python with the bpy module

# expression shown, engine light cue, relight (ref, floor, top), grade (sat, tint, contrast)
SUBJECT_EXP = 1.25   # Pion a touch brighter than the room around him (value separation, measured by light_check.py)
SUBJECT_EXP_MOOD = {"sedih": 1.8, "licik": 1.35, "duit": 1.55, "kaget": 1.0}   # moonlight leaves the red pawn dark: lift him more there


def subject_exp(mood):
    return SUBJECT_EXP_MOOD.get(mood, SUBJECT_EXP)

PRESETS = {
    "hangat": ("senang", "dir 0 .92 .35 key .6 .42 .25 amb .38 .33 .3 sky .1 .08 .06 gnd .03 .02 .02 rim .45 .32 .18",
               (75, .4, 1.5), (1.05, "1,1,1", 1.0)),
    "marah": ("marah", "dir 0 -.45 .9 key .85 .2 .1 amb .22 .1 .08 sky .05 .02 .02 gnd .1 .02 .01 rim .55 .14 .06",
              (75, .38, 1.5), (1.05, "1.04,.94,.92", 1.08)),
    "sedih": ("kecewa", "dir -.9 .42 -.15 key .35 .45 .7 amb .32 .34 .42 sky .06 .07 .1 gnd .02 .02 .03 rim .22 .3 .48",
              (75, .4, 1.35), (0.75, ".92,.97,1.08", 0.97)),
    "kaget": ("kaget", "dir 0 .9 .4 key .9 .9 .88 amb .5 .5 .5 sky .12 .12 .12 gnd .04 .04 .04 rim .38 .38 .4",
              (70, .35, 1.42), (0.95, "1,1,1.03", 1.12)),
    "licik": ("licik", "dir 0 -.45 .9 key .25 .75 .38 amb .24 .22 .3 sky .03 .03 .05 gnd .04 .08 .05 rim .3 .12 .45",
              (75, .38, 1.5), (1.05, ".97,1.02,1.05", 1.05)),
    "duit": ("duit", "dir 0 .9 .35 key .85 .68 .3 amb .35 .3 .2 sky .1 .08 .04 gnd .06 .04 .02 rim .48 .36 .12",
             (75, .3, 1.5), (1.2, "1.08,1,.85", 1.05)),
    "pencerahan": ("soktahu", "dir .3 .8 .4 key .4 .45 .6 amb .22 .24 .32 sky .06 .07 .1 gnd .03 .03 .05 rim .15 .2 .35",
                   (75, .55, 1.15), (1.1, "1,.98,1.02", 1.08)),   # the engine already floods the face: light relight
    "misteri": ("penasaran", "dir .3 .8 .4 key .4 .32 .65 amb .22 .2 .3 sky .06 .05 .1 gnd .02 .02 .04 rim .28 .28 .52",
                (75, .4, 1.45), (0.92, ".97,.95,1.06", 1.0)),
}


def run(cmd, cwd=None):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"failed: {' '.join(cmd)}\n{r.stdout[-1500:]}\n{r.stderr[-1500:]}")
    return r.stdout


def render_one(emo, work, res, samples, volume=True):
    expr, light, (ref, floor, top), (sat, tint, con) = PRESETS[emo]
    base = os.path.join(work, emo)
    cmd = [BPY, os.path.join(HERE, "build_castle.py"), "--", "--out", base + ".blend", "--render", base + "_bg.png",
           "--samples", str(samples), "--res", res, "--proxy", "--bbox", base + ".json",
           "--lightpass", base + "_lp.png", "--mood", "chandelier", "--emotion", emo]
    if not volume:
        cmd.append("--novolume")
    run(cmd)
    cue = base + "_cue.txt"
    open(cue, "w").write(f"frame full\nlight {light} exp {subject_exp(emo)}\n0.0 {expr}\n")
    run(["node", "react_render.js", "--audio", "test/vo_test.wav", "--cues", cue, "--out", base + "_eng",
         "--dur", "1.2", "--png", "--blur", "1"], cwd=ENGINE)   # frame 10 (0.33 s) = soktahu book glow at its peak
    out = base + ".png"
    run(["python3", os.path.join(HERE, "comp_pion.py"), "--bg", base + "_bg.png", "--bbox", base + ".json",
         "--fg", os.path.join(base + "_eng_frames", "00010.png"), "--light", base + "_lp.png",
         "--ref", str(ref), "--floor", str(floor), "--top", str(top),
         "--sat", str(sat), "--tint", tint, "--contrast", str(con), "--out", out, "--mask", base + "_mask.png"])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--work", default=None)
    ap.add_argument("--res", default="432x540")
    ap.add_argument("--samples", type=int, default=16)
    ap.add_argument("--only", default=None)
    ap.add_argument("--novolume", action="store_true")
    a = ap.parse_args()
    work = a.work or os.path.splitext(a.out)[0] + "_work"
    os.makedirs(work, exist_ok=True)
    names = a.only.split(",") if a.only else list(PRESETS)
    tiles = []
    for emo in names:
        print("render", emo, flush=True)
        tiles.append((emo, Image.open(render_one(emo, work, a.res, a.samples, not a.novolume)).convert("RGB")))
    w, h = tiles[0][1].size
    cols = min(4, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * (h + 34)), (12, 12, 14))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 22)
    except OSError:
        font = ImageFont.load_default()
    for i, (emo, im) in enumerate(tiles):
        x, y = (i % cols) * w, (i // cols) * (h + 34)
        sheet.paste(im, (x, y + 34))
        d.text((x + 10, y + 5), f"{emo}  ({PRESETS[emo][0]})", fill=(240, 220, 180), font=font)
    sheet.save(a.out)
    print("RESULT sheet", a.out)


if __name__ == "__main__":
    main()
