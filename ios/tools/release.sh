#!/bin/sh
# App Store に出すリリース版を作る。
#   sh ios/tools/release.sh          → ios/build/export/Nyanko.ipa を書き出すだけ
#   sh ios/tools/release.sh upload   → そのまま App Store Connect へ送る（TestFlight に出る）
# ビルド番号は main のコミット数。同じコミットから 2 度は送れない（番号が重なる）
set -e
cd "$(dirname "$0")/.."

dest=export
[ "$1" = upload ] && dest=upload
build=$(git rev-list --count HEAD)
archive=build/Nyanko.xcarchive
opts=build/ExportOptions.plist

mkdir -p build
cat > "$opts" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>destination</key>
	<string>$dest</string>
	<key>teamID</key>
	<string>XYZ8TG878C</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>manageAppVersionAndBuildNumber</key>
	<false/>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
EOF

rm -rf "$archive" build/export
xcodebuild -project Nyanko.xcodeproj -scheme Nyanko -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$archive" \
  -allowProvisioningUpdates CURRENT_PROJECT_VERSION="$build" archive
xcodebuild -exportArchive -archivePath "$archive" -exportOptionsPlist "$opts" \
  -exportPath build/export -allowProvisioningUpdates

echo "build $build: $dest done"
