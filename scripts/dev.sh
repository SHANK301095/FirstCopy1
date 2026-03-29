#!/bin/bash
# Development script - starts Vite, Python backend, and Electron concurrently

echo "🚀 Starting EA Backtesting Studio in development mode..."

# Check for required tools
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.10+"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js LTS"
    exit 1
fi

# Start Python backend
echo "📦 Starting Python backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt -q
python main.py --port 32145 &
BACKEND_PID=$!
cd ..

# Wait for backend
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:32145/health > /dev/null; then
        echo "✅ Backend is ready"
        break
    fi
    sleep 0.5
done

# Start Vite dev server
echo "🌐 Starting Vite dev server..."
npm run dev &
VITE_PID=$!

# Wait for Vite
sleep 3

# Start Electron
echo "⚡ Starting Electron..."
npm run electron:dev

# Cleanup on exit
trap "kill $BACKEND_PID $VITE_PID 2>/dev/null" EXIT
