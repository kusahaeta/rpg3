# アステル（開拓者）の3Dモデルを Blender 上で一から組み立てる。
#
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/build_aster.py
#
# 出力: assets/blender/aster.blend（リグ・ウェイト・マテリアル・頂点カラー(AO)付き）
# ゲーム用の GLB は tools/blender/export_glb.py で書き出す。
#
# 座標系: Blender は Z 上・キャラは -Y 向き（glTF 書き出しで +Y 上・+Z 向きになる）。
# ボーン名・マテリアル名・"Weapon" オブジェクト名はゲーム側（js/gfx/models.js）が参照するので変えないこと。
import os, sys, math, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from charlib import *
from mathutils import Vector, Matrix

reset(hc=(0, 0, 1.662), hr=(0.094, 0.1, 0.104))
HC, HR = C.hc, C.hr

material('skin', '#ffe7dc')
material('face', '#ffe7dc')
material('hair', '#f1f0f8')
material('outfit', '#252c4c')
material('outfit_dark', '#161a2e')
material('shirt', '#eeecf5')
material('legs', '#1f2236')
material('dark', '#1a1920')
material('glove', '#1e1d28')
material('accent', '#e6c47c', metal=0.6)
material('scarf', '#ecc978')
material('metal', '#d8dbe8', metal=0.8)
material('glow', '#f5d98e', emit=2.0)

SCARF_Z = [1.48, 1.37, 1.26, 1.16, 1.06]
rig = build_rig({
    'z': (0.93, 1.08, 1.25, 1.44, 1.56, 1.8),
    'shoulder': (0.165, 0.004, 1.43), 'arm': (0.275, 0.245, 0.17),
    'leg': ((0.085, 0, 0.92), (0.081, -0.008, 0.5), (0.08, 0.01, 0.085), (0.08, -0.12, 0.02)),
    'tail': (0.035, 0.105, SCARF_Z, 'chest'),
})
SH, ARMD = C.sh, C.armd


# ------------------------------------------------------------
#  体（断面ロフト → ボクセルリメッシュで一体化）
# ------------------------------------------------------------
X = Vector((1, 0, 0))
TORSO = [  # z, 横, 前, 後
    (0.84, 0.10, 0.07, 0.08), (0.89, 0.135, 0.085, 0.096), (0.95, 0.147, 0.088, 0.1),
    (1.02, 0.137, 0.083, 0.09), (1.09, 0.121, 0.079, 0.078), (1.15, 0.123, 0.084, 0.077),
    (1.22, 0.137, 0.094, 0.08), (1.29, 0.151, 0.101, 0.083), (1.35, 0.159, 0.099, 0.086),
    (1.40, 0.163, 0.091, 0.085), (1.44, 0.152, 0.077, 0.08), (1.47, 0.115, 0.06, 0.068),
    (1.49, 0.065, 0.048, 0.055)]
LEG = [  # z, 横, 前, 後
    (0.93, 0.084, 0.084, 0.09), (0.85, 0.08, 0.08, 0.084), (0.75, 0.071, 0.072, 0.075),
    (0.64, 0.061, 0.061, 0.064), (0.54, 0.052, 0.054, 0.052), (0.47, 0.05, 0.05, 0.053),
    (0.39, 0.052, 0.045, 0.062), (0.31, 0.048, 0.042, 0.055), (0.21, 0.04, 0.038, 0.043),
    (0.12, 0.035, 0.035, 0.037), (0.06, 0.034, 0.038, 0.036)]
ARM = [  # 肩からの距離, 横, 前後
    (0.0, 0.044, 0.044), (0.05, 0.05, 0.048), (0.13, 0.048, 0.046), (0.27, 0.04, 0.04),
    (0.36, 0.042, 0.04), (0.46, 0.034, 0.03), (0.53, 0.027, 0.023)]

def leg_x(z, s):
    return s * lerp(0.08, 0.085, smoothstep(0.1, 0.9, z))

