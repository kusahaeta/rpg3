# .blend を開いて正面・側面・背面・斜めのプレビュー画像を描画する（確認用）
#   Blender -b assets/blender/aster.blend -P tools/blender/render_preview.py -- <出力ディレクトリ> [pose]
import bpy, math, os, sys
from mathutils import Vector, Euler

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = args[0] if args else '/tmp'
pose = args[1] if len(args) > 1 else ''
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
sh = scene.display.shading
sh.light = 'STUDIO'
sh.color_type = 'MATERIAL'
sh.show_object_outline = True
sh.show_cavity = False
scene.render.resolution_x = 520
scene.render.resolution_y = 720
scene.render.film_transparent = False
scene.world = scene.world or bpy.data.worlds.new('W')
for o in scene.objects:
    if o.type == 'ARMATURE':
        o.hide_render = True

if pose:
    rig = bpy.data.objects['Rig']
    pb = rig.pose.bones
    for b in pb:
        b.rotation_mode = 'XYZ'
    if pose == 'walk':
        pb['thigh.L'].rotation_euler = (0.6, 0, 0); pb['thigh.R'].rotation_euler = (-0.5, 0, 0)
        pb['shin.R'].rotation_euler = (-0.6, 0, 0)
        pb['upper_arm.L'].rotation_euler = (-0.5, 0, 0); pb['upper_arm.R'].rotation_euler = (0.5, 0, 0)
        pb['forearm.R'].rotation_euler = (0.6, 0, 0)
    elif pose == 'raise':
        pb['upper_arm.R'].rotation_euler = (0, 0, -2.4); pb['upper_arm.L'].rotation_euler = (0, 0, 1.2)
        pb['head'].rotation_euler = (0.3, 0, 0.3)

cam_data = bpy.data.cameras.new('Cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 2.1
cam = bpy.data.objects.new('Cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
views = {'front': (0, -1), 'side': (1, 0), 'back': (0, 1), 'three': (0.7, -0.7)}
if len(args) > 2:
    cam_data.ortho_scale = 0.55
    hd = bpy.data.objects.get('Head')
    target = sum((hd.matrix_world @ Vector(c) for c in hd.bound_box), Vector()) / 8 if hd else Vector((0, 0, 1.7))
else:
    zmax = max((o.matrix_world @ Vector(c)).z for o in scene.objects if o.type == 'MESH' for c in o.bound_box)
    target = Vector((0, 0, zmax / 2))
for name, (x, y) in views.items():
    d = Vector((x, y, 0.0)).normalized()
    cam.location = target + d * 5
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(out, f'{pose or "rest"}_{name}{"_face" if len(args) > 2 else ""}.png')
    bpy.ops.render.render(write_still=True)
