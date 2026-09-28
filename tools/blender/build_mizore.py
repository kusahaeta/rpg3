# ミゾレ（氷壁の守人）の3Dモデルを Blender 上で一から組み立てる。
#
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/build_mizore.py
#
# 出力: assets/blender/mizore.blend。ゲーム用の GLB は tools/blender/export_glb.py で書き出す。
# 共通部品は charlib.py。座標系: Blender は Z 上・キャラは -Y 向き。
import os, sys, math, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from charlib import *
from mathutils import Vector, Matrix

reset(hc=(0, 0, 1.585), hr=(0.089, 0.094, 0.097))
HC, HR = C.hc, C.hr
HEAD_ONLY = os.environ.get('HEAD_ONLY')

material('skin', '#ffeae2')
material('face', '#ffeae2')
material('hair', '#d9f2ff')
material('shirt', '#f8f9ff')
material('outfit', '#a6d5f5')        # ジャケット
material('outfit_dark', '#4d7fc4')   # 裏地・ベルト
material('skirt', '#2a3a78')
material('dark', '#1c1b27')
material('glove', '#1c1b27')
material('accent', '#8fe6ff', metal=0.3)
material('ribbon', '#6fc3f0')
material('metal', '#dfe8f5', metal=0.8)
material('ice', '#c9f2ff')
material('glow', '#8fe9ff', emit=2.0)

TAIL_Z = [1.0, 0.9, 0.8, 0.7, 0.6]
rig = build_rig({
    'z': (0.86, 1.0, 1.16, 1.36, 1.47, 1.69),
    'shoulder': (0.14, 0.004, 1.355), 'arm': (0.25, 0.225, 0.15),
    'leg': ((0.078, 0, 0.855), (0.07, -0.006, 0.47), (0.066, 0.012, 0.105), (0.066, -0.1, 0.012)),
    'tail': (0.0, 0.1, TAIL_Z, 'hips'),
})
SH, ARMD = C.sh, C.armd


# ------------------------------------------------------------
#  頭：丸顔にしない。頬骨（目の高さ）から下を直線的に絞って小さなあご先へ、
#      横から見るとあご先 → 耳の下へ上がるあごのライン、平らな顔の面
# ------------------------------------------------------------
def head_shape(n):
    x, y, z = n.x, n.y, n.z
    ring = math.sqrt(max(1e-5, 1 - z * z))
    fh = -y / ring                                   # 水平方向の正面度（cos phi）
    t = clamp01((-z - 0.1) / 0.9)                    # 頬骨=0 → あご先=1
    face = smoothstep(-0.95, -0.05, fh)              # 顔〜側面（後頭部の真後ろは除く）
    front = smoothstep(-0.1, 0.95, fh)               # 顔の正面（横へなだらかに）
    sx = 1.0
    if z < -0.1:
        # 頬からあごへ直線的に細く、先端だけ丸める
        W = (0.995 - 0.7 * t ** 1.55) * math.sqrt(max(0.0, 1 - smoothstep(0.9, 1.0, t) ** 2))
        sx = W / ring                                # 下半分は後ろ側まで同じ幅に絞る（輪郭がくびれないように）
    px, py, pz = x * sx * HR.x, y * HR.y, z * HR.z
    pz *= 1 + 0.13 * t * face                         # 顔の下半分を少し長く
    py *= 1 - 0.09 * smoothstep(0.55, 0.95, fh) * smoothstep(-0.9, -0.2, z) * smoothstep(0.7, 0.2, z)  # 顔の面を平らに
    pz -= 0.012 * t ** 1.6 * front                    # あご先
    py -= 0.007 * t ** 1.6 * front
    pz += 0.014 * t ** 1.4 * (1 - front) * face       # 耳の下はあごの裏を持ち上げてエラを作る
    back = 1 - face
    py *= 1 - 0.3 * t * back                          # うなじ
    pz += 0.02 * t * back
    py += 0.011 * smoothstep(0.1, 0.9, -fh) * smoothstep(-0.4, 0.6, z)   # 後頭部のふくらみ
    nose = Vector((0, -1, -0.3)).normalized()
    py -= 0.0055 * math.exp(-((n - nose).length / 0.1) ** 2)             # 小さな鼻
    return Vector((px, py, pz))


