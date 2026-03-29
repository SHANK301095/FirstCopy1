#!/bin/bash
# Build script for production desktop app

set -e

echo "🔨 Building EA Backtesting Studio for production..."

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     PLATFORM=linux;;
    Darwin*)    PLATFORM=mac;;
    MINGW*|CYGWIN*|MSYS*)  PLATFORM=win;;
    *)          PLATFORM="unknown";;
esac

echo "📍 Detected platform: $PLATFORM"

# Step 1: Build frontend
echo "📦 Building frontend (Vite)..."
npm run build:web

# Step 2: Build Electron main process
echo "⚡ Building Electron main process..."
cd electron
npx tsc
cd ..

# Step 3: Build Python backend
echo "🐍 Building Python backend with PyInstaller..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt -q
pip install pyinstaller -q

pyinstaller --clean --noconfirm backtest_server.spec

echo "✅ Backend built: backend/dist/backtest_server/"
cd ..

# Step 4: Package with electron-builder
echo "📦 Packaging desktop app..."
if [ "$PLATFORM" = "mac" ]; then
    npx electron-builder --mac
elif [ "$PLATFORM" = "linux" ]; then
    npx electron-builder --linux
elif [ "$PLATFORM" = "win" ]; then
    npx electron-builder --win
else
    echo "Building for all platforms..."
    npx electron-builder --mac --win --linux
fi

echo ""
echo "✅ Build complete! Check the 'release' folder for installers."
echo ""
ls -la release/ 2>/dev/null || echo "Release folder contents will appear after build completes."
