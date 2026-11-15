"""Lighting check per mood, the scenario-blender-lighting-rendering way: measure, then look.

    /opt/bpyenv/bin/python light_check.py --work <emotion_sheet work dir> [--only hangat,marah]

For every mood rendered by emotion_sheet.py (final composite + Pion's mask) this runs bx_light.analyse()
and verdict(): Pion's value separation from his surroundings, silhouette merge, light-to-shadow gradient
on him, competing focal points, clipping, crush, value range, vignette, complementary hue clashes.
It writes <mood>_values.png (desaturated | value groups | squint) and prints a table. Run it after
changing EMOTIONS; aim for an empty verdict.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
for cand in (os.environ.get("BX_LIGHT_SCRIPTS", ""),
             os.path.join(HERE, "..", "..", "scenario-blender-lighting-rendering", "scripts"),
             os.path.join(HERE, "..", "..", "..", "..", ".agents", "skills", "scenario-blender-lighting-rendering", "scripts")):
    if cand and os.path.isdir(cand):
        sys.path.insert(0, cand); break
import bx_light as BL  # noqa: E402  (needs bpy: run with /opt/bpyenv/bin/python)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", required=True)
    ap.add_argument("--only", default=None)
    a = ap.parse_args(argv)
    names = a.only.split(",") if a.only else sorted({f[:-9] for f in os.listdir(a.work) if f.endswith("_mask.png")})
    report = {}
    for m in names:
        png, mk = os.path.join(a.work, m + ".png"), os.path.join(a.work, m + "_mask.png")
        if not (os.path.isfile(png) and os.path.isfile(mk)):
            continue
        mask = np.asarray(Image.open(mk).convert("L")).astype(np.float32) / 255.0
        rep = BL.analyse(png, mask)
        v = BL.verdict(rep)
        BL.value_study(png, os.path.join(a.work, m + "_values.png"), mask=mask)
        s = rep.get("subject", {})
        report[m] = {"minus_ring": s.get("minus_ring"), "edge_merge_pct": s.get("edge_merge_pct"),
                     "internal_ratio": s.get("internal_ratio"), "range": rep["value_range"],
                     "vignette": rep["vignette_ratio"], "verdict": v}
        print(f"{m:11s} sep {s.get('minus_ring')!s:>7}  merge {s.get('edge_merge_pct')!s:>5}%  "
              f"form x{s.get('internal_ratio')!s:<5} range {rep['value_range']}  vign {rep['vignette_ratio']}")
        for line in v:
            print("     -", line)
    json.dump(report, open(os.path.join(a.work, "light_check.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