# ------------------------------------------------------------
#  体（女性の体型）
# ------------------------------------------------------------
TORSO = [  # z, 横, 前, 後
    (0.77, 0.085, 0.06, 0.07), (0.81, 0.128, 0.078, 0.094), (0.87, 0.15, 0.084, 0.104),
    (0.94, 0.143, 0.079, 0.096), (1.00, 0.118, 0.07, 0.08), (1.06, 0.1, 0.067, 0.068),
    (1.12, 0.107, 0.074, 0.066), (1.18, 0.124, 0.094, 0.07), (1.23, 0.131, 0.107, 0.072),
    (1.28, 0.129, 0.096, 0.072), (1.32, 0.127, 0.079, 0.07), (1.355, 0.117, 0.066, 0.066),
    (1.38, 0.085, 0.052, 0.055), (1.40, 0.05, 0.04, 0.045)]
LEG = [  # z, 横, 前, 後
    (0.86, 0.077, 0.077, 0.084), (0.78, 0.071, 0.07, 0.075), (0.68, 0.062, 0.061, 0.064),
    (0.58, 0.052, 0.052, 0.054), (0.48, 0.044, 0.045, 0.045), (0.42, 0.044, 0.042, 0.049),
    (0.34, 0.046, 0.039, 0.054), (0.26, 0.039, 0.035, 0.044), (0.17, 0.03, 0.03, 0.032),
    (0.11, 0.026, 0.027, 0.029)]
ARM = [  # 肩からの距離, 横, 前後
    (0.0, 0.038, 0.038), (0.05, 0.042, 0.04), (0.13, 0.038, 0.037), (0.25, 0.031, 0.031),
    (0.33, 0.033, 0.031), (0.42, 0.026, 0.023), (0.48, 0.022, 0.019)]

def leg_xy(z, s):
    return (s * lerp(0.066, 0.078, smoothstep(0.1, 0.86, z)), -0.006 * smoothstep(0.86, 0.47, z) * smoothstep(0.1, 0.47, z))

def body_region(c):
    if c.z > 1.37 and abs(c.x) < 0.06:
        return 'skin'                                  # 首
    if c.z < 0.8 and abs(c.x) > 0.025:
        return 'skin'                                  # 脚
    if c.z < 1.02:
        return 'skirt'                                 # スカートの下（突き抜け対策）
    return 'shirt'


