"""Bang Udin (tukang parkir), soft-block stylized 3D in the look of the user's reference sheet.
Run: /opt/bpyenv/bin/python udin.py --view main|face|turn --rot 0 --out out.png --res 1080x1350 --samples 96
Blender: Z up, character faces -Y, metres (character ~1.0 tall)."""
import bpy, bmesh, math, sys, argparse
from mathutils import Vector, Euler

ap = argparse.ArgumentParser()
ap.add_argument('--view', default='main'); ap.add_argument('--rot', type=float, default=0); ap.add_argument('--out', default='udin.png')
ap.add_argument('--res', default='1080x1350'); ap.add_argument('--samples', type=int, default=96); ap.add_argument('--blend', default='')
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

# ---------------- materials ----------------
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + .055) / 1.055) ** 2.4 if x > .04045 else x / 12.92 for x in c) + (1,)

MATS = {}
def mat(name, hexc, rough=.72, sss=0., grime=.12, metal=0., emit=0., bump=.05):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    bsdf = N['Principled BSDF']; bsdf.inputs['Roughness'].default_value = rough; bsdf.inputs['Metallic'].default_value = metal
    if sss: bsdf.inputs['Subsurface Weight'].default_value = sss; bsdf.inputs['Subsurface Radius'].default_value = (.06, .025, .015)
    if emit: bsdf.inputs['Emission Color'].default_value = lin(hexc); bsdf.inputs['Emission Strength'].default_value = emit
    tc = N.new('ShaderNodeTexCoord')
    n1 = N.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 38; n1.inputs['Detail'].default_value = 8; n1.inputs['Roughness'].default_value = .62
    n2 = N.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 6; n2.inputs['Detail'].default_value = 3
    L.new(tc.outputs['Object'], n1.inputs['Vector']); L.new(tc.outputs['Object'], n2.inputs['Vector'])
    r1 = N.new('ShaderNodeValToRGB'); r1.color_ramp.elements[0].position = .42; r1.color_ramp.elements[1].position = .62
    L.new(n1.outputs['Fac'], r1.inputs['Fac'])
    r2 = N.new('ShaderNodeValToRGB'); r2.color_ramp.elements[0].position = .3; r2.color_ramp.elements[1].position = .75
    L.new(n2.outputs['Fac'], r2.inputs['Fac'])
    base = N.new('ShaderNodeRGB'); base.outputs[0].default_value = lin(hexc)
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0
    # base * (1 - grime*(1-ramp)) : painted toy with worn speckle + soft large blotches
    inv = N.new('ShaderNodeMath'); inv.operation = 'MULTIPLY_ADD'; inv.inputs[1].default_value = grime; inv.inputs[2].default_value = 1 - grime
    L.new(r1.outputs['Color'], inv.inputs[0])
    inv2 = N.new('ShaderNodeMath'); inv2.operation = 'MULTIPLY_ADD'; inv2.inputs[1].default_value = grime * .7; inv2.inputs[2].default_value = 1 - grime * .7
    L.new(r2.outputs['Color'], inv2.inputs[0])
    mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; L.new(inv.outputs[0], mul.inputs[0]); L.new(inv2.outputs[0], mul.inputs[1])
    L.new(base.outputs[0], mx.inputs[6]); L.new(mul.outputs[0], mx.inputs[7])
    L.new(mx.outputs[2], bsdf.inputs['Base Color'])
    if bump:
        bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = .002
        L.new(n1.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], bsdf.inputs['Normal'])
    MATS[name] = m; return m

M = dict(
    skin=mat('skin', '#e3955c', .55, sss=.12, grime=.10), skinD=mat('skinD', '#cf7e4c', .55, sss=.12, grime=.1),
    nose=mat('nose', '#e58c58', .5, sss=.15, grime=.08),
    cap=mat('cap', '#2c4583', .8, grime=.16), capD=mat('capD', '#223869', .8, grime=.16), hair=mat('hair', '#2a1c16', .65, grime=.12),
    shirt=mat('shirt', '#283150', .9, grime=.14, bump=.08), vest=mat('vest', '#ff6a0f', .7, grime=.2, bump=.06),
    stripe=mat('stripe', '#dfe3e8', .32, grime=.06, metal=.35), shorts=mat('shorts', '#8f7350', .9, grime=.18, bump=.08),
    sole=mat('sole', '#2f4f86', .6, grime=.12), strap=mat('strap', '#eeeeea', .5, grime=.06),
    towel=mat('towel', '#f3eee2', .95, grime=.1, bump=.12), red=mat('red', '#cf3d4f', .8, grime=.1),
    metal=mat('metal', '#c3c8d0', .25, metal=.9, grime=.04, bump=0), eyew=mat('eyew', '#f8f6f1', .25, grime=0, bump=0),
    pupil=mat('pupil', '#141114', .15, grime=0, bump=0), glint=mat('glint', '#ffffff', .2, grime=0, emit=4, bump=0),
    mouth=mat('mouth', '#5a1b21', .6, grime=0, bump=0), teeth=mat('teeth', '#f4f0e6', .35, grime=0, bump=0), tongue=mat('tongue', '#d0606a', .45, grime=0, bump=0),
    brow=mat('brow', '#2a1c16', .7, grime=.05, bump=0), blush=mat('blush', '#f2876f', .6, sss=.1, grime=.05),
    badge=mat('badge', '#f2c230', .5, grime=.1), ticket=mat('ticket', '#ffd34d', .7, grime=.05), ticket2=mat('ticket2', '#ff9fb0', .7, grime=.05),
)