def leg_y(z):
    return -0.008 * smoothstep(0.9, 0.5, z) * smoothstep(0.1, 0.5, z)

def body_region(c):
    if c.z > 1.47 and abs(c.x) < 0.075:
        return 'skin'          # 首
    if c.z < 1.03 and abs(c.x) < 0.2:
        return 'legs'          # ズボン
    if not (c.y < -0.03 and abs(c.x) < 0.11):
        return 'outfit'        # コートの下に隠れる所は上着の色（突き抜け対策）
    return 'shirt'

def build_body_aster():
    return build_body(TORSO, LEG, ARM, [(Vector((0, 0.006, 1.43)), 0.047), (Vector((0, 0.004, 1.52)), 0.044), (Vector((0, 0.0, 1.61)), 0.04)],
                      lambda z, s: (leg_x(z, s), leg_y(z)), body_region, ['shirt', 'legs', 'skin', 'outfit'])


# ------------------------------------------------------------
#  頭（V字のあご・小さな鼻）
# ------------------------------------------------------------
def head_shape(n):
    p = Vector((n.x * HR.x, n.y * HR.y, n.z * HR.z))
    low = smoothstep(0.25, -1.0, n.z)               # あご側
    front = smoothstep(0.35, -0.85, n.y)            # 顔側（-Y）
    p.x *= 1.0 - 0.42 * (low ** 1.25) * (0.35 + 0.65 * front)   # V字のあご
    p.z -= 0.042 * (low ** 1.1) * front             # あごを下へ
    p.y -= 0.012 * low * front                      # あごを少し前へ
    p.y *= 1.0 - 0.3 * low * (1 - front)            # うなじを平らに
    p.y *= 1.0 - 0.1 * smoothstep(-0.4, -0.95, n.y) * smoothstep(-0.2, 0.3, n.z + 0.3)  # 顔の面を平らに
    p.y += 0.012 * smoothstep(0.0, 0.9, n.y) * smoothstep(-0.3, 0.5, n.z)             # 後頭部
    nose = Vector((0, -1, -0.3)).normalized()
    p.y -= 0.0075 * math.exp(-((n - nose).length / 0.11) ** 2)
    return p


