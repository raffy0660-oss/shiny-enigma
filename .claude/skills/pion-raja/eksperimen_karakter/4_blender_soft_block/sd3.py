"""Anak SD, faceted soft-block 3D after the user's reference sheet (top-right kid).
Run: /opt/bpyenv/bin/python sd3.py -- --view main|face|turn --rot 0 --res 1080x1600 --samples 128 --out out.png
Blender: Z up, character faces -Y, metres (~1.0 tall incl. hair)."""
import bpy, bmesh, math, sys, argparse
from mathutils import Vector, Quaternion, Euler, Matrix
import random

ap = argparse.ArgumentParser()
ap.add_argument('--view', default='main'); ap.add_argument('--rot', type=float, default=0); ap.add_argument('--out', default='sd.png')
ap.add_argument('--res', default='1080x1600'); ap.add_argument('--samples', type=int, default=128); ap.add_argument('--blend', default='')
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene; COLL = S.collection

# ---------------- materials: painted matte + soft grime + contact AO ----------------
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + .055) / 1.055) ** 2.4 if x > .04045 else x / 12.92 for x in c) + (1,)
MATS = {}
def mat(name, hexc, rough=.75, sss=0., grime=.10, dirt=0., metal=0., emit=0., bump=.03, ao=.35, coat=0.):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    bs = N['Principled BSDF']; bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    if sss: bs.inputs['Subsurface Weight'].default_value = sss; bs.inputs['Subsurface Radius'].default_value = (.05, .02, .012); bs.inputs['Subsurface Scale'].default_value = .5
    if coat: bs.inputs['Coat Weight'].default_value = coat
    if emit: bs.inputs['Emission Color'].default_value = lin(hexc); bs.inputs['Emission Strength'].default_value = emit
    tc = N.new('ShaderNodeTexCoord')
    def noise(scale, detail, rough_=.6, lo=.4, hi=.62):
        n = N.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough_
        L.new(tc.outputs['Object'], n.inputs['Vector'])
        r = N.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].position = lo; r.color_ramp.elements[1].position = hi; L.new(n.outputs['Fac'], r.inputs['Fac'])
        return n, r
    n1, r1 = noise(55, 8); n2, r2 = noise(7, 3, .5, .3, .75); n3, r3 = noise(14, 6, .7, .55, .75)
    def lerp1(r, amt):  # 1 - amt*(1-r)
        m_ = N.new('ShaderNodeMath'); m_.operation = 'MULTIPLY_ADD'; m_.inputs[1].default_value = amt; m_.inputs[2].default_value = 1 - amt; L.new(r.outputs['Color'], m_.inputs[0]); return m_
    a1, a2 = lerp1(r1, grime), lerp1(r2, grime * .8)
    aon = N.new('ShaderNodeAmbientOcclusion'); aon.samples = 8; aon.inputs['Distance'].default_value = .035
    ao_m = N.new('ShaderNodeMath'); ao_m.operation = 'MULTIPLY_ADD'; ao_m.inputs[1].default_value = ao; ao_m.inputs[2].default_value = 1 - ao; L.new(aon.outputs['AO'], ao_m.inputs[0])
    f = N.new('ShaderNodeMath'); f.operation = 'MULTIPLY'; L.new(a1.outputs[0], f.inputs[0]); L.new(a2.outputs[0], f.inputs[1])
    f2 = N.new('ShaderNodeMath'); f2.operation = 'MULTIPLY'; L.new(f.outputs[0], f2.inputs[0]); L.new(ao_m.outputs[0], f2.inputs[1])
    base = N.new('ShaderNodeRGB'); base.outputs[0].default_value = lin(hexc)
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1
    L.new(base.outputs[0], mul.inputs[6]); L.new(f2.outputs[0], mul.inputs[7])
    out = mul
    if dirt:  # brownish smudges (worn school clothes)
        dm = N.new('ShaderNodeMix'); dm.data_type = 'RGBA'; dm.blend_type = 'MULTIPLY'; dm.inputs[7].default_value = (.62, .52, .40, 1)
        fm = N.new('ShaderNodeMath'); fm.operation = 'MULTIPLY'; fm.inputs[1].default_value = dirt; L.new(r3.outputs['Color'], fm.inputs[0])
        L.new(fm.outputs[0], dm.inputs[0]); L.new(mul.outputs[2], dm.inputs[6]); out = dm
    L.new(out.outputs[2], bs.inputs['Base Color'])
    if bump:
        bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = .002
        L.new(n1.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], bs.inputs['Normal'])
    MATS[name] = m; return m

