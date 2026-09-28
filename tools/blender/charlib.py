# キャラクターモデル生成の共通部品（build_<名前>.py から import して使う）
#
# 座標系: Blender は Z 上・キャラは -Y 向き（glTF 書き出しで +Y 上・+Z 向きになる）。
# ボーン名・マテリアル名・"Weapon" / "Shield" オブジェクト名はゲーム側（js/gfx/models.js）が参照するので変えないこと。
import bpy, bmesh, math, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TAU = math.tau
FRONT = Vector((0, -1, 0))
X = Vector((1, 0, 0))
ARM_REST = 0.2          # 腕は少し開いた A ポーズ（ゲーム側の GLB_ARM_REST と一致）


class _Cfg:
    """キャラごとの寸法（setup で設定）"""
    hc = Vector((0, 0, 1.66))       # 頭の中心
    hr = Vector((0.094, 0.1, 0.104))  # 頭の半径（幅・奥行き・高さ）
    sh = {}                          # 肩の位置
    armd = {}                        # 腕の向き
    tail_z = []                      # 垂れ物（マフラー・リボン）用ボーンの高さ
    rig = None
    arm_data = None
    bones = []
C = _Cfg()


def reset(hc, hr):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    C.hc, C.hr = Vector(hc), Vector(hr)
    C.sh, C.armd = {}, {}


def scene():
    return bpy.context.scene


# ------------------------------------------------------------
#  マテリアル（名前 = ゲーム側の役割）
# ------------------------------------------------------------
def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hexcol(h):
    h = h.lstrip('#')
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)

MATS = {}
def material(name, hex_, emit=0.0, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = hexcol(hex_)
    bsdf.inputs['Roughness'].default_value = 0.55
    bsdf.inputs['Metallic'].default_value = metal
    if emit:
        bsdf.inputs['Emission Color'].default_value = hexcol(hex_)
        bsdf.inputs['Emission Strength'].default_value = emit
    m.diffuse_color = hexcol(hex_)
    MATS[name] = m


# ------------------------------------------------------------
#  ユーティリティ
# ------------------------------------------------------------
def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return a + (b - a) * t

def clamp01(x):
    return max(0.0, min(1.0, x))

def link(obj):
    scene().collection.objects.link(obj)
    return obj

class Part:
    """複数マテリアルを持つ bmesh の組み立て用"""
    def __init__(self, name, mats):
        self.name, self.mats, self.bm = name, mats, bmesh.new()

    def mi(self, m):
        return self.mats.index(m)

    def loft(self, rings, mat, cap0=True, cap1=True):
        """断面リングを順につないだ筒。要素数1のリングは先端（尖り）になる"""
        bm, idx = self.bm, self.mi(mat)
        vs = [[bm.verts.new(p) for p in r] for r in rings]
        faces = []
        for i in range(len(vs) - 1):
            A, B = vs[i], vs[i + 1]
            if len(A) == 1:
                A, B, flip = B, A, True
            else:
                flip = False
            n = len(A)
            for k in range(n):
                k2 = (k + 1) % n
                f = (A[k], A[k2], B[0]) if len(B) == 1 else (A[k], A[k2], B[k2], B[k])
                faces.append(bm.faces.new(f[::-1] if flip else f))
        for ring, cap in ((vs[0], cap0), (vs[-1], cap1)):
            if cap and len(ring) > 2:
                c = bm.verts.new(sum((v.co for v in ring), Vector()) / len(ring))
                for k in range(len(ring)):
                    faces.append(bm.faces.new((ring[k], ring[(k + 1) % len(ring)], c)))
        for f in faces:
            f.material_index = idx
        return faces

    def add_bm(self, other, mat):
        me = bpy.data.meshes.new('tmp'); other.to_mesh(me); other.free()
        n0 = len(self.bm.faces)
        self.bm.from_mesh(me); bpy.data.meshes.remove(me)
        self.bm.faces.ensure_lookup_table()
        for f in self.bm.faces[n0:]:
            f.material_index = self.mi(mat)

    def build(self, recalc=True, smooth=True):
        if recalc:
            bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me); self.bm.free()
        for m in self.mats:
            me.materials.append(MATS[m])
        for p in me.polygons:
            p.use_smooth = smooth
        return link(bpy.data.objects.new(self.name, me))