# ------------------------------------------------------------
#  髪（三日月断面の毛束を重ねる）
# ------------------------------------------------------------
def build_hair():
    part = Part('Hair', ['hair'])
    # 頭皮のキャップ（前は額の上、後ろは襟足まで）
    hair_cap(part, lambda phi: 1.12 + 1.45 * (1 - math.cos(phi)) / 2 + 0.2 * abs(math.sin(phi)))

    # 後頭部（毛先を外へ跳ねさせる）
    for i in range(11):
        k = (i - 5) / 5
        ph = math.pi + k * 1.45
        L = 2.02 + 0.1 * (1 - abs(k)) + (0.06 if i % 2 else 0)
        clump(part, [(0.3, math.pi + k * 0.3, 1.02), (0.95, ph, 1.13), (1.55, ph + 0.05 * k, 1.15), (L, ph + 0.1 * k, 1.2), (L + 0.14, ph + 0.16 * k, 1.36)], 0.05, bend=0.55)
    # 頭頂（つむじから前・横へ流れる大きな束）
    for i in range(8):
        ph = math.pi + (i - 3.5) * 0.62
        clump(part, [(0.12, math.pi + (i - 3.5) * 0.15, 1.02), (0.55, ph, 1.19), (1.05, ph, 1.2), (1.35, ph, 1.2)], 0.055, bend=0.6)
    for i in range(5):
        ph = (i - 2) * 0.45
        clump(part, [(0.45, math.pi * 0.9 + ph * 0.3, 1.02), (0.1, ph * 0.5, 1.16), (0.5, ph, 1.22), (0.9, ph * 1.05, 1.2)], 0.055, bend=0.6)
    # 前髪（眉の下あたりまで。中央の細い一束だけ目の間へ）
    bangs = [(0.0, 1.5, 0.036), (0.24, 1.37, 0.046), (-0.26, 1.4, 0.046), (0.52, 1.36, 0.042), (-0.54, 1.35, 0.042),
             (0.8, 1.52, 0.042), (-0.82, 1.54, 0.042), (0.12, 1.28, 0.032), (-0.07, 1.64, 0.016)]
    for ph, th1, w in bangs:
        tip = ph * 0.8 - 0.1 * (1 if ph >= 0 else -1)
        clump(part, [(0.2, ph * 0.35, 1.04), (0.7, ph * 0.9, 1.17), (1.1, ph * 0.92, 1.16), (th1, tip, 1.13)], w, bend=0.45, taper=0.9)
    # 横髪（ほほにかかる）
    for s in (1, -1):
        clump(part, [(0.55, s * 1.0, 1.05), (1.1, s * 1.12, 1.15), (1.6, s * 1.1, 1.14), (2.05, s * 0.98, 1.1)], 0.042, bend=0.45)
        clump(part, [(0.6, s * 1.4, 1.05), (1.2, s * 1.5, 1.15), (1.7, s * 1.5, 1.15), (2.1, s * 1.42, 1.17)], 0.045, bend=0.45)
        clump(part, [(0.65, s * 1.85, 1.05), (1.25, s * 1.95, 1.15), (1.8, s * 2.0, 1.16), (2.1, s * 2.05, 1.28)], 0.045, bend=0.5)
    hair = part.build()

    # アホ毛
    part = Part('Ahoge', ['hair'])
    pts, n = [], 14
    for i in range(n):
        t = i / (n - 1); a = t * 3.9
        pts.append(HC + Vector((0.004 * t, -0.03 - math.sin(a) * 0.045 * (1 - 0.35 * t), HR.z * 1.12 + (1 - math.cos(a)) * 0.042 * (1 - 0.25 * t))))
    rings = [[p + s_ * math.cos(a) * 0.009 * (1 - i / (n - 1)) ** 0.8 + u * math.sin(a) * 0.004 * (1 - i / (n - 1)) for a in [k / 8 * TAU for k in range(8)]]
             for i, (p, (t, s_, u)) in enumerate(zip(pts, frames(pts, Vector((1, 0, 0)))))]
    rings[-1] = [pts[-1]]
    part.loft(rings, 'hair')
    return [hair, part.build()]


# ------------------------------------------------------------
#  コート（前開き・ラペル・立ち襟・後ろスリット・縁取り）
# ------------------------------------------------------------
COAT = [  # z, 横, 前, 後, 前の開き(rad)
    (1.51, 0.083, 0.066, 0.071, 0.66), (1.495, 0.09, 0.068, 0.073, 0.62),
    (1.478, 0.15, 0.076, 0.082, 0.55), (1.45, 0.194, 0.095, 0.095, 0.5), (1.40, 0.19, 0.106, 0.098, 0.45),
    (1.34, 0.18, 0.114, 0.096, 0.39), (1.27, 0.168, 0.113, 0.093, 0.31), (1.20, 0.152, 0.105, 0.09, 0.23),
    (1.13, 0.14, 0.098, 0.089, 0.16), (1.07, 0.142, 0.099, 0.093, 0.16), (1.00, 0.16, 0.107, 0.107, 0.25),
    (0.92, 0.182, 0.122, 0.122, 0.42), (0.82, 0.207, 0.137, 0.142, 0.56), (0.72, 0.226, 0.152, 0.162, 0.66),
    (0.62, 0.243, 0.164, 0.182, 0.74), (0.52, 0.258, 0.176, 0.198, 0.82)]
VENT_Z = 0.86

