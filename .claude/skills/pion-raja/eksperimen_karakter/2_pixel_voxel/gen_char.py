"""Bang Udin (tukang parkir) as pixel art: one design, two outputs.
sprite.png  : 30x48 2D pixel sprite (front), 1px ink outline, 2-tone shading
voxels.json : 3D voxel model built from the same shapes (same columns/rows), face painted from the sprite
Coordinates: x = column 0..29 (centre line at 15.0), r = sprite row 0..47 (47 = shoe bottom), z = depth (+ = front).
Voxel y index = 47 - r."""
import json, math
from PIL import Image

W, H, CX = 32, 49, 15.0
OUT = (30, 26, 36)
C = dict(
    skin=(251, 236, 214), skin_d=(238, 208, 178), blush=(255, 168, 178),
    cap=(52, 70, 120), cap_d=(36, 49, 88), brim=(38, 50, 86),
    shirt=(44, 56, 96), vest=(255, 138, 31), vest_d=(214, 96, 18),
    stripe=(236, 240, 244), stripe_d=(186, 196, 206),
    pants=(62, 62, 74), pants_d=(44, 44, 54), shoe=(45, 42, 51),
    hair=(58, 42, 34), white=(255, 255, 255), whistle=(206, 210, 222), whistle_d=(150, 156, 172), cord=(226, 71, 95),
)
HCY, HR = 14.5, 9.3          # head centre row / radius
BT, BB = 23.0, 39.0          # body top / bottom rows


def body_hw(pr):
    t = min(1, max(0, (pr - BT) / (BB - BT)))
    return 6.0 + (7.6 - 6.0) * t


def in_head(px, pr, z=0.0):
    return (px - CX) ** 2 + (pr - HCY) ** 2 + z * z <= HR * HR


def in_body(px, pr, z=0.0):
    hw = body_hw(pr)
    u, v, w = (px - CX) / hw, (pr - (BT + BB) / 2) / ((BB - BT) / 2), z / (hw * .85)
    return abs(u) ** 2.7 + abs(v) ** 2.7 + abs(w) ** 2.7 <= 1


def body_col(px, pr, z, shade):
    if pr >= 33:
        return C['pants_d'] if shade else C['pants']
    front_open = abs(px - CX) <= 1.6 and z >= 0
    if front_open:
        return C['shirt']
    if int(pr) == 29:
        return C['stripe_d'] if shade else C['stripe']
    return C['vest_d'] if shade else C['vest']


def line_px(a, b):
    (x0, y0), (x1, y1) = a, b
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    return [(round(x0 + (x1 - x0) * i / max(1, n - 1)), round(y0 + (y1 - y0) * i / max(1, n - 1))) for i in range(n)]


# limbs (shared by 2D and 3D): pixel lists in (x, row)
ARM_L = line_px((8, 27), (7, 31)) + line_px((7, 31), (6, 36))
HAND_L = [(5, 37), (6, 37), (5, 38), (6, 38)]
ARM_R = line_px((21, 27), (25, 26)) + line_px((25, 26), (27, 20))
HAND_R = [(27, 18), (28, 18), (27, 19), (28, 19)]
FINGERS = [(26, 17), (27, 16), (28, 16), (29, 17)]
LEGS = [(12, r) for r in range(39, 46)] + [(17, r) for r in range(39, 46)]
SHOES = [(x, r) for r in (46, 47) for x in (9, 10, 11, 12)] + [(x, r) for r in (46, 47) for x in (17, 18, 19, 20)]

# face details in front view (x, row) -> colour
FACE = {}
for ex in (10, 16):                       # 4x4 eyes: ink ring, round corners, white inside, pupil looking up-right
    for dx in range(4):
        for dy in range(4):
            corner = dx in (0, 3) and dy in (0, 3)
            ring = dx in (0, 3) or dy in (0, 3)
            if corner:
                continue
            FACE[(ex + dx, 13 + dy)] = OUT if ring else C['white']
    FACE[(ex + 2, 14)] = OUT
for x in (10, 11, 12):
    FACE[(x, 11)] = OUT                   # brows (left one a little lower = cheeky)
for x in (17, 18, 19):
    FACE[(x, 11)] = OUT
for p in [(11, 20), (12, 20), (13, 20), (14, 19)]:
    FACE[p] = OUT                         # smirk
FACE[(8, 18)] = C['blush']; FACE[(9, 18)] = C['blush']; FACE[(20, 18)] = C['blush']; FACE[(21, 18)] = C['blush']
WHISTLE = {(15, 19): C['whistle'], (16, 19): C['whistle'], (17, 19): C['whistle_d'], (15, 20): C['whistle_d'], (16, 20): C['whistle_d']}
CORD = [(17, 21), (18, 22), (18, 23), (18, 24), (17, 25)]