def sec(c, Xa, Ya, rx, ryf, ryb=None, n=24, e=2.0):
    """断面リング。Xa=横、Ya=前。前後で奥行きを変えられる超楕円"""
    ryb = ryf if ryb is None else ryb
    out = []
    for k in range(n):
        a = k / n * TAU
        ca, sa = math.cos(a), math.sin(a)
        px = math.copysign(abs(ca) ** (2 / e), ca) * rx
        py = math.copysign(abs(sa) ** (2 / e), sa) * (ryf if sa > 0 else ryb)
        out.append(c + Xa * px + Ya * py)
    return out

def spline(ctrl, n):
    """Catmull-Rom で制御点を n 点に補間"""
    P = [ctrl[0]] + list(ctrl) + [ctrl[-1]]
    segs = len(ctrl) - 1
    out = []
    for i in range(n):
        t = i / (n - 1) * segs
        k = min(int(t), segs - 1); u = t - k
        p0, p1, p2, p3 = P[k], P[k + 1], P[k + 2], P[k + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return out

def interp_table(rows, n):
    """数値テーブルの各列を Catmull-Rom で n 行に補間"""
    cols = list(zip(*rows))
    res = [spline([Vector((v, 0, 0)) for v in col], n) for col in cols]
    return [tuple(res[c][i].x for c in range(len(cols))) for i in range(n)]

def table_at(rows, z, n=80):
    """テーブルを補間して z に最も近い行"""
    return min(interp_table(rows, n), key=lambda q: abs(q[0] - z))

def frames(pts, up_hint):
    """点列の各点での (接線, 横, 上) の直交フレーム"""
    out = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        up = up_hint(p) if callable(up_hint) else up_hint
        side = t.cross(up)
        if side.length < 1e-5:
            side = t.cross(Vector((0, 1, 0)))
        side.normalize()
        out.append((t, side, side.cross(t).normalized()))
    return out

def tube_path(part, pts, radius, mat, sides=8, flat=1.0, up=Vector((0, 0, 1)), closed=False, cap=True):
    rings = []
    for p, (t, s, u) in zip(pts, frames(pts, up)):
        r = radius(p) if callable(radius) else radius
        rings.append([p + s * math.cos(a) * r + u * math.sin(a) * r * flat for a in [k / sides * TAU for k in range(sides)]])
    if closed:
        rings.append(rings[0])
    part.loft(rings, mat, cap0=cap and not closed, cap1=cap and not closed)

def ribbon(part, ctrl, w0, w1, up, mat, thick=0.0065, n=14, sides=12):
    """平たい帯（リボン・マフラーの端）"""
    pts = spline(ctrl, n)
    rings = []
    for i, (p, (t, side, u)) in enumerate(zip(pts, frames(pts, up))):
        w = w0(i / (n - 1)) if callable(w0) else lerp(w0, w1, i / (n - 1))
        rings.append([p + side * math.cos(a) * w + u * math.sin(a) * thick * (1 - 0.5 * math.cos(a) ** 2) for a in [k / sides * TAU for k in range(sides)]])
    part.loft(rings, mat)
    return pts

def bake_modifiers(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    old = obj.data
    obj.modifiers.clear()
    obj.data = me
    bpy.data.meshes.remove(old)
    for p in me.polygons:
        p.use_smooth = True

def add_mod(obj, kind, **kw):
    m = obj.modifiers.new(kind.lower(), kind)
    for k, v in kw.items():
        setattr(m, k, v)
    return m

def orient(bm, center_fn):
    """開いたシートの法線を外向きに（巻き順が揃っている前提）"""
    bm.normal_update()
    s = sum(f.normal.dot(f.calc_center_median() - center_fn(f.calc_center_median())) for f in bm.faces)
    if s < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)

def quad(bm, a, b, c, d, flip):
    return bm.faces.new((d, c, b, a) if flip else (a, b, c, d))

def grid_bm(rows, flip=False, bm=None, closed=False):
    """点の2次元配列（行×列）から四角面のシート。closed で列方向を輪にする"""
    bm = bm or bmesh.new()
    vs = [[bm.verts.new(p) for p in r] for r in rows]
    for j in range(len(vs) - 1):
        n = len(vs[j])
        for i in range(n if closed else n - 1):
            i2 = (i + 1) % n
            quad(bm, vs[j][i], vs[j][i2], vs[j + 1][i2], vs[j + 1][i], flip)
    return bm, vs

def boundary_loops(bm):
    adj = {}
    for e in bm.edges:
        if e.is_boundary:
            a, b = e.verts
            adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    seen, loops = set(), []
    for start in adj:
        if start in seen:
            continue
        loop, prev, cur = [start], None, start
        seen.add(start)
        while True:
            nxt = [v for v in adj[cur] if v is not prev and v not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            loop.append(cur); seen.add(cur)
        loops.append([v.co.copy() for v in loop])
    return loops

def piping(part, bm_src, mat='accent', r=0.0045, only=None):
    """開いた面の縁に縁取り（パイピング）を付ける。only(p) で縁の一部だけに"""
    for loop in boundary_loops(bm_src):
        if len(loop) < 3:
            continue
        if only:
            # 条件を満たす連続区間ごとに
            segs, cur = [], []
            for p in loop + loop[:1]:
                if only(p):
                    cur.append(p)
                elif cur:
                    segs.append(cur); cur = []
            if cur:
                segs.append(cur)
            for sgm in segs:
                if len(sgm) >= 2:
                    tube_path(part, sgm, r, mat, sides=6)
        else:
            tube_path(part, loop, r, mat, sides=6, closed=True)

def solid_sheet(name, bm, mat, thickness, offset=-1.0, subsurf=0):
    """シートに厚みを付けたオブジェクト"""
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(MATS[mat])
    ob = link(bpy.data.objects.new(name, me))
    add_mod(ob, 'SOLIDIFY', thickness=thickness, offset=offset)
    if subsurf:
        add_mod(ob, 'SUBSURF', levels=subsurf, render_levels=subsurf)
    bake_modifiers(ob)
    return ob

def sphere_bm(center, r, scale=(1, 1, 1), seg=(12, 8)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg[0], v_segments=seg[1], radius=r)
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    return bm

def box_bm(center, size, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if rot:
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=rot)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    return bm

def star_bm(center, r_out, r_in, depth, normal=FRONT, up=Vector((0, 0, 1)), points=4):
    """立体の星（points 本の角）"""
    bm = bmesh.new()
    side = up.cross(normal).normalized()
    top, bot = [], []
    for k in range(points * 2):
        a = k / (points * 2) * TAU
        r = r_out if k % 2 == 0 else r_in
        off = side * math.sin(a) * r + up * math.cos(a) * r
        top.append(bm.verts.new(center + off + normal * depth))
        bot.append(bm.verts.new(center + off))
    ct = bm.verts.new(center + normal * depth * 1.8)
    n = len(top)
    for k in range(n):
        k2 = (k + 1) % n
        bm.faces.new((top[k], top[k2], ct))
        bm.faces.new((bot[k], bot[k2], top[k2], top[k]))
    return bm

def bow(part, center, width, height, depth, mat, normal=FRONT, up=Vector((0, 0, 1)), tails=0.0, tail_w=None):
    """蝶結びのリボン：左右の輪（つぶした楕円体）＋結び目＋垂れ"""
    side = up.cross(normal).normalized()
    rot = Matrix((side, normal, up)).transposed()   # ローカル (x=横, y=前, z=上)
    for s in (1, -1):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=1.0)
        for v in bm.verts:
            x, y, z = v.co
            # 外側ほど上下に広がるしずく形
            t = (x * s + 1) / 2
            v.co = Vector((s * (0.08 + t * 0.92) * width * 0.5, y * depth * 0.5 * (1 - 0.4 * t), z * height * 0.5 * (0.45 + 0.55 * t)))
            v.co.x += s * width * 0.5 * 0.1
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=rot)
        bmesh.ops.translate(bm, vec=center, verts=bm.verts)
        part.add_bm(bm, mat)
    kn = sphere_bm(Vector(), 1.0, (height * 0.22, depth * 0.45, height * 0.3))
    bmesh.ops.rotate(kn, verts=kn.verts, cent=(0, 0, 0), matrix=rot)
    bmesh.ops.translate(kn, vec=center + normal * depth * 0.15, verts=kn.verts)
    part.add_bm(kn, mat)
    if tails:
        tw = tail_w or height * 0.3
        for s in (1, -1):
            ribbon(part, [center, center + side * s * width * 0.15 - up * tails * 0.5, center + side * s * width * 0.3 - up * tails],
                   tw * 0.8, tw, normal, mat, thick=0.003, n=8, sides=8)