def coat_point(z, rx, ryf, ryb, th, e):
    """th: 正面(-Y)から横回りの角度"""
    s, c = math.sin(th), math.cos(th)
    x = math.copysign(abs(s) ** (2 / e), s) * rx
    y = -math.copysign(abs(c) ** (2 / e), c) * (ryf if c > 0 else ryb)
    back = max(0.0, -c)
    zz = z - 0.075 * back * smoothstep(1.0, 0.52, z)       # 後ろを長く
    return Vector((x, y, zz))

def build_coat():
    rows = interp_table(COAT, 46)
    cols = 26
    bm = bmesh.new()
    seam = []
    for s in (1, -1):
        grid = []
        for z, rx, f, b, op in rows:
            e = lerp(2.0, 2.4, smoothstep(1.0, 1.3, z))
            vent = 0.05 * smoothstep(VENT_Z, 0.5, z) if z < VENT_Z else 0.0
            row = []
            for i in range(cols + 1):
                th = lerp(op, math.pi - vent, i / cols)
                p = coat_point(z, rx, f, b, th, e)
                p.x *= s
                row.append(bm.verts.new(p))
            grid.append(row)
            if z >= VENT_Z:
                seam.append(row[-1])
        for j in range(len(grid) - 1):
            for i in range(cols):
                quad(bm, grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i], s < 0)
    bmesh.ops.remove_doubles(bm, verts=seam, dist=1e-5)
    orient(bm, lambda c: Vector((0, 0, c.z)))
    part = Part('CoatTrim', ['accent'])
    piping(part, bm, r=0.0042)
    me = bpy.data.meshes.new('Coat'); bm.to_mesh(me); bm.free()
    me.materials.append(MATS['outfit'])
    coat = link(bpy.data.objects.new('Coat', me))
    add_mod(coat, 'SOLIDIFY', thickness=0.009, offset=-1.0)
    bake_modifiers(coat)
    for p in coat.data.polygons:
        p.use_smooth = True

    # ラペル
    lap = Part('Lapel', ['outfit_dark'])
    for s in (1, -1):
        rows_l = []
        for z in [lerp(1.47, 1.13, i / 18) for i in range(19)]:
            zc, rx, f, b, op = min(rows, key=lambda q: abs(q[0] - z))
            w = 0.34 * math.sin(smoothstep(1.47, 1.13, z) ** 0.8 * math.pi) ** 0.9 + 0.02
            if z > 1.4:
                w += 0.12 * smoothstep(1.4, 1.46, z)    # 襟のノッチ
            e = lerp(2.0, 2.4, smoothstep(1.0, 1.3, z))
            inner = coat_point(z, rx + 0.004, f + 0.006, b, op - 0.01, e)
            outer = coat_point(z, rx + 0.01, f + 0.012, b, op + w, e)
            inner.x *= s; outer.x *= s
            rows_l.append((inner, outer))
        bm = bmesh.new()
        vs = [(bm.verts.new(a), bm.verts.new(b)) for a, b in rows_l]
        for i in range(len(vs) - 1):
            quad(bm, vs[i][0], vs[i][1], vs[i + 1][1], vs[i + 1][0], s < 0)
        orient(bm, lambda c: Vector((0, 0, c.z)))
        piping(part, bm, r=0.0035)
        lap.add_bm(bm, 'outfit_dark')
    lapel = lap.build(recalc=False)
    add_mod(lapel, 'SOLIDIFY', thickness=0.005, offset=-1.0)
    bake_modifiers(lapel)
    for p in lapel.data.polygons:
        p.use_smooth = True

    # 袖・袖口・肩当て
    sl = Part('Sleeves', ['outfit', 'outfit_dark', 'accent'])
    pads = Part('Pads', ['outfit'])
    for sfx in ('L', 'R'):
        d, side = arm_frame(sfx)
        tab = [(0.0, 0.05, 0.05), (0.05, 0.063, 0.061), (0.15, 0.058, 0.056), (0.27, 0.052, 0.05), (0.38, 0.05, 0.048), (0.44, 0.051, 0.049)]
        part_rings = [sec(SH[sfx] + d * t, side, FRONT, rx, ry, n=24) for t, rx, ry in interp_table(tab, 16)]
        sl.loft(part_rings, 'outfit', cap0=True, cap1=False)
        cuff = [sec(SH[sfx] + d * t, side, FRONT, rx, ry, n=24) for t, rx, ry in ((0.43, 0.054, 0.052), (0.47, 0.057, 0.055), (0.505, 0.059, 0.057))]
        sl.loft(cuff, 'outfit_dark', cap0=False, cap1=False)
        for t, r in ((0.43, 0.054), (0.505, 0.059)):
            tube_path(sl, sec(SH[sfx] + d * t, side, FRONT, r, r, n=24), 0.0038, 'accent', sides=6, closed=True)
        for k in (0, 1):
            bmb = bmesh.new()
            bmesh.ops.create_uvsphere(bmb, u_segments=10, v_segments=6, radius=0.0065)
            c = SH[sfx] + d * (0.455 + k * 0.03) + side * 0.056
            bmesh.ops.translate(bmb, vec=c, verts=bmb.verts)
            sl.add_bm(bmb, 'accent')
        # 肩当て（袖の付け根を覆う）
        s = 1 if sfx == 'L' else -1
        pad = []
        for i in range(8):
            t = i / 7
            a = lerp(-1.2, 1.25, t)
            ring = []
            for k in range(13):
                b = lerp(-1.4, 1.4, k / 12)
                r = 0.072 * (1 - 0.15 * abs(b) ** 2)
                p = Vector((s * (0.15 + math.sin(a) * 0.055), math.sin(b) * r * 1.0, 1.44 + math.cos(a) * 0.035 * math.cos(b)))
                ring.append(p)
            pad.append(ring)
        bmp = bmesh.new()
        vs = [[bmp.verts.new(p) for p in r] for r in pad]
        for i in range(len(vs) - 1):
            for k in range(len(vs[i]) - 1):
                quad(bmp, vs[i][k], vs[i][k + 1], vs[i + 1][k + 1], vs[i + 1][k], s < 0)
        orient(bmp, lambda c, s=s: Vector((s * 0.13, 0, 1.39)))
        piping(part, bmp, r=0.0035)
        pads.add_bm(bmp, 'outfit')
    sleeves = sl.build()
    pad_ob = pads.build(recalc=False)
    add_mod(pad_ob, 'SOLIDIFY', thickness=0.006, offset=-1.0)
    bake_modifiers(pad_ob)
    for p in pad_ob.data.polygons:
        p.use_smooth = True
    return [coat, part.build(), lapel, sleeves, pad_ob]

