"""Export the castle for the browser studio (three.js): castle.glb + scene.json.

    /opt/bpyenv/bin/python export_studio.py -- [--out assets] [--res 1080x1350]

The room is built by castle3d/build_castle.py (same geometry as the Cycles renders). Blender's procedural
shaders don't survive glTF, so every material is flattened to a Principled colour here; the studio
re-creates the bricks, the coffered vault and the stained glass as canvas textures by object name.
scene.json carries the shot camera, Pion's place, every light position and the per-mood light presets
(build_castle.EMOTIONS), so the studio lights each atmosphere from the same data as the renders.
"""
import argparse
import json
import math
import os
import sys

import bpy  # before mathutils with the pip module

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import build_castle as BC  # noqa: E402
import build_pion as BP    # noqa: E402

FLAT = {  # material name prefix -> (sRGB base colour, metallic, roughness, emissive sRGB, emissive strength)
    "Stone": ((.56, .45, .34), 0, .85, None, 0), "Gold": ((1.0, .78, .34), 1, .28, None, 0),
    "Velvet": ((.62, .05, .11), 0, .8, None, 0), "CastleMarbleL": ((.92, .89, .83), 0, .12, None, 0),
    "CastleMarbleD": ((.06, .05, .045), 0, .1, None, 0), "Carpet": ((.72, .05, .1), 0, .7, None, 0),
    "Wood": ((.33, .18, .08), 0, .5, None, 0), "Iron": ((.08, .08, .085), 1, .45, None, 0),
    "Flame": ((0, 0, 0), 0, 1, (1.0, .55, .2), 6), "LampBulb": ((0, 0, 0), 0, 1, (1.0, .72, .4), 6),
    "Brass": ((.82, .62, .3), 1, .3, None, 0), "Wax": ((.95, .9, .78), 0, .4, None, 0),
    "BannerBlue": ((.06, .14, .5), 0, .7, None, 0), "ThroneRuby": ((.85, .04, .1), 0, .05, None, 0),
    "StainedGlass": ((0, 0, 0), 0, 1, (1, 1, 1), 2), "Lead": ((.05, .05, .05), .6, .6, None, 0),
    "SillStone": ((.5, .42, .33), 0, .8, None, 0), "StatueStone": ((.62, .59, .55), 0, .85, None, 0),
    "VaultCoffers": ((.5, .06, .09), 0, .55, None, 0),
}


def flatten_materials():
    for m in bpy.data.materials:
        spec = next((v for k, v in FLAT.items() if m.name.startswith(k)), None)
        if not m.use_nodes:
            continue
        nt = m.node_tree
        b = nt.nodes.get("Principled BSDF")
        if spec is None:
            if b is None or b.inputs["Base Color"].is_linked:
                spec = ((.6, .6, .6), 0, .6, None, 0)
            else:
                c = b.inputs["Base Color"].default_value
                spec = ((c[0] ** (1 / 2.2), c[1] ** (1 / 2.2), c[2] ** (1 / 2.2)), b.inputs["Metallic"].default_value,
                        b.inputs["Roughness"].default_value, None, 0)
        col, met, rough, emc, ems = spec
        for n in list(nt.nodes):
            nt.nodes.remove(n)
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        p = nt.nodes.new("ShaderNodeBsdfPrincipled")
        p.inputs["Base Color"].default_value = (*BC.lin(col), 1)
        p.inputs["Metallic"].default_value = met
        p.inputs["Roughness"].default_value = rough
        if emc:
            p.inputs["Emission Color"].default_value = (*BC.lin(emc), 1)
            p.inputs["Emission Strength"].default_value = ems
        nt.links.new(p.outputs[0], out.inputs["Surface"])


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(HERE, "assets"))
    ap.add_argument("--res", default="1080x1350")
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    BC.build_room(volume=False)
    res = tuple(int(v) for v in a.res.split("x"))
    BC.camera_and_key(res)
    BC.mood_chandelier(False)               # hang the chandelier where the renders have it
    sc = bpy.context.scene
    cam = sc.camera
    bpy.context.view_layer.update()
    q = cam.matrix_world.to_quaternion()
    cam_info = {"pos": list(cam.matrix_world.translation), "quat_wxyz": [q.w, q.x, q.y, q.z], "lens": cam.data.lens,
                "sensor": cam.data.sensor_width, "shift_y": cam.data.shift_y, "res": list(res)}
    lights = [{"name": o.name, "type": o.data.type, "pos": list(o.matrix_world.translation),
               "color": list(o.data.color)} for o in bpy.data.objects if o.type == "LIGHT"]
    for o in list(bpy.data.objects):        # the glb holds geometry only: lights and helpers are rebuilt in the studio
        if o.type in ("LIGHT", "CAMERA") or o.name in ("Haze",):
            bpy.data.objects.remove(o, do_unlink=True)
    flatten_materials()
    glb = os.path.join(a.out, "castle.glb")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_apply=True, export_cameras=False,
                              export_lights=False, export_yup=True, export_texcoords=True, export_normals=True)
    scene = {
        "camera": cam_info,
        "pion": {"scale": BC.PION_SCALE, "head_z": BC.HEAD_Z, "frame_cy": 2.35, "frame_vh": 6.6},
        "lights": lights, "emotions": {k: {kk: (list(vv) if isinstance(vv, tuple) else vv) for kk, vv in v.items()}
                                        for k, v in BC.EMOTIONS.items()},
        "room": {"x": BC.ROOM_X, "back_y": BC.BACK_Y, "front_y": BC.FRONT_Y, "ceil_z": BC.CEIL_Z, "spring_z": BC.SPRING_Z},
        "axes": "Blender z-up; the glb is exported y-up (x, y, z)_blender -> (x, z, -y)_three",
    }
    json.dump(scene, open(os.path.join(a.out, "scene.json"), "w"), indent=1, default=lambda o: list(o))
    print("RESULT studio export", glb, f"{os.path.getsize(glb) / 1e6:.1f} MB", len(lights), "lights")


if __name__ == "__main__":
    main()
