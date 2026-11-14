"""AAA throne room + cartoon Pion Raja that takes the scene's light and shadows.

Background: a realistic (PBR, Cycles) version of the engine's castle.js throne room:
stone walls and pillars, red velvet curtains, stained-glass windows with volumetric
light shafts, chandelier, wall torches, marble chessboard floor, red carpet, gold
throne on a dais, treasure chests with coin piles, banners.

Pion keeps the cartoon look (ink outline, flat face, two-tone cel shading) but every
light in the room shades it: toon diffuse per light (hard terminator, real cast
shadows, light colour), a little true diffuse for bounce colour from the room, and a
low flat floor so shadows never go black.

Run:
    /opt/bpyenv/bin/python build_castle.py -- --out castle.blend --render out.png
        [--samples 96] [--res 1080x1920] [--expr senang] [--novolume]
"""
import argparse
import math
import os
import random
import time
import sys

import bpy  # must come before bmesh/mathutils with the pip module
import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_pion as BP        # noqa: E402  geometry + PBR helpers
import build_pion_toon as TT   # noqa: E402  ink outline + toon helpers

lin = BP.srgb
R = random.Random(11)

# room extents (Blender units; Pion is 4.65 tall and stands at the origin)
ROOM_X = 15.0
BACK_Y = 28.0
FRONT_Y = -22.0
CEIL_Z = 26.0


# ----------------------------------------------------------------- materials

def node_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt.nodes, nt.links, nt.nodes.get("Principled BSDF")


