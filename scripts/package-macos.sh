#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: scripts/package-macos.sh must be run on macOS" >&2
  exit 1
fi

ARCH="${1:-}"
if [[ "$ARCH" != "arm64" && "$ARCH" != "amd64" ]]; then
  echo "Usage: $0 <arm64|amd64> [version]" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="${2:-}"
if [[ -z "$VERSION" ]]; then
  VERSION="$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' assets/dict_zh_cn.json | head -n 1)"
fi
VERSION="${VERSION#v}"
if [[ -z "$VERSION" ]]; then
  VERSION="1.0.0"
fi

APP_NAME="AntigravityZH"
BUNDLE_ID="com.antigravityzh.launcher"
DIST_DIR="${OUTPUT_DIR:-$ROOT_DIR/dist}"
mkdir -p "$DIST_DIR"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

STAGE_DIR="$TMP_DIR/dmg-stage"
APP_DIR="$STAGE_DIR/${APP_NAME}.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

echo "==> Building darwin/${ARCH} binary (version ${VERSION})..."
CGO_ENABLED=0 GOOS=darwin GOARCH="$ARCH" \
  go build -ldflags="-s -w" -o "$MACOS_DIR/${APP_NAME}" ./cmd/antigravity-zh
chmod +x "$MACOS_DIR/${APP_NAME}"

echo "==> Generating AppIcon.icns from assets/app.ico..."
BASE_PNG="$TMP_DIR/app_icon.png"
ICONSET_DIR="$TMP_DIR/AppIcon.iconset"
mkdir -p "$ICONSET_DIR"
go run ./tools/genicon -ico "$ROOT_DIR/assets/app.ico" -png "$BASE_PNG"

for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$BASE_PNG" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null
  size2=$((size * 2))
  sips -z "$size2" "$size2" "$BASE_PNG" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET_DIR" -o "$RESOURCES_DIR/AppIcon.icns"

echo "==> Writing Contents/Info.plist..."
cat > "$CONTENTS_DIR/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>zh_CN</string>
  <key>CFBundleDisplayName</key>
  <string>${APP_NAME}</string>
  <key>CFBundleExecutable</key>
  <string>${APP_NAME}</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>${BUNDLE_ID}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>${APP_NAME}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${VERSION}</string>
  <key>CFBundleVersion</key>
  <string>${VERSION}</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF

echo "==> Signing ${APP_NAME}.app..."
if [[ -n "${APPLE_SIGN_IDENTITY:-}" ]]; then
  codesign --force --deep --options runtime --timestamp --sign "$APPLE_SIGN_IDENTITY" "$APP_DIR"
else
  codesign --force --deep --sign - "$APP_DIR"
fi
codesign --verify --deep --strict "$APP_DIR"

echo "==> Creating DMG image..."
ln -s /Applications "$STAGE_DIR/Applications"

DMG_PATH="$DIST_DIR/${APP_NAME}-darwin-${ARCH}.dmg"
rm -f "$DMG_PATH"
hdiutil create \
  -volname "${APP_NAME}" \
  -srcfolder "$STAGE_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH" >/dev/null

echo "==> Created: ${DMG_PATH}"
