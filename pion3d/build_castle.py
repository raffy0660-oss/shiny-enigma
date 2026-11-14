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
PION_SCALE = 1.6            # Pion relative to the hall (1.0 = engine proportions vs this room)
HEAD_Z = 2.95 * PION_SCALE


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
        "candle": mat_emit("LampBulb", (1.0, 0.62, 0.28), 30.0),
        "brass": BP.mat_simple("Brass", (.78, .55, .22), rough=0.3, metal=1.0),
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

    # chandelier: gold ring with 8 brass lamp shades hanging under it, opening DOWNWARD,
    # a glowing bulb in each and a spot light pointing at the floor
    cz, cy = 17.0, 8.0
    ring = BP.torus("ChandelierRing", 2.6, 0.12, 96, 16, loc=(0, cy, cz))
    BP.assign(ring, M["gold"])
    chain = cylinder("ChandelierChain", 0.07, CEIL_Z - cz, (0, cy, cz), M["gold"], 12)
    shade_prof = [(0.06, 0.0), (0.14, -0.08), (0.3, -0.32), (0.5, -0.62), (0.53, -0.66)]
    for k in range(8):
        a = k / 8 * 2 * math.pi
        x, y = 2.6 * math.cos(a), cy + 2.6 * math.sin(a)
        rod = cylinder(f"LampRod_{k}", 0.035, 0.55, (x, y, cz - 0.55), M["gold"], 10)
        sh = BP.lathe(f"LampShade_{k}", shade_prof, 48)
        sh.location = (x, y, cz - 0.55)
        so_ = sh.modifiers.new("Solid", "SOLIDIFY"); so_.thickness = 0.03; so_.offset = 1.0
        BP.subsurf(sh, 1)
        BP.assign(sh, M["brass"])
        bulb = BP.uv_sphere(f"LampBulb_{k}", 0.13, 16, 10, loc=(x, y, cz - 1.0))
        BP.assign(bulb, M["candle"])
        sp = bpy.data.lights.new(f"ChandLight_{k}", "SPOT")
        sp.energy = 350; sp.color = (1.0, 0.68, 0.38); sp.shadow_soft_size = 0.15
        sp.spot_size = math.radians(85); sp.spot_blend = 0.6
        plo = bpy.data.objects.new(f"ChandLight_{k}", sp); BP.link(plo)
        plo.location = (x, y, cz - 1.05)        # default spot direction is -Z: straight down

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

    build_statues(M["stone"], mat_statue())

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



# ----------------------------------------------------------------- stone chess statues

