"""Pion Raja, 2D-cartoon look (cel shading + ink outline) on the Blender build.

Reuses the geometry of build_pion.py and swaps every material for a toon one:
Toon BSDF diffuse (hard two-tone terminator, real cast shadows) over a flat
ambient emission, a small toon highlight, a Fresnel rim, and an inverted-hull
ink outline (hidden from shadow rays). No fur, no DOF-heavy photo look.

Run:
    /opt/bpyenv/bin/python build_pion_toon.py -- --out pion_toon.blend --render out.png
        [--samples 48] [--res 1080x1920] [--expr senang]
"""
import argparse
import math
import os
import sys

import bpy  # must come before mathutils with the pip module
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_pion as BP  # noqa: E402

INK = (0.13, 0.05, 0.04)   # engine outline colour (#2b1a10-ish dark brown)


def lin(c):
    return BP.srgb(c)


def toon_mat(name, base=None, ramp_fn=None, amb=0.42, spec=0.0, rim=0.25, dots=False):
    """base: sRGB triple, or ramp_fn(nodes, links) -> colour socket."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    for n in list(N):
        if n.type != "OUTPUT_MATERIAL":
            N.remove(n)
    out = [n for n in N if n.type == "OUTPUT_MATERIAL"][0]

    if ramp_fn:
        col = ramp_fn(N, L)
    else:
        rgb = N.new("ShaderNodeRGB")
        rgb.outputs[0].default_value = (*lin(base), 1)
        col = rgb.outputs[0]
    if dots:  # ermine: black tail spots
        tc = N.new("ShaderNodeTexCoord")
        vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 3.6
        L.new(tc.outputs["Object"], vor.inputs["Vector"])
        mr = N.new("ShaderNodeMapRange"); mr.interpolation_type = "STEPPED"
        mr.inputs["From Min"].default_value = 0.0; mr.inputs["From Max"].default_value = 0.13
        mr.inputs["To Min"].default_value = 1.0; mr.inputs["To Max"].default_value = 0.0
        mr.inputs["Steps"].default_value = 1.0
        L.new(vor.outputs["Distance"], mr.inputs["Value"])
        mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"
        L.new(col, mx.inputs[6]); mx.inputs[7].default_value = (*lin((.1, .07, .06)), 1)
        L.new(mr.outputs[0], mx.inputs["Factor"])
        col = mx.outputs[2]

    # lit part: toon diffuse with a hard terminator
    toon = N.new("ShaderNodeBsdfToon"); toon.component = "DIFFUSE"
    toon.inputs["Size"].default_value = 0.62
    toon.inputs["Smooth"].default_value = 0.015
    lit = N.new("ShaderNodeMix"); lit.data_type = "RGBA"; lit.blend_type = "MULTIPLY"
    lit.inputs["Factor"].default_value = 1.0
    L.new(col, lit.inputs[6]); lit.inputs[7].default_value = (1 - amb, 1 - amb, 1 - amb, 1)
    L.new(lit.outputs[2], toon.inputs["Color"])   # lit = ambient + this = base colour
    # shadow tone: flat emission, slightly warm/saturated like hand-painted shade
    shade = N.new("ShaderNodeMix"); shade.data_type = "RGBA"; shade.blend_type = "MULTIPLY"
    shade.inputs["Factor"].default_value = 1.0
    L.new(col, shade.inputs[6]); shade.inputs[7].default_value = (amb, amb * 0.86, amb * 0.95, 1)
    emit = N.new("ShaderNodeEmission")
    L.new(shade.outputs[2], emit.inputs["Color"])
    add = N.new("ShaderNodeAddShader")
    L.new(toon.outputs[0], add.inputs[0]); L.new(emit.outputs[0], add.inputs[1])
    last = add
    if spec:
        g = N.new("ShaderNodeBsdfToon"); g.component = "GLOSSY"
        g.inputs["Size"].default_value = 0.16
        g.inputs["Smooth"].default_value = 0.04
        g.inputs["Color"].default_value = (spec, spec, spec * 0.92, 1)
        a2 = N.new("ShaderNodeAddShader")
        L.new(last.outputs[0], a2.inputs[0]); L.new(g.outputs[0], a2.inputs[1])
        last = a2
    if rim:
        lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.2
        st = N.new("ShaderNodeMapRange"); st.interpolation_type = "STEPPED"; st.inputs["Steps"].default_value = 1.0
        st.inputs["From Min"].default_value = 0.35; st.inputs["From Max"].default_value = 1.0
        L.new(lw.outputs["Facing"], st.inputs["Value"])
        re = N.new("ShaderNodeEmission")
        re.inputs["Color"].default_value = (1.0, 0.86, 0.66, 1)
        L.new(st.outputs[0], re.inputs["Strength"])
        rs = N.new("ShaderNodeMath"); rs.operation = "MULTIPLY"; rs.inputs[1].default_value = rim
        L.new(st.outputs[0], rs.inputs[0]); L.new(rs.outputs[0], re.inputs["Strength"])
        a3 = N.new("ShaderNodeAddShader")
        L.new(last.outputs[0], a3.inputs[0]); L.new(re.outputs[0], a3.inputs[1])
        last = a3
    L.new(last.outputs[0], out.inputs["Surface"])
    return m


def flat_mat(name, color, strength=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N):
        if n.type != "OUTPUT_MATERIAL":
            N.remove(n)
    out = [n for n in N if n.type == "OUTPUT_MATERIAL"][0]
    e = N.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*lin(color), 1)
    e.inputs["Strength"].default_value = strength
    L.new(e.outputs[0], out.inputs["Surface"])
    return m


def outline_mat():
    """Inverted hull: show only the hull's far side, never in shadow rays."""
    m = bpy.data.materials.new("Ink")
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N):
        if n.type != "OUTPUT_MATERIAL":
            N.remove(n)
    out = [n for n in N if n.type == "OUTPUT_MATERIAL"][0]
    geo = N.new("ShaderNodeNewGeometry")
    lp = N.new("ShaderNodeLightPath")
    e = N.new("ShaderNodeEmission"); e.inputs["Color"].default_value = (*lin(INK), 1)
    tr = N.new("ShaderNodeBsdfTransparent")
    mx = N.new("ShaderNodeMath"); mx.operation = "MAXIMUM"
    L.new(geo.outputs["Backfacing"], mx.inputs[0]); L.new(lp.outputs["Is Shadow Ray"], mx.inputs[1])
    mxr = N.new("ShaderNodeMath"); mxr.operation = "MAXIMUM"
    L.new(mx.outputs[0], mxr.inputs[0]); L.new(lp.outputs["Is Reflection Ray"], mxr.inputs[1])
    ms = N.new("ShaderNodeMixShader")
    L.new(mxr.outputs[0], ms.inputs["Fac"])
    L.new(e.outputs[0], ms.inputs[1]); L.new(tr.outputs[0], ms.inputs[2])
    L.new(ms.outputs[0], out.inputs["Surface"])
    return m