def mat_stone():
    m, N, L, b = node_mat("Stone")
    geo = N.new("ShaderNodeNewGeometry")   # world position: boxes are scaled, object coords would stretch
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (0.6, 0.6, 0.6)
    L.new(geo.outputs["Position"], mp.inputs["Vector"])
    # blocks on the wall plane: use x+y for horizontal, z vertical
    sep = N.new("ShaderNodeSeparateXYZ"); L.new(mp.outputs[0], sep.inputs[0])
    addxy = N.new("ShaderNodeMath"); addxy.operation = "ADD"
    L.new(sep.outputs["X"], addxy.inputs[0]); L.new(sep.outputs["Y"], addxy.inputs[1])
    comb = N.new("ShaderNodeCombineXYZ")
    L.new(addxy.outputs[0], comb.inputs["X"]); L.new(sep.outputs["Z"], comb.inputs["Y"])
    brick = N.new("ShaderNodeTexBrick")
    brick.inputs["Scale"].default_value = 1.0
    brick.inputs["Mortar Size"].default_value = 0.025
    brick.inputs["Mortar Smooth"].default_value = 0.3
    brick.inputs["Brick Width"].default_value = 1.1
    brick.inputs["Row Height"].default_value = 0.42
    brick.inputs["Color1"].default_value = (*lin((.62, .5, .38)), 1)
    brick.inputs["Color2"].default_value = (*lin((.48, .37, .27)), 1)
    brick.inputs["Mortar"].default_value = (*lin((.22, .17, .13)), 1)
    L.new(comb.outputs[0], brick.inputs["Vector"])
    noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 6.0; noise.inputs["Detail"].default_value = 10
    L.new(mp.outputs[0], noise.inputs["Vector"])
    ov = N.new("ShaderNodeMix"); ov.data_type = "RGBA"; ov.blend_type = "OVERLAY"; ov.inputs["Factor"].default_value = 0.35
    L.new(brick.outputs["Color"], ov.inputs[6]); L.new(noise.outputs["Fac"], ov.inputs[7])
    L.new(ov.outputs[2], b.inputs["Base Color"])
    rough = N.new("ShaderNodeMapRange"); rough.inputs["To Min"].default_value = 0.65; rough.inputs["To Max"].default_value = 0.9
    L.new(noise.outputs["Fac"], rough.inputs["Value"]); L.new(rough.outputs[0], b.inputs["Roughness"])
    hgt = N.new("ShaderNodeMath"); hgt.operation = "ADD"
    L.new(brick.outputs["Fac"], hgt.inputs[0])
    nm = N.new("ShaderNodeMath"); nm.operation = "MULTIPLY"; nm.inputs[1].default_value = 0.3
    L.new(noise.outputs["Fac"], nm.inputs[0]); L.new(nm.outputs[0], hgt.inputs[1])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.45; bump.invert = True
    L.new(hgt.outputs[0], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_stained_glass(seed):
    m, N, L, b = node_mat(f"StainedGlass_{seed}")
    for n in list(N):
        if n.type == "BSDF_PRINCIPLED":
            N.remove(n)
    out = [n for n in N if n.type == "OUTPUT_MATERIAL"][0]
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping"); mp.inputs["Location"].default_value = (seed * 3.1, 0, 0)
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 1.6
    L.new(mp.outputs[0], vor.inputs["Vector"])
    edge = N.new("ShaderNodeTexVoronoi"); edge.feature = "DISTANCE_TO_EDGE"; edge.inputs["Scale"].default_value = 1.6
    L.new(mp.outputs[0], edge.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")   # cell colour palette: royal blue, ruby, gold, emerald, amber
    pal = [(0.0, (.08, .2, .85)), (.25, (.85, .08, .1)), (.5, (1.0, .75, .15)), (.72, (.1, .6, .25)), (.9, (.95, .45, .1))]
    ramp.color_ramp.interpolation = "CONSTANT"
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = pal[0][0], (*lin(pal[0][1]), 1)
    el[1].position, el[1].color = pal[-1][0], (*lin(pal[-1][1]), 1)
    for p, c in pal[1:-1]:
        e = el.new(p); e.color = (*lin(c), 1)
    sepc = N.new("ShaderNodeSeparateColor"); L.new(vor.outputs["Color"], sepc.inputs[0])
    L.new(sepc.outputs[0], ramp.inputs[0])
    lead = N.new("ShaderNodeMapRange"); lead.inputs["From Min"].default_value = 0.02; lead.inputs["From Max"].default_value = 0.05
    L.new(edge.outputs["Distance"], lead.inputs["Value"])
    em = N.new("ShaderNodeEmission")
    L.new(ramp.outputs["Color"], em.inputs["Color"])
    st = N.new("ShaderNodeMath"); st.operation = "MULTIPLY"; st.inputs[1].default_value = 7.0
    L.new(lead.outputs[0], st.inputs[0]); L.new(st.outputs[0], em.inputs["Strength"])
    L.new(em.outputs[0], out.inputs["Surface"])
    return m


def mat_emit(name, col, strength):
    m, N, L, b = node_mat(name)
    b.inputs["Base Color"].default_value = (0, 0, 0, 1)
    b.inputs["Emission Color"].default_value = (*col, 1)
    b.inputs["Emission Strength"].default_value = strength
    return m


def mat_wood():
    m, N, L, b = node_mat("Wood")
    tc = N.new("ShaderNodeTexCoord")
    wave = N.new("ShaderNodeTexWave"); wave.wave_type = "RINGS"; wave.inputs["Scale"].default_value = 2.0
    wave.inputs["Distortion"].default_value = 6.0; wave.inputs["Detail"].default_value = 6
    L.new(tc.outputs["Object"], wave.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*lin((.22, .11, .05)), 1)
    ramp.color_ramp.elements[1].color = (*lin((.42, .24, .11)), 1)
    L.new(wave.outputs["Fac"], ramp.inputs[0]); L.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.5
    b.inputs["Coat Weight"].default_value = 0.3
    return m


# ----------------------------------------------------------------- set pieces

def box(name, size, loc, mat, bevel=0.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    if bevel:
        bm_ = o.modifiers.new("Bevel", "BEVEL"); bm_.width = bevel; bm_.segments = 3
    BP.assign(o, mat)
    return o


def cylinder(name, r, h, loc, mat, verts=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(loc[0], loc[1], loc[2] + h / 2))
    o = bpy.context.active_object
    o.name = name
    BP.smooth(o)
    BP.assign(o, mat)
    return o


def arch_window_mesh(name, w, h):
    """Flat arched pane in the XZ plane (rectangle + half circle), facing -y."""
    bm_ = bmesh.new()
    pts = [(-w / 2, 0), (w / 2, 0), (w / 2, h - w / 2)]
    for i in range(1, 24):
        a = i / 24 * math.pi
        pts.append((w / 2 * math.cos(a), h - w / 2 + w / 2 * math.sin(a)))
    pts.append((-w / 2, h - w / 2))
    vs = [bm_.verts.new((x, 0, z)) for x, z in pts]
    bm_.faces.new(vs)
    bmesh.ops.triangulate(bm_, faces=bm_.faces)
    me = bpy.data.meshes.new(name)
    bm_.to_mesh(me)
    bm_.free()
    return BP.new_obj(name, me)


def curtain(name, width, height, loc, folds, mat, gather=0.55, flip=1):
    """Velvet drape: grid with sine folds, gathered toward a tie-back."""
    nx, nz = 90, 60
    bm_ = bmesh.new()
    grid = []
    for j in range(nz + 1):
        v = j / nz
        z = v * height
        # gathered at the tie-back height: width shrinks there, flares below
        tb = math.exp(-((v - 0.36) / 0.12) ** 2)
        wscale = 1 - gather * tb
        row = []
        for i in range(nx + 1):
            u = i / nx
            x = (u - (0.0 if flip > 0 else 1.0)) * width * wscale * flip
            depth = (0.35 + 0.25 * tb) * math.sin(u * folds * 2 * math.pi) + 0.08 * math.sin(u * folds * 5.3 * math.pi + v * 3)
            row.append(bm_.verts.new((x, depth, z)))
        grid.append(row)
    for j in range(nz):
        for i in range(nx):
            bm_.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces)
    me = bpy.data.meshes.new(name)
    bm_.to_mesh(me)
    bm_.free()
    o = BP.new_obj(name, me)
    o.location = loc
    BP.smooth(o)
    sol = o.modifiers.new("Solid", "SOLIDIFY"); sol.thickness = 0.06
    BP.assign(o, mat)
    return o


def build_room(volume=True):
    M = {
        "stone": mat_stone(),
        "gold": BP.mat_gold(),
        "velvet": BP.mat_velvet(),
        "marbleL": BP.mat_marble("CastleMarbleL", (.93, .9, .84), (.6, .55, .5), 0.08),
        "marbleD": BP.mat_marble("CastleMarbleD", (.05, .04, .04), (.32, .26, .2), 0.06),
        "carpet": BP.mat_simple("Carpet", (.72, .05, .1), rough=0.7, sheen=0.15),
        "wood": mat_wood(),
        "iron": BP.mat_simple("Iron", (.08, .08, .085), rough=0.45, metal=1.0),
        "flame": mat_emit("Flame", (1.0, 0.45, 0.12), 40.0),
        "candle": mat_emit("CandleFlame", (1.0, 0.62, 0.28), 30.0),
        "wax": BP.mat_simple("Wax", (.95, .9, .78), rough=0.4, sss=0.5),
        "blue": BP.mat_simple("BannerBlue", (.06, .14, .5), rough=0.7, sheen=0.6),
    }

    # floor: marble chessboard (big tiles), slightly polished
    tile = 3.4
    for i in range(-5, 5):
        for j in range(-6, 9):
            box(f"Floor_{i}_{j}", (tile - 0.02, tile - 0.02, 0.2), ((i + 0.5) * tile, (j - 0.5) * tile, -0.1),
                M["marbleL"] if (i + j) % 2 == 0 else M["marbleD"], bevel=0.02)
    # red carpet runner with gold border, from the throne toward the camera (Pion stands on it)
    box("Carpet", (4.4, BACK_Y - 3 - FRONT_Y, 0.06), (0, (BACK_Y - 3 + FRONT_Y) / 2, 0.03), M["carpet"], bevel=0.02)
    for sx in (-1, 1):
        box(f"CarpetTrim_{sx}", (0.18, BACK_Y - 3 - FRONT_Y, 0.07), (sx * 2.2, (BACK_Y - 3 + FRONT_Y) / 2, 0.04), M["gold"], bevel=0.01)

    # walls
    box("BackWall", (ROOM_X * 2 + 2, 1.0, CEIL_Z), (0, BACK_Y + 0.5, CEIL_Z / 2), M["stone"], bevel=0)
    for sx in (-1, 1):
        box(f"SideWall_{sx}", (1.0, BACK_Y - FRONT_Y, CEIL_Z), (sx * (ROOM_X + 0.5), (BACK_Y + FRONT_Y) / 2, CEIL_Z / 2), M["stone"], bevel=0)
    box("Ceiling", (ROOM_X * 2 + 2, BACK_Y - FRONT_Y, 0.6), (0, (BACK_Y + FRONT_Y) / 2, CEIL_Z), M["wood"], bevel=0)

    # pillars along the side walls, with torches
    for sx in (-1, 1):
        for k, y in enumerate((-2.0, 9.0, 20.0)):
            x = sx * (ROOM_X - 1.6)
            cylinder(f"Pillar_{sx}_{k}", 0.9, CEIL_Z, (x, y, 0), M["stone"], 64)
            box(f"PillarBase_{sx}_{k}", (2.3, 2.3, 0.7), (x, y, 0.35), M["stone"], bevel=0.08)
            box(f"PillarCap_{sx}_{k}", (2.3, 2.3, 0.6), (x, y, CEIL_Z - 0.3), M["stone"], bevel=0.08)
            # torch sconce facing the room
            tx = x - sx * 1.05
            cylinder(f"TorchStick_{sx}_{k}", 0.09, 1.2, (tx, y, 6.2), M["iron"], 16)
            cylinder(f"TorchCup_{sx}_{k}", 0.28, 0.35, (tx, y, 7.35), M["iron"], 24)
            fl = BP.uv_sphere(f"TorchFlame_{sx}_{k}", 0.24, 16, 10, loc=(tx, y, 7.95), scale=(1, 1, 1.8))
            BP.assign(fl, M["flame"])
            pl = bpy.data.lights.new(f"TorchLight_{sx}_{k}", "POINT")
            pl.energy = 1400
            pl.color = (1.0, 0.55, 0.25)
            pl.shadow_soft_size = 0.35
            plo = bpy.data.objects.new(f"TorchLight_{sx}_{k}", pl); BP.link(plo)
            plo.location = (tx - sx * 0.25, y, 8.0)

    # dais + throne
    for s, (w, d, h) in enumerate(((11, 6.5, 0.45), (9, 5.2, 0.9), (7, 4.0, 1.35))):
        box(f"Dais_{s}", (w, d, 0.45), (0, BACK_Y - 3.6 - (2 - s) * 0.0, h - 0.225), M["marbleL"] if s % 2 == 0 else M["stone"], bevel=0.05)
    ty, S = BACK_Y - 3.4, 1.5   # throne scaled up: it is the room's focal prop behind Pion
    box("ThroneSeat", (3.2 * S, 2.6 * S, 1.2 * S), (0, ty, 1.35 + 0.6 * S), M["gold"], bevel=0.12)
    box("ThroneCushion", (2.8 * S, 2.2 * S, 0.4 * S), (0, ty - 0.1, 1.35 + 1.35 * S), M["velvet"], bevel=0.15)
    box("ThroneBack", (3.2 * S, 0.6 * S, 6.5 * S), (0, ty + 1.1 * S, 1.35 + 3.25 * S), M["gold"], bevel=0.12)
    box("ThroneBackPad", (2.4 * S, 0.2 * S, 5.0 * S), (0, ty + 0.76 * S, 1.35 + 3.4 * S), M["velvet"], bevel=0.1)
    for sx in (-1, 1):
        box(f"ThroneArm_{sx}", (0.45 * S, 2.6 * S, 1.0 * S), (sx * 1.75 * S, ty, 1.35 + 1.65 * S), M["gold"], bevel=0.12)
        ball = BP.uv_sphere(f"ThroneFinial_{sx}", 0.35 * S, 24, 12, loc=(sx * 1.45 * S, ty + 1.1 * S, 1.35 + 6.85 * S))
        BP.assign(ball, M["gold"])
    crest = BP.uv_sphere("ThroneCrest", 0.55 * S, 32, 16, loc=(0, ty + 1.05 * S, 1.35 + 7.05 * S), scale=(1, 0.4, 1.2))
    BP.assign(crest, M["gold"])

    # stained-glass windows on the back wall, with lead frame + light shafts
    win_w, win_h = 3.6, 10.0
    for k, x in enumerate((-8.0, 8.0)):
        pane = arch_window_mesh(f"Window_{k}", win_w, win_h)
        pane.location = (x, BACK_Y - 0.02, 5.0)
        BP.assign(pane, mat_stained_glass(k))
        frame = box(f"WindowSill_{k}", (win_w + 0.6, 0.7, 0.35), (x, BACK_Y - 0.3, 4.85), M["stone"], bevel=0.05)
        sp = bpy.data.lights.new(f"WindowSun_{k}", "SPOT")
        sp.energy = 60000
        sp.color = (1.0, 0.86, 0.66)
        sp.spot_size = math.radians(38)
        sp.spot_blend = 0.6
        sp.shadow_soft_size = 1.2
        spo = bpy.data.objects.new(f"WindowSun_{k}", sp); BP.link(spo)
        spo.location = (x, BACK_Y - 0.4, 12.0)
        tgt = Vector((x * 0.25, 2.0, 0.0))
        spo.rotation_euler = (tgt - spo.location).to_track_quat("-Z", "Y").to_euler()
    # red damask panel behind the throne + curtains framing it
    box("DamaskPanel", (7.6, 0.15, 14.0), (0, BACK_Y - 0.1, 7.0), M["velvet"], bevel=0.02)
    box("DamaskFrameTop", (8.0, 0.25, 0.3), (0, BACK_Y - 0.15, 14.1), M["gold"], bevel=0.04)
    for sx in (-1, 1):
        box(f"DamaskFrame_{sx}", (0.3, 0.25, 14.0), (sx * 3.95, BACK_Y - 0.15, 7.0), M["gold"], bevel=0.04)
        curtain(f"Curtain_{sx}", 4.6, 17.0, (sx * 3.6, BACK_Y - 1.2, 0.0), 5, M["velvet"], flip=-sx)
        rope = BP.torus(f"TieBack_{sx}", 0.6, 0.09, 48, 12, loc=(sx * 4.8, BACK_Y - 1.0, 6.1))
        BP.assign(rope, M["gold"])
    box("CurtainRod", (13.0, 0.25, 0.25), (0, BACK_Y - 1.2, 17.1), M["gold"], bevel=0.05)
    # banners on the side walls
    for sx in (-1, 1):
        for k, y in enumerate((3.5, 14.5)):
            ban = box(f"Banner_{sx}_{k}", (0.08, 2.6, 7.0), (sx * (ROOM_X - 0.05), y, 13.0), M["blue"], bevel=0.0)
            box(f"BannerRod_{sx}_{k}", (0.2, 3.2, 0.2), (sx * (ROOM_X - 0.2), y, 16.6), M["gold"], bevel=0.03)
            em = BP.uv_sphere(f"BannerCrest_{sx}_{k}", 0.6, 24, 12, loc=(sx * (ROOM_X - 0.12), y, 13.6), scale=(0.15, 1, 1.15))
            BP.assign(em, M["gold"])

    # chandelier: gold ring, candles, warm point lights
    cz, cy = 17.0, 8.0
    ring = BP.torus("ChandelierRing", 2.6, 0.12, 96, 16, loc=(0, cy, cz))
    BP.assign(ring, M["gold"])
    chain = cylinder("ChandelierChain", 0.07, CEIL_Z - cz, (0, cy, cz), M["gold"], 12)
    for k in range(10):
        a = k / 10 * 2 * math.pi
        x, y = 2.6 * math.cos(a), cy + 2.6 * math.sin(a)
        cylinder(f"Candle_{k}", 0.1, 0.55, (x, y, cz + 0.1), M["wax"], 12)
        fl = BP.uv_sphere(f"CandleFlame_{k}", 0.07, 12, 8, loc=(x, y, cz + 0.78), scale=(1, 1, 1.7))
        BP.assign(fl, M["candle"])
        if k % 2 == 0:
            pl = bpy.data.lights.new(f"ChandLight_{k}", "POINT")
            pl.energy = 350; pl.color = (1.0, 0.68, 0.38); pl.shadow_soft_size = 0.2
            plo = bpy.data.objects.new(f"ChandLight_{k}", pl); BP.link(plo); plo.location = (x, y, cz + 0.9)

    # treasure chests + coin piles near the dais
    for k, (x, y, rz) in enumerate(((-6.2, 19.0, 0.35), (6.0, 18.0, -0.4))):
        chest = box(f"Chest_{k}", (2.2, 1.4, 1.3), (x, y, 0.65), M["wood"], bevel=0.06, rot=(0, 0, rz))
        for b_ in (-0.7, 0.0, 0.7):
            off = Vector((math.cos(rz), math.sin(rz), 0)) * b_
            box(f"ChestBand_{k}_{b_}", (0.14, 1.46, 1.36), (x + off.x, y + off.y, 0.66), M["gold"], bevel=0.02, rot=(0, 0, rz))
        lid = box(f"ChestLid_{k}", (2.2, 1.4, 0.35), (x, y, 1.45), M["wood"], bevel=0.08, rot=(-0.9, 0, rz))
        lid.location = (x - math.sin(rz) * 0.55, y + math.cos(rz) * 0.55, 1.75)
        glow = BP.uv_sphere(f"ChestGold_{k}", 0.9, 32, 16, loc=(x, y, 1.25), scale=(1.0, 0.6, 0.35))
        BP.assign(glow, M["gold"])
        # coin pile spilling forward
        for c in range(170):
            ang = R.uniform(0, 2 * math.pi)
            rr = abs(R.gauss(0, 1.2))
            cxp = x + math.cos(ang) * rr - math.sin(rz) * 0.0
            cyp = y - 1.1 + math.sin(ang) * rr * 0.7
            hz = max(0.0, 0.5 - rr * 0.35) + R.uniform(0, 0.04)
            bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.16, depth=0.035, location=(cxp, cyp, hz + 0.02),
                                                rotation=(R.uniform(-0.6, 0.6), R.uniform(-0.6, 0.6), R.uniform(0, 3)))
            coin = bpy.context.active_object
            coin.name = f"Coin_{k}_{c}"
            BP.assign(coin, M["gold"])

    # god-ray haze
    if volume:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, (BACK_Y + FRONT_Y) / 2, CEIL_Z / 2))
        vol = bpy.context.active_object
        vol.name = "Haze"
        vol.scale = (ROOM_X * 2, BACK_Y - FRONT_Y, CEIL_Z)
        vm = bpy.data.materials.new("Haze")
        vm.use_nodes = True
        N, L = vm.node_tree.nodes, vm.node_tree.links
        N.remove(N.get("Principled BSDF"))
        out = [n for n in N if n.type == "OUTPUT_MATERIAL"][0]
        pv = N.new("ShaderNodeVolumePrincipled")
        pv.inputs["Density"].default_value = 0.0045
        pv.inputs["Anisotropy"].default_value = 0.55
        pv.inputs["Color"].default_value = (1.0, 0.9, 0.8, 1)
        L.new(pv.outputs[0], out.inputs["Volume"])
        vol.data.materials.append(vm)
    return M