def build_sprite():
    img = [[None] * W for _ in range(H)]
    region = [[None] * W for _ in range(H)]
    for r in range(H):
        for x in range(W):
            px, pr = x + .5, r + .5
            if in_body(px, pr):
                img[r][x] = body_col(px, pr, 1, (px - CX) > body_hw(pr) * .45); region[r][x] = 'body'
    for r in range(H):
        for x in range(W):
            px, pr = x + .5, r + .5
            if in_head(px, pr) or (pr < 8.5 and (px - CX) ** 2 + (pr - HCY) ** 2 <= (HR + .8) ** 2):
                shade = (px - CX) > HR * .5
                if pr < 8.5:
                    img[r][x] = C['cap_d'] if shade else C['cap']; region[r][x] = 'cap'
                else:
                    img[r][x] = C['skin_d'] if shade else C['skin']; region[r][x] = 'head'
    for x in range(W):                    # brim: row 10-11, one pixel wider than the head
        for r in (8, 9):
            if abs(x + .5 - CX) <= HR + 1.3:
                img[r][x] = C['brim'] if r == 8 else OUT; region[r][x] = 'cap'
    # chin line where the head sits on the body
    for r in range(H - 1):
        for x in range(W):
            if region[r][x] == 'head' and region[r + 1][x] == 'body':
                img[r][x] = OUT
    for (x, r), col in list(FACE.items()) + list(WHISTLE.items()):
        if col == C['blush'] and region[r][x] != 'head':
            continue
        img[r][x] = col
    for x, r in CORD:
        img[r][x] = C['cord']
    for x, r in SHOES:
        img[r][x] = C['shoe']
    # outline everything filled so far
    filled = [[img[r][x] is not None for x in range(W)] for r in range(H)]
    for r in range(H):
        for x in range(W):
            if filled[r][x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, rr = x + dx, r + dy
                if 0 <= xx < W and 0 <= rr < H and filled[rr][xx]:
                    img[r][x] = OUT; break
    for x, r in ARM_L + ARM_R + HAND_L + HAND_R + FINGERS + LEGS:
        img[r][x] = OUT
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for r in range(H):
        for x in range(W):
            if img[r][x]:
                im.putpixel((x, r), img[r][x] + (255,))
    return im


def build_voxels():
    vox = {}
    ZR = range(-11, 14)
    for r in range(H):
        for x in range(W):
            for z in ZR:
                px, pr = x + .5, r + .5
                if in_body(px, pr, z):
                    vox[(x, r, z)] = body_col(px, pr, z, False)
                cap_shell = pr < 8.5 and (px - CX) ** 2 + (pr - HCY) ** 2 + z * z <= (HR + .8) ** 2
                if in_head(px, pr, z) or cap_shell:
                    if pr < 8.5:
                        vox[(x, r, z)] = C['cap']
                    elif z < -3 and pr < 21:
                        vox[(x, r, z)] = C['hair']
                    else:
                        vox[(x, r, z)] = C['skin']
    for x in range(W):                    # brim: half disc sticking out at the front, one voxel thick
        for z in ZR:
            if ((x + .5 - CX) / (HR + 1.0)) ** 2 + ((z - 1.5) / (HR + 3.0)) ** 2 <= 1 and z >= -2:
                vox[(x, 9, z)] = C['brim']
            if ((x + .5 - CX) / (HR + .8)) ** 2 + (z / (HR + .8)) ** 2 <= 1:
                vox.setdefault((x, 8, z), C['cap'])
    # paint the face onto the frontmost head voxel of each column
    def front(x, r):
        zs = [z for (xx, rr, z) in vox if xx == x and rr == r]
        return max(zs) if zs else None
    for (x, r), col in FACE.items():
        z = front(x, r)
        if z is not None and vox[(x, r, z)] in (C['skin'],):
            vox[(x, r, z)] = col
    for (x, r), col in WHISTLE.items():
        z = front(x, r)
        vox[(x, r, z + 1)] = col
        vox[(x, r, z + 2)] = col
    for x, r in CORD:
        z = front(x, r)
        if z is not None: vox[(x, r, z + 1)] = C['cord']
    # limbs: arms come slightly forward, legs at z 0
    def four(pts):  # 4-connected so voxel arms read as solid sticks, not beads
        out = [pts[0]]
        for (x0, r0), (x1, r1) in zip(pts, pts[1:]):
            if x0 != x1 and r0 != r1:
                out.append((x1, r0))
            out.append((x1, r1))
        return out
    for pts, zf in ((four(ARM_L), lambda i, n: round(i / max(1, n - 1) * 1.5)), (four(ARM_R), lambda i, n: round(i / max(1, n - 1) * 2))):
        for i, (x, r) in enumerate(pts):
            vox[(x, r, zf(i, len(pts)))] = OUT
    for x, r in HAND_L:
        for z in (1, 2):
            vox[(x, r, z)] = OUT
    for x, r in HAND_R + FINGERS:
        for z in (2, 3):
            vox[(x, r, z)] = OUT
    for x, r in LEGS:
        vox[(x, r, 0)] = OUT
    for x, r in SHOES:
        for z in (-1, 0, 1, 2):
            vox[(x, r, z)] = C['shoe']
    # keep only voxels with an empty neighbour
    keep = []
    for (x, r, z), col in vox.items():
        if any((x + dx, r + dy, z + dz) not in vox for dx, dy, dz in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))):
            keep.append([x, 47 - r, z, *col])
    return keep


if __name__ == '__main__':
    sp = build_sprite(); sp.save('sprite.png')
    sp.resize((W * 14, H * 14), Image.NEAREST).save('sprite_x14.png')
    v = build_voxels(); json.dump({'w': W, 'h': H, 'cx': CX, 'v': v}, open('voxels.json', 'w'))
    print('sprite', sp.size, 'voxels', len(v))