def blush_mat(name, hexc, strength=.55):
    m = bpy.data.materials.new(name); m.use_nodes = True; N = m.node_tree.nodes; L = m.node_tree.links; bs = N['Principled BSDF']
    bs.inputs['Base Color'].default_value = lin(hexc); bs.inputs['Roughness'].default_value = .6
    tc = N.new('ShaderNodeTexCoord'); g = N.new('ShaderNodeTexGradient'); g.gradient_type = 'SPHERICAL'
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / .5, 1 / .5, 1 / .5)
    L.new(tc.outputs['Generated'], mp.inputs['Vector']); mp.inputs['Location'].default_value = (-1, -1, -1)
    L.new(mp.outputs['Vector'], g.inputs['Vector'])
    r = N.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].position = 0.0; r.color_ramp.elements[1].position = 1.0
    r.color_ramp.elements[0].color = (0, 0, 0, 1); r.color_ramp.elements[1].color = (strength, strength, strength, 1)
    L.new(g.outputs['Fac'], r.inputs['Fac']); L.new(r.outputs['Color'], bs.inputs['Alpha'])
    return m

M = dict(
    skin=mat('skin', '#dc8f55', .62, sss=.18, grime=.07, ao=.4), skinD=mat('skinD', '#c87b46', .62, sss=.18, grime=.07),
    nose=mat('nose', '#ee9b76', .55, sss=.2, grime=.05), ear=mat('ear', '#c97748', .65, sss=.2, grime=.06),
    hair=mat('hair', '#2b2120', .7, grime=.16, bump=.06, ao=.45), brow=mat('brow', '#241b1a', .7, grime=.08, bump=0),
    eyew=mat('eyew', '#f7f5f0', .18, grime=0, bump=0, ao=.25, coat=.4), pupil=mat('pupil', '#121012', .1, grime=0, bump=0, ao=0, coat=.6),
    lid=mat('lid', '#d98d58', .62, sss=.18, grime=.06), mouth=mat('mouth', '#3e1c1a', .6, grime=0, bump=0),
    shirt=mat('shirt', '#e4dccd', .85, grime=.12, dirt=.5, bump=.05, ao=.45), tie=mat('tie', '#a12b2c', .72, grime=.12),
    shorts=mat('shorts', '#7c2a27', .88, grime=.16, dirt=.25, bump=.06, ao=.45), belt=mat('belt', '#1f1b1c', .55, grime=.08),
    metal=mat('metal', '#bfc3c9', .3, metal=.85, grime=.03, bump=0), sock=mat('sock', '#ece9e2', .92, grime=.10, dirt=.3, bump=.12),
    shoe=mat('shoe', '#2a2628', .6, grime=.14, dirt=.15), sole=mat('sole', '#d8cfc2', .75, grime=.12, dirt=.35),
    bag=mat('bag', '#2b292b', .82, grime=.18, dirt=.2, bump=.08, ao=.5), bagD=mat('bagD', '#1d1c1e', .82, grime=.14, bump=.08),
    badge=mat('badge', '#a32a24', .6, grime=.06), badgeY=mat('badgeY', '#e0b440', .45, grime=.04),
)
BLUSH = blush_mat('blush', '#e2645a', .6)

# ---------------- geometry helpers ----------------
def obj(name, me, m, parent=None):
    o = bpy.data.objects.new(name, me); COLL.objects.link(o); me.materials.append(m)
    if parent: o.parent = parent
    for p in me.polygons: p.use_smooth = True
    return o

def soft(o, w=.005, seg=2, angle=None):
    b = o.modifiers.new('bev', 'BEVEL'); b.width = w; b.segments = seg; b.harden_normals = True
    if angle is None: b.limit_method = 'NONE'
    else: b.limit_method = 'ANGLE'; b.angle_limit = math.radians(angle)
    return o