# ------------------------------------------------------------
#  髪：水色のボブ。毛先は外ハネ、顔まわりの横髪は鎖骨まで
# ------------------------------------------------------------
def build_hair():
    part = Part('Hair', ['hair'])
    hair_cap(part, lambda phi: 1.1 + 1.45 * (1 - math.cos(phi)) / 2 + 0.22 * abs(math.sin(phi)))
    # 後ろ（あごの高さまでのボブ、毛先を外へ）
    for i in range(13):
        k = (i - 6) / 6
        ph = math.pi + k * 1.5
        L = 2.42 + 0.07 * (1 - abs(k)) + (0.05 if i % 2 else -0.03)
        clump(part, [(0.3, math.pi + k * 0.3, 1.02), (0.9, ph, 1.13), (1.6, ph + 0.04 * k, 1.16), (2.1, ph + 0.08 * k, 1.19),
                     (L, ph + 0.14 * k, 1.28), (L + 0.1, ph + 0.22 * k, 1.5)], 0.05, bend=0.55, n=18)
    # 頭頂
    for i in range(8):
        ph = math.pi + (i - 3.5) * 0.62
        clump(part, [(0.12, math.pi + (i - 3.5) * 0.15, 1.02), (0.55, ph, 1.19), (1.05, ph, 1.2), (1.4, ph, 1.2)], 0.05, bend=0.6)
    for i in range(5):
        ph = (i - 2) * 0.45
        clump(part, [(0.45, math.pi * 0.9 + ph * 0.3, 1.02), (0.1, ph * 0.5, 1.16), (0.5, ph, 1.22), (0.9, ph * 1.05, 1.2)], 0.05, bend=0.6)
    # 前髪（目は隠さない。細い束が目の間に数本）
    bangs = [(0.0, 1.45, 0.034), (0.22, 1.36, 0.042), (-0.22, 1.38, 0.042), (0.45, 1.33, 0.04), (-0.47, 1.34, 0.04),
             (0.7, 1.5, 0.04), (-0.72, 1.52, 0.04), (0.1, 1.62, 0.015), (-0.13, 1.66, 0.013), (0.33, 1.26, 0.03)]
    for ph, th1, w in bangs:
        tip = ph * 0.82 + 0.06
        clump(part, [(0.2, ph * 0.35, 1.04), (0.7, ph * 0.9, 1.16), (1.1, ph * 0.92, 1.15), (th1, tip, 1.12)], w, bend=0.45, taper=0.9)
    # 横髪（顔まわりは長く、鎖骨まで）
    for s in (1, -1):
        clump(part, [(0.55, s * 1.02, 1.05), (1.1, s * 1.16, 1.15), (1.6, s * 1.2, 1.14),
                     Vector((s * 0.086, -0.035, 1.53)), Vector((s * 0.08, -0.04, 1.44)), Vector((s * 0.068, -0.045, 1.37))], 0.04, bend=0.45, n=20)
        clump(part, [(0.6, s * 1.45, 1.05), (1.2, s * 1.58, 1.15), (1.8, s * 1.66, 1.15),
                     Vector((s * 0.098, -0.004, 1.5)), Vector((s * 0.104, 0.004, 1.43))], 0.042, bend=0.45, n=18)
        clump(part, [(0.5, s * 0.84, 1.05), (1.05, s * 0.9, 1.15), (1.55, s * 0.92, 1.14), (2.0, s * 0.86, 1.12)], 0.034, bend=0.45)
        clump(part, [(0.65, s * 1.9, 1.05), (1.25, s * 2.0, 1.15), (1.85, s * 2.05, 1.16), (2.35, s * 2.1, 1.3)], 0.045, bend=0.5)
    hair = part.build()
    # 髪飾り（左側に氷の結晶）
    acc = Part('HairPin', ['ice', 'glow', 'accent'])
    p = hp(0.95, 1.05, 1.2)
    nrm = (p - HC).normalized()
    acc.add_bm(star_bm(p, 0.026, 0.008, 0.008, normal=nrm, up=Vector((0, 0, 1)), points=6), 'ice')
    acc.add_bm(sphere_bm(p + nrm * 0.012, 0.006), 'glow')
    for k in (-1, 1):
        q = hp(0.95 + k * 0.12, 1.2, 1.17)
        tube_path(acc, [q - Vector((0, 0.02, 0)), q + Vector((0, 0.02, 0.0))], 0.0028, 'accent', sides=6)
    pin = acc.build()
    for o in (hair, pin):
        rigid(o, 'head')
    return [hair, pin]


# ------------------------------------------------------------
#  衣装
# ------------------------------------------------------------
JACKET = [  # z, 横, 前, 後, 前の開き(rad)
    (1.405, 0.07, 0.054, 0.058, 0.95), (1.385, 0.125, 0.066, 0.07, 0.9), (1.36, 0.162, 0.08, 0.08, 0.88),
    (1.32, 0.16, 0.1, 0.082, 0.88), (1.27, 0.143, 0.118, 0.08, 0.92), (1.22, 0.134, 0.113, 0.078, 1.02),
    (1.17, 0.124, 0.1, 0.075, 1.2)]