def add_outline(obj, ink, width):
    obj.data.materials.append(ink)
    sol = obj.modifiers.new("Outline", "SOLIDIFY")
    sol.thickness = width
    sol.offset = 1.0
    sol.use_flip_normals = True
    sol.use_rim = False
    sol.material_offset = len(obj.data.materials) - 1
    sol.material_offset_rim = len(obj.data.materials) - 1
    return sol


def skin_ramp(N, L):
    geo = N.new("ShaderNodeNewGeometry")
    sep = N.new("ShaderNodeSeparateXYZ")
    div = N.new("ShaderNodeMath"); div.operation = "DIVIDE"; div.inputs[1].default_value = 4.0
    ramp = N.new("ShaderNodeValToRGB")
    stops = [(0.0, (.55, .05, .12)), (.3, (.85, .13, .17)), (.5, (.97, .3, .18)), (.64, (1, .47, .17)), (1.0, (1, .62, .25))]
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = stops[0][0], (*lin(stops[0][1]), 1)
    el[1].position, el[1].color = stops[-1][0], (*lin(stops[-1][1]), 1)
    for p, c in stops[1:-1]:
        e = el.new(p); e.color = (*lin(c), 1)
    L.new(geo.outputs["Position"], sep.inputs[0]); L.new(sep.outputs["Z"], div.inputs[0])
    L.new(div.outputs[0], ramp.inputs[0])
    return ramp.outputs["Color"]


