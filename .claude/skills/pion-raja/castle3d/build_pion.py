"""Pion Raja, high-fidelity Blender build (Cycles).

Rebuilds the Pion Raja mascot from the WebGL engine's proportions
(.claude/skills/pion-raja/engine/engine.js + render.js) as a stylized
"premium 3D" character: lacquered vinyl body, metallic gold crown, velvet
cape, real ermine fur (hair particles), sculpted 3D eyes, on a marble chessboard.

Run (bpy pip module, Blender 5.2 LTS):
    /opt/bpyenv/bin/python build_pion.py --out pion.blend [--render out.png] [--samples 256]
        [--res 1080x1920] [--expr senang]

Engine axes: y up, face toward +z. Blender: z up, face toward -y.
Mapping: (x, y, z)_engine -> (x, -z, y)_blender.
"""
import argparse
import math
import os
import sys

import bpy  # must come before bmesh/mathutils with the pip module
import bmesh
from mathutils import Matrix, Vector

# ----------------------------------------------------------------- helpers

def srgb(c):
    """sRGB display triple (engine colors) -> linear for Blender."""
    out = []
    for v in c:
        out.append(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def catmull(points, n):
    """Uniform Catmull-Rom through 2D points, n samples (like engine spline2D)."""
    pts = [points[0]] + list(points) + [points[-1]]
    segs = len(points) - 1
    out = []
    for i in range(n):
        t = i / (n - 1) * segs
        k = min(int(t), segs - 1)
        f = t - k
        p0, p1, p2, p3 = pts[k], pts[k + 1], pts[k + 2], pts[k + 3]
        f2, f3 = f * f, f * f * f
        out.append(tuple(
            0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * f + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * f2
                   + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * f3) for j in range(2)))
    return out


def eng(x, y, z):
    return Vector((x, -z, y))


def link(obj, coll=None):
    (coll or bpy.context.scene.collection).objects.link(obj)
    return obj


def new_obj(name, mesh):
    return link(bpy.data.objects.new(name, mesh))


def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def subsurf(obj, lv=2, rlv=None):
    m = obj.modifiers.new("Subsurf", "SUBSURF")
    m.levels = lv
    m.render_levels = rlv if rlv is not None else lv
    return m


def lathe(name, prof, segs=96, phi0=0.0, phil=2 * math.pi, cap_top=False, cap_bottom=False):
    """Revolve (r, y) profile around the up axis. Angles follow the engine:
    x = r sin(phi), z_eng = r cos(phi)."""
    full = abs(phil - 2 * math.pi) < 1e-6
    cols = segs if full else segs + 1
    bm = bmesh.new()
    rows = []
    for (r, y) in prof:
        row = []
        for j in range(cols):
            ph = phi0 + j / segs * phil
            row.append(bm.verts.new(eng(r * math.sin(ph), y, r * math.cos(ph))))
        rows.append(row)
    for i in range(len(rows) - 1):
        for j in range(segs):
            a, b = rows[i][j], rows[i][(j + 1) % cols]
            c, d = rows[i + 1][(j + 1) % cols], rows[i + 1][j]
            if len({a, b, c, d}) == 4:
                bm.faces.new((a, b, c, d))
    if cap_bottom and full:
        bmesh.ops.contextual_create(bm, geom=rows[0])
    if cap_top and full:
        bmesh.ops.contextual_create(bm, geom=rows[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me)
    smooth(o)
    return o


def uv_sphere(name, r=1.0, seg=64, rings=32, loc=(0, 0, 0), scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me)
    o.location = loc
    o.scale = scale
    smooth(o)
    return o


def torus(name, R, r, seg=96, rseg=24, loc=(0, 0, 0), scale=(1, 1, 1)):
    bm = bmesh.new()
    vs = []
    for i in range(seg):
        a = i / seg * 2 * math.pi
        row = []
        for j in range(rseg):
            b = j / rseg * 2 * math.pi
            rr = R + r * math.cos(b)
            row.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), r * math.sin(b))))
        vs.append(row)
    for i in range(seg):
        for j in range(rseg):
            bm.faces.new((vs[i][j], vs[(i + 1) % seg][j], vs[(i + 1) % seg][(j + 1) % rseg], vs[i][(j + 1) % rseg]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me)
    o.location = loc
    o.scale = scale
    smooth(o)
    return o


def tube(name, pts, radius, rseg=20, cap=True):
    """Tube mesh along a polyline (Blender coords)."""
    bm = bmesh.new()
    n = len(pts)
    rings = []
    prev_nrm = None
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        if prev_nrm is None:
            up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            nrm = t.cross(up).normalized()
        else:
            nrm = (prev_nrm - t * prev_nrm.dot(t)).normalized()
        prev_nrm = nrm
        bin_ = t.cross(nrm)
        r = radius(i / (n - 1)) if callable(radius) else radius
        rings.append([bm.verts.new(p + (nrm * math.cos(a) + bin_ * math.sin(a)) * r)
                      for a in (k / rseg * 2 * math.pi for k in range(rseg))])
    for i in range(n - 1):
        for k in range(rseg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % rseg], rings[i + 1][(k + 1) % rseg], rings[i + 1][k]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me)
    smooth(o)
    return o


