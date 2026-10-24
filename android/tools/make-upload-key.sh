#!/bin/sh
# Google Play へのアップロード鍵を作り、android/keystore.properties に書く（はじめに 1 度だけ）。
# パスワードはここで自分で決めて入力する。鍵とパスワードはリポジトリに入れない（.gitignore 済み）。
# なくしたら Play Console からアップロード鍵の再設定を頼める（アプリの署名は Google が持つ）が、手間なので別の場所にも控える
set -e
cd "$(dirname "$0")/.."
[ -z "$JAVA_HOME" ] && export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

store="$HOME/.android/nyanko-upload.jks"
alias=upload
if [ -f "$store" ]; then echo "$store はもうあります" >&2; exit 1; fi

printf "鍵のパスワード（6 字以上）: "; stty -echo; read pass; stty echo; echo
printf "もう一度: "; stty -echo; read pass2; stty echo; echo
[ "$pass" = "$pass2" ] || { echo "一致しません" >&2; exit 1; }

"$JAVA_HOME/bin/keytool" -genkeypair -v -keystore "$store" -alias "$alias" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$pass" -keypass "$pass" -dname "CN=kusahaeta"

umask 077
cat > keystore.properties <<PROPS
storeFile=$store
storePassword=$pass
keyAlias=$alias
keyPassword=$pass
PROPS
echo "作りました: $store（android/keystore.properties に書きました）"
