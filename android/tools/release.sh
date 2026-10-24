#!/bin/sh
# Google Play に出すリリース版（AAB）を作る。
#   sh android/tools/release.sh   → android/app/build/outputs/bundle/release/app-release.aab
# 署名は android/keystore.properties のアップロード鍵（無いときは sh android/tools/make-upload-key.sh で作る）。
# versionCode は main のコミット数。同じコミットから 2 度は送れない（番号が重なる）
set -e
cd "$(dirname "$0")/.."

if [ ! -f keystore.properties ]; then
  echo "keystore.properties がありません。先に sh android/tools/make-upload-key.sh を実行してください" >&2
  exit 1
fi
[ -z "$JAVA_HOME" ] && export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
[ -z "$ANDROID_HOME" ] && [ ! -f local.properties ] && export ANDROID_HOME="$HOME/Library/Android/sdk"

./gradlew --quiet clean bundleRelease
aab=app/build/outputs/bundle/release/app-release.aab
echo "versionCode $(git rev-list --count HEAD): $(pwd)/$aab"