# ---------------- builders ----------------
COLL = S.collection
def empty(name, loc=(0, 0, 0), parent=None, rot=(0, 0, 0)):
    o = bpy.data.objects.new(name, None); COLL.objects.link(o); o.location = loc; o.rotation_euler = rot
    if parent: o.parent = parent
    return o

def block(name, size, loc, m, bev=None, parent=None, rot=(0, 0, 0), seg=4):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); COLL.objects.link(o); o.location = loc; o.rotation_euler = rot
    if parent: o.parent = parent
    me.materials.append(m)
    b = o.modifiers.new('bev', 'BEVEL'); b.width = bev if bev is not None else min(size) * .28; b.segments = seg; b.limit_method = 'NONE'; b.harden_normals = True
    for p in me.polygons: p.use_smooth = True
    return o

def ellip(name, r, loc, m, parent=None, rot=(0, 0, 0), seg=32):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * r[0], v.co.y * r[1], v.co.z * r[2]))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); COLL.objects.link(o); o.location = loc; o.rotation_euler = rot
    if parent: o.parent = parent
    me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    return o

def cord(name, pts, r, m, parent=None):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 4
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts): bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, cu); COLL.objects.link(o); cu.materials.append(m)
    if parent: o.parent = parent
    return o

# ---------------- Bang Udin ----------------
ROOT = empty('udin')
X = 1  # +x = viewer's right
# legs, feet, sandals jepit
for k in (-1, 1):
    x = k * .063
    block(f'sole{k}', (.102, .16, .018), (x, -.022, .009), M['sole'], .006, ROOT)
    block(f'foot{k}', (.084, .122, .044), (x, -.02, .038), M['skin'], .018, ROOT)
    for i, dx in enumerate((-.024, -.008, .008, .024)):
        block(f'toe{k}{i}', (.014 if i else .018, .022, .018), (x + dx * (1 if k > 0 else -1), -.083, .027), M['skin'], .006, ROOT)
    cord(f'strapA{k}', [(x - .038, .0, .022), (x - .014, -.045, .058), (x + .002, -.072, .036)], .0055, M['strap'], ROOT)
    cord(f'strapB{k}', [(x + .038, .0, .022), (x + .014, -.045, .058), (x + .002, -.072, .036)], .0055, M['strap'], ROOT)
    block(f'calf{k}', (.086, .09, .19), (x, .0, .145), M['skin'], .03, ROOT)
    block(f'knee{k}', (.09, .094, .05), (x, -.002, .222), M['skin'], .022, ROOT)
# cargo shorts
block('hips', (.262, .168, .1), (0, 0, .405), M['shorts'], .035, ROOT)
for k in (-1, 1):
    block(f'shortleg{k}', (.122, .148, .15), (k * .064, 0, .29), M['shorts'], .03, ROOT, rot=(0, k * -.04, 0))
    block(f'pocket{k}', (.016, .075, .07), (k * .128, 0, .3), M['shorts'], .012, ROOT)
    block(f'hem{k}', (.126, .152, .02), (k * .064, 0, .222), M['shorts'], .008, ROOT, rot=(0, k * -.04, 0))
# torso: t-shirt, vest, stripes, badge
TOR = empty('torso', (0, 0, .43), ROOT)
block('shirt', (.272, .162, .275), (0, 0, .138), M['shirt'], .055, TOR)
block('collar', (.11, .06, .02), (0, -.065, .272), M['shirt'], .01, TOR)
for k in (-1, 1):
    block(f'vestF{k}', (.098, .022, .25), (k * .082, -.087, .13), M['vest'], .012, TOR)
    block(f'vestS{k}', (.022, .15, .25), (k * .142, 0, .13), M['vest'], .012, TOR)
    block(f'strF{k}', (.1, .026, .026), (k * .082, -.089, .085), M['stripe'], .006, TOR)
    block(f'strS{k}', (.026, .152, .026), (k * .143, 0, .085), M['stripe'], .006, TOR)
    block(f'strapV{k}', (.06, .15, .026), (k * .085, 0, .266), M['vest'], .01, TOR)