def ring_point(z, rx, ryf, ryb, th, e=2.2):
    s, c = math.sin(th), math.cos(th)
    x = math.copysign(abs(s) ** (2 / e), s) * rx
    y = -math.copysign(abs(c) ** (2 / e), c) * (ryf if c > 0 else ryb)
    return Vector((x, y, z))

def build_jacket(trim):
    rows = interp_table(JACKET, 22)
    cols = 24
    bm = bmesh.new()
    seam = []
    for s in (1, -1):
        grid = []
        for z, rx, f, b, op in rows:
            row = []
            for i in range(cols + 1):
                th = lerp(op, math.pi, i / cols)
                p = ring_point(z - 0.05 * max(0.0, -math.cos(th)) * smoothstep(1.25, 1.17, z), rx + 0.012, f + 0.012, b + 0.012, th)
                p.x *= s
                row.append(p)
            grid.append(row)
        _, vs = grid_bm(grid, flip=s < 0, bm=bm)
        seam += [r[-1] for r in vs]
    bmesh.ops.remove_doubles(bm, verts=seam, dist=1e-5)
    orient(bm, lambda c: Vector((0, 0, c.z)))
    piping(trim, bm, mat='accent', r=0.0035)
    jk = solid_sheet('Jacket', bm, 'outfit', 0.007)

    # 袖：ジャケットは肘から先が広がるベル袖、中から白いシャツの袖と袖口のフリル
    sl = Part('Sleeves', ['outfit', 'shirt', 'ribbon', 'accent'])
    for sfx in ('L', 'R'):
        d, side = arm_frame(sfx)
        tab = [(0.0, 0.047), (0.06, 0.052), (0.15, 0.052), (0.24, 0.058), (0.31, 0.074), (0.37, 0.092)]
        rows = [sec(SH[sfx] + d * t - FRONT * 0.004 * t, side, FRONT, r, r * 0.95, n=28) for t, r in interp_table(tab, 16)]
        bm2, _ = grid_bm(rows, closed=True)
        orient(bm2, lambda c, sfx=sfx: SH[sfx] + ARMD[sfx] * (c - SH[sfx]).dot(ARMD[sfx]))
        piping(trim, bm2, mat='accent', r=0.0035, only=lambda p, sfx=sfx: (p - SH[sfx]).dot(ARMD[sfx]) > 0.2)
        sl.add_bm(bm2, 'outfit')
        tab = [(0.28, 0.036), (0.36, 0.037), (0.42, 0.039), (0.455, 0.048), (0.49, 0.058)]
        rows = [sec(SH[sfx] + d * t, side, FRONT, r, r, n=24) for t, r in interp_table(tab, 10)]
        bm3, _ = grid_bm(rows, closed=True)
        orient(bm3, lambda c, sfx=sfx: SH[sfx] + ARMD[sfx] * (c - SH[sfx]).dot(ARMD[sfx]))
        piping(trim, bm3, mat='accent', r=0.0025, only=lambda p, sfx=sfx: (p - SH[sfx]).dot(ARMD[sfx]) > 0.47)
        sl.add_bm(bm3, 'shirt')
        c = SH[sfx] + d * 0.44 - FRONT * -0.04 + side * 0.0
        bow(sl, SH[sfx] + d * 0.445 + FRONT * 0.038, 0.05, 0.024, 0.012, 'ribbon', normal=FRONT, up=-d, tails=0.035)
    sleeves = sl.build(recalc=False)
    add_mod(sleeves, 'SOLIDIFY', thickness=0.004, offset=-1.0)
    bake_modifiers(sleeves)

    # 白い大きな襟（ジャケットの肩にかかる）
    rows = []
    for j, (z, rx, ry) in enumerate(((1.43, 0.043, 0.042), (1.405, 0.08, 0.07), (1.385, 0.13, 0.092), (1.36, 0.158, 0.105))):
        row = []
        for i in range(33):
            th = lerp(0.42, TAU - 0.42, i / 32)
            p = ring_point(z, rx, ry, ry * 0.95, th, e=2.2)
            front = max(0.0, math.cos(th))
            p.z -= 0.075 * front ** 1.6 * j / 3            # 前は襟先が下がる
            p.y -= 0.012 * front * j / 3
            row.append(p)
        rows.append(row)
    bm4, _ = grid_bm(rows)
    orient(bm4, lambda c: Vector((0, 0, c.z - 0.2)))
    piping(trim, bm4, mat='accent', r=0.003, only=lambda p: p.z < 1.415)
    collar = solid_sheet('Collar', bm4, 'shirt', 0.005)
    return [jk, sleeves, collar]

