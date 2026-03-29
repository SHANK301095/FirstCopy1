# 🖥️ Desktop App Build Guide

Complete guide to build and run the EA Backtesting Studio desktop application.

---

## 📋 Prerequisites (Aapko Ye Chahiye)

### 1. Node.js (Required)
- **Download**: https://nodejs.org/en/download/
- **Version**: 18 LTS or higher
- **Verify**: Run `node --version` in Command Prompt

### 2. Python (Required for Backend)
- **Download**: https://www.python.org/downloads/
- **Version**: 3.10 or higher
- **Important**: During installation, CHECK "Add Python to PATH"
- **Verify**: Run `python --version` in Command Prompt

### 3. Git (Recommended)
- **Download**: https://git-scm.com/download/win
- **Purpose**: Clone and manage the repository

### 4. Visual Studio Build Tools (For Native Modules)
- **Download**: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- **Select**: "Desktop development with C++"
- **Purpose**: Some npm packages require compilation

---

## 🚀 Quick Start (Development Mode)

### Windows:
```batch
# 1. Clone/download the project
git clone <your-repo-url>
cd <project-folder>

# 2. Install dependencies
npm install

# 3. Run development mode
scripts\dev.bat
```

### What Happens:
1. Python backend starts on port 32145
2. Vite dev server starts on port 5173
3. Electron window opens with hot-reload

---

## 📦 Production Build (Installer Create Karna)

### Windows - One-Click Build:
```batch
# Run the build script
scripts\build.bat
```

### What This Does:
1. ✅ Cleans previous builds
2. ✅ Builds frontend (Vite → `dist/`)
3. ✅ Compiles Electron TypeScript (→ `dist-electron/`)
4. ✅ Packages with electron-builder (→ `release/`)
5. ✅ Asks to create desktop shortcut

### Output Files:
- `release/EA Backtesting Studio-x.x.x-win-x64.exe` - **NSIS Installer** (recommended)
- `release/EA Backtesting Studio-x.x.x-win-x64-portable.exe` - **Portable Version** (no install needed)

### After Build - Install:
```batch
# Option 1: Run the installer directly
release\EA Backtesting Studio-1.0.0-win-x64.exe

# Option 2: Use the install script
scripts\install-production.bat
```

### Create Desktop Shortcut (Development Mode):
```batch
scripts\create-shortcut.bat
```

---

## 🔧 MetaTrader 5 Setup (MT5 Ke Liye)

### Auto-Detection:
The app automatically searches for MT5 in:
- `C:\Program Files\MetaTrader 5`
- `C:\Program Files (x86)\MetaTrader 5`
- Broker-specific paths (IC Markets, XM, OANDA, etc.)

### Manual Configuration:
1. Go to **Desktop Settings** page
2. Click **Auto-Detect** or manually set:
   - MetaEditor Path: `...\metaeditor64.exe`
   - Terminal Path: `...\terminal64.exe`
   - Data Folder: `C:\Users\<YOU>\AppData\Roaming\MetaQuotes\Terminal\<HASH>`

### Important MT5 Settings:
- MT5 terminal must be installed (not portable version preferred)
- Expert Advisors must be allowed (`Tools > Options > Expert Advisors`)
- Enable "Allow automated trading"

---

## 📁 Folder Structure

```
project/
├── electron/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # IPC bridge
│   ├── auto-updater.ts  # Update system
│   └── debug-bundle.ts  # Debugging tools
├── backend/
│   ├── main.py          # Python API server
│   ├── requirements.txt # Python dependencies
│   └── backtest_server.spec  # PyInstaller config
├── src/
│   └── desktop/         # Desktop-only components
├── scripts/
│   ├── dev.bat          # Windows dev script
│   ├── build.bat        # Windows build script
│   └── build.sh         # Unix build script
├── release/             # Built installers (after build)
└── electron-builder.yml # Build configuration
```

---

## 🐛 Troubleshooting

### "Python not found"
```batch
# Reinstall Python with PATH option checked
# Or add manually:
setx PATH "%PATH%;C:\Python311"
```

### "npm install fails"
```batch
# Install Visual Studio Build Tools
# Then run:
npm install --force
```

### "Backend won't start"
```batch
# Check if port 32145 is in use:
netstat -ano | findstr :32145

# Kill the process:
taskkill /PID <PID> /F
```

### "pip missing in venv" (No module named 'pip')
This is a common issue where the virtual environment was created but pip wasn't installed properly.

