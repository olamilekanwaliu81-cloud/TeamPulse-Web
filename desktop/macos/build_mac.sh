#!/bin/bash
# Builds TeamPulse.app (a window onto the live TeamPulse site), a .dmg, and the zip the website offers for download.
#
#   bash macos/build_mac.sh
#   TP_URL=https://your-site.example bash macos/build_mac.sh     (to point it at another address)
#
# Needs only Apple's Command Line Tools (clang, codesign, hdiutil, iconutil). No downloads.
# Output goes to macos/dist/ (ignored by git).

set -euo pipefail
cd "$(dirname "$0")"

APP="dist/TeamPulse.app"
VERSION="0.2.0"
TP_URL="${TP_URL:-https://teampulse.owpublishiing.com}"
OUT="$(cd ../.. && pwd)/public/downloads"
FLAGS=(-fobjc-arc -O2 -mmacosx-version-min=12.0 -Wno-deprecated-declarations)

rm -rf build dist
mkdir -p build dist

echo "1/6 Compiling the app (opens $TP_URL)..."
# One app for Intel and Apple Silicon Macs. If the universal build fails, build for this Mac only.
if clang "${FLAGS[@]}" -DTP_URL_STR="\"$TP_URL\"" -arch x86_64 -arch arm64 -framework Cocoa -framework WebKit main.m -o build/TeamPulse 2> build/universal.log; then
  :
else
  echo "    universal build failed, building for this Mac only ($(uname -m))"
  clang "${FLAGS[@]}" -DTP_URL_STR="\"$TP_URL\"" -arch "$(uname -m)" -framework Cocoa -framework WebKit main.m -o build/TeamPulse
fi

echo "2/6 Drawing the icon..."
clang -fobjc-arc -framework Cocoa make_icon.m -o build/make_icon
build/make_icon build/AppIcon.iconset > /dev/null
iconutil -c icns build/AppIcon.iconset -o build/AppIcon.icns

echo "3/6 Assembling the app..."
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp build/TeamPulse "$APP/Contents/MacOS/TeamPulse"
cp build/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"
cp selftest.js "$APP/Contents/Resources/selftest.js"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>TeamPulse</string>
  <key>CFBundleDisplayName</key><string>TeamPulse</string>
  <key>CFBundleIdentifier</key><string>com.teampulse.prototype</string>
  <key>CFBundleExecutable</key><string>TeamPulse</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${VERSION}</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>LSApplicationCategoryType</key><string>public.app-category.business</string>
  <key>NSHumanReadableCopyright</key><string>TeamPulse. A window onto your team's site.</string>
</dict>
</plist>
PLIST

echo "4/6 Signing (ad hoc)..."
codesign --force --deep --sign - "$APP" 2> /dev/null
codesign --verify --deep --strict "$APP"

echo "5/6 Packaging the installer..."
mkdir -p dist/dmgroot
cp -R "$APP" dist/dmgroot/
ln -s /Applications dist/dmgroot/Applications
hdiutil create -volname "TeamPulse" -srcfolder dist/dmgroot -ov -format UDZO dist/TeamPulse.dmg > /dev/null
rm -rf dist/dmgroot

echo "6/6 Zipping the download for the website..."
ZIPSTAGE="dist/zipstage/TeamPulse for Mac"
mkdir -p "$ZIPSTAGE" "$OUT"
cp -R "$APP" "$ZIPSTAGE/"
cat > "$ZIPSTAGE/READ ME FIRST.txt" <<'TXT'
TeamPulse for Mac
=================

TeamPulse opens in its own window, like any other app. It shows your team's TeamPulse site,
so you see the same people and numbers as on your phone. It needs an internet connection.
Works on macOS 12 or newer, on Intel and Apple Silicon Macs.

To install
1. Drag TeamPulse into your Applications folder.
2. Open TeamPulse from Applications or Launchpad.

If your Mac says it cannot check the app
This app is not from the App Store yet, so macOS asks before it opens it the first time.
- macOS 15: open System Settings, then Privacy & Security. Scroll down to the message about
  TeamPulse and choose "Open Anyway".
- macOS 14 or older: Control-click TeamPulse and choose Open, then Open again.
You only do this once.
TXT
rm -f "$OUT/TeamPulse-mac.zip"
ditto -c -k --sequesterRsrc --keepParent "$ZIPSTAGE" "$OUT/TeamPulse-mac.zip"
rm -rf dist/zipstage

echo
echo "Built:"
echo "  $(pwd)/$APP  ($(lipo -archs "$APP/Contents/MacOS/TeamPulse"), $(du -sh "$APP" | cut -f1))"
echo "  $(pwd)/dist/TeamPulse.dmg  ($(du -sh dist/TeamPulse.dmg | cut -f1))"
echo "  $OUT/TeamPulse-mac.zip  ($(du -sh "$OUT/TeamPulse-mac.zip" | cut -f1))"