def piece(name, size, loc, m, parent=None, rot=(0, 0, 0), dirv=None, roll=0., taper=(1, 1), base=False, bev=None, chamfer=0.):
    """box w x d x h; base=True -> from z=0 to z=h (pivot at the base); dirv points the +Z axis; taper scales the top (x, y).
    chamfer>0 cuts the 4 vertical edges (octagon section) before the soft bevel."""
    w, d, h = size
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        z = v.co.z + (.5 if base else 0)
        t = (taper[0], taper[1]) if v.co.z > 0 else (1, 1)
        v.co = Vector((v.co.x * w * t[0], v.co.y * d * t[1], z * h))
    if chamfer:
        bm.edges.ensure_lookup_table()
        vert_edges = [e for e in bm.edges if abs((e.verts[0].co - e.verts[1].co).normalized().z) > .9]
        bmesh.ops.bevel(bm, geom=vert_edges, offset=chamfer, segments=1, profile=.5, affect='EDGES')
    bm.to_mesh(me); bm.free()
    o = obj(name, me, m, parent); o.location = loc
    if dirv is not None:
        z = Vector(dirv).normalized(); x = Vector((0, 0, 1)).cross(z)
        if x.length < 1e-6: x = Vector((1, 0, 0))
        x.normalize(); y = z.cross(x)
        q = Matrix((x, y, z)).transposed().to_quaternion() @ Quaternion((0, 0, 1), roll); o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = q
    else: o.rotation_euler = rot
    soft(o, bev if bev is not None else min(w, d, h) * .1)
    return o

def limb(name, p0, p1, w, d, m, parent=None, ext=0., roll=0.):
    p0, p1 = Vector(p0), Vector(p1); v = p1 - p0
    return piece(name, (w, d, v.length + ext), p0 - v.normalized() * ext / 2, m, parent, dirv=v, roll=roll, base=True)

def ellip(name, r, loc, m, parent=None, rot=(0, 0, 0), seg=40):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * r[0], v.co.y * r[1], v.co.z * r[2]))
    bm.to_mesh(me); bm.free(); o = obj(name, me, m, parent); o.location = loc; o.rotation_euler = rot; return o

def cord(name, pts, r, m, parent=None):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 4; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts): bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, cu); COLL.objects.link(o); cu.materials.append(m)
    if parent: o.parent = parent
    return o

def empty(name, loc=(0, 0, 0), parent=None, rot=(0, 0, 0)):
    o = bpy.data.objects.new(name, None); COLL.objects.link(o); o.location = loc; o.rotation_euler = rot
    if parent: o.parent = parent
    return o

# ---------------- the faceted head ----------------
HW, HD, HH, RIDGE = .300, .265, .262, .016
def head_mesh():
    me = bpy.data.meshes.new('head'); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * HW, v.co.y * HD, (v.co.z + .5) * HH))
    bm.edges.ensure_lookup_table()
    vert = [e for e in bm.edges if abs((e.verts[0].co - e.verts[1].co).normalized().z) > .9]
    bmesh.ops.bevel(bm, geom=vert, offset=.042, segments=1, profile=.5, affect='EDGES')                 # octagon section
    bm.edges.ensure_lookup_table()
    bottom = [e for e in bm.edges if e.verts[0].co.z < 1e-4 and e.verts[1].co.z < 1e-4]
    bmesh.ops.bevel(bm, geom=bottom, offset=.058, segments=1, profile=.5, affect='EDGES')               # jaw chamfer
    bm.edges.ensure_lookup_table()
    top = [e for e in bm.edges if e.verts[0].co.z > HH - 1e-4 and e.verts[1].co.z > HH - 1e-4]
    bmesh.ops.bevel(bm, geom=top, offset=.02, segments=1, profile=.5, affect='EDGES')
    # vertical ridge down the middle of the face (the nose sits on it)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(1, 0, 0))
    ymin = min(v.co.y for v in bm.verts)
    for v in bm.verts:
        if abs(v.co.x) < 1e-5 and v.co.y < ymin + .07: v.co.y -= RIDGE * (1 if v.co.y < ymin + 1e-4 else .6)
    bm.to_mesh(me); bm.free(); return me