**Fix commands (run in PowerShell):**
```powershell
# Step 1: Navigate to backend
cd backend

# Step 2: Install pip in existing venv
.\.venv\Scripts\python.exe -m ensurepip --upgrade --default-pip

# Step 3: Upgrade pip and install build tools
.\.venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel

# Step 4: Install all dependencies
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

**If the above doesn't work, recreate the venv from scratch:**
```powershell
cd backend
Remove-Item -Recurse -Force .\.venv
python -m venv .venv
.\.venv\Scripts\python.exe -m ensurepip --upgrade --default-pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### "ModuleNotFoundError" when starting backend
```batch
# Make sure venv is activated and deps are installed:
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

### "MT5 not detected"
1. Make sure MT5 is installed (not just portable)
2. Run the app as Administrator once
3. Manually set paths in Desktop Settings

### "Electron window is blank"
```batch
# Clear cache and restart:
rmdir /s /q "%APPDATA%\ea-backtest-studio"
```

### Backend Setup Doctor
The desktop app includes a **Backend Setup Doctor** (Settings → Diagnostics tab) that can:
- Detect if Python is installed
- Check if virtual environment exists
- Verify pip is available in venv
- Confirm requirements.txt is present
- Test if core dependencies are installed

Use the "Run Checks" button to diagnose issues and get copy-paste fix commands.

### Git Auth Doctor
The **Git Auth Doctor** (Settings → Diagnostics tab) helps diagnose Git authentication issues:
- Detect if Git is installed
- Check remote type (HTTPS vs SSH)
- Verify Git Credential Manager configuration
- Check SSH key availability
- Test authentication to GitHub

---

## 🔑 Git Authentication Setup (HTTPS/GCM vs SSH)

### Option A: HTTPS + Git Credential Manager (Recommended for beginners)
```powershell
# Configure Git to use Credential Manager
git config --global credential.helper manager

# Run once interactively - opens browser for authentication
git pull
```

Git Credential Manager stores credentials securely in Windows Credential Manager. It's included with Git for Windows.

### Option B: SSH Key Authentication (Recommended for automation)
```powershell
# Step 1: Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Step 2: Start SSH agent service
powershell -Command "Get-Service ssh-agent | Set-Service -StartupType Automatic; Start-Service ssh-agent"

# Step 3: Add key to agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519

# Step 4: Show public key (copy this to GitHub → Settings → SSH Keys)
type $env:USERPROFILE\.ssh\id_ed25519.pub

# Step 5: Test connection
ssh -T git@github.com
```

### Common Git Auth Issues

**"Permission denied (publickey)"**
- SSH key not added to GitHub, or not in SSH agent
- Fix: Add key with `ssh-add`, then add public key to GitHub SSH Keys

**"Host key verification failed"**
```powershell
# Remove old host key and retry
ssh-keygen -R github.com
ssh -T git@github.com
```

**"could not read Username"**
- Credentials not cached for HTTPS
- Fix: Run `git pull` in terminal to trigger authentication prompt

**"fatal: could not read from remote repository"**
- Wrong remote URL format
- For HTTPS: `https://github.com/USER/REPO.git`
- For SSH: `git@github.com:USER/REPO.git`

**Dirty working tree blocking pull**
```powershell
# Stash changes before pulling
git stash
git pull
git stash pop
```

---

## 🔐 Code Signing (Production Release Ke Liye)

For distributing to users, you need code signing:

### Windows (EV Certificate):
1. Get EV code signing certificate from DigiCert/Sectigo
2. Add to `electron-builder.yml`:
```yaml
win:
  certificateFile: path/to/certificate.pfx
  certificatePassword: YOUR_PASSWORD
```

### macOS (Apple Developer):
1. Enroll in Apple Developer Program ($99/year)
2. Create certificates in Xcode
3. Configure notarization in `electron-builder.yml`

---

## 📊 Features in Desktop Mode

| Feature | Web | Desktop |
|---------|-----|---------|
| Backtesting | ✅ In-browser | ✅ + MT5 Integration |
| Data Import | ✅ Upload CSV | ✅ + File system access |
| Excel Export | ❌ | ✅ Multi-sheet XLSX |
| Bulk Runs | ❌ | ✅ 1-4 parallel workers |
| MT5 Tester | ❌ | ✅ Full automation |
| Offline Mode | ⚠️ PWA | ✅ 100% offline |
| System Tray | ❌ | ✅ Background runs |
| Notifications | ❌ | ✅ Native OS |

---

## 📞 Support

- **Debug Bundle**: Desktop Settings → Advanced → Create Debug Bundle
- **Logs**: `%APPDATA%\ea-backtest-studio\logs\`
- **Config**: `%APPDATA%\ea-backtest-studio\config.json`

---

*Last Updated: December 2024*