def checker_floor(N, L):
    tc = N.new("ShaderNodeTexCoord")
    chk = N.new("ShaderNodeTexChecker"); chk.inputs["Scale"].default_value = 1.0
    chk.inputs["Color1"].default_value = (*lin((.96, .9, .78)), 1)
    chk.inputs["Color2"].default_value = (*lin((.42, .25, .16)), 1)
    L.new(tc.outputs["Object"], chk.inputs["Vector"])
    return chk.outputs["Color"]


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="pion_toon.blend")
    ap.add_argument("--render", default=None)
    ap.add_argument("--samples", type=int, default=48)
    ap.add_argument("--res", default="1080x1920")
    ap.add_argument("--expr", default="senang")
    a = ap.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig, M = BP.build(a.expr)
    for o in bpy.data.objects:  # no realistic fur in the cartoon look
        for md in list(o.modifiers):
            if md.type == "PARTICLE_SYSTEM":
                o.modifiers.remove(md)
    BP.build_set(M)
    w, h = (int(v) for v in a.res.split("x"))
    BP.build_lights_camera((w, h))
    BP.render_settings(a.samples)
    sc = bpy.context.scene

    # ---- toon materials, mapped from the realistic ones by name
    ink = outline_mat()
    T = {
        "PionSkin": toon_mat("T_Skin", ramp_fn=skin_ramp, amb=0.5, spec=0.5, rim=0.1),
        "RingDark": toon_mat("T_Ring", (.16, .05, .05), rim=0.0),
        "Gold": toon_mat("T_Gold", (1.0, .773, .192), amb=0.55, spec=0.7, rim=0.0),
        "Velvet": toon_mat("T_Cape", (.784, .078, .227), amb=0.5, rim=0.08),
        "FurBase": toon_mat("T_Ermine", (1.0, .97, .9), amb=0.72, rim=0.0, dots=True),
        "EyeWhite": flat_mat("T_EyeWhite", (1.0, .98, .95)),
        "Pupil": flat_mat("T_Pupil", (.1, .04, .03)),
        "FaceBrown": flat_mat("T_Brown", INK),
        "Ruby": toon_mat("T_Ruby", (.9, .08, .12), spec=0.8, rim=0.0),
        "MarbleLight": toon_mat("T_TileLight", (.97, .91, .8), amb=0.6, rim=0.0),
        "MarbleDark": toon_mat("T_TileDark", (.45, .27, .17), amb=0.6, rim=0.0),
        "Ivory": toon_mat("T_Ivory", (.93, .88, .78), amb=0.55, rim=0.0),
        "Ebony": toon_mat("T_Ebony", (.25, .16, .13), amb=0.55, rim=0.0),
    }
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        for slot in o.material_slots:
            if slot.material and slot.material.name in T:
                slot.material = T[slot.material.name]
    # backdrop: flat painted sky-to-wall gradient (2D background feel)
    bd = bpy.data.objects["Backdrop"]
    bm = bpy.data.materials.new("T_Backdrop"); bm.use_nodes = True
    N, L = bm.node_tree.nodes, bm.node_tree.links
    for n in list(N):
        if n.type != "OUTPUT_MATERIAL":
            N.remove(n)
    outn = [n for n in N if n.type == "OUTPUT_MATERIAL"][0]
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ")
    L.new(tc.outputs["Generated"], sep.inputs[0])
    rp = N.new("ShaderNodeValToRGB")
    rp.color_ramp.elements[0].position = 0.42; rp.color_ramp.elements[0].color = (*lin((.95, .72, .5)), 1)
    rp.color_ramp.elements[1].position = 0.75; rp.color_ramp.elements[1].color = (*lin((.42, .58, .85)), 1)
    L.new(sep.outputs["Z"], rp.inputs[0])
    em = N.new("ShaderNodeEmission"); L.new(rp.outputs[0], em.inputs["Color"])
    L.new(em.outputs[0], outn.inputs["Surface"])
    bd.data.materials.clear(); bd.data.materials.append(bm)
    # candles -> soft warm dots (keep, read as distant lamps)
    for o in bpy.data.objects:
        if o.name.startswith("Candle_") or o.name == "BgPiece_0":
            o.hide_render = True

    # ---- outlines (world units; Pion is 4.65 tall)
    widths = {"Body": 0.065, "Head": 0.065, "Collar": 0.04, "Cape": 0.05, "ErmineCollar": 0.045,
              "Trim_L": 0.045, "Trim_R": 0.045, "Trim_Hem": 0.045, "CrownBand": 0.04}
    for o in bpy.data.objects:
        if o.type != "MESH" or o.name in ("Backdrop",) or o.name.startswith("Candle_"):
            continue
        if o.name.startswith(("Brow", "Mouth", "Pupil")):
            continue
        wdt = widths.get(o.name)
        if wdt is None:
            if o.name.startswith("EyeWhite"):
                wdt = 0.2      # eye is scaled ~0.17: local units -> ~0.03 world
            elif o.name.startswith(("Spike", "Ruby", "CrownRim", "Ring_")):
                wdt = 0.03
            elif o.name.startswith("BgPiece"):
                wdt = 0.05
            elif o.name.startswith("Tile_"):
                continue
            else:
                wdt = 0.025
        add_outline(o, ink, wdt)

    # ---- lighting: one crisp sun + nothing else (ambient lives in the shaders)
    for o in list(bpy.data.objects):
        if o.type == "LIGHT":
            bpy.data.objects.remove(o, do_unlink=True)
    sun_d = bpy.data.lights.new("Sun", "SUN")
    sun_d.energy = math.pi  # toon diffuse x pi/pi: lit tone lands exactly on the base colour
    sun_d.angle = math.radians(1.5)
    sun_d.color = (1.0, 0.97, 0.92)
    sun = bpy.data.objects.new("Sun", sun_d)
    BP.link(sun)
    # key from camera-left, high: a clean cel shadow band down Pion's right side
    sun.rotation_euler = (math.radians(42), 0, math.radians(-75))
    sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0

    # camera: mild depth of field only (background soft, not photo-bokeh)
    cam = sc.camera
    cam.data.dof.aperture_fstop = 1.4

    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.cycles.samples = a.samples
    sc.cycles.max_bounces = 2
    sc.cycles.diffuse_bounces = 1
    sc.cycles.glossy_bounces = 1
    sc.cycles.transparent_max_bounces = 16
    sc.render.film_transparent = False
    # remove the photographic comp finish (bloom/vignette) if present
    if getattr(sc, "compositing_node_group", None) is not None:
        sc.compositing_node_group = None
    sc.render.use_compositing = False

    bpy.ops.wm.save_as_mainfile(filepath=a.out)
    print("RESULT built", a.out)
    if a.render:
        import time
        t0 = time.time()
        sc.render.filepath = a.render
        bpy.ops.render.render(write_still=True)
        print("RESULT rendered", a.render, f"{time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
