#!/usr/bin/env bash
set -e

echo ""
echo " ================================"
echo "   NotaraCBR - Build Script"
echo " ================================"
echo ""

# Detect platform
PLATFORM="$(uname -s)"
case "$PLATFORM" in
  Darwin) TARGET="darwin" ; ICON="public/icon.png" ;;
  Linux)  TARGET="linux"  ; ICON="public/icon.png" ;;
  *)
    echo "[ERROR] Unsupported platform: $PLATFORM"
    exit 1
    ;;
esac

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)  ARCH_FLAG="x64"   ;;
  arm64)   ARCH_FLAG="arm64" ;;
  aarch64) ARCH_FLAG="arm64" ;;
  *)
    echo "[ERROR] Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# Check Node is available
if ! command -v node &> /dev/null; then
  echo "[ERROR] Node.js not found. Please install Node.js 18+ from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo "[ERROR] Node.js 18+ required (found v$NODE_VER)"
  exit 1
fi

echo "[1/3] Installing dependencies..."
npm install

echo ""
echo "[2/3] Building React frontend..."
npx vite build

echo ""
echo "[3/3] Packaging Electron app for $PLATFORM ($ARCH_FLAG)..."
npx electron-packager . NotaraCBR \
  --platform="$TARGET" \
  --arch="$ARCH_FLAG" \
  --out=dist-electron \
  --overwrite \
  --ignore="^/src" \
  --ignore="^/\.git" \
  --ignore="^/dist-electron" \
  --electron-version=31.7.7 \
  --icon="$ICON"

echo ""
echo " ================================================"
if [ "$TARGET" = "darwin" ]; then
  echo "   Build complete!"
  echo "   dist-electron/NotaraCBR-darwin-$ARCH_FLAG/NotaraCBR.app"
else
  echo "   Build complete!"
  echo "   dist-electron/NotaraCBR-linux-$ARCH_FLAG/NotaraCBR"
fi
echo " ================================================"
echo ""