# ------------------------------------------------------------
#  アーマチュア
# ------------------------------------------------------------
def build_rig(spec):
    """spec: hips/spine/chest/neck/head の z、shoulder、腕の長さ、脚の関節、垂れ物ボーン"""
    arm_data = bpy.data.armatures.new('Rig')
    rig = link(bpy.data.objects.new('Rig', arm_data))
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    EB = arm_data.edit_bones

    def bone(name, head, tail, parent=None, connect=False):
        b = EB.new(name)
        b.head, b.tail = Vector(head), Vector(tail)
        if parent:
            b.parent = EB[parent]; b.use_connect = connect

    z = spec['z']   # hips, spine, chest, neck, head, headtop
    bone('hips', (0, 0, z[0]), (0, 0, z[1]))
    bone('spine', (0, 0, z[1]), (0, 0, z[2]), 'hips', True)
    bone('chest', (0, 0, z[2]), (0, 0, z[3]), 'spine', True)
    bone('neck', (0, 0, z[3]), (0, 0.004, z[4]), 'chest', True)
    bone('head', (0, 0.004, z[4]), (0, 0.004, z[5]), 'neck', True)
    ua, fa, ha = spec['arm']
    for s, sfx in ((1, 'L'), (-1, 'R')):
        d = Vector((math.sin(ARM_REST) * s, 0, -math.cos(ARM_REST)))
        sh = Vector((spec['shoulder'][0] * s, spec['shoulder'][1], spec['shoulder'][2]))
        C.sh[sfx], C.armd[sfx] = sh, d
        bone(f'upper_arm.{sfx}', sh, sh + d * ua, 'chest')
        bone(f'forearm.{sfx}', sh + d * ua, sh + d * (ua + fa), f'upper_arm.{sfx}', True)
        bone(f'hand.{sfx}', sh + d * (ua + fa), sh + d * (ua + fa + ha), f'forearm.{sfx}', True)
        hip, knee, ankle, toe = [Vector((p[0] * s, p[1], p[2])) for p in spec['leg']]
        bone(f'thigh.{sfx}', hip, knee, 'hips')
        bone(f'shin.{sfx}', knee, ankle, f'thigh.{sfx}', True)
        bone(f'foot.{sfx}', ankle, toe, f'shin.{sfx}', True)
    tx, ty, tz, parent = spec['tail']
    C.tail_z = tz
    for i in range(4):
        bone(f'scarf.{i}', (tx, ty, tz[i]), (tx, ty, tz[i + 1]), parent if i == 0 else f'scarf.{i - 1}', i > 0)
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.show_in_front = True
    arm_data.display_type = 'STICK'
    C.rig, C.arm_data, C.bones = rig, arm_data, [b.name for b in arm_data.bones]
    return rig