# ------------------------------------------------------------
#  小物：ベルト・ボタン・ブローチ・太ももベルト・ブーツ
# ------------------------------------------------------------
def build_props():
    pr = Part('Props', ['dark', 'accent', 'glow', 'outfit_dark'])
    # ベルト（ズボンの上端）
    z = 1.035
    zc, rx, f, b = table_at(TORSO, z)
    band = [sec(Vector((0, 0, z + dz)), X, FRONT, rx + 0.007, f + 0.007, b + 0.007, n=36, e=2.3) for dz in (-0.017, 0.017)]
    pr.loft(band, 'dark', cap0=False, cap1=False)
    bmb = bmesh.new()
    bmesh.ops.create_cube(bmb, size=1.0)
    bmesh.ops.scale(bmb, vec=(0.05, 0.012, 0.04), verts=bmb.verts)
    bmesh.ops.translate(bmb, vec=(0, -(f + 0.012), z), verts=bmb.verts)
    pr.add_bm(bmb, 'accent')
    # シャツのボタン
    for zb in (1.17, 1.24, 1.31):
        zc, rx, f, b = table_at(TORSO, zb)
        bmb = bmesh.new()
        bmesh.ops.create_uvsphere(bmb, u_segments=10, v_segments=6, radius=0.0055)
        bmesh.ops.scale(bmb, vec=(1, 0.5, 1), verts=bmb.verts)
        bmesh.ops.translate(bmb, vec=(0, -f - 0.001, zb), verts=bmb.verts)
        pr.add_bm(bmb, 'outfit_dark')
    # コートの留め具（ウエスト）
    for s in (1, -1):
        p = coat_point(1.09, 0.141, 0.1, 0.09, 0.2, 2.4); p.x *= s
        bmb = bmesh.new()
        bmesh.ops.create_uvsphere(bmb, u_segments=12, v_segments=8, radius=0.009)
        bmesh.ops.translate(bmb, vec=p + Vector((0, -0.004, 0)), verts=bmb.verts)
        pr.add_bm(bmb, 'accent')
    # ブローチ（左胸）：金の星と光る芯
    p = coat_point(1.33, 0.19, 0.126, 0.1, 0.72, 2.4)
    nrm = Vector((0.45, -1, 0.1)).normalized()
    pr.add_bm(star_bm(p, 0.026, 0.009, 0.006, normal=nrm, points=4), 'accent')
    bmb = bmesh.new()
    bmesh.ops.create_icosphere(bmb, subdivisions=1, radius=0.008)
    bmesh.ops.translate(bmb, vec=p + nrm * 0.01, verts=bmb.verts)
    pr.add_bm(bmb, 'glow')
    # 右太ももベルト
    zt = 0.76
    x = leg_x(zt, -1)
    zc, rx, f, b = min(interp_table(LEG, 40), key=lambda q: abs(q[0] - zt))
    band = [sec(Vector((x, leg_y(zt), zt + dz)), X, FRONT, rx + 0.006, f + 0.006, b + 0.006, n=24) for dz in (-0.011, 0.011)]
    pr.loft(band, 'dark', cap0=False, cap1=False)
    bmb = bmesh.new()
    bmesh.ops.create_cube(bmb, size=1.0)
    bmesh.ops.scale(bmb, vec=(0.022, 0.008, 0.026), verts=bmb.verts)
    bmesh.ops.translate(bmb, vec=(x - 0.025, -(f + 0.008), zt), verts=bmb.verts)
    pr.add_bm(bmb, 'accent')
    return pr.build(recalc=False)