SKIRT = [  # z, 横, 前, 後
    (1.035, 0.108, 0.075, 0.072), (0.98, 0.15, 0.1, 0.11), (0.9, 0.19, 0.14, 0.155),
    (0.8, 0.222, 0.172, 0.19), (0.7, 0.245, 0.196, 0.214)]
PLEATS = 26

def skirt_point(z, rx, f, b, th, t, extra=0.0):
    tri = abs(((th / TAU * PLEATS) % 1.0) - 0.5) * 2          # プリーツの山谷
    amp = 0.013 * t
    p = ring_point(z, rx + amp * tri + extra, f + amp * tri + extra, b + amp * tri + extra, th, e=2.0)
    p.z -= 0.012 * max(0.0, -math.cos(th)) * t                 # 後ろを少し長く
    return p

def build_skirt(trim):
    rows = interp_table(SKIRT, 14)
    cols = PLEATS * 6
    grid = []
    for j, (z, rx, f, b) in enumerate(rows):
        t = j / (len(rows) - 1)
        grid.append([skirt_point(z, rx, f, b, i / cols * TAU, t) for i in range(cols)])
    bm, _ = grid_bm(grid, closed=True)
    orient(bm, lambda c: Vector((0, 0, c.z)))
    piping(trim, bm, mat='shirt', r=0.004, only=lambda p: p.z < 0.75)
    z, rx, f, b = rows[-2]
    ring = [skirt_point(0.715, *table_at(SKIRT, 0.715)[1:], i / cols * TAU, 0.93, extra=0.003) for i in range(cols)]
    tube_path(trim, ring, 0.0022, 'shirt', sides=5, closed=True)
    skirt = solid_sheet('Skirt', bm, 'skirt', 0.006)

    # 腰に巻いた黒い上着（右側に垂れる）と前の結び目
    wr = Part('Wrap', ['dark', 'outfit_dark', 'accent'])
    grid = []
    rows2 = interp_table([(1.03, 0.114, 0.08, 0.078), (0.95, 0.172, 0.122, 0.132), (0.85, 0.215, 0.16, 0.176), (0.74, 0.25, 0.196, 0.21), (0.66, 0.268, 0.21, 0.228)], 14)
    for j, (z, rx, f, b) in enumerate(rows2):
        row = []
        for i in range(29):
            th = lerp(0.35, 2.75, i / 28) + 0.1 * j / 13
            p = ring_point(z - 0.03 * j / 13 * math.sin(th), rx + 0.012, f + 0.012, b + 0.012, th)
            p.x = -p.x                                                   # 右側（-X）
            row.append(p)
        grid.append(row)
    bm2, _ = grid_bm(grid, flip=True)
    orient(bm2, lambda c: Vector((0, 0, c.z)))
    piping(trim, bm2, mat='accent', r=0.003, only=lambda p: p.z < 1.0)
    wrap = solid_sheet('WrapCloth', bm2, 'dark', 0.006)
    knot = Vector((0.035, -0.092, 1.02))
    wr.add_bm(sphere_bm(knot, 0.03, (1.2, 0.7, 0.9)), 'dark')
    for k, (dx, L) in enumerate(((-0.04, 0.2), (0.03, 0.15))):
        pts = spline([knot, knot + Vector((dx * 0.5, -0.015, -0.05)), knot + Vector((dx, -0.02, -L))], 10)
        tube_path(wr, pts, lambda p: 0.018, 'dark', sides=10, flat=0.55, up=FRONT)
        end = pts[-1]
        tube_path(wr, sec(end, X, FRONT, 0.02, 0.012, n=12), 0.004, 'outfit_dark', sides=6, closed=True)
    knot_ob = wr.build()

    # ななめのベルトと左腰のポーチ（氷の結晶の飾り）
    bt = Part('Belt', ['outfit_dark', 'metal', 'shirt', 'accent', 'glow', 'ribbon'])
    ring = []
    for i in range(49):
        th = i / 48 * TAU
        z = 0.985 + 0.028 * math.sin(th)                  # 左で高く右で低い
        zc, rx, f, b = table_at(SKIRT, z)
        ring.append(skirt_point(z, rx, f, b, th, clamp01((1.035 - z) / 0.335), extra=0.018))
    tube_path(bt, ring[:-1], 0.01, 'outfit_dark', sides=8, flat=0.35, up=lambda p: Vector((p.x, p.y, 0)).normalized(), closed=True)
    bt.add_bm(box_bm(ring[12] + Vector((0.004, -0.004, 0)), (0.03, 0.02, 0.032)), 'metal')
    pc = Vector((0.155, -0.06, 0.93))
    bt.add_bm(box_bm(pc, (0.05, 0.035, 0.062)), 'shirt')
    bt.add_bm(box_bm(pc + Vector((0, -0.012, 0.022)), (0.054, 0.02, 0.022)), 'ribbon')
    bt.add_bm(star_bm(pc + Vector((0.0, -0.019, -0.008)), 0.013, 0.004, 0.004, normal=Vector((0.3, -1, 0)).normalized(), points=6), 'accent')
    bt.add_bm(sphere_bm(pc + Vector((0.002, -0.025, -0.008)), 0.004), 'glow')
    belt = bt.build()

    # 背中の大きなリボン（垂れはボーンで揺らす）
    rb = Part('BackBow', ['ribbon', 'accent'])
    bc = Vector((0, 0.1, 1.035))
    bow(rb, bc, 0.22, 0.095, 0.05, 'ribbon', normal=Vector((0, 1, 0)), up=Vector((0, 0, 1)))
    for s in (1, -1):
        ctrl = []
        for k, z in enumerate((1.02, 0.94, 0.84, 0.74, 0.64, 0.57)):
            zc, rx, f, b = table_at(SKIRT, max(z, 0.7))
            ctrl.append(Vector((s * (0.02 + 0.03 * k / 5), b + 0.025 + (0.02 if z < 0.7 else 0.0), z)))
        pts = ribbon(rb, ctrl, 0.03, 0.042, Vector((0, 1, 0)), 'ribbon', thick=0.004)
        p, (t, side, u) = pts[-2], frames(pts, Vector((0, 1, 0)))[-2]
        tube_path(rb, [p + side * 0.043, p - side * 0.043], 0.0025, 'accent', sides=6)
    backbow = rb.build()
    return [skirt, wrap, knot_ob, belt, backbow]