block('vestB', (.27, .022, .25), (0, .087, .13), M['vest'], .012, TOR)
block('strB', (.272, .026, .026), (0, .089, .085), M['stripe'], .006, TOR)
block('pocketV', (.06, .012, .055), (.082, -.1, .035), M['vest'], .008, TOR)
block('badge', (.045, .008, .03), (-.082, -.1, .2), M['badge'], .004, TOR)
# towel over the shoulder (viewer's left), with red stripes
block('towelTop', (.095, .2, .03), (-.09, 0, .284), M['towel'], .014, TOR, rot=(0, .12, 0))
for y, s in ((-.103, 1), (.103, -1)):
    block(f'towel{s}', (.088, .024, .19), (-.092, y, .19), M['towel'], .011, TOR, rot=(s * .05, .06, .05 * s))
    for z in (.135, .155):
        block(f'tstripe{s}{z}', (.09, .022, .008), (-.088, y, z), M['red'], .003, TOR, rot=(s * .04, 0, 0))
# whistle on a lanyard
cord('lanyard', [(-.05, -.07, .28), (-.02, -.1, .2), (.02, -.105, .15), (.04, -.098, .12)], .0035, M['red'], TOR)
cord('lanyard2', [(.05, -.07, .28), (.05, -.095, .2), (.04, -.098, .13)], .0035, M['red'], TOR)
block('whistle', (.045, .022, .022), (.045, -.108, .11), M['metal'], .009, TOR)
ellip('whistleR', (.016, .014, .016), (.03, -.108, .1), M['metal'], TOR)
# neck + head
NECK = empty('neck', (0, 0, .275), TOR)
block('neckB', (.075, .07, .05), (0, 0, .015), M['skinD'], .02, NECK)
HEAD = empty('head', (0, 0, .035), NECK, rot=(0, .05, .06))
HW, HD, HH = .282, .25, .265; FY = -HD / 2
block('headB', (HW, HD, HH), (0, 0, HH / 2), M['skin'], .06, HEAD)
for k in (-1, 1):
    block(f'ear{k}', (.032, .05, .07), (k * (HW / 2 + .008), .005, .12), M['skin'], .015, HEAD)
    block(f'earI{k}', (.012, .026, .04), (k * (HW / 2 + .022), .0, .12), M['skinD'], .005, HEAD)
block('nose', (.054, .05, .048), (0, FY - .018, .105), M['nose'], .022, HEAD)
# eyes (white ovals, pupils looking at the camera side, glint), brows (one raised = cheeky)
for k in (-1, 1):
    ex = k * .054
    ellip(f'eyeW{k}', (.034, .018, .04), (ex, FY - .002, .145), M['eyew'], HEAD)
    ellip(f'pupil{k}', (.016, .008, .019), (ex + .008, FY - .017, .146), M['pupil'], HEAD)
    ellip(f'glint{k}', (.0055, .004, .0055), (ex + .013, FY - .023, .155), M['glint'], HEAD, seg=16)
    block(f'brow{k}', (.058, .02, .016), (ex, FY - .006, .192 + (.01 if k > 0 else 0)), M['brow'], .007, HEAD, rot=(0, (-.22 if k > 0 else .1), 0))
    ellip(f'blush{k}', (.024, .006, .016), (k * .093, FY + .001, .1), M['blush'], HEAD)
# open grin: cavity cut into the head (boolean, cutter material transferred), teeth + tongue inside
cut = ellip('mouthCut', (.062, .03, .03), (0, FY + .002, .06), M['mouth'], HEAD)
cut.hide_render = True; cut.display_type = 'WIRE'
bo = bpy.data.objects['headB'].modifiers.new('mouth', 'BOOLEAN'); bo.operation = 'DIFFERENCE'; bo.object = cut; bo.solver = 'EXACT'; bo.material_mode = 'TRANSFER'
block('teeth', (.09, .014, .013), (0, FY + .008, .082), M['teeth'], .004, HEAD)
ellip('tongue', (.03, .012, .01), (0, FY + .012, .042), M['tongue'], HEAD)
# hair under the cap (chunky clumps) and cap
block('hairBack', (.252, .12, .11), (0, .065, .2), M['hair'], .03, HEAD)
for i, (x, y, z, r) in enumerate([(-.1, .04, .2, .3), (.1, .05, .2, -.25), (-.06, .1, .15, .1), (.07, .1, .15, -.15), (0, .11, .16, 0)]):
    block(f'tuft{i}', (.07, .07, .06), (x, y, z), M['hair'], .018, HEAD, rot=(r, .2 * r, r))
for k in (-1, 1):
    block(f'side{k}', (.03, .06, .07), (k * (HW / 2 - .006), -.02, .2), M['hair'], .012, HEAD)