def build_boots():
    bt = Part('Boots', ['dark', 'accent', 'outfit_dark'])
    for s in (1, -1):
        rows = interp_table([r for r in LEG if r[0] <= 0.47], 14)
        rings = []
        for z, rx, f, b in rows[::-1]:
            if z > 0.44:
                continue
            rings.append(sec(Vector((leg_x(z, s), leg_y(z), z)), X, FRONT, rx + 0.011, f + 0.011, b + 0.011, n=24))
        top_z = 0.44
        zc, rx, f, b = min(interp_table(LEG, 60), key=lambda q: abs(q[0] - top_z))
        rings.append(sec(Vector((leg_x(top_z, s), 0, top_z)), X, FRONT, rx + 0.02, f + 0.022, b + 0.018, n=24))
        bt.loft(rings, 'dark', cap0=True, cap1=False)
        tube_path(bt, rings[-1], 0.005, 'accent', sides=6, closed=True)
        # 足の甲〜つま先
        x = leg_x(0.05, s)
        foot = [(0.06, 0.036, 0.036, 0.045), (0.035, 0.043, 0.05, 0.055), (-0.02, 0.046, 0.046, 0.05), (-0.08, 0.044, 0.038, 0.042),
                (-0.125, 0.036, 0.028, 0.032), (-0.15, 0.022, 0.018, 0.026)]
        rings = []
        for y, w, h, zc in interp_table(foot, 12):
            ring = []
            for k in range(20):
                a = k / 20 * TAU
                ca, sa = math.cos(a), math.sin(a)
                ring.append(Vector((x + ca * w, y, zc + sa * (h if sa > 0 else zc - 0.014))))
            rings.append(ring)
        bt.loft(rings, 'dark')
        # 靴底とかかと
        sole = [(0.064, 0.036), (0.03, 0.045), (-0.03, 0.049), (-0.09, 0.046), (-0.135, 0.036), (-0.158, 0.02)]
        sr = []
        for y, w in interp_table(sole, 10):
            sr.append([Vector((x + math.cos(a) * w, y, 0.012 + math.sin(a) * 0.012)) for a in [k / 16 * TAU for k in range(16)]])
        bt.loft(sr, 'outfit_dark')
        bmb = bmesh.new()
        bmesh.ops.create_cube(bmb, size=1.0)
        bmesh.ops.scale(bmb, vec=(0.058, 0.05, 0.03), verts=bmb.verts)
        bmesh.ops.translate(bmb, vec=(x, 0.04, 0.015), verts=bmb.verts)
        bt.add_bm(bmb, 'outfit_dark')
        # ベルトと留め金
        for zs in (0.17, 0.3):
            zc_, rx, f, b = min(interp_table(LEG, 60), key=lambda q: abs(q[0] - zs))
            band = [sec(Vector((leg_x(zs, s), leg_y(zs), zs + dz)), X, FRONT, rx + 0.016, f + 0.016, b + 0.016, n=24) for dz in (-0.01, 0.01)]
            bt.loft(band, 'outfit_dark', cap0=False, cap1=False)
            bmb = bmesh.new()
            bmesh.ops.create_cube(bmb, size=1.0)
            bmesh.ops.scale(bmb, vec=(0.008, 0.02, 0.024), verts=bmb.verts)
            bmesh.ops.translate(bmb, vec=(leg_x(zs, s) + s * (rx + 0.018), 0, zs), verts=bmb.verts)
            bt.add_bm(bmb, 'accent')
    return bt.build()