def arm_frame(sfx):
    s = 1 if sfx == 'L' else -1
    return C.armd[sfx], Vector((math.cos(ARM_REST) * s, 0, math.sin(ARM_REST) * s))


# ------------------------------------------------------------
#  体（断面ロフト → ボクセルリメッシュで一体化）
# ------------------------------------------------------------
def build_body(torso, leg, arm, neck, leg_xy, region, mats, voxel=0.0055, ratio=0.13):
    """torso/leg: (z, 横, 前, 後) の表、arm: (肩からの距離, 横, 前後)、neck: [(点, 半径)]、
    leg_xy(z, s) → (x, y)、region(面の中心) → マテリアル名"""
    part = Part('Body', [mats[0]])
    part.loft([sec(Vector((0, 0, z)), X, FRONT, rx, f, b, n=32, e=2.3) for z, rx, f, b in interp_table(torso, 30)], mats[0])
    pts = spline([p for p, r in neck], 8)
    rads = spline([Vector((r, 0, 0)) for p, r in neck], 8)
    part.loft([sec(p, X, FRONT, r.x, r.x, n=20) for p, r in zip(pts, rads)], mats[0])
    for s, sfx in ((1, 'L'), (-1, 'R')):
        rows = interp_table(leg, 26)
        part.loft([sec(Vector((*leg_xy(z, s), z)), X, FRONT, rx, f, b, n=24) for z, rx, f, b in rows], mats[0])
        d, side = arm_frame(sfx)
        part.loft([sec(C.sh[sfx] + d * t, side, FRONT, rx, ry, n=20) for t, rx, ry in interp_table(arm, 16)], mats[0])
    ob = part.build()
    add_mod(ob, 'REMESH', mode='VOXEL', voxel_size=voxel, adaptivity=0.0)
    add_mod(ob, 'SMOOTH', factor=0.6, iterations=6)
    add_mod(ob, 'DECIMATE', ratio=ratio)
    bake_modifiers(ob)
    me = ob.data
    me.validate()
    for m in mats[1:]:
        me.materials.append(MATS[m])
    for p in me.polygons:
        p.material_index = mats.index(region(p.center))
    return ob


