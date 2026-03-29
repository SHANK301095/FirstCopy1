# EA Backtesting Studio - Desktop App

Offline desktop application for backtesting trading strategies. Built with Electron + React + Python FastAPI.

## Features

- 📊 **100% Offline** - No internet required after installation
- 📁 **Local CSV Processing** - Handle 50-300MB files with 1-5M rows
- ⚡ **Vectorized Backtests** - Fast Python engine with pandas/numpy
- 📈 **Rich Analytics** - Equity curves, drawdown, metrics, trade logs
- 💾 **Export to CSV** - Trades, summary, equity data

## Prerequisites

### All Platforms
- **Node.js** 18+ LTS ([nodejs.org](https://nodejs.org))
- **Python** 3.10+ ([python.org](https://python.org))
- **Git** ([git-scm.com](https://git-scm.com))

### Windows
- Visual Studio Build Tools with C++ workload
- Run: `npm install -g windows-build-tools`

### macOS
- Xcode Command Line Tools: `xcode-select --install`

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install build-essential python3-dev python3-venv
```

## Quick Start (Development)

```bash
# Clone and install
git clone <your-repo>
cd ea-backtest-studio
npm install

# Start development mode
# Windows:
scripts\dev.bat

# macOS/Linux:
chmod +x scripts/*.sh
./scripts/dev.sh
```

## Building Installers

### Windows (.exe)
```bash
scripts\build.bat
# Output: release/EA Backtesting Studio-*-win-x64.exe
```

### macOS (.dmg)
```bash
./scripts/build.sh
# Output: release/EA Backtesting Studio-*-mac-*.dmg
```

### Linux (.AppImage)
```bash
./scripts/build.sh
# Output: release/EA Backtesting Studio-*-linux-x64.AppImage
```

## Project Structure

```
├── electron/           # Electron main process
│   ├── main.ts        # Main entry, backend spawning
│   └── preload.ts     # Secure IPC bridge
├── backend/           # Python FastAPI engine
│   ├── main.py        # API server
│   ├── requirements.txt
│   └── backtest_server.spec  # PyInstaller config
├── src/               # React frontend
├── scripts/           # Build & dev scripts
├── build/             # Installer assets
└── electron-builder.yml  # Packaging config
```

## Configuration Defaults

| Setting | Default |
|---------|---------|
| Timezone | Asia/Kolkata (IST) |
| Currency | INR |
| Commission | 0.01%/side |
| Slippage | 1 tick |
| Exports Folder | ~/Documents/EA-Backtests/ |

## Troubleshooting

### Port Already in Use
The backend auto-selects a free port starting from 32145. If issues persist:
```bash
# Windows
netstat -ano | findstr :32145
taskkill /PID <pid> /F

# macOS/Linux  
lsof -i :32145
kill -9 <pid>
```

### Antivirus False Positives (Windows)
Add exclusions for:
- `%LOCALAPPDATA%\ea-backtest-studio`
- The installation directory

### Missing Python DLLs (Windows)
Install Visual C++ Redistributable: https://aka.ms/vs/17/release/vc_redist.x64.exe

### PyInstaller Build Fails
Fallback: Run backend via Python directly:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py --port 32145
```

## Privacy

- ✅ No telemetry or analytics
- ✅ No network calls (all requests blocked except localhost)
- ✅ All data stays on your machine
- ✅ No external dependencies at runtime

## License

MIT License - See LICENSE.txt