# ------------------------------------------------------------
#  マフラー
# ------------------------------------------------------------
def build_scarf():
    sc = Part('Scarf', ['scarf', 'accent'])
    for z0, rx, ry, tilt, r, h in ((1.498, 0.08, 0.076, 0.02, 0.013, 2.4), (1.54, 0.07, 0.067, -0.012, 0.011, 2.2)):
        ring = [Vector((math.sin(a) * rx, -math.cos(a) * ry, z0 + tilt * math.cos(a) + 0.008 * math.sin(a))) for a in [k / 40 * TAU for k in range(40)]]
        tube_path(sc, ring, r, 'scarf', sides=12, flat=h, closed=True)
    # 結び目（左前）と前に垂れる端
    bmb = bmesh.new()
    bmesh.ops.create_uvsphere(bmb, u_segments=14, v_segments=10, radius=0.026)
    bmesh.ops.scale(bmb, vec=(1.1, 0.8, 1.0), verts=bmb.verts)
    bmesh.ops.translate(bmb, vec=(0.045, -0.08, 1.49), verts=bmb.verts)
    sc.add_bm(bmb, 'scarf')
    def tail(ctrl, w0, w1, up):
        pts = ribbon(sc, ctrl, w0, w1, up, 'scarf')
        p, (t, side, u) = pts[-2], frames(pts, up)[-2]
        tube_path(sc, [p + side * w1 * 1.02, p - side * w1 * 1.02], 0.0035, 'accent', sides=6)   # 端の金のライン
    tail([Vector((0.05, -0.088, 1.48)), Vector((0.066, -0.106, 1.41)), Vector((0.07, -0.112, 1.34)), Vector((0.062, -0.11, 1.28))], 0.026, 0.036, Vector((0, -1, 0)))
    # 背中に垂れる長い端（真下が基準。ゲーム側でなびかせる）
    tail([Vector((0.035, 0.09, 1.5)), Vector((0.035, 0.108, 1.42)), Vector((0.035, 0.11, 1.3)), Vector((0.035, 0.11, 1.18)), Vector((0.035, 0.11, 1.06))], 0.032, 0.042, Vector((0, 1, 0)))
    return sc.build()