# ------------------------------------------------------------
#  手（指付き）。hands: {'L': {...}, 'R': {...}}
#    fist: 握り具合(0〜1)、glove: 指ぬきグローブ、size: 大きさ、cuff: 手首の飾りの材質
# ------------------------------------------------------------
def build_hands(wrist_t, hands, mats):
    part = Part('Hands', mats)
    for s, sfx in ((1, 'L'), (-1, 'R')):
        o = hands[sfx]
        fist, k = o.get('fist', 0.0), o.get('size', 1.0)
        palm_m = 'glove' if o.get('glove') else 'skin'
        # 正準座標：指先 -Z、手のひら -X（体側）、親指 -Y（前）。左手基準で右は鏡像
        rot = Matrix.Rotation(-ARM_REST * s, 4, 'Y')
        mir = Matrix.Scale(-1, 4, (1, 0, 0)) if s < 0 else Matrix.Identity(4)
        base = Matrix.Translation(C.sh[sfx] + C.armd[sfx] * wrist_t) @ rot @ mir @ Matrix.Scale(k, 4)
        P = lambda v: base @ Vector(v)
        palm = []
        for i in range(6):
            t = i / 5
            z = -0.005 - t * 0.08
            palm.append([P(v) for v in sec(Vector((0.002 * t, 0, z)), X, FRONT, lerp(0.015, 0.013, t), lerp(0.024, 0.033, math.sin(t * 2.2) ** 0.6))])
        part.loft(palm, palm_m)
        if o.get('cuff'):
            part.loft([[P(v) for v in sec(Vector((0, 0, z)), X, FRONT, 0.023, 0.027)] for z in (0.004, -0.012)], o['cuff'])
        curl = [lerp(a, b, fist) for a, b in zip((0.25, 0.4, 0.3), (1.25, 1.45, 1.0))]
        for fi, (y, L) in enumerate(((-0.026, 0.9), (-0.009, 1.0), (0.009, 0.95), (0.025, 0.78))):
            pos, ang, pts = Vector((0.0, y, -0.083)), 0.0, []
            pts.append(pos.copy())
            for seg, ln in enumerate((0.036 * L, 0.024 * L, 0.019 * L)):
                ang += curl[seg] * lerp(1 + 0.15 * fi, 1.0, fist)
                pos = pos + Vector((-math.sin(ang), 0, -math.cos(ang))) * ln
                pts.append(pos.copy())
            path = spline(pts, 9)
            rad = lambda i: lerp(0.0088, 0.0066, i / 8) * o.get('finger', 1.0)
            rings = [[P(v) for v in sec(p, X, FRONT, rad(i), rad(i), n=8)] for i, p in enumerate(path)]
            part.loft(rings[:4], palm_m, cap1=False)
            part.loft(rings[3:], 'skin', cap0=False)
        tp = [Vector((-0.008, -0.022, -0.018)), Vector((-0.016, -0.036, -0.04))]
        tp.append(tp[-1] + Vector((-0.006, -0.012, -0.024)).lerp(Vector((-0.02, -0.01, -0.02)), fist))
        tp.append(tp[-1] + Vector((-0.004, -0.006, -0.02)).lerp(Vector((-0.012, 0.012, -0.012)), fist))
        path = spline(tp, 9)
        rings = [[P(v) for v in sec(p, X, FRONT, lerp(0.011, 0.0075, i / 8), lerp(0.011, 0.0075, i / 8), n=8)] for i, p in enumerate(path)]
        part.loft(rings[:5], palm_m, cap1=False)
        part.loft(rings[4:], 'skin', cap0=False)
    ob = part.build()
    set_weights(ob, [{'hand.L' if v.co.x > 0 else 'hand.R': 1.0} for v in ob.data.vertices])
    attach(ob)
    return ob