def cone(name, r, h, seg=32):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=0.0, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = new_obj(name, me)
    smooth(o)
    return o


# ----------------------------------------------------------------- materials

def mat_new(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    return m, nt, bsdf


def set_in(node, name, val):
    node.inputs[name].default_value = val


def mat_skin():
    """Lacquered vinyl with the engine's body gradient (world height / 4)."""
    m, nt, b = mat_new("PionSkin")
    N, L = nt.nodes, nt.links
    geo = N.new("ShaderNodeNewGeometry")
    sep = N.new("ShaderNodeSeparateXYZ")
    div = N.new("ShaderNodeMath"); div.operation = "DIVIDE"; div.inputs[1].default_value = 4.0
    ramp = N.new("ShaderNodeValToRGB")
    el = ramp.color_ramp.elements
    # engine gradient, pushed toward orange on the head (reference.png reads orange, not salmon)
    stops = [(0.0, (.55, .05, .12)), (.3, (.85, .13, .17)), (.5, (.97, .3, .18)), (.64, (1, .45, .16)), (1.0, (1, .62, .24))]
    el[0].position, el[0].color = stops[0][0], (*srgb(stops[0][1]), 1)
    el[1].position, el[1].color = stops[-1][0], (*srgb(stops[-1][1]), 1)
    for pos, col in stops[1:-1]:
        e = el.new(pos); e.color = (*srgb(col), 1)
    L.new(geo.outputs["Position"], sep.inputs[0])
    L.new(sep.outputs["Z"], div.inputs[0])
    L.new(div.outputs[0], ramp.inputs[0])
    # cheek blush: two soft spots on the face (object space of the head is world here)
    blush = N.new("ShaderNodeGroup") if False else None
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MIX"
    L.new(ramp.outputs["Color"], mix.inputs[6])
    mix.inputs[7].default_value = (*srgb((1.0, .42, .38)), 1)
    # blush mask = max of two gaussians around cheek points
    masks = []
    for sx in (-1, 1):
        c = eng(sx * 0.52, 2.95 - 0.18, 0.80)
        vsub = N.new("ShaderNodeVectorMath"); vsub.operation = "DISTANCE"
        vsub.inputs[1].default_value = c
        L.new(geo.outputs["Position"], vsub.inputs[0])
        mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.08; mr.inputs["From Max"].default_value = 0.30
        mr.inputs["To Min"].default_value = 0.35; mr.inputs["To Max"].default_value = 0.0
        L.new(vsub.outputs["Value"], mr.inputs["Value"])
        masks.append(mr)
    mx = N.new("ShaderNodeMath"); mx.operation = "MAXIMUM"
    L.new(masks[0].outputs[0], mx.inputs[0]); L.new(masks[1].outputs[0], mx.inputs[1])
    L.new(mx.outputs[0], mix.inputs["Factor"])
    L.new(mix.outputs[2], b.inputs["Base Color"])
    set_in(b, "Roughness", 0.32)
    set_in(b, "Subsurface Weight", 0.12)
    set_in(b, "Subsurface Radius", (0.08, 0.03, 0.02))
    set_in(b, "Subsurface Scale", 0.15)
    set_in(b, "Coat Weight", 0.45)
    set_in(b, "Coat Roughness", 0.08)
    # micro surface: very soft noise bump so highlights are not CG-perfect
    noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 60.0
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.02
    L.new(noise.outputs["Fac"], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_simple(name, col, rough=0.4, metal=0.0, coat=0.0, sss=0.0, sheen=0.0, linear=False):
    m, nt, b = mat_new(name)
    set_in(b, "Base Color", (*(col if linear else srgb(col)), 1))
    set_in(b, "Roughness", rough)
    set_in(b, "Metallic", metal)
    set_in(b, "Coat Weight", coat)
    set_in(b, "Coat Roughness", 0.05)
    if sss:
        set_in(b, "Subsurface Weight", sss)
    if sheen:
        set_in(b, "Sheen Weight", sheen)
    return m


def mat_gold():
    m, nt, b = mat_new("Gold")
    N, L = nt.nodes, nt.links
    set_in(b, "Base Color", (1.0, 0.71, 0.29, 1))
    set_in(b, "Metallic", 1.0)
    set_in(b, "Specular Tint", (1.0, 0.86, 0.6, 1))
    noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 18.0
    mr = N.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = 0.16; mr.inputs["To Max"].default_value = 0.3
    L.new(noise.outputs["Fac"], mr.inputs["Value"])
    L.new(mr.outputs[0], b.inputs["Roughness"])
    return m


def mat_velvet():
    m, nt, b = mat_new("Velvet")
    N, L = nt.nodes, nt.links
    lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.45
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = (*srgb((.62, .04, .13)), 1)
    mix.inputs[7].default_value = (*srgb((.95, .32, .42)), 1)
    L.new(lw.outputs["Facing"], mix.inputs["Factor"])
    L.new(mix.outputs[2], b.inputs["Base Color"])
    set_in(b, "Roughness", 0.75)
    set_in(b, "Sheen Weight", 1.0)
    set_in(b, "Sheen Roughness", 0.35)
    set_in(b, "Sheen Tint", (1.0, 0.55, 0.6, 1))
    wave = N.new("ShaderNodeTexWave"); wave.inputs["Scale"].default_value = 140.0
    wave.inputs["Distortion"].default_value = 4.0
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.05
    L.new(wave.outputs["Fac"], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_ermine_fur():
    """Hair shader: warm white with black ermine-tail spots (object-space Voronoi)."""
    # Principled BSDF on the strands, not the Hair BSDF: white hair BSDF needs many glossy
    # bounces to stay white, and this CPU budget keeps 3 (it rendered as grey felt).
    m, nt, b = mat_new("ErmineFur")
    N, L = nt.nodes, nt.links
    tc = N.new("ShaderNodeTexCoord")
    vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 3.2
    vor.inputs["Randomness"].default_value = 0.9
    L.new(tc.outputs["Object"], vor.inputs["Vector"])
    mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.12; mr.inputs["From Max"].default_value = 0.15
    mr.inputs["To Min"].default_value = 1.0; mr.inputs["To Max"].default_value = 0.0
    L.new(vor.outputs["Distance"], mr.inputs["Value"])
    # strand gradient: slightly darker roots read as depth in the pile
    hi = N.new("ShaderNodeHairInfo")
    root = N.new("ShaderNodeMapRange"); root.inputs["To Min"].default_value = 0.55; root.inputs["To Max"].default_value = 1.0
    L.new(hi.outputs["Intercept"], root.inputs["Value"])
    white = N.new("ShaderNodeMix"); white.data_type = "RGBA"; white.blend_type = "MULTIPLY"
    white.inputs["Factor"].default_value = 1.0
    white.inputs[6].default_value = (0.92, 0.89, 0.84, 1)
    L.new(root.outputs[0], white.inputs[7])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"
    L.new(white.outputs[2], mix.inputs[6])
    mix.inputs[7].default_value = (0.012, 0.01, 0.01, 1)
    L.new(mr.outputs[0], mix.inputs["Factor"])
    L.new(mix.outputs[2], b.inputs["Base Color"])
    set_in(b, "Roughness", 0.45)
    set_in(b, "Sheen Weight", 0.6)
    set_in(b, "Sheen Tint", (1, 1, 1, 1))
    set_in(b, "Subsurface Weight", 0.25)
    set_in(b, "Subsurface Radius", (0.05, 0.05, 0.05))
    set_in(b, "Subsurface Scale", 0.05)
    return m


def mat_eye_white():
    m, nt, b = mat_new("EyeWhite")
    N, L = nt.nodes, nt.links
    lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.12
    mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.55; mr.inputs["From Max"].default_value = 0.8
    L.new(lw.outputs["Facing"], mr.inputs["Value"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = (0.92, 0.9, 0.86, 1)
    mix.inputs[7].default_value = (*srgb((.23, .1, .07)), 1)
    L.new(mr.outputs[0], mix.inputs["Factor"])
    L.new(mix.outputs[2], b.inputs["Base Color"])
    set_in(b, "Roughness", 0.25)
    set_in(b, "Coat Weight", 1.0)
    set_in(b, "Coat Roughness", 0.02)
    set_in(b, "Subsurface Weight", 0.2)
    return m


def mat_marble(name, base, vein, rough=0.12):
    m, nt, b = mat_new(name)
    N, L = nt.nodes, nt.links
    tc = N.new("ShaderNodeTexCoord")
    noise = N.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 0.35
    noise.inputs["Detail"].default_value = 12.0; noise.inputs["Distortion"].default_value = 3.5
    L.new(tc.outputs["Object"], noise.inputs["Vector"])
    wave = N.new("ShaderNodeTexWave"); wave.inputs["Scale"].default_value = 0.25
    wave.inputs["Distortion"].default_value = 14.0; wave.inputs["Detail"].default_value = 8.0
    L.new(tc.outputs["Object"], wave.inputs["Vector"])
    mixf = N.new("ShaderNodeMath"); mixf.operation = "MULTIPLY"
    L.new(noise.outputs["Fac"], mixf.inputs[0]); L.new(wave.outputs["Fac"], mixf.inputs[1])
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (*srgb(base), 1)
    ramp.color_ramp.elements[1].position = 0.55
    ramp.color_ramp.elements[1].color = (*srgb(base), 1)
    e = ramp.color_ramp.elements.new(0.62); e.color = (*srgb(vein), 1)
    L.new(mixf.outputs[0], ramp.inputs[0])
    L.new(ramp.outputs["Color"], b.inputs["Base Color"])
    set_in(b, "Roughness", rough)
    set_in(b, "Coat Weight", 0.6)
    set_in(b, "Coat Roughness", 0.03)
    return m


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


# ----------------------------------------------------------------- face

def head_point(az, el, off=0.0):
    """Point on the head ellipsoid (r=1, y scale .96, center y=2.95) in Blender coords.
    az: radians right of face center, el: radians up."""
    x = math.sin(az) * math.cos(el)
    y = math.sin(el)
    z = math.cos(az) * math.cos(el)
    n = Vector((x, y / 0.96, z)).normalized()
    p = Vector((x, y * 0.96, z))
    p = p + n * off
    return eng(p.x, p.y + 2.95, p.z), Vector((n.x, -n.z, n.y))


def orient_to(obj, normal, up=Vector((0, 0, 1))):
    z = normal.normalized()
    x = up.cross(z).normalized()
    y = z.cross(x)
    obj.rotation_euler = Matrix((x, y, z)).transposed().to_euler()


def curve_on_head(name, pts_azel, radius, off, mat):
    pts = [head_point(a, e, off)[0] for (a, e) in pts_azel]
    pts = [Vector(p) for p in pts]
    # densify for a smooth tube
    dense = []
    for i in range(len(pts) - 1):
        for k in range(8):
            dense.append(pts[i].lerp(pts[i + 1], k / 8))
    dense.append(pts[-1])
    o = tube(name, dense, radius, rseg=16)
    assign(o, mat)
    subsurf(o, 1)
    return o


EXPRESSIONS = {
    # brow (inner, outer) elevation offsets and tilt, pupil look, mouth shape
    "senang": dict(brow_in=0.0, brow_out=0.02, eye_h=0.25, pupil=(0.0, -0.01), mouth="smile"),
    "licik": dict(brow_in=-0.05, brow_out=0.05, eye_h=0.18, pupil=(0.03, 0.0), mouth="smirk"),
    "datar": dict(brow_in=0.0, brow_out=0.0, eye_h=0.23, pupil=(0.0, 0.0), mouth="flat"),
}


def build_face(expr, M):
    e = EXPRESSIONS.get(expr, EXPRESSIONS["senang"])
    parts = []
    ex = 0.34          # eye azimuth from center (rad)
    ey = 0.05          # eye elevation
    for s in (-1, 1):
        # eye white: flattened ellipsoid sitting on the head surface
        p, n = head_point(s * ex, ey, -0.01)
        eye = uv_sphere(f"EyeWhite_{'L' if s < 0 else 'R'}", 1.0, 48, 24)
        eye.location = p
        eye.scale = (0.165, 0.165 * e["eye_h"] / 0.2, 0.075)
        orient_to(eye, n)
        assign(eye, M["eyewhite"])
        parts.append(eye)
        # pupil: dark glossy lens slightly in front of the white
        pa, pe = s * ex + e["pupil"][0] + (-0.03 * s), ey - 0.02 + e["pupil"][1]
        pp, pn = head_point(pa, pe, 0.055)
        pup = uv_sphere(f"Pupil_{'L' if s < 0 else 'R'}", 1.0, 32, 16)
        pup.location = pp
        pup.scale = (0.072, 0.085, 0.03)
        orient_to(pup, pn)
        assign(pup, M["pupil"])
        parts.append(pup)
        # brow
        bi, bo = e["brow_in"], e["brow_out"]
        brow = [(s * (ex - 0.17), ey + 0.30 + bi), (s * ex, ey + 0.34 + (bi + bo) / 2 + 0.015), (s * (ex + 0.17), ey + 0.31 + bo)]
        parts.append(curve_on_head(f"Brow_{'L' if s < 0 else 'R'}", brow,
                                   lambda t: 0.018 + 0.016 * math.sin(math.pi * t), 0.012, M["brown"]))
    # mouth
    if e["mouth"] == "smile":
        mouth = [(-0.17, -0.27), (-0.08, -0.33), (0.0, -0.345), (0.08, -0.33), (0.17, -0.27)]
    elif e["mouth"] == "smirk":
        mouth = [(-0.14, -0.31), (-0.04, -0.33), (0.06, -0.32), (0.16, -0.26)]
    else:
        mouth = [(-0.12, -0.31), (0.0, -0.315), (0.12, -0.31)]
    parts.append(curve_on_head("Mouth", mouth, lambda t: 0.012 + 0.012 * math.sin(math.pi * t), 0.008, M["brown"]))
    return parts


# ----------------------------------------------------------------- fur

def add_fur(obj, mat, count, length, children=40, radius_root=0.006):
    obj.data.materials.append(mat)
    slot = len(obj.data.materials)
    mod = obj.modifiers.new("Fur", "PARTICLE_SYSTEM")
    ps = mod.particle_system
    st = ps.settings
    st.type = "HAIR"
    st.count = count
    st.use_advanced_hair = True
    st.emit_from = "FACE"
    st.use_emit_random = True
    st.distribution = "RAND"
    st.material = slot
    st.hair_step = 5
    st.display_step = 3
    st.render_step = 4
    st.root_radius = 1.0
    st.tip_radius = 0.0
    st.radius_scale = radius_root
    st.child_type = "INTERPOLATED"
    st.child_percent = children
    st.rendered_child_count = children
    st.child_length = 0.9
    st.child_length_threshold = 0.3
    st.clump_factor = 0.15
    st.roughness_1 = 0.012
    st.roughness_1_size = 1.0
    st.roughness_endpoint = 0.008
    st.roughness_2 = 0.01
    st.roughness_2_size = 0.5
    st.hair_length = length     # setter rescales normal_factor (default 1.0 means 4 units long)
    st.factor_random = 0.004    # random velocity adds length in random directions: keep tiny
    st.length_random = 0.35
    st.use_hair_bspline = True
    st.kink = "NO"
    return ps


# ----------------------------------------------------------------- build

def build(expr):
    sc = bpy.context.scene
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)

    M = {
        "skin": mat_skin(),
        "ring": mat_simple("RingDark", (.14, .05, .05), rough=0.3, coat=0.5),
        "gold": mat_gold(),
        "velvet": mat_velvet(),
        "fur": mat_ermine_fur(),
        "furbase": mat_simple("FurBase", (.95, .92, .86), rough=0.9),
        "eyewhite": mat_eye_white(),
        "pupil": mat_simple("Pupil", (.10, .045, .03), rough=0.08, coat=1.0),
        "brown": mat_simple("FaceBrown", (.23, .1, .07), rough=0.45),
        "ruby": mat_simple("Ruby", (.75, .02, .06), rough=0.05, coat=1.0),
    }

    pion = []
    # body (lathe of the engine's spline profile, capped on top under the collar)
    body_sp = catmull([[0, 0], [1.3, 0], [1.3, .12], [1.15, .2], [1.15, .32], [.9, .5], [.62, 1.05], [.46, 1.6], [.42, 1.95]], 80)
    body_sp = [(max(r, 0.0), y) for r, y in body_sp] + [(0.0, 1.97)]
    body = lathe("Body", body_sp, 96)
    assign(body, M["skin"])
    subsurf(body, 1, 2)
    pion.append(body)
    for (r, y) in [[1.3, .12], [1.15, .2], [1.15, .32], [.9, .5]]:
        rg = torus(f"Ring_{y}", r + 0.005, 0.035, 128, 12, loc=eng(0, y, 0))
        assign(rg, M["ring"])
        pion.append(rg)

    # neck collar (body colored) and head
    col = torus("Collar", 0.58, 0.2, 96, 24, loc=eng(0, 2.05, 0), scale=(1, 0.8, 1))
    assign(col, M["skin"])
    pion.append(col)
    head = uv_sphere("Head", 1.0, 96, 48, loc=eng(0, 2.95, 0), scale=(1, 1, 0.96))
    assign(head, M["skin"])
    pion.append(head)
    pion += build_face(expr, M)

    # crown: flared band, rim rings, 5 spikes with balls, small rubies; tilted like render.js
    crown_root = bpy.data.objects.new("CrownRoot", None)
    link(crown_root)
    crown_root.location = eng(0, 3.55, 0)
    crown_root.rotation_euler = (0, 0.1, 0)    # engine RZ(-0.1) -> tilt toward +x
    crown_root.scale = (1.1, 1.1, 1.18)        # a bit bigger than the toon engine: the crown is the read
    band = lathe("CrownBand", [(0.76, -0.19), (0.81, 0.0), (0.86, 0.19)], 96)
    sol = band.modifiers.new("Solid", "SOLIDIFY"); sol.thickness = 0.05; sol.offset = 1.0
    bev = band.modifiers.new("Bevel", "BEVEL"); bev.width = 0.012; bev.segments = 3
    subsurf(band, 1, 2)
    assign(band, M["gold"])
    band.parent = crown_root
    parts = [band]
    for yy, rr in ((0.19, 0.87), (-0.19, 0.775)):
        t = torus(f"CrownRim_{yy}", rr + 0.02, 0.045, 96, 16, loc=(0, 0, yy))
        assign(t, M["gold"]); t.parent = crown_root; parts.append(t)
    for k in range(5):
        a = k / 5 * 2 * math.pi
        h = 0.8 if k % 2 == 0 else 0.55
        piv = bpy.data.objects.new(f"SpikePivot_{k}", None); link(piv)
        piv.parent = crown_root
        # engine: RY(a) . T(0,.17,.8) . RX(.12); face (+z eng) is a=0 -> -y blender
        piv.matrix_parent_inverse = Matrix.Identity(4)
        piv.rotation_euler = (0, 0, a)
        sp = cone(f"Spike_{k}", 0.14, h, 32)
        sp.parent = piv
        sp.location = (0, -0.8, 0.17)
        sp.rotation_euler = (-0.12, 0, 0)
        bev = sp.modifiers.new("Bevel", "BEVEL"); bev.width = 0.01; bev.segments = 2
        assign(sp, M["gold"])
        ball = uv_sphere(f"SpikeBall_{k}", 0.135, 32, 16)
        ball.parent = sp
        ball.location = (0, 0, h)
        assign(ball, M["gold"])
        # ruby set into the band below each spike
        gem = uv_sphere(f"Ruby_{k}", 0.075, 24, 12)
        gem.parent = piv
        gem.location = (0, -0.835, 0.0)
        gem.scale = (1, 0.55, 1.15)
        assign(gem, M["ruby"])
        parts += [sp, ball, gem]

    # cape (velvet shell around the back) + ermine trims
    PHI0, PHIL = math.pi - 1.8, 3.6
    cape_prof = catmull([[1.5, 0], [1.38, .3], [1.08, .55], [.82, 1.05], [.68, 1.6], [.7, 2.0], [.86, 2.15]], 40)
    cape = lathe("Cape", cape_prof, 72, PHI0, PHIL)
    sol = cape.modifiers.new("Solid", "SOLIDIFY"); sol.thickness = 0.05; sol.offset = 1.0
    subsurf(cape, 1, 2)
    assign(cape, M["velvet"])
    pion.append(cape)
    trims = []
    for side, ph in (("L", PHI0), ("R", PHI0 + PHIL)):
        pts = [eng(r * math.sin(ph), y, r * math.cos(ph)) for (r, y) in cape_prof]
        trims.append(tube(f"Trim_{side}", pts, 0.13, 20))
    hem = [eng(1.5 * math.sin(PHI0 + i / 60 * PHIL), 0.03, 1.5 * math.cos(PHI0 + i / 60 * PHIL)) for i in range(61)]
    trims.append(tube("Trim_Hem", hem, 0.14, 20))
    erm = torus("ErmineCollar", 0.76, 0.16, 96, 20, loc=eng(0, 2.12, 0))
    trims.append(erm)
    for t in trims:
        assign(t, M["furbase"])
        subsurf(t, 1)
        area = sum(p.area for p in t.data.polygons)
        add_fur(t, M["fur"], count=int(area * 3500), length=0.115, children=40, radius_root=0.0045)
        pion.append(t)

    rig = bpy.data.objects.new("PionRoot", None)
    link(rig)
    for o in pion + [crown_root]:
        if o.parent is None:
            o.parent = rig
    return rig, M


def build_set(M):
    """Chessboard floor, a few giant out-of-focus pieces, curved backdrop."""
    tile = 3.4
    light = mat_marble("MarbleLight", (.93, .89, .82), (.55, .5, .46), 0.1)
    dark = mat_marble("MarbleDark", (.06, .045, .04), (.35, .28, .22), 0.08)
    for i in range(-4, 4):
        for j in range(-2, 8):
            bpy.ops.mesh.primitive_cube_add(size=1, location=((i + 0.5) * tile, (j - 0.5) * tile + 0.0, -0.08))
            t = bpy.context.active_object
            t.name = f"Tile_{i}_{j}"
            t.scale = (tile - 0.03, tile - 0.03, 0.16)
            b = t.modifiers.new("Bevel", "BEVEL"); b.width = 0.03; b.segments = 3
            b.affect = "EDGES"
            assign(t, light if (i + j) % 2 == 0 else dark)
    # background pieces (simple lathes): a pawn and a rook in the opposite colors, far behind
    pawn_prof = catmull([[0, 0], [1.3, 0], [1.3, .12], [1.15, .32], [.9, .5], [.6, 1.1], [.45, 1.9], [.75, 2.05], [.45, 2.2], [.9, 2.9], [.7, 3.6], [0, 3.85]], 60)
    rook_prof = [(0, 0), (1.5, 0), (1.5, .25), (1.25, .45), (1.0, .9), (0.9, 2.6), (1.15, 2.8), (1.2, 3.6), (0.95, 3.6), (0.95, 3.35), (0, 3.35)]
    ivory = mat_simple("Ivory", (.9, .84, .74), rough=0.25, coat=0.6, sss=0.1)
    ebony = mat_simple("Ebony", (.05, .035, .03), rough=0.2, coat=0.7)
    # placed along the camera's line of sight so they sit behind Pion, out of focus
    specs = [(rook_prof, ebony, (0.2, 10.5), 1.4), (pawn_prof, ivory, (7.7, 12.2), 1.25),
             (pawn_prof, ebony, (6.0, 21.2), 1.25), (rook_prof, ivory, (-3.5, 19.0), 1.5)]
    for k, (prof, m, (x, y), s) in enumerate(specs):
        o = lathe(f"BgPiece_{k}", prof, 64, cap_top=True, cap_bottom=True)
        o.location = (x, y, 0)
        o.scale = (s, s, s)
        subsurf(o, 1)
        assign(o, m)
    # backdrop: big curved warm wall
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=60, depth=60, location=(0, 10, 25), end_fill_type="NOTHING")
    wall = bpy.context.active_object
    wall.name = "Backdrop"
    wm, nt, b = mat_new("Backdrop")
    N, L = nt.nodes, nt.links
    tc = N.new("ShaderNodeTexCoord")
    grad = N.new("ShaderNodeTexGradient"); grad.gradient_type = "SPHERICAL"
    mp = N.new("ShaderNodeMapping"); mp.inputs["Location"].default_value = (0, 0.15, 0.35)
    mp.inputs["Scale"].default_value = (1.4, 1.4, 1.4)
    L.new(tc.outputs["Generated"], mp.inputs["Vector"]); L.new(mp.outputs[0], grad.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.01, 0.012, 0.022, 1)
    ramp.color_ramp.elements[1].color = (0.16, 0.085, 0.04, 1)
    L.new(grad.outputs["Fac"], ramp.inputs[0])
    L.new(ramp.outputs["Color"], b.inputs["Base Color"])
    set_in(b, "Roughness", 0.9)
    assign(wall, wm)
    for p in wall.data.polygons:
        p.use_smooth = True
    # warm candle practicals far behind: they turn into bokeh balls with the shallow focus
    cm, cnt, cb = mat_new("Candle")
    set_in(cb, "Emission Color", (1.0, 0.55, 0.22, 1))
    set_in(cb, "Emission Strength", 40.0)
    set_in(cb, "Base Color", (0, 0, 0, 1))
    import random
    rnd = random.Random(7)
    for k in range(18):
        s_ = rnd.uniform(24, 42)
        off = rnd.uniform(-9, 9)
        x = 0.318 * s_ + 0.948 * off
        y = 0.948 * s_ - 0.318 * off
        z = rnd.uniform(3.0, 11.0)
        c = uv_sphere(f"Candle_{k}", rnd.uniform(0.12, 0.22), 16, 8, loc=(x, y, z))
        assign(c, cm)


def build_lights_camera(res):
    sc = bpy.context.scene
    head = Vector((0, 0, 2.95))

    def area(name, loc, energy, size, color, target=head, shape="DISK", size_y=None, spread=None):
        d = bpy.data.lights.new(name, "AREA")
        d.energy = energy
        d.shape = shape
        d.size = size
        if size_y:
            d.size_y = size_y
        d.color = color
        if spread:
            d.spread = spread
        o = bpy.data.objects.new(name, d)
        link(o)
        o.location = loc
        dirv = (target - Vector(loc)).normalized()
        o.rotation_euler = dirv.to_track_quat("-Z", "Y").to_euler()
        return o

    # key: big warm softbox 40 deg camera-left, 35 deg up (camera sits at -y)
    def sph(az, el, dist):
        az, el = math.radians(az), math.radians(el)
        return head + Vector((-math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * dist
    key = area("Key", sph(42, 36, 11), 2100, 6.0, (1.0, 0.86, 0.72))
    fill = area("Fill", sph(-55, 8, 13), 320, 7.0, (0.62, 0.74, 1.0))
    rim = area("RimKey", sph(140, 30, 9), 2200, 2.2, (1.0, 0.82, 0.62), shape="RECTANGLE", size_y=6.0)
    rim2 = area("RimCool", sph(-150, 25, 9), 1300, 2.0, (0.55, 0.7, 1.0), shape="RECTANGLE", size_y=6.0)
    top = area("CrownTop", head + Vector((0.5, -1.5, 6.0)), 260, 2.0, (1.0, 0.9, 0.75), target=Vector((0, 0, 3.7)))
    bounce = area("FloorBounce", Vector((0, -3.5, 0.15)), 120, 4.0, (1.0, 0.6, 0.45), target=Vector((0, 0, 1.6)))
    # eye catchlight: tiny, near camera, specular only
    eye = area("EyeLight", Vector((-0.8, -10.0, 3.6)), 18, 0.35, (1, 1, 1))
    eye.visible_diffuse = False
    eye.visible_volume_scatter = False
    eye.visible_glossy = True

    world = bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.012, 0.016, 0.03, 1)
    bg.inputs["Strength"].default_value = 1.0

    cam_d = bpy.data.cameras.new("Cam")
    cam_d.lens = 70
    cam_d.sensor_width = 36
    cam_d.dof.use_dof = True
    cam_d.dof.aperture_fstop = 0.45   # scene is ~4.6 m tall: a low f-number gives toy-photo depth
    cam = bpy.data.objects.new("Cam", cam_d)
    link(cam)
    cam.location = (-5.2, -15.5, 2.3)
    target = Vector((0.0, 0.0, 2.45))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam_d.dof.focus_distance = (Vector((0, -0.9, 3.0)) - cam.location).length
    sc.camera = cam

    w, h = res
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100


def render_settings(samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 6
    cy.diffuse_bounces = 3
    cy.glossy_bounces = 3
    cy.transmission_bounces = 4
    cy.volume_bounces = 0
    cy.transparent_max_bounces = 8
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.sample_clamp_indirect = 8.0
    sc.render.hair_type = "STRIP" if False else sc.render.hair_type
    sc.view_settings.view_transform = "Khronos PBR Neutral"  # keeps the brand orange/red saturated
    sc.view_settings.exposure = 0.0
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"


def comp(sc):
    """Light finish: bloom (Glare), vignette via lens distortion-free ellipse mask."""
    for _cand in (os.environ.get("BX_LIGHT_SCRIPTS", ""),   # optional bloom/vignette helper (scenario-blender-lighting-rendering skill)
                  os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "scenario-blender-lighting-rendering", "scripts"),
                  os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".claude", "skills", "scenario-blender-lighting-rendering", "scripts")):
        if _cand and os.path.isdir(_cand):
            sys.path.append(_cand)
    try:
        import bx_light as BL
        BL.comp_finish(scene=sc, bloom=0.18, threshold=1.2, bloom_size=0.55, vignette=0.28, contrast=0.04, color_boost=0.03)
        return "bx_light.comp_finish"
    except Exception as ex:  # keep the render even if the helper changes
        return f"comp skipped: {ex}"


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="pion.blend")
    ap.add_argument("--render", default=None)
    ap.add_argument("--samples", type=int, default=256)
    ap.add_argument("--res", default="1080x1920")
    ap.add_argument("--expr", default="senang")
    ap.add_argument("--nofur", action="store_true")
    ap.add_argument("--nocomp", action="store_true")
    a = ap.parse_args(argv)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig, M = build(a.expr)
    if a.nofur:
        for o in bpy.data.objects:
            for m in list(o.modifiers):
                if m.type == "PARTICLE_SYSTEM":
                    o.modifiers.remove(m)
    build_set(M)
    w, h = (int(v) for v in a.res.split("x"))
    build_lights_camera((w, h))
    render_settings(a.samples)
    note = "comp off" if a.nocomp else comp(bpy.context.scene)
    bpy.ops.wm.save_as_mainfile(filepath=a.out)
    print("RESULT built", a.out, note)
    if a.render:
        import time
        t0 = time.time()
        bpy.context.scene.render.filepath = a.render
        bpy.ops.render.render(write_still=True)
        print("RESULT rendered", a.render, f"{time.time() - t0:.1f}s")