ROOT = empty('kid')
# ---- shoes, socks, legs
for k in (-1, 1):
    x = k * .052
    piece(f'sole{k}', (.09, .172, .014), (x, -.02, .007), M['sole'], ROOT, bev=.005)
    piece(f'shoe{k}', (.084, .155, .046), (x, -.016, .039), M['shoe'], ROOT, bev=.018)
    piece(f'toe{k}', (.082, .06, .032), (x, -.074, .032), M['shoe'], ROOT, bev=.015)
    piece(f'heel{k}', (.082, .04, .058), (x, .046, .045), M['shoe'], ROOT, bev=.014)
    for i, y in enumerate((-.045, -.03, -.015)):
        piece(f'lace{k}{i}', (.05, .007, .006), (x, y, .074 + i * .003), M['belt'], ROOT, bev=.002, rot=(-.2, 0, 0))
    piece(f'tongue{k}', (.042, .05, .016), (x, -.02, .074), M['shoe'], ROOT, bev=.006, rot=(-.25, 0, 0))
    piece(f'sock{k}', (.058, .062, .1), (x, .002, .118), M['sock'], ROOT, bev=.012)
    piece(f'sockTop{k}', (.061, .065, .018), (x, .002, .163), M['sock'], ROOT, bev=.006)
    piece(f'shin{k}', (.042, .045, .08), (x, .004, .205), M['skin'], ROOT, bev=.01)
# ---- long maroon shorts, belt
piece('hips', (.18, .124, .065), (0, 0, .412), M['shorts'], ROOT, bev=.012)
for k in (-1, 1):
    piece(f'shortleg{k}', (.104, .124, .175), (k * .05, 0, .222), M['shorts'], ROOT, base=True, taper=(.88, .94), bev=.01, rot=(0, k * -.035, 0))
piece('belt', (.184, .127, .02), (0, 0, .447), M['belt'], ROOT, bev=.006)
piece('buckle', (.032, .008, .022), (0, -.065, .447), M['metal'], ROOT, bev=.003)
piece('buckleIn', (.018, .004, .01), (0, -.0695, .447), M['belt'], ROOT, bev=.001)
# ---- white school shirt
piece('shirt', (.17, .114, .205), (0, 0, .456), M['shirt'], ROOT, base=True, taper=(1.02, 1.0), bev=.012)
piece('tuck', (.176, .118, .03), (0, 0, .465), M['shirt'], ROOT, bev=.01)
piece('collarBand', (.065, .055, .022), (0, -.004, .662), M['shirt'], ROOT, bev=.006)
for k in (-1, 1):
    piece(f'collar{k}', (.052, .011, .05), (k * .021, -.058, .672), M['shirt'], ROOT, dirv=(-k * .55, -.22, -1), roll=k * .15, taper=(.15, .9), base=True, bev=.003)
piece('pocket', (.048, .007, .052), (.044, -.058, .575), M['shirt'], ROOT, bev=.003)
piece('pocketFlap', (.05, .009, .012), (.044, -.06, .601), M['shirt'], ROOT, bev=.003)
piece('badge', (.028, .005, .034), (.044, -.064, .598), M['badge'], ROOT, dirv=(0, 0, -1), taper=(.45, 1), base=True, bev=.003)
piece('badgeY', (.013, .004, .014), (.044, -.067, .584), M['badgeY'], ROOT, bev=.002)
piece('knot', (.021, .014, .02), (0, -.061, .65), M['tie'], ROOT, bev=.005)
piece('tie', (.025, .007, .125), (.001, -.062, .515), M['tie'], ROOT, base=True, taper=(.85, 1), bev=.003, rot=(0, .03, 0))
piece('tieTip', (.028, .007, .026), (.004, -.062, .517), M['tie'], ROOT, dirv=(.04, 0, -1), taper=(.08, 1), base=True, bev=.002)
for k in (-1, 1):
    piece(f'sleeve{k}', (.078, .094, .092), (k * .1, 0, .612), M['shirt'], ROOT, bev=.012, rot=(0, k * -.12, 0))
    piece(f'cuff{k}', (.082, .098, .018), (k * .106, 0, .572), M['shirt'], ROOT, bev=.006, rot=(0, k * -.12, 0))