def build_props(trim):
    pr = Part('Props', ['dark', 'ice', 'glow', 'accent', 'shirt', 'ribbon'])
    # チョーカーと氷のペンダント
    band = [sec(Vector((0, 0.004, z)), X, FRONT, 0.037, 0.036, 0.036, n=24) for z in (1.44, 1.456)]
    pr.loft(band, 'dark', cap0=False, cap1=False)
    oc = Vector((0, -0.042, 1.428))
    ob = bmesh.new(); bmesh.ops.create_icosphere(ob, subdivisions=0, radius=1.0)
    bmesh.ops.scale(ob, vec=(0.007, 0.005, 0.012), verts=ob.verts); bmesh.ops.translate(ob, vec=oc, verts=ob.verts)
    pr.add_bm(ob, 'ice')
    # 胸の雪の結晶のブローチ（左胸）
    p = ring_point(1.3, 0.172, 0.118, 0.09, 1.0)
    nrm = Vector((0.55, -1, 0.05)).normalized()
    pr.add_bm(star_bm(p, 0.024, 0.007, 0.005, normal=nrm, points=6), 'accent')
    pr.add_bm(sphere_bm(p + nrm * 0.008, 0.007), 'glow')
    # 右太もものガーター（白いバンドと小さなリボン、スカートへ伸びるストラップ）
    zt = 0.7
    x, y = leg_xy(zt, -1)
    zc, rx, f, b = table_at(LEG, zt)
    pr.loft([sec(Vector((x, y, zt + dz)), X, FRONT, rx + 0.004, f + 0.004, b + 0.004, n=24) for dz in (-0.012, 0.012)], 'shirt', cap0=False, cap1=False)
    bow(pr, Vector((x - rx * 0.55, y - f * 0.85, zt)), 0.04, 0.02, 0.01, 'ribbon', normal=Vector((-0.5, -1, 0)).normalized())
    for a in (0.5, 2.5):
        p0 = Vector((x + math.cos(a) * -(rx + 0.005), y - math.sin(a) * (f + 0.005), zt + 0.012))
        tube_path(pr, [p0, p0 + Vector((-0.004 * math.cos(a), 0, 0.07))], 0.0025, 'dark', sides=5)
    props = pr.build()
    return props