def mat_statue():
    m, N, L, b = node_mat("StatueStone")
    geo = N.new("ShaderNodeNewGeometry")
    noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 2.5; noise.inputs["Detail"].default_value = 12
    L.new(geo.outputs["Position"], noise.inputs["Vector"])
    fine = N.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 40.0; fine.inputs["Detail"].default_value = 6
    L.new(geo.outputs["Position"], fine.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*lin((.42, .4, .37)), 1)
    ramp.color_ramp.elements[1].color = (*lin((.7, .67, .62)), 1)
    L.new(noise.outputs["Fac"], ramp.inputs[0]); L.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.85
    mix = N.new("ShaderNodeMath"); mix.operation = "ADD"
    L.new(noise.outputs["Fac"], mix.inputs[0]); L.new(fine.outputs["Fac"], mix.inputs[1])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25
    L.new(mix.outputs[0], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def _piece_base(name, mat, top=1.4):
    prof = BP.catmull([[0, 0], [1.25, 0], [1.25, .18], [1.05, .3], [1.05, .42], [.8, .6], [.62, top]], 40)
    o = BP.lathe(name, prof + [(0.0, top)], 64)
    BP.subsurf(o, 1)
    BP.assign(o, mat)
    return o


def _knight_head(name, mat, h=3.0, thick=1.05):
    """Classic Staunton knight: side silhouette extruded, bevelled and smoothed. Faces +x."""
    sil = [(-0.36, 0.0), (0.34, 0.0), (0.3, 0.14), (0.2, 0.26), (0.26, 0.38), (0.44, 0.5), (0.56, 0.58),
           (0.58, 0.65), (0.52, 0.71), (0.36, 0.71), (0.28, 0.76), (0.24, 0.86), (0.17, 0.97), (0.1, 1.0),
           (0.06, 0.93), (0.0, 0.99), (-0.06, 0.92), (-0.14, 0.86), (-0.3, 0.74), (-0.4, 0.55), (-0.4, 0.3)]
    bm_ = bmesh.new()
    vs = [bm_.verts.new((x * h, 0.0, z * h)) for x, z in sil]
    f = bm_.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm_, geom=[f])
    moved = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm_, verts=moved, vec=(0, thick, 0))
    bmesh.ops.translate(bm_, verts=bm_.verts, vec=(0, -thick / 2, 0))
    bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces)
    me = bpy.data.meshes.new(name); bm_.to_mesh(me); bm_.free()
    o = BP.new_obj(name, me)
    bev = o.modifiers.new("Bevel", "BEVEL"); bev.width = 0.09; bev.segments = 3; bev.limit_method = "ANGLE"
    BP.subsurf(o, 1)
    BP.smooth(o)
    BP.assign(o, mat)
    # eye + nostril carved as small dark-ish dents read through the bump; mane ridge
    for sy in (-1, 1):
        eye = BP.uv_sphere(f"{name}_eye{sy}", 0.11 * h / 3, 16, 8, loc=(0.24 * h, sy * thick * 0.5, 0.8 * h), scale=(1, 0.5, 1))
        BP.assign(eye, mat); eye.parent = o
    mane = BP.tube(f"{name}_mane", [Vector((x * h, 0, z * h)) for x, z in
                                    [(-0.06, 0.95), (-0.2, 0.84), (-0.33, 0.7), (-0.42, 0.5), (-0.43, 0.28)]],
                   lambda t: 0.16 * h / 3 * (1 - 0.4 * t), 12)
    BP.assign(mane, mat); mane.parent = o
    return o


def _crown_spikes(parent, mat, z, r, n, h, ball):
    for k in range(n):
        a = k / n * 2 * math.pi
        c = BP.cone(f"{parent.name}_spike{k}", 0.16, h, 16)
        c.location = (r * math.cos(a), r * math.sin(a), z)
        BP.assign(c, mat); c.parent = parent
        b = BP.uv_sphere(f"{parent.name}_ball{k}", ball, 16, 8, loc=(r * math.cos(a), r * math.sin(a), z + h))
        BP.assign(b, mat); b.parent = parent


def chess_statue(kind, name, mat):
    """Returns the root object of a stone chess piece (about 6 units tall at scale 1)."""
    root = bpy.data.objects.new(name, None); BP.link(root)
    if kind == "knight":
        base = _piece_base(name + "_base", mat, top=1.2); base.parent = root
        head = _knight_head(name + "_head", mat); head.parent = root; head.location = (0, 0, 1.05)
    elif kind == "rook":
        prof = BP.catmull([[0, 0], [1.3, 0], [1.3, .2], [1.1, .35], [1.0, .6], [0.85, 2.8], [1.05, 3.1], [1.1, 3.9]], 50)
        body = BP.lathe(name + "_body", prof + [(0.0, 3.9)], 64); BP.subsurf(body, 1); BP.assign(body, mat); body.parent = root
        for k in range(6):
            a = k / 6 * 2 * math.pi
            mer = box(f"{name}_merlon{k}", (0.55, 0.45, 0.55), (0.82 * math.cos(a), 0.82 * math.sin(a), 4.15), mat, bevel=0.06, rot=(0, 0, a))
            mer.parent = root
    elif kind == "bishop":
        prof = BP.catmull([[0, 0], [1.2, 0], [1.2, .2], [1.0, .35], [.75, .7], [.5, 2.4], [.85, 2.6], [.5, 2.75],
                           [.75, 3.4], [.7, 4.0], [.35, 4.5], [0.0, 4.65]], 60)
        body = BP.lathe(name + "_body", prof, 64); BP.subsurf(body, 1); BP.assign(body, mat); body.parent = root
        ball = BP.uv_sphere(name + "_ball", 0.22, 24, 12, loc=(0, 0, 4.8)); BP.assign(ball, mat); ball.parent = root
    elif kind in ("king", "queen"):
        prof = BP.catmull([[0, 0], [1.35, 0], [1.35, .22], [1.1, .4], [.8, .8], [.55, 3.0], [.95, 3.2], [.6, 3.4],
                           [.85, 4.2], [.95, 4.45], [0.0, 4.5]], 60)
        body = BP.lathe(name + "_body", prof, 64); BP.subsurf(body, 1); BP.assign(body, mat); body.parent = root
        if kind == "king":
            cv = box(name + "_crossV", (0.28, 0.28, 1.1), (0, 0, 5.05), mat, bevel=0.05); cv.parent = root
            ch = box(name + "_crossH", (0.8, 0.28, 0.28), (0, 0, 5.2), mat, bevel=0.05); ch.parent = root
        else:
            _crown_spikes(root, mat, 4.35, 0.75, 8, 0.45, 0.13)
            top = BP.uv_sphere(name + "_top", 0.3, 24, 12, loc=(0, 0, 4.7)); BP.assign(top, mat); top.parent = root
    return root