# ---- thin neck
piece('neck', (.038, .038, .07), (0, .004, .65), M['skinD'], ROOT, base=True, bev=.008)
# ---- arms: viewer-left grips the bag strap at the chest, viewer-right hangs
SL, EL, WL = (-.108, .0, .6), (-.138, -.035, .485), (-.08, -.074, .575)
limb('upperL', SL, EL, .047, .049, M['skin'], ROOT, ext=.01)
piece('elbowL', (.044, .046, .03), EL, M['skin'], ROOT, bev=.01)
limb('foreL', EL, WL, .046, .048, M['skin'], ROOT, ext=.01)
hdL = (Vector(WL) - Vector(EL)).normalized()
piece('handL', (.07, .056, .074), Vector(WL) + hdL * .01, M['skin'], ROOT, dirv=hdL, base=True, roll=.3, bev=.012)
piece('thumbL', (.022, .024, .036), Vector(WL) + hdL * .02 + Vector((.02, -.028, 0)), M['skin'], ROOT, dirv=(.3, -.5, 1), base=True, bev=.007)
SR, ER, WR = (.108, .0, .6), (.122, .006, .48), (.126, -.006, .385)
limb('upperR', SR, ER, .047, .049, M['skin'], ROOT, ext=.01)
piece('elbowR', (.044, .046, .03), ER, M['skin'], ROOT, bev=.01)
limb('foreR', ER, WR, .046, .048, M['skin'], ROOT, ext=.01)
piece('handR', (.064, .05, .07), (.127, -.008, .388), M['skin'], ROOT, dirv=(.02, -.04, -1), base=True, bev=.011)
piece('thumbR', (.022, .024, .034), (.11, -.032, .372), M['skin'], ROOT, dirv=(-.2, -.4, -1), base=True, bev=.006)
# ---- big black backpack + straps
piece('bag', (.29, .17, .33), (.065, .16, .53), M['bag'], ROOT, bev=.055, rot=(.05, 0, .24))
piece('bagFront', (.2, .07, .15), (.09, .255, .46), M['bagD'], ROOT, bev=.03, rot=(.05, 0, .24))
piece('bagSide', (.055, .13, .15), (.215, .12, .46), M['bagD'], ROOT, bev=.02, rot=(.05, 0, .24))
piece('bagLump', (.2, .13, .09), (.09, .16, .655), M['bag'], ROOT, bev=.04, rot=(.22, .12, .32))
piece('bagLump2', (.08, .14, .19), (.2, .165, .55), M['bag'], ROOT, bev=.035, rot=(.1, .15, .3))
piece('bagTop', (.22, .13, .035), (.07, .15, .69), M['bagD'], ROOT, bev=.014, rot=(.05, 0, .24))
cord('bagHandle', [(.04, .12, .7), (.08, .11, .745), (.12, .13, .7)], .01, M['bagD'], ROOT)
cord('zip', [(-.01, .28, .53), (.08, .295, .54), (.17, .27, .53)], .0028, M['metal'], ROOT)
for k in (-1, 1):
    piece(f'strapTop{k}', (.04, .13, .017), (k * .06, .0, .664), M['bagD'], ROOT, bev=.006)
piece('strapF', (.04, .013, .19), (-.062, -.063, .565), M['bagD'], ROOT, bev=.005, rot=(.05, 0, -.04))
# ---- head
HEAD = empty('head', (0, 0, .712), ROOT, rot=(0, .11, .16))
head = obj('headB', head_mesh(), M['skin'], HEAD); soft(head, .006, 2)
FY = -HD / 2 - RIDGE          # face ridge (centre front)
def face_y(x):                 # front surface depth at x (two planes meeting at the ridge)
    half = HW / 2 - .042
    return -HD / 2 - RIDGE * max(0, 1 - abs(x) / half)