def build_boots():
    bt = Part('Boots', ['dark', 'outfit', 'accent', 'ribbon', 'outfit_dark'])
    for s in (1, -1):
        x = leg_xy(0.1, s)[0]
        # くるぶし上までの筒
        rows = []
        for z in [lerp(0.09, 0.2, i / 6) for i in range(7)]:
            zc, rx, f, b = table_at(LEG, max(z, 0.11))
            rows.append(sec(Vector((leg_xy(z, s)[0], 0.004, z)), X, FRONT, rx + 0.008, f + 0.008, b + 0.008, n=24))
        bt.loft(rows, 'dark', cap0=False, cap1=False)
        top = [sec(Vector((leg_xy(0.2, s)[0], 0.002, z)), X, FRONT, r, r * 0.95, r * 1.05, n=24) for z, r in ((0.2, 0.041), (0.225, 0.047), (0.24, 0.05))]
        bt.loft(top, 'outfit', cap0=False, cap1=False)
        tube_path(bt, top[-1], 0.0035, 'accent', sides=6, closed=True)
        # 足（ヒールでかかとが上がる）
        foot = [(0.05, 0.022, 0.12, 0.08), (0.03, 0.03, 0.13, 0.062), (0.0, 0.032, 0.12, 0.045), (-0.03, 0.035, 0.095, 0.028),
                (-0.065, 0.036, 0.058, 0.01), (-0.1, 0.03, 0.04, 0.006), (-0.128, 0.012, 0.024, 0.008)]
        rings = []
        for y, w, top_z, bot_z in interp_table(foot, 14):
            c = Vector((x, y, (top_z + bot_z) / 2))
            rings.append(sec(c, X, Vector((0, 0, 1)), w, (top_z - bot_z) / 2, (top_z - bot_z) / 2, n=20, e=2.6))
        bt.loft(rings, 'dark')
        bt.add_bm(box_bm(Vector((x, 0.033, 0.035)), (0.026, 0.024, 0.07)), 'dark')          # ヒール
        bt.add_bm(box_bm(Vector((x, 0.033, 0.003)), (0.028, 0.026, 0.006)), 'outfit_dark')
        bow(bt, Vector((x, -0.052, 0.13)), 0.05, 0.024, 0.012, 'ribbon', normal=Vector((0, -1, 0.5)).normalized())
    return bt.build()


