# .blend をゲーム用 GLB に書き出し、file:// でも読めるよう base64 埋め込みの JS も生成する
#   Blender -b assets/blender/aster.blend -P tools/blender/export_glb.py
# 出力: assets/models/<名前>.glb と assets/models/<名前>.js（window.GLB_MODELS[<名前>] に登録）
import bpy, base64, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
name = os.path.splitext(os.path.basename(bpy.data.filepath))[0]
out_dir = os.path.join(ROOT, 'assets', 'models')
os.makedirs(out_dir, exist_ok=True)
glb = os.path.join(out_dir, name + '.glb')

# リグは必ず静止ポーズで書き出す
for o in bpy.data.objects:
    if o.type == 'ARMATURE':
        o.data.pose_position = 'REST'

bpy.ops.export_scene.gltf(
    filepath=glb, export_format='GLB',
    export_skins=True, export_animations=False, export_morph=False,
    export_apply=False, export_yup=True, export_texcoords=True, export_normals=True,
    export_materials='EXPORT', export_vertex_color='ACTIVE', export_cameras=False, export_lights=False,
)

with open(glb, 'rb') as f:
    data = base64.b64encode(f.read()).decode('ascii')
js = os.path.join(out_dir, name + '.js')
with open(js, 'w') as f:
    f.write('// 自動生成（tools/blender/export_glb.py）。直接編集しないこと\n')
    f.write(f"(window.GLB_MODELS = window.GLB_MODELS || {{}})['{name}'] = '{data}';\n")
print('exported', glb, os.path.getsize(glb), 'bytes')