SLOPE = math.atan(RIDGE / (HW / 2 - .042))
# ears: big, low, flared
for k in (-1, 1):
    e = piece(f'ear{k}', (.064, .072, .1), (k * (HW / 2 + .02), .014, .078), M['skin'], HEAD, bev=.014, rot=(0, k * -.1, k * .3))
    piece(f'earIn{k}', (.016, .04, .058), (k * (HW / 2 + .052), .006, .078), M['ear'], HEAD, bev=.006, rot=(0, k * -.1, k * .3))
# eyes: viewer-left wide open, viewer-right half-lidded (bored / skeptical)
xl, xr = -.062, .068
ellip('eyeL', (.044, .022, .047), (xl, face_y(xl) + .003, .148), M['eyew'], HEAD, rot=(0, 0, SLOPE))
ellip('pupilL', (.016, .008, .017), (xl + .012, face_y(xl) - .016, .141), M['pupil'], HEAD, rot=(0, 0, SLOPE))
ellip('eyeR', (.034, .016, .026), (xr, face_y(xr) + .003, .136), M['eyew'], HEAD, rot=(0, 0, -SLOPE))
ellip('pupilR', (.013, .007, .013), (xr - .012, face_y(xr) - .011, .132), M['pupil'], HEAD, rot=(0, 0, -SLOPE))
ellip('lidR', (.04, .017, .024), (xr, face_y(xr) - .001, .153), M['skin'], HEAD, rot=(0, .12, -SLOPE))
piece('lidLine', (.072, .008, .007), (xr, face_y(xr) - .012, .14), M['brow'], HEAD, bev=.003, rot=(0, .12, -SLOPE))
piece('lidLow', (.05, .006, .004), (xr, face_y(xr) - .006, .113), M['lid'], HEAD, bev=.002, rot=(0, 0, -SLOPE))
# chunky brows
piece('browL', (.078, .022, .026), (xl - .002, face_y(xl) - .007, .207), M['brow'], HEAD, bev=.006, rot=(0, -.03, SLOPE))
piece('browR', (.07, .022, .024), (xr + .004, face_y(xr) - .007, .186), M['brow'], HEAD, bev=.006, rot=(0, .42, -SLOPE))
# triangular nose on the ridge
def nose_mesh():
    me = bpy.data.meshes.new('nose'); y0 = FY + .004
    vs = [(0, y0, .15), (-.034, y0 + .003, .078), (.034, y0 + .003, .078), (0, y0 - .034, .09)]
    me.from_pydata(vs, [], [(0, 1, 3), (0, 3, 2), (1, 2, 3), (0, 2, 1)]); me.update(); return me
soft(obj('nose', nose_mesh(), M['nose'], HEAD), .004, 2)
cord('mouth', [(-.019, FY + .006, .052), (-.001, FY + .003, .058), (.017, FY + .006, .05)], .003, M['mouth'], HEAD)
for k, (x, z, s) in ((-1, (-.082, .1, 1.25)), (1, (.09, .095, .8))):
    bpy.ops.mesh.primitive_plane_add(size=1); p = bpy.context.object; p.name = f'blush{k}'; p.parent = HEAD
    p.data.materials.append(BLUSH); p.scale = (.075 * s, .055 * s, 1); p.rotation_euler = (math.pi / 2, 0, k * SLOPE); p.location = (x, face_y(x) - .0015, z)
# ---- hair: thick slabs; visor fringe over the brows, flared wings over the ears, spikes at the back
H = M['hair']
piece('hairCap', (HW + .008, HD + .008, .06), (0, .005, HH - .012), H, HEAD, bev=.012, chamfer=.045)
piece('hairBack', (HW + .012, .075, .16), (0, HD / 2 - .01, .175), H, HEAD, bev=.012)
for k in (-1, 1):
    piece(f'hairSide{k}', (.032, .17, .09), (k * (HW / 2 + .004), .028, .215), H, HEAD, bev=.008)