# ------------------------------------------------------------
#  頭（UV はゲームの顔テクスチャ＝正距円筒図法：ゲームの +Z が u=0.25）
#    shape(n) は単位球の方向 n → 頭中心からの相対位置
# ------------------------------------------------------------
def build_head(shape, ear=None, normal_center=Vector((0, 0.04, 0.015)), seg=(64, 40)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg[0], v_segments=seg[1], radius=1.0)
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        us = []
        for l in f.loops:
            p = l.vert.co.normalized()
            x3, y3, z3 = p.x, p.z, -p.y
            us.append([(math.atan2(z3, -x3) / TAU) % 1.0, 1.0 - math.acos(max(-1, min(1, y3))) / math.pi])
        if max(u for u, _ in us) - min(u for u, _ in us) > 0.5:
            for q in us:
                if q[0] < 0.5:
                    q[0] += 1.0
        for l, q in zip(f.loops, us):
            l[uv].uv = q
    for v in bm.verts:
        v.co = C.hc + shape(v.co.normalized())
    me = bpy.data.meshes.new('Head'); bm.to_mesh(me); bm.free()
    me.materials.append(MATS['face'])
    for p in me.polygons:
        p.use_smooth = True
    # アニメ調の陰影：顔の法線を球面寄りにして、鼻やあごに影を落とさない
    me.update()
    c = C.hc + normal_center
    me.normals_split_custom_set_from_vertices([tuple(v.normal.lerp((v.co - c).normalized(), 0.8).normalized()) for v in me.vertices])
    ob = link(bpy.data.objects.new('Head', me))
    out = [ob]
    if ear:
        ex, ey, ez, h = ear
        part = Part('Ears', ['skin'])
        for s in (1, -1):
            c = C.hc + Vector((s * ex, ey, ez))
            rings = []
            for i in range(7):
                t = i / 6
                w = math.sin(t * math.pi) ** 0.7 + 0.05
                rings.append([c + Vector((s * (0.003 * w + math.cos(a) * 0.006 * w), math.sin(a) * 0.016 * w * h / 0.054 + 0.003, lerp(-0.45, 0.55, t) * h))
                              for a in [k / 10 * TAU for k in range(10)]])
            part.loft(rings, 'skin')
        out.append(part.build())
    for o in out:
        rigid(o, 'head')
    return out


# ------------------------------------------------------------
#  髪（三日月断面の毛束を重ねる）
# ------------------------------------------------------------
def hp(theta, phi, s=1.0):
    """頭の楕円体に対する球面座標（theta: 頭頂から、phi: 0 が正面、正が左 +X）"""
    return C.hc + Vector((math.sin(theta) * math.sin(phi) * C.hr.x, -math.sin(theta) * math.cos(phi) * C.hr.y, math.cos(theta) * C.hr.z)) * s

def clump(part, ctrl, w0, th0=None, bend=0.45, n=16, sides=10, taper=0.75, mat='hair'):
    """ctrl: [(theta, phi, s) か Vector, ...]。根元が太く先が尖る毛束"""
    th0 = th0 or w0 * 0.42
    pts = spline([c if isinstance(c, Vector) else hp(*c) for c in ctrl], n)   # 制御点は球面座標か絶対座標
    rings = []
    for i, (p, (t, side, up)) in enumerate(zip(pts, frames(pts, lambda q: (q - C.hc).normalized()))):
        u = i / (n - 1)
        if i == n - 1:
            rings.append([p]); continue
        w = w0 * (1 - u) ** taper * (0.85 + 0.25 * math.sin(min(1, u * 2.5) * math.pi / 2))
        th = th0 * (1 - u) ** 0.6 + 0.0015
        ring = []
        for k in range(sides):
            a = k / sides * TAU
            ca, sa = math.cos(a), math.sin(a)
            ring.append(p + side * ca * w + up * (sa * th - bend * ca * ca * w))
        rings.append(ring)
    part.loft(rings, mat, cap0=True)