# ------------------------------------------------------------
#  武器（バット）：ゲーム側で手に持たせる。ローカル +Z が柄→先端
# ------------------------------------------------------------
def build_weapon():
    wp = Part('Weapon', ['dark', 'metal', 'accent', 'glow'])
    prof = [(-0.095, 0.0), (-0.094, 0.018), (-0.088, 0.026), (-0.078, 0.024), (-0.072, 0.015), (0.0, 0.0145), (0.18, 0.0155),
            (0.3, 0.021), (0.45, 0.03), (0.62, 0.034), (0.76, 0.034), (0.8, 0.028), (0.812, 0.0)]
    rows = [(z, r) for z, r in prof]
    def ring(z, r):
        return [Vector((math.cos(a) * r, math.sin(a) * r, z)) for a in [k / 20 * TAU for k in range(20)]] if r > 0 else [Vector((0, 0, z))]
    grip = [ring(z, r) for z, r in rows[:7]]
    wp.loft(grip, 'dark', cap0=False, cap1=False)
    wp.loft([ring(z, r) for z, r in rows[6:]], 'metal', cap0=False, cap1=False)
    for z in (-0.06, -0.02, 0.02, 0.06, 0.1, 0.14):   # グリップテープの段
        tube_path(wp, ring(z, 0.0152), 0.0025, 'dark', sides=5, closed=True)
    for z, r in ((0.2, 0.0165), (0.64, 0.0345), (0.7, 0.0345)):
        tube_path(wp, ring(z, r + 0.001), 0.0035, 'accent', sides=6, closed=True)
    # 光るライン
    pts = [Vector((0, -(lerp(0.021, 0.034, smoothstep(0.3, 0.6, z)) + 0.001), z)) for z in [lerp(0.3, 0.6, i / 10) for i in range(11)]]
    tube_path(wp, pts, 0.0028, 'glow', sides=6)
    wp.add_bm(star_bm(Vector((0, -0.0345, 0.67)), 0.018, 0.006, 0.004, normal=Vector((0, -1, 0)), up=Vector((0, 0, 1))), 'accent')
    ob = wp.build()
    ob.location = (0.55, 0.3, 0.2)
    return ob


# ------------------------------------------------------------
#  組み立て
# ------------------------------------------------------------
body = build_body_aster()
auto_weights(body)
hands = build_hands(0.52, {'L': {'glove': True, 'cuff': 'accent'}, 'R': {'glove': True, 'cuff': 'accent', 'fist': 1.0}}, ['glove', 'skin', 'accent'])
head, ears = build_head(head_shape, ear=(0.088, 0.014, -0.01, 0.054))
hair, ahoge = build_hair()
coat, coat_trim, lapel, sleeves, pads = build_coat()
props = build_props()
boots = build_boots()
scarf = build_scarf()
weapon = build_weapon()

for o in (hair, ahoge):
    rigid(o, 'head')
coat_skirt = lambda co: skirt_weights(co, 1.0, 0.5, 0.8)
for o in (coat, coat_trim, lapel):
    transfer(o, body); blend_lower(o, 1.1, 0.98, coat_skirt); attach(o)
for o in (sleeves, pads, props):
    transfer(o, body); attach(o)
boot_weights(boots, 0.1); attach(boots)
tail_weights(scarf, lambda co: co.y >= 0.085 and co.z <= 1.5, root_bone='chest', root_z=1.45)

meshes = [o for o in scene().objects if o.type == 'MESH']
bake_ao([o for o in meshes if o is not weapon], skip=('Head',), tint={'Hair': hair_band, 'Ahoge': hair_band})
bake_ao([weapon])
save('aster')
