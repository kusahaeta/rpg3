#!/bin/sh
# Blender でモデルを組み立て → GLB / 埋め込み JS を書き出す
#   sh tools/blender/build.sh            （BLENDER でパスを上書き可）
set -e
cd "$(dirname "$0")/../.."
BLENDER="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
# 引数でキャラを指定（省略時は全員）: sh tools/blender/build.sh mizore
names="${*:-aster mizore}"
for name in $names; do
  "$BLENDER" -b -P "tools/blender/build_$name.py"
  "$BLENDER" -b "assets/blender/$name.blend" -P tools/blender/export_glb.py
done