def hair_cap(part, lim, scale=(1.06, 1.05, 1.05)):
    """頭皮を覆うキャップ。lim(phi) より下は削る"""
    cap = bmesh.new()
    bmesh.ops.create_uvsphere(cap, u_segments=48, v_segments=28, radius=1.0)
    kill = []
    for v in cap.verts:
        p = v.co
        phi = math.atan2(p.x, -p.y)
        th = math.acos(max(-1, min(1, p.z)))
        if th > lim(phi):
            kill.append(v)
        else:
            v.co = C.hc + Vector((p.x * C.hr.x * scale[0], p.y * C.hr.y * scale[1], p.z * C.hr.z * scale[2]))
    bmesh.ops.delete(cap, geom=kill, context='VERTS')
    part.add_bm(cap, 'hair')


# ------------------------------------------------------------
#  ウェイト
# ------------------------------------------------------------
def ensure_groups(ob):
    for b in C.bones:
        if b not in ob.vertex_groups:
            ob.vertex_groups.new(name=b)

def attach(ob):
    ob.parent = C.rig
    ob.modifiers.new('Armature', 'ARMATURE').object = C.rig

def rigid(ob, bone_name):
    ensure_groups(ob)
    ob.vertex_groups[bone_name].add(range(len(ob.data.vertices)), 1.0, 'REPLACE')
    attach(ob)

def get_weights(ob):
    names = {g.index: g.name for g in ob.vertex_groups}
    return [{names[g.group]: g.weight for g in v.groups if g.weight > 1e-4} for v in ob.data.vertices]

def set_weights(ob, ws):
    ensure_groups(ob)
    for g in ob.vertex_groups:
        g.remove(range(len(ob.data.vertices)))
    for i, w in enumerate(ws):
        tot = sum(w.values()) or 1
        for b, x in w.items():
            if x / tot > 1e-3:
                ob.vertex_groups[b].add([i], x / tot, 'REPLACE')

def transfer(ob, src):
    ensure_groups(ob)
    m = ob.modifiers.new('dt', 'DATA_TRANSFER')
    m.object = src
    m.use_vert_data = True
    m.data_types_verts = {'VGROUP_WEIGHTS'}
    m.vert_mapping = 'POLYINTERP_NEAREST'
    m.layers_vgroup_select_src = 'ALL'
    m.layers_vgroup_select_dst = 'NAME'
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
        bpy.ops.object.modifier_apply(modifier=m.name)

def auto_weights(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True); C.rig.select_set(True)
    bpy.context.view_layer.objects.active = C.rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    for i in range(4):
        g = ob.vertex_groups.get(f'scarf.{i}')
        if g:
            ob.vertex_groups.remove(g)

def skirt_weights(co, top=1.0, bottom=0.5, amount=0.8):
    """腰から下の布：脚に引っぱられすぎないよう hips と太ももを混ぜる"""
    k = amount * smoothstep(top, bottom, co.z)
    wl = smoothstep(-0.07, 0.07, co.x)
    return {'hips': 1 - k, 'thigh.L': k * wl, 'thigh.R': k * (1 - wl)}

def blend_lower(ob, zhi, zlo, fn):
    """上は体から転写したまま、zhi→zlo で fn のウェイトへなめらかに切り替える"""
    ws = get_weights(ob)
    for v, w in zip(ob.data.vertices, ws):
        t = smoothstep(zhi, zlo, v.co.z)
        if t <= 0:
            continue
        c = fn(v.co)
        for b in set(w) | set(c):
            w[b] = w.get(b, 0) * (1 - t) + c.get(b, 0) * t
    set_weights(ob, ws)