# ------------------------------------------------------------
#  盾（氷の六角盾）：ゲーム側で左腕に付ける。-Y 向きの面が表
# ------------------------------------------------------------
def build_shield():
    sp = Part('Shield', ['ice', 'accent', 'glow', 'outfit_dark'])
    R = 0.27
    hexp = lambda r, y, rot=0.0: [Vector((math.cos(a) * r, y, math.sin(a) * r)) for a in [k / 6 * TAU + math.pi / 2 + rot for k in range(6)]]
    # 面取りした板（中央が盛り上がったカット面）
    sp.loft([hexp(R, 0.012), hexp(R * 1.02, 0.0), hexp(R, -0.012), hexp(R * 0.62, -0.03), [Vector((0, -0.04, 0))]], 'ice', cap0=True, cap1=False)
    tube_path(sp, hexp(R * 1.02, 0.0), 0.009, 'accent', sides=6, closed=True)
    tube_path(sp, hexp(R * 0.64, -0.03), 0.004, 'accent', sides=6, closed=True)
    # 角の氷のトゲ
    for p in hexp(R * 1.02, 0.0):
        d = p.normalized()
        ob = bmesh.new(); bmesh.ops.create_cone(ob, cap_ends=True, segments=5, radius1=0.018, radius2=0.0, depth=0.07)
        m = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        bmesh.ops.transform(ob, matrix=Matrix.Translation(p + d * 0.03) @ m, verts=ob.verts)
        sp.add_bm(ob, 'ice')
    sp.add_bm(star_bm(Vector((0, -0.04, 0)), 0.07, 0.018, 0.008, normal=FRONT, points=6), 'glow')
    sp.add_bm(box_bm(Vector((0, 0.03, 0)), (0.03, 0.03, 0.12)), 'outfit_dark')   # 裏の持ち手
    ob = sp.build()
    ob.location = (0.6, 0.2, 1.0)
    return ob


# ------------------------------------------------------------
#  組み立て
# ------------------------------------------------------------
if HEAD_ONLY:
    head, ears = build_head(head_shape, ear=(0.083, 0.012, -0.012, 0.05))
    save('mizore_head')
    raise SystemExit

body = build_body(TORSO, LEG, ARM, [(Vector((0, 0.008, 1.35)), 0.037), (Vector((0, 0.006, 1.43)), 0.034), (Vector((0, 0.002, 1.52)), 0.031)],
                  leg_xy, body_region, ['shirt', 'skin', 'skirt'], voxel=0.005, ratio=0.16)
auto_weights(body)
hands = build_hands(0.475, {'L': {'size': 0.9, 'finger': 0.85, 'fist': 0.15}, 'R': {'size': 0.9, 'finger': 0.85, 'fist': 0.55, 'glove': True}},
                    ['glove', 'skin'])
head, ears = build_head(head_shape, ear=(0.083, 0.012, -0.012, 0.05))
hair, pin = build_hair()
trim = Part('Trim', ['accent', 'shirt'])
jacket, sleeves, collar = build_jacket(trim)
skirt, wrap, knot, belt, backbow = build_skirt(trim)
props = build_props(trim)
trim_ob = trim.build()
boots = build_boots()
shield = build_shield()

for o in (jacket, sleeves, collar, props, belt, knot):
    transfer(o, body); attach(o)
cloth = lambda co: skirt_weights(co, 1.0, 0.66, 0.7)
for o in (skirt, wrap, trim_ob):
    transfer(o, body); blend_lower(o, 1.03, 0.97, cloth); attach(o)
boot_weights(boots, 0.1, 0.0); attach(boots)
tail_weights(backbow, lambda co: co.z < 1.0, root_bone='hips', root_z=0.99)

meshes = [o for o in scene().objects if o.type == 'MESH']
tint = lambda p, ao: hair_band(p, ao, top=(0.74, 0.91, 1.0), tip=(0.98, 0.93, 1.0), tip_from=1.5, tip_to=2.6)
bake_ao([o for o in meshes if o is not shield], skip=('Head',), tint={'Hair': tint})
bake_ao([shield])
save('mizore')