block('capDome', (HW + .016, HD + .018, .092), (0, .004, HH - .008), M['cap'], .04, HEAD)
block('capBrim', (.215, .13, .017), (0, FY - .055, HH - .045), M['capD'], .008, HEAD, rot=(-.12, 0, 0))
block('capBtn', (.03, .03, .014), (0, 0, HH + .04), M['capD'], .006, HEAD)
block('capPatch', (.06, .006, .034), (0, FY - .009, HH - .006), M['badge'], .004, HEAD)
# arms: shoulder -> elbow -> wrist
def arm(side, sh, el, wr, open_hand):
    s = empty(f'sh{side}', (side * .158, 0, .245), TOR, rot=sh)
    block(f'sleeve{side}', (.096, .1, .11), (side * .004, 0, -.04), M['shirt'], .028, s)
    block(f'upper{side}', (.078, .078, .07), (0, 0, -.115), M['skin'], .024, s)
    e = empty(f'el{side}', (0, 0, -.15), s, rot=el)
    block(f'fore{side}', (.076, .076, .12), (0, 0, -.058), M['skin'], .024, e)
    h = empty(f'wr{side}', (0, 0, -.12), e, rot=wr)
    if open_hand:
        block(f'palm{side}', (.092, .042, .08), (0, 0, -.04), M['skin'], .016, h)
        for i, dx in enumerate((-.027, -.009, .009, .027)):
            block(f'fing{side}{i}', (.02, .034, .056 - abs(i - 1.5) * .007), (dx * 1.15, .0, -.1), M['skin'], .007, h)
        block(f'thumb{side}', (.022, .028, .04), (-side * .048, -.006, -.03), M['skin'], .009, h, rot=(0, side * .5, 0))
    else:
        block(f'palm{side}', (.092, .058, .086), (0, 0, -.044), M['skin'], .02, h)
        block(f'thumb{side}', (.024, .03, .042), (-side * .045, -.012, -.028), M['skin'], .01, h, rot=(0, side * .4, 0))
    return h
hR = arm(1, (0, -2.55, 0), (-.25, -.35, 0), (0, 0, 0), True)        # raised (viewer's right): "stop / maju terus"
hL = arm(-1, (-.1, .12, 0), (-.95, 0, 0), (0, 0, 0), False)          # relaxed, holding parking tickets
block('ticket', (.07, .05, .012), (0, -.04, -.06), M['ticket'], .003, hL, rot=(.9, 0, 0))
block('ticket2', (.07, .05, .012), (.004, -.045, -.05), M['ticket2'], .003, hL, rot=(.9, 0, 0))
ROOT.rotation_euler = (0, 0, math.radians(A.rot))

# ---------------- studio: shadow catcher floor, soft lights ----------------
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0)); floor = bpy.context.object; floor.is_shadow_catcher = True
w = bpy.data.worlds.new('w'); S.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = lin('#cfc9c3'); bg.inputs['Strength'].default_value = .32
def area(name, loc, size, power, col, target=(0, 0, .5)):
    L = bpy.data.lights.new(name, 'AREA'); L.size = size; L.energy = power; L.color = col[:3]
    o = bpy.data.objects.new(name, L); COLL.objects.link(o); o.location = loc
    d = Vector(target) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); return o
area('key', (-1.6, -2.3, 2.3), 2.4, 150, (1.0, .92, .82))
area('fill', (2.2, -1.6, 1.0), 3.0, 45, (.86, .91, 1.0))
area('rim', (.8, 2.2, 2.0), 1.6, 110, (1.0, .95, .9))
area('top', (0, 0, 3.0), 2.0, 25, (1, 1, 1))

# ---------------- camera ----------------
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); COLL.objects.link(cam); S.camera = cam
views = {'main': ((.75, -3.4, .8), (0, 0, .53), 95), 'face': ((.2, -1.6, .9), (0, 0, .82), 85), 'turn': ((0, -3.6, .62), (0, 0, .53), 90)}
loc, tgt, lens = views[A.view]; cam.location = loc; cam.data.lens = lens
cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

# ---------------- render ----------------
rw, rh = map(int, A.res.split('x'))
S.render.engine = 'CYCLES'; S.cycles.device = 'CPU'; S.cycles.samples = A.samples; S.cycles.use_denoising = True
try: S.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
S.cycles.max_bounces = 6; S.render.threads_mode = 'AUTO'
S.render.resolution_x, S.render.resolution_y = rw, rh; S.render.film_transparent = True
S.view_settings.view_transform = 'AgX'
try: S.view_settings.look = 'AgX - Punchy'
except Exception: pass
S.render.image_settings.file_format = 'PNG'; S.render.image_settings.color_mode = 'RGBA'
S.render.filepath = A.out
if A.blend: bpy.ops.wm.save_as_mainfile(filepath=A.blend)
bpy.ops.render.render(write_still=True)
print('done', A.out)