def boot_weights(ob, ankle_z, toe_y=0.02):
    ws = []
    for v in ob.data.vertices:
        sfx = 'L' if v.co.x > 0 else 'R'
        f = smoothstep(ankle_z, ankle_z - 0.06, v.co.z) * smoothstep(toe_y, toe_y - 0.08, v.co.y)
        ws.append({f'shin.{sfx}': 1 - f, f'foot.{sfx}': f})
    set_weights(ob, ws)

def tail_weights(ob, is_tail, root_bone='chest', root_z=None):
    """垂れ物（scarf.0〜3 のボーン鎖）。is_tail(co) が偽の頂点は root_bone に固定"""
    tz = C.tail_z
    ws = []
    for v in ob.data.vertices:
        co = v.co
        if not is_tail(co):
            ws.append({root_bone: 1.0}); continue
        w = {}
        for i in range(4):
            zc = (tz[i] + tz[i + 1]) / 2
            seg = abs(tz[i] - tz[i + 1])
            x = max(0.0, 1 - abs(co.z - zc) / seg)
            if x:
                w[f'scarf.{i}'] = x
        rz = tz[0] - 0.03 if root_z is None else root_z
        if co.z > rz:
            w[root_bone] = (co.z - rz) / 0.05
        ws.append(w or {'scarf.3': 1.0})
    set_weights(ob, ws)


# ------------------------------------------------------------
#  頂点カラー：アンビエントオクルージョン（＋色の味付け）
#    tint: {オブジェクト名: fn(ワールド座標, ao) → (r, g, b)}
# ------------------------------------------------------------
def fib_dirs(n):
    out = []
    for i in range(n):
        z = 1 - (i + 0.5) / n
        r = math.sqrt(max(0, 1 - z * z))
        a = i * 2.39996
        out.append(Vector((math.cos(a) * r, math.sin(a) * r, z)))
    return out

def bake_ao(objs, skip=(), tint=None, strength=0.7, dist=0.07):
    tint = tint or {}
    verts, polys = [], []
    for o in objs:
        base = len(verts)
        verts += [o.matrix_world @ v.co for v in o.data.vertices]
        polys += [[base + i for i in p.vertices] for p in o.data.polygons]
    tree = BVHTree.FromPolygons(verts, polys)
    dirs = fib_dirs(20)
    for o in objs:
        me = o.data
        attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        me.color_attributes.active_color = attr
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
        fn = tint.get(o.name)
        for i, v in enumerate(me.vertices):
            if o.name in skip:
                attr.data[i].color = (1, 1, 1, 1); continue
            p = o.matrix_world @ v.co
            n = (o.matrix_world.to_3x3() @ v.normal).normalized()
            t = n.orthogonal().normalized(); b = n.cross(t)
            occ = 0.0
            for d in dirs:
                w = t * d.x + b * d.y + n * d.z
                hit = tree.ray_cast(p + n * 0.0015, w, dist)
                if hit[0] is not None:
                    occ += 1 - hit[3] / dist
            ao = 1 - strength * occ / len(dirs)
            c = fn(p, ao) if fn else (ao, ao, ao)
            attr.data[i].color = (c[0], c[1], c[2], 1)

def hair_band(p, ao, top=(1, 1, 1), tip=(1, 1, 1), tip_from=1.4, tip_to=2.3):
    """髪：天使の輪の帯・根元→毛先のグラデーション"""
    q = p - C.hc
    th = math.acos(max(-1, min(1, q.z / max(q.length, 1e-6))))
    band = smoothstep(0.42, 0.52, th) * smoothstep(0.78, 0.66, th) * smoothstep(-0.02, -0.07, q.y)
    shade = lerp(0.86, 1.0, band) * lerp(1.0, 0.92, smoothstep(0.9, 1.9, th))
    g = smoothstep(tip_from, tip_to, th)
    col = [lerp(a, b, g) for a, b in zip(top, tip)]
    return [ao * shade * c for c in col[:2]] + [ao * lerp(shade, 1.0, 0.3) * col[2]]


def save(name):
    sc = scene()
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.color_type = 'MATERIAL'
    path = os.path.join(ROOT, 'assets', 'blender', name + '.blend')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=path)
    meshes = [o for o in sc.objects if o.type == 'MESH']
    print('saved', path, 'verts:', sum(len(o.data.vertices) for o in meshes), {o.name: len(o.data.vertices) for o in meshes})