# ----------------------------------------------------------------- pion

def pion_mat(name, base=None, ramp_fn=None, spec=0.0, dots=False, floor=0.06, gi=0.2):
    """Cartoon material that is lit by the scene: toon diffuse (stepped, takes every light's
    colour and shadow), a little true diffuse (room bounce), a low flat floor."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N):
        if n.type != "OUTPUT_MATERIAL":
            N.remove(n)
    out = [n for n in N if n.type == "OUTPUT_MATERIAL"][0]
    if ramp_fn:
        col = ramp_fn(N, L)
    else:
        rgb = N.new("ShaderNodeRGB"); rgb.outputs[0].default_value = (*lin(base), 1)
        col = rgb.outputs[0]
    if dots:
        tc = N.new("ShaderNodeTexCoord")
        vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 3.6
        L.new(tc.outputs["Object"], vor.inputs["Vector"])
        mr = N.new("ShaderNodeMapRange"); mr.interpolation_type = "STEPPED"; mr.inputs["Steps"].default_value = 1.0
        mr.inputs["From Max"].default_value = 0.13; mr.inputs["To Min"].default_value = 1.0; mr.inputs["To Max"].default_value = 0.0
        L.new(vor.outputs["Distance"], mr.inputs["Value"])
        mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"
        L.new(col, mx.inputs[6]); mx.inputs[7].default_value = (*lin((.1, .07, .06)), 1)
        L.new(mr.outputs[0], mx.inputs["Factor"])
        col = mx.outputs[2]

    def scaled(k):
        s = N.new("ShaderNodeMix"); s.data_type = "RGBA"; s.blend_type = "MULTIPLY"; s.inputs["Factor"].default_value = 1.0
        L.new(col, s.inputs[6]); s.inputs[7].default_value = (k, k, k, 1)
        return s.outputs[2]

    toon = N.new("ShaderNodeBsdfToon"); toon.component = "DIFFUSE"
    toon.inputs["Size"].default_value = 0.62; toon.inputs["Smooth"].default_value = 0.02
    L.new(scaled(1.0 - gi), toon.inputs["Color"])
    dif = N.new("ShaderNodeBsdfDiffuse")
    L.new(scaled(gi), dif.inputs["Color"])
    em = N.new("ShaderNodeEmission")
    L.new(scaled(floor), em.inputs["Color"])
    a1 = N.new("ShaderNodeAddShader"); L.new(toon.outputs[0], a1.inputs[0]); L.new(dif.outputs[0], a1.inputs[1])
    a2 = N.new("ShaderNodeAddShader"); L.new(a1.outputs[0], a2.inputs[0]); L.new(em.outputs[0], a2.inputs[1])
    last = a2
    if spec:
        g = N.new("ShaderNodeBsdfToon"); g.component = "GLOSSY"
        g.inputs["Size"].default_value = 0.14; g.inputs["Smooth"].default_value = 0.05
        g.inputs["Color"].default_value = (spec, spec, spec, 1)
        a3 = N.new("ShaderNodeAddShader"); L.new(last.outputs[0], a3.inputs[0]); L.new(g.outputs[0], a3.inputs[1])
        last = a3
    L.new(last.outputs[0], out.inputs["Surface"])
    return m


def build_pion(expr):
    rig, PM = BP.build(expr)
    for o in bpy.data.objects:
        for md in list(o.modifiers):
            if md.type == "PARTICLE_SYSTEM":
                o.modifiers.remove(md)
    ink = TT.outline_mat()
    T = {
        "PionSkin": pion_mat("P_Skin", ramp_fn=TT.skin_ramp, spec=0.45),
        "RingDark": pion_mat("P_Ring", (.16, .05, .05)),
        "Gold": pion_mat("P_Gold", (1.0, .773, .192), spec=0.8, floor=0.16),
        "Velvet": pion_mat("P_Cape", (.784, .078, .227)),
        "FurBase": pion_mat("P_Ermine", (1.0, .97, .9), dots=True, floor=0.16),
        "EyeWhite": TT.flat_mat("P_EyeWhite", (1.0, .98, .95)),
        "Pupil": TT.flat_mat("P_Pupil", (.1, .04, .03)),
        "FaceBrown": TT.flat_mat("P_Brown", TT.INK),
        "Ruby": pion_mat("P_Ruby", (.9, .08, .12), spec=0.8),
    }
    pion_objs = []
    stack = [rig]
    while stack:
        o = stack.pop()
        pion_objs.append(o)
        stack += list(o.children)
    widths = {"Body": 0.065, "Head": 0.065, "Collar": 0.04, "Cape": 0.05, "ErmineCollar": 0.045,
              "Trim_L": 0.045, "Trim_R": 0.045, "Trim_Hem": 0.045, "CrownBand": 0.04}
    for o in pion_objs:
        if o.type != "MESH":
            continue
        for slot in o.material_slots:
            if slot.material and slot.material.name in T:
                slot.material = T[slot.material.name]
        if o.name.startswith(("Brow", "Mouth", "Pupil")):
            continue
        w = widths.get(o.name)
        if w is None:
            w = 0.2 if o.name.startswith("EyeWhite") else 0.03
        TT.add_outline(o, ink, w)
    return rig, pion_objs


# ----------------------------------------------------------------- camera, lights, render

def camera_and_key(res):
    sc = bpy.context.scene
    cam_d = bpy.data.cameras.new("Cam")
    cam_d.lens = 34
    cam_d.sensor_width = 36
    cam_d.dof.use_dof = True
    cam_d.dof.aperture_fstop = 1.8
    cam = bpy.data.objects.new("Cam", cam_d); BP.link(cam)
    # straight-on and a little above Pion's head, like the engine camera (tiltDeg 6),
    # so the composited engine Pion and its Blender shadow proxy share one perspective
    cam.location = (0.0, -11.5, 3.7)
    cam.rotation_euler = (math.radians(90 - 3.0), 0, 0)
    cam_d.shift_y = 0.12   # keep the camera level-ish, frame more of the hall above Pion
    if res[0] / res[1] > 0.7:
        # 4:5 / square feeds: the height is barely the long side, so open the lens a little
        # to keep the whole chandelier in frame and lift Pion off the bottom edge
        cam_d.lens = 27
        cam_d.shift_y = 0.1
    cam_d.dof.focus_distance = (Vector((0, -0.5, 3.0)) - cam.location).length
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100

    # motivated key on Pion: warm torch-coloured soft light from camera-left (a torch off frame)
    k = bpy.data.lights.new("KeyTorch", "AREA"); k.shape = "DISK"; k.size = 3.0
    k.energy = 900; k.color = (1.0, 0.72, 0.48)
    ko = bpy.data.objects.new("KeyTorch", k); BP.link(ko)
    ko.location = (-8.5, -2.5, 7.0)   # side-ish key: Pion's shadow falls visibly to the right
    ko.rotation_euler = (Vector((0, 0, 3.0)) - ko.location).to_track_quat("-Z", "Y").to_euler()
    # cool fill from the room (window bounce), very soft
    f = bpy.data.lights.new("FillRoom", "AREA"); f.size = 8.0; f.energy = 250; f.color = (0.7, 0.8, 1.0)
    fo = bpy.data.objects.new("FillRoom", f); BP.link(fo)
    fo.location = (7.0, -8.0, 4.0)
    fo.rotation_euler = (Vector((0, 0, 2.5)) - fo.location).to_track_quat("-Z", "Y").to_euler()
    # rim from the windows behind (key side, per Andy Goralczyk)
    r = bpy.data.lights.new("RimWindow", "AREA"); r.shape = "RECTANGLE"; r.size = 1.5; r.size_y = 5.0
    r.energy = 1300; r.color = (1.0, 0.9, 0.75)
    ro = bpy.data.objects.new("RimWindow", r); BP.link(ro)
    ro.location = (-3.5, 6.0, 7.0)
    ro.rotation_euler = (Vector((0, 0, 3.0)) - ro.location).to_track_quat("-Z", "Y").to_euler()

    w = bpy.data.worlds.new("World"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.01, 0.008, 0.006, 1)


def mood_window(volume):
    """Dark hall lit by one side window: a hard sunbeam through the haze lands on Pion.
    Torches and candles stay as small glows (practicals), almost no light of their own."""
    for o in bpy.data.objects:
        if o.type != "LIGHT":
            continue
        n = o.name
        if n.startswith("TorchLight"):
            o.data.energy *= 0.06
        elif n.startswith("ChandLight"):
            o.data.energy *= 0.04
        elif n.startswith("WindowSun"):
            o.data.energy *= 0.08          # back windows: glow only
        elif n in ("KeyTorch", "RimWindow"):
            o.data.energy = 0.0
        elif n == "FillRoom":
            o.data.energy = 12.0
    for o in bpy.data.objects:            # dim the emissive flames a little too
        if o.name.startswith(("TorchFlame", "CandleFlame")):
            pass
    # side window on the left wall, between the first two pillars
    wx, wy, wz = -ROOM_X + 0.03, 3.5, 4.2
    pane = arch_window_mesh("SideWindow", 3.2, 9.0)
    pane.location = (wx, wy, wz)
    pane.rotation_euler = (0, 0, -math.pi / 2)       # faces +x, into the hall
    glass = mat_emit("SideWindowGlass", (1.0, 0.9, 0.72), 18.0)
    BP.assign(pane, glass)
    # lead mullions so the window reads as a window, not a light panel
    lead = BP.mat_simple("Lead", (.05, .05, .05), rough=0.6, metal=0.6)
    for k in range(-1, 2):
        box(f"Mullion_V{k}", (0.08, 0.1, 9.0), (wx + 0.05, wy + k * 1.05, wz + 4.5), lead, bevel=0, rot=(0, 0, 0))
    for zz in (2.0, 4.0, 6.0):
        box(f"Mullion_H{zz}", (0.08, 3.2, 0.1), (wx + 0.05, wy, wz + zz), lead, bevel=0)
    box("SideSill", (0.8, 3.8, 0.35), (wx + 0.3, wy, wz - 0.15), BP.mat_simple("SillStone", (.5, .42, .33), rough=0.8), bevel=0.05)
    # the sun: a narrow, hard spot just inside the glass, aimed at Pion
    sp = bpy.data.lights.new("SunBeam", "SPOT")
    sp.energy = 240000.0
    sp.color = (1.0, 0.88, 0.68)
    sp.spot_size = math.radians(22)
    sp.spot_blend = 0.25
    sp.shadow_soft_size = 0.25
    so = bpy.data.objects.new("SunBeam", sp)
    BP.link(so)
    so.location = (wx + 0.4, wy, wz + 5.5)
    tgt = Vector((0.4, -0.3, 1.8))
    so.rotation_euler = (tgt - so.location).to_track_quat("-Z", "Y").to_euler()
    so.visible_volume_scatter = True
    bpy.context.scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.002, 0.002, 0.003, 1)
    hz = bpy.data.objects.get("Haze")
    if hz and volume:
        hz.data.materials[0].node_tree.nodes["Principled Volume"].inputs["Density"].default_value = 0.011
    for m in bpy.data.materials:          # back stained glass: a dim glow so the eye goes to the sunbeam
        if m.name.startswith("StainedGlass_"):
            for n in m.node_tree.nodes:
                if n.type == "MATH" and n.operation == "MULTIPLY":
                    n.inputs[1].default_value = 2.5


def mood_chandelier(volume, pos=(0.0, -1.0, 9.0), color=(1.0, 0.52, 0.2)):
    """Night hall: the orange chandelier above Pion is the only light. Everything else is off:
    torches (flames hidden), window suns, stained glass dark."""
    old = Vector((0.0, 8.0, 17.0))           # where build_room hangs it
    new = Vector(pos)
    d = new - old
    for o in bpy.data.objects:
        if o.name.startswith(("ChandelierRing", "Candle_", "CandleFlame_", "ChandLight_")):
            o.location += d
    ch = bpy.data.objects.get("ChandelierChain")
    if ch:
        h0, h1 = CEIL_Z - old.z, CEIL_Z - new.z
        ch.scale.z = h1 / h0
        ch.location = (new.x, new.y, new.z + h1 / 2)
    for o in bpy.data.objects:
        if o.type == "LIGHT":
            if o.name.startswith("ChandLight_"):
                o.data.energy = 700.0
                o.data.color = color
                o.data.shadow_soft_size = 0.15
            else:
                o.data.energy = 0.0
        elif o.name.startswith("TorchFlame"):
            o.hide_render = True
    for m in bpy.data.materials:
        if m.name.startswith("StainedGlass_"):
            for n in m.node_tree.nodes:
                if n.type == "MATH" and n.operation == "MULTIPLY":
                    n.inputs[1].default_value = 0.0
        if m.name == "CandleFlame":
            m.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (1.0, 0.5, 0.16, 1)
            m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 60.0
    # one stronger hub light in the ring: the main shadow caster on Pion and the floor
    hub = bpy.data.lights.new("ChandHub", "POINT")
    hub.energy = 3500.0
    hub.color = color
    hub.shadow_soft_size = 0.9
    ho = bpy.data.objects.new("ChandHub", hub)
    BP.link(ho)
    ho.location = (new.x, new.y, new.z + 0.5)
    sc = bpy.context.scene
    sc.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.0, 0.0, 0.0, 1)
    hz = bpy.data.objects.get("Haze")
    if hz and volume:
        hz.data.materials[0].node_tree.nodes["Principled Volume"].inputs["Density"].default_value = 0.006
        hz.data.materials[0].node_tree.nodes["Principled Volume"].inputs["Color"].default_value = (1.0, 0.85, 0.7, 1)


def render_settings(samples, volume):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.03
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 5
    cy.diffuse_bounces = 3
    cy.glossy_bounces = 2
    cy.transmission_bounces = 2
    cy.volume_bounces = 0
    cy.transparent_max_bounces = 16
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.sample_clamp_indirect = 6.0
    cy.volume_step_rate = 4.0 if volume else 1.0
    cy.volume_max_steps = 256
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Punchy"
    except TypeError:
        pass
    sc.view_settings.exposure = 0.0
    sc.render.image_settings.file_format = "PNG"


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="castle.blend")
    ap.add_argument("--render", default=None)
    ap.add_argument("--samples", type=int, default=96)
    ap.add_argument("--res", default="1080x1920")
    ap.add_argument("--expr", default="senang")
    ap.add_argument("--novolume", action="store_true")
    ap.add_argument("--proxy", action="store_true",
                    help="Pion invisible to camera/reflections, still casts shadows (for the engine Pion composite)")
    ap.add_argument("--bbox", default=None, help="write the proxy's screen bbox (px) to this JSON")
    ap.add_argument("--lightpass", default=None,
                    help="also render the proxy alone in white clay, lit by the room (RGBA PNG) for relighting the engine Pion")
    ap.add_argument("--lightpass-only", action="store_true", help="skip the beauty render")
    ap.add_argument("--mood", default="warm", choices=["warm", "window", "chandelier"],
                    help="warm = torch-lit hall; window = dark hall, one sunbeam from a side window onto Pion")
    a = ap.parse_args(argv)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig, pion_objs = build_pion(a.expr)
    if a.proxy:
        for o in pion_objs:
            if o.type == "MESH":
                o.visible_camera = False
                o.visible_glossy = False
                o.visible_transmission = False
                o.visible_volume_scatter = False
                o.visible_shadow = True
                o.visible_diffuse = True
    build_room(volume=not a.novolume)
    camera_and_key(tuple(int(v) for v in a.res.split("x")))
    if a.mood == "window":
        mood_window(not a.novolume)
    elif a.mood == "chandelier":
        mood_chandelier(not a.novolume)
    render_settings(a.samples, not a.novolume)
    sc = bpy.context.scene
    sys.path.append("/home/user/shiny-enigma/.claude/skills/scenario-blender-lighting-rendering/scripts")
    try:
        import bx_light as BL
        BL.comp_finish(scene=sc, bloom=0.3, threshold=1.0, bloom_size=0.6, vignette=0.3, contrast=0.03)
    except Exception as ex:
        print("comp skipped:", ex)
    if a.bbox:
        import json
        from bpy_extras.object_utils import world_to_camera_view
        dg = bpy.context.evaluated_depsgraph_get()
        W, H = sc.render.resolution_x, sc.render.resolution_y
        xs, ys = [], []
        for o in pion_objs:
            if o.type != "MESH":
                continue
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            for v in list(me.vertices)[::3]:
                p = world_to_camera_view(sc, sc.camera, ev.matrix_world @ v.co)
                xs.append(p.x * W); ys.append((1 - p.y) * H)
            ev.to_mesh_clear()
        base = world_to_camera_view(sc, sc.camera, Vector((0, 0, 0)))
        info = {"x0": min(xs), "x1": max(xs), "y0": min(ys), "y1": max(ys), "W": W, "H": H,
                "base": [base.x * W, (1 - base.y) * H]}
        json.dump(info, open(a.bbox, "w"))
        print("RESULT bbox", info)
    # god rays only from the windows: other lights stay out of the haze
    for o in bpy.data.objects:
        if o.type == "LIGHT" and not o.name.startswith(("WindowSun", "SunBeam", "ChandLight", "ChandHub")):
            o.visible_volume_scatter = False
    bpy.ops.wm.save_as_mainfile(filepath=a.out)
    print("RESULT built", a.out)
    import time
    if a.render and not a.lightpass_only:
        t0 = time.time()
        sc.render.filepath = a.render
        bpy.ops.render.render(write_still=True)
        print("RESULT rendered", a.render, f"{time.time() - t0:.1f}s")
    if a.lightpass:
        render_lightpass(sc, pion_objs, a.lightpass, min(a.samples, 48))


def render_lightpass(sc, pion_objs, path, samples):
    """The room's light on Pion: proxy visible in white clay, every other object hidden from
    the camera but still lighting and shadowing it (bounce, torch colour, window rim)."""
    clay = bpy.data.materials.new("LightClay")
    clay.use_nodes = True
    b = clay.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1)
    b.inputs["Roughness"].default_value = 0.6
    b.inputs["Specular IOR Level"].default_value = 0.35
    names = {o.name for o in pion_objs}
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        if o.name in names and o.name.startswith(("EyeWhite", "Pupil", "Brow", "Mouth", "Ruby")):
            o.hide_render = True      # the engine draws its own face: keep only the head's form
            continue
        if o.name in names:
            for md in list(o.modifiers):
                if md.name == "Outline":
                    o.modifiers.remove(md)
            for i in range(len(o.material_slots)):
                o.material_slots[i].material = clay
            o.visible_camera = True
            o.visible_glossy = True
        else:
            o.visible_camera = False
        if o.name == "Haze":
            o.hide_render = True
    sc.render.film_transparent = True
    sc.render.use_compositing = False
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = -1.0      # headroom: the comp normalises it
    sc.cycles.samples = samples
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.color_depth = "16"
    t0 = time.time()
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("RESULT lightpass", path, f"{time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