def build_statues(stone, statue):
    """Stone chess pieces on plinths down both sides of the hall (faces toward the carpet)."""
    spots = [("knight", -7.6, 2.5, -0.6), ("knight", 7.6, 2.5, math.pi + 0.6),   # turned toward camera
             ("rook", -8.6, 11.0, 0.0), ("bishop", 8.6, 11.0, 0.0),
             ("queen", -9.6, 19.5, 0.0), ("king", 9.6, 19.5, 0.0)]
    for k, (kind, x, y, rz) in enumerate(spots):
        box(f"Plinth_{k}", (3.2, 3.2, 1.4), (x, y, 0.7), stone, bevel=0.1)
        box(f"PlinthCap_{k}", (3.5, 3.5, 0.25), (x, y, 1.52), stone, bevel=0.06)
        root = chess_statue(kind, f"Statue_{kind}_{k}", statue)
        root.location = (x, y, 1.65)
        root.rotation_euler = (0, 0, rz)
        root.scale = (1.15, 1.15, 1.15)


# ----------------------------------------------------------------- red drapery (theatre framing)

def mat_drape():
    m, N, L, b = node_mat("Drape")
    lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = (*lin((.5, .02, .05)), 1)       # deep red in the folds facing us
    mix.inputs[7].default_value = (*lin((.8, .1, .14)), 1)        # brighter at grazing angles (velvet)
    L.new(lw.outputs["Facing"], mix.inputs["Factor"]); L.new(mix.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.8
    b.inputs["Sheen Weight"].default_value = 0.35
    b.inputs["Sheen Tint"].default_value = (1.0, 0.45, 0.45, 1)
    return m


def swag(name, x0, x1, y, z_top, drop, scallops, mat, depth=0.35):
    """Festoon of cloth hung from a straight top edge: each scallop sags in a soft U with folds."""
    nx, nz = 24 * scallops, 18
    bm_ = bmesh.new()
    grid = []
    for j in range(nz + 1):
        v = j / nz
        row = []
        for i in range(nx + 1):
            u = i / nx
            us = (u * scallops) % 1.0
            sag = drop * (0.35 + 0.65 * math.sin(math.pi * us))      # deeper in the middle of each scallop
            x = x0 + (x1 - x0) * u
            z = z_top - v * sag
            fold = depth * v * math.sin(us * math.pi * 6) * math.sin(math.pi * us)
            row.append(bm_.verts.new((x, y - 0.15 * v * math.sin(math.pi * us) + fold, z)))
        grid.append(row)
    for j in range(nz):
        for i in range(nx):
            bm_.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    me = bpy.data.meshes.new(name); bm_.to_mesh(me); bm_.free()
    o = BP.new_obj(name, me); BP.smooth(o)
    sol = o.modifiers.new("Solid", "SOLIDIFY"); sol.thickness = 0.05
    BP.assign(o, mat)
    # gold trim along the bottom edge + a tassel at every join
    pts = [Vector(grid[nz][i].co) for i in range(0, nx + 1, 2)] if False else None
    edge = []
    for i in range(nx + 1):
        u = i / nx; us = (u * scallops) % 1.0
        sag = drop * (0.35 + 0.65 * math.sin(math.pi * us))
        fold = depth * math.sin(us * math.pi * 6) * math.sin(math.pi * us)
        edge.append(Vector((x0 + (x1 - x0) * u, y - 0.15 * math.sin(math.pi * us) + fold, z_top - sag)))
    return o, edge


def _hanging_drape(name, x_in, x_out, y, z_top, mat, folds=6):
    """Floor-length curtain inside the hall between x_in and x_out, pinched by a tie-back."""
    nx, nz = 50, 50
    bm_ = bmesh.new(); grid = []
    for j in range(nz + 1):
        v = j / nz
        tb = math.exp(-((v - 0.4) / 0.11) ** 2)
        row = []
        for i in range(nx + 1):
            u = i / nx
            x = x_out + (x_in - x_out) * u * (1 - 0.45 * tb)          # gathered toward the wall side
            fold = (0.25 + 0.15 * tb) * math.sin(u * folds * math.pi)
            row.append(bm_.verts.new((x, y + fold, v * z_top)))
        grid.append(row)
    for j in range(nz):
        for i in range(nx):
            bm_.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    me = bpy.data.meshes.new(name); bm_.to_mesh(me); bm_.free()
    o = BP.new_obj(name, me); BP.smooth(o)
    sol = o.modifiers.new("Solid", "SOLIDIFY"); sol.thickness = 0.05
    BP.assign(o, mat)
    return o


def build_drapes(res, gold):
    """Red velvet inside the hall (never in front of the lens): two fabric arches across the room,
    each a festoon under the ceiling with floor-length curtains at its ends, so the top of the shot
    reads as a red cloth 'roof' and a little red shows at the left and right edges."""
    drape = mat_drape()
    coll = bpy.data.collections.new("Drapes"); bpy.context.scene.collection.children.link(coll)
    for k, (yy, half, z_top) in enumerate(((6.5, 9.2, 16.5), (16.0, 11.0, 18.5))):
        o, edge = swag(f"Swag_{k}", -half - 0.4, half + 0.4, yy, z_top, 2.4, 4, drape, depth=0.45)
        t = BP.tube(f"SwagTrim_{k}", edge, 0.06, 10, cap=True); BP.assign(t, gold)
        coll.objects.link(o)
        for j in range(5):
            x = -half - 0.4 + j * (2 * half + 0.8) / 4
            c = BP.cone(f"Tassel_{k}_{j}", 0.13, 0.6, 16); c.location = (x, yy - 0.05, z_top - 2.4 * 0.35 - 0.62)
            c.rotation_euler = (math.pi, 0, 0); BP.assign(c, gold)
        for sx in (-1, 1):
            d = _hanging_drape(f"HallDrape_{k}_{sx}", sx * (half - 1.4), sx * (half + 1.6), yy + 0.15, z_top, drape)
            coll.objects.link(d)
            rope = BP.torus(f"HallTie_{k}_{sx}", 0.45, 0.07, 32, 10, loc=(sx * (half + 0.9), yy, 0.4 * z_top))
            rope.rotation_euler = (math.pi / 2, 0, 0); BP.assign(rope, gold)
        rod = box(f"DrapeRod_{k}", (2 * half + 4.0, 0.22, 0.22), (0, yy, z_top + 0.1), gold, bevel=0.05)
    # a soft warm light on the fabric only, so it stays red in the darker moods
    L_ = bpy.data.lights.new("DrapeKey", "AREA"); L_.size = 10.0; L_.color = (1.0, 0.7, 0.5); L_.energy = 2500.0
    lo = bpy.data.objects.new("DrapeKey", L_); BP.link(lo); lo.location = (0.0, -4.0, 9.0)
    lo.rotation_euler = (Vector((0, 10.0, 12.0)) - lo.location).to_track_quat("-Z", "Y").to_euler()
    lo.light_linking.receiver_collection = coll

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
    cr = bpy.data.objects.get("CrownRoot")
    if cr:   # the proxy must match the engine's proportions exactly (build_pion enlarges the crown)
        cr.scale = (1.0, 1.0, 1.0)
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
    # close, like the creator's videos: Pion fills ~60 % of the frame height, base near the bottom,
    # head over the throne; a wide lens keeps the chandelier (hung behind him) in shot
    cam.location = (0.0, -10.5, 4.4)
    cam.rotation_euler = (math.radians(90 - 2.0), 0, 0)
    cam_d.lens = 26
    cam_d.shift_y = 0.08
    if res[0] / res[1] > 0.7:   # 4:5 / square feeds
        cam.location = (0.0, -9.0, 4.3)
        cam_d.lens = 23
        cam_d.shift_y = 0.06
    cam_d.dof.focus_distance = (Vector((0, -0.5 * PION_SCALE, HEAD_Z)) - cam.location).length
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


def add_side_window(glass_col, beam_col, energy):
    """Arched window on the left wall with lead mullions and a hard spot through it onto Pion."""
    # side window on the left wall, between the first two pillars
    wx, wy, wz = -ROOM_X + 0.03, 3.5, 4.2
    pane = arch_window_mesh("SideWindow", 3.2, 9.0)
    pane.location = (wx, wy, wz)
    pane.rotation_euler = (0, 0, -math.pi / 2)       # faces +x, into the hall
    glass = mat_emit("SideWindowGlass", glass_col, 18.0)
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
    sp.energy = energy
    sp.color = beam_col
    sp.spot_size = math.radians(22)
    sp.spot_blend = 0.25
    sp.shadow_soft_size = 0.25
    so = bpy.data.objects.new("SunBeam", sp)
    BP.link(so)
    so.location = (wx + 0.4, wy, wz + 5.5)
    tgt = Vector((0.4, -0.3, 1.8))
    so.rotation_euler = (tgt - so.location).to_track_quat("-Z", "Y").to_euler()
    so.visible_volume_scatter = True
    return so


EMOTIONS = {
    # chandelier colour/scale, hub, extra lights, haze, comp grade, engine light cue
    "hangat": dict(chand=(1.0, 0.52, 0.2), k=1.0, hub=3500, haze=(0.005, (1.0, 0.85, 0.7)), room=(0.4, (1.0, 0.62, 0.32))),
    "marah": dict(chand=(1.0, 0.22, 0.08), k=0.45, hub=1200, haze=(0.004, (1.0, 0.7, 0.65)), room=(0.35, (1.0, 0.45, 0.25)),
                  under=((1.0, 0.32, 0.1), 900), rim=((1.0, 0.15, 0.05), 2200)),
    "sedih": dict(chand=(1.0, 0.5, 0.2), k=0.0, hub=0, haze=(0.007, (0.7, 0.8, 1.0)), room=(0.35, (0.55, 0.65, 1.0)),
                  window=((0.55, 0.7, 1.0), (0.45, 0.6, 1.0), 110000.0)),
    "kaget": dict(chand=(1.0, 0.96, 0.9), k=2.0, hub=11000, haze=(0.004, (1.0, 1.0, 1.0)), room=(0.4, (1.0, 0.9, 0.8)),
                  rim=((0.9, 0.95, 1.0), 2500)),
    "licik": dict(chand=(1.0, 0.5, 0.2), k=0.0, hub=0, haze=(0.006, (0.75, 0.6, 1.0)), room=(0.35, (0.6, 0.5, 1.0)),
                  under=((0.25, 1.0, 0.45), 1300), rim=((0.6, 0.15, 1.0), 3200)),
    "duit": dict(chand=(1.0, 0.72, 0.28), k=1.3, hub=4500, haze=(0.005, (1.0, 0.85, 0.5)), room=(0.45, (1.0, 0.75, 0.35)),
                 chests=((1.0, 0.7, 0.2), 900), top=((1.0, 0.78, 0.35), 2500)),
    # soktahu "enlightenment": cool, dim hall; the open book in his left hand is the light (gold, from below-front)
    "pencerahan": dict(chand=(1.0, 0.5, 0.2), k=0.0, hub=0, haze=(0.006, (0.85, 0.88, 1.0)), room=(0.3, (0.45, 0.58, 0.95)),
                       book=((1.0, 0.78, 0.38), 2600), top=((1.0, 0.86, 0.55), 700)),
    "misteri": dict(chand=(0.65, 0.45, 1.0), k=0.5, hub=1500, haze=(0.007, (0.7, 0.65, 1.0)), room=(0.35, (0.6, 0.55, 1.0)),
                    rim=((0.35, 0.5, 1.0), 1800)),
}
EXPR_TO_EMOTION = {
    "senang": "hangat", "imut": "hangat", "ngakak": "hangat", "datar": "hangat",
    "marah": "marah", "kecewa": "sedih", "sakit": "sedih", "kaget": "kaget",
    "licik": "licik", "curiga": "licik", "sinis": "licik", "duit": "duit",
    "penasaran": "misteri", "ragu": "misteri", "pusing": "misteri",
    "girang": "hangat", "bahagia": "hangat", "cium": "hangat", "lega": "hangat", "gemas": "hangat",
    "santai": "hangat", "ngiler": "hangat", "nangis": "sedih", "tersedu": "sedih", "merajuk": "sedih",
    "memelas": "sedih", "syok": "kaget", "kesal": "marah", "ngamuk": "marah", "bangga": "duit",
    "bosan": "misteri", "cemas": "misteri", "soktahu": "pencerahan",
}


def _area(name, loc, target, color, energy, size=1.0, size_y=None):
    d = bpy.data.lights.new(name, "AREA")
    d.energy, d.color, d.size = energy, color, size
    if size_y:
        d.shape, d.size_y = "RECTANGLE", size_y
    o = bpy.data.objects.new(name, d)
    BP.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


def mood_emotion(name, volume):
    """Lighting per feeling, built on the chandelier night hall (everything else off)."""
    E = EMOTIONS[name]
    mood_chandelier(volume, color=E["chand"])
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name.startswith("ChandLight_"):
            o.data.energy *= E["k"]
        if o.name == "ChandHub":
            o.data.energy = E["hub"]
    for m in bpy.data.materials:   # candle flames follow the chandelier (off when it is off)
        if m.name == "LampBulb":
            b = m.node_tree.nodes["Principled BSDF"]
            b.inputs["Emission Color"].default_value = (*E["chand"], 1)
            b.inputs["Emission Strength"].default_value = 60.0 * min(1.0, E["k"]) if E["k"] > 0 else 0.0
    # keep the hall readable (not a horror set): torches back on at a low, tinted level,
    # a big soft bounce from the ceiling, and the stained glass glowing a little
    lvl, rc = E.get("room", (0.35, (1.0, 0.62, 0.32)))
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name.startswith("TorchLight"):
            o.data.energy = 1400.0 * lvl
            o.data.color = rc
        elif o.name.startswith("TorchFlame"):
            o.hide_render = False
    flame = bpy.data.materials.get("Flame")
    if flame:
        flame.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (*rc, 1)
    _area("RoomBounce", (0.0, 6.0, CEIL_Z - 1.0), (0.0, 8.0, 0.0), rc, 9000.0 * lvl, size=22.0)
    for m in bpy.data.materials:
        if m.name.startswith("StainedGlass_"):
            for n in m.node_tree.nodes:
                if n.type == "MATH" and n.operation == "MULTIPLY":
                    n.inputs[1].default_value = 7.0 * lvl
    head = (0.0, 0.0, HEAD_Z)
    if "under" in E:   # uplight from the floor in front: menace
        col, en = E["under"]
        _area("UnderLight", (0.0, -3.2, 0.25), head, col, en, size=0.9)
    if "rim" in E:     # hard edge from behind
        col, en = E["rim"]
        _area("RimMood", (1.5, 3.2 * PION_SCALE, 5.5 * PION_SCALE), head, col, en, size=1.2, size_y=4.0 * PION_SCALE)
    if "top" in E:     # narrow spot from above
        col, en = E["top"]
        sp = bpy.data.lights.new("TopSpot", "SPOT"); sp.energy = en * 10; sp.color = col
        sp.spot_size = math.radians(28); sp.spot_blend = 0.4; sp.shadow_soft_size = 0.3
        so = bpy.data.objects.new("TopSpot", sp); BP.link(so); so.location = (0.0, -1.5, 15.0)
        so.rotation_euler = (Vector(head) - so.location).to_track_quat("-Z", "Y").to_euler()
    if "chests" in E:  # treasure glows
        col, en = E["chests"]
        for k in range(2):
            ch = bpy.data.objects.get(f"ChestGold_{k}")
            if ch:
                pl = bpy.data.lights.new(f"ChestGlow_{k}", "POINT"); pl.energy = en; pl.color = col
                pl.shadow_soft_size = 0.5
                po = bpy.data.objects.new(f"ChestGlow_{k}", pl); BP.link(po)
                po.location = ch.location + Vector((0, -0.6, 0.9))
    if "book" in E:    # light from the open book (engine nerd pose: left hand, in front of the chest)
        col, en = E["book"]
        bl = bpy.data.lights.new("BookGlow", "POINT"); bl.energy = en; bl.color = col; bl.shadow_soft_size = 0.35
        bo = bpy.data.objects.new("BookGlow", bl); BP.link(bo)
        bo.location = Vector((0.52, -1.45, 1.85)) * PION_SCALE
    if "window" in E:
        g, b, en = E["window"]
        add_side_window(g, b, en)
    hz = bpy.data.objects.get("Haze")
    if hz and volume:
        pv = hz.data.materials[0].node_tree.nodes["Principled Volume"]
        pv.inputs["Density"].default_value = E["haze"][0]
        pv.inputs["Color"].default_value = (*E["haze"][1], 1)


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
        if o.name.startswith(("TorchFlame", "LampBulb")):
            pass
    so = add_side_window((1.0, 0.9, 0.72), (1.0, 0.88, 0.68), 240000.0)
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


def mood_chandelier(volume, pos=(0.0, 2.6, 11.2), color=(1.0, 0.52, 0.2)):
    """Night hall: the orange chandelier above Pion is the only light. Everything else is off:
    torches (flames hidden), window suns, stained glass dark."""
    ring = bpy.data.objects.get("ChandelierRing")
    old = ring.location.copy() if ring else Vector((0.0, 8.0, 17.0))   # idempotent: move from where it is
    new = Vector(pos)
    d = new - old
    for o in bpy.data.objects:
        if o.name.startswith(("ChandelierRing", "LampRod_", "LampShade_", "LampBulb_", "ChandLight_")):
            o.location += d
    ch = bpy.data.objects.get("ChandelierChain")
    if ch:
        h0, h1 = CEIL_Z - old.z, CEIL_Z - new.z
        ch.scale.z = h1 / h0
        ch.location = (new.x, new.y, new.z + h1 / 2)
    for o in bpy.data.objects:
        if o.type == "LIGHT":
            if o.name.startswith(("DrapeKey", "DrapeFill")):
                continue
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
        if m.name == "LampBulb":
            m.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (1.0, 0.5, 0.16, 1)
            m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 60.0
    # one stronger hub light in the ring, also aimed down: the main shadow caster on Pion
    hub = bpy.data.lights.new("ChandHub", "SPOT")
    hub.energy = 3500.0
    hub.color = color
    hub.shadow_soft_size = 0.9
    hub.spot_size = math.radians(110)
    hub.spot_blend = 0.7
    ho = bpy.data.objects.new("ChandHub", hub)
    BP.link(ho)
    ho.location = (new.x, new.y, new.z - 0.6)
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
    ap.add_argument("--emotion", default=None, help="lighting per feeling: an emotion preset "
                    "(hangat marah sedih kaget licik duit misteri) or a Pion expression (marah, kecewa, licik...)")
    ap.add_argument("--mood", default="warm", choices=["warm", "window", "chandelier"],
                    help="warm = torch-lit hall; window = dark hall, one sunbeam from a side window onto Pion")
    a = ap.parse_args(argv)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig, pion_objs = build_pion(a.expr)
    rig.scale = (PION_SCALE, PION_SCALE, PION_SCALE)   # Pion bigger relative to the hall
    bpy.context.view_layer.update()
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
    build_drapes(tuple(int(v) for v in a.res.split("x")), BP.mat_gold())
    if a.mood == "window":
        mood_window(not a.novolume)
    elif a.mood == "chandelier":
        mood_chandelier(not a.novolume)
    if a.emotion:
        mood_emotion(EXPR_TO_EMOTION.get(a.emotion, a.emotion), not a.novolume)
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
        if o.type == "LIGHT" and not o.name.startswith(("WindowSun", "SunBeam", "ChandLight", "ChandHub", "TopSpot", "BookGlow")):
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
        if o.name in names and o.name.startswith(("Spike", "SpikeBall", "CrownRim")):
            o.visible_shadow = False  # crown spikes over a top light print a dark 'nose' on the face
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