random.seed(11)
# volume on top of the head
piece('hairMass', (HW + .01, HD + .01, .1), (0, .006, HH + .052), H, HEAD, bev=.014, rot=(-.07, .05, .03), chamfer=.06)
piece('hairMass2', (.2, .17, .06), (-.02, .01, HH + .1), H, HEAD, bev=.012, rot=(.12, -.1, .25), chamfer=.04)
def clump(i, ang_deg, L, down, r0, z0, w=.13, t=.09, jitter=7, tp=(.32, .6)):
    a = math.radians(ang_deg + random.uniform(-jitter, jitter))
    d = Vector((math.cos(a), math.sin(a), 0)); dv = d * (1 - abs(down)) + Vector((0, 0, -down))
    base = Vector((0, .01, z0)) + Vector((d.x * r0 * 1.1, d.y * r0 * .95, 0))
    piece(f'clump{i}', (w * random.uniform(.9, 1.1), t * random.uniform(.9, 1.1), L * random.uniform(.92, 1.08)), base, H, HEAD, dirv=dv,
          roll=random.uniform(-.3, .3), taper=(tp[0] * random.uniform(.85, 1.15), tp[1]), base=True, bev=.008)
# perimeter layer: front fringe hangs over the forehead, sides flare over the ears, back droops
A_ = [(-90, .13, .6), (-118, .135, .55), (-62, .13, .58), (-145, .15, .45), (-35, .14, .5),
      (180, .15, .35), (155, .15, .45), (-5, .16, .3), (25, .15, .42),
      (125, .15, .6), (90, .15, .65), (55, .15, .6)]
for i, (ang, L, down) in enumerate(A_): clump(i, ang, L, down, .085, HH + .045)
# upper layer: chunks lying on top, some lifting into spikes (top right, top left)
B_ = [(-100, .12, .25), (-55, .12, .22), (-160, .13, .12), (-15, .13, -.05), (150, .12, .1), (35, .13, -.2), (100, .12, .3), (70, .12, .15), (5, .12, -.35)]
for j, (ang, L, down) in enumerate(B_): clump(20 + j, ang, L, down, .045, HH + .095, w=.12, t=.08)
# fringe strand down the viewer-left temple
piece('strandL', (.06, .05, .11), (-.14, -.1, .26), H, HEAD, dirv=(-.25, -.3, -.92), roll=.2, taper=(.35, .6), base=True, bev=.007)
ROOT.rotation_euler = (0, 0, math.radians(A.rot + (-14 if A.view in ('main', 'face') else 0)))

# ---------------- studio ----------------
bpy.ops.mesh.primitive_plane_add(size=20); fl = bpy.context.object; fl.is_shadow_catcher = True
w = bpy.data.worlds.new('w'); S.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = lin('#cdc3bf'); bg.inputs['Strength'].default_value = .34
def area(name, loc, size, power, col, target=(0, 0, .55)):
    Lg = bpy.data.lights.new(name, 'AREA'); Lg.size = size; Lg.energy = power; Lg.color = col
    o = bpy.data.objects.new(name, Lg); COLL.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
area('key', (-1.5, -2.4, 2.3), 3.2, 175, (1.0, .86, .7))
area('fill', (2.3, -1.6, .9), 3.0, 40, (.9, .9, 1.0))
area('rim', (1.3, 2.1, 2.1), 1.6, 160, (1.0, .94, .86))
area('kick', (-1.6, 1.8, 1.2), 1.6, 70, (.95, .95, 1.0))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); COLL.objects.link(cam); S.camera = cam
views = {'main': ((.12, -3.9, .56), (0, 0, .53), 116), 'face': ((.05, -1.8, .78), (0, 0, .82), 90), 'turn': ((0, -3.9, .55), (0, 0, .5), 128)}
loc, tgt, lens = views[A.view]; cam.location = loc; cam.data.lens = lens
cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
rw, rh = map(int, A.res.split('x'))
S.render.engine = 'CYCLES'; S.cycles.device = 'CPU'; S.cycles.samples = A.samples; S.cycles.use_denoising = True
S.cycles.max_bounces = 6; S.render.resolution_x, S.render.resolution_y = rw, rh; S.render.film_transparent = True
S.view_settings.view_transform = 'AgX'; S.view_settings.exposure = -.3
try: S.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
S.render.image_settings.file_format = 'PNG'; S.render.image_settings.color_mode = 'RGBA'; S.render.filepath = A.out
if A.blend: bpy.ops.wm.save_as_mainfile(filepath=A.blend)
bpy.ops.render.render(write_still=True); print('done', A.out)
