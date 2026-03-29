#!/usr/bin/env node
/**
 * Electron Development Script
 * Compiles TypeScript and launches Electron in dev mode
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const ELECTRON_DIR = path.join(ROOT, 'electron');
const DIST_ELECTRON = path.join(ROOT, 'dist-electron');

console.log('🔧 Compiling Electron TypeScript...');

// Ensure dist-electron directory exists
if (!fs.existsSync(DIST_ELECTRON)) {
  fs.mkdirSync(DIST_ELECTRON, { recursive: true });
}

// Compile TypeScript
try {
  execSync('npx tsc -p electron/tsconfig.json', { 
    cwd: ROOT, 
    stdio: 'inherit' 
  });
  console.log('✅ Electron compiled successfully');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

// Start Vite dev server
console.log('🚀 Starting Vite dev server...');
const vite = spawn('npm', ['run', 'dev'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, BROWSER: 'none' }
});

// Wait for Vite to be ready, then start Electron
setTimeout(() => {
  console.log('⚡ Starting Electron...');
  const electron = spawn('npx', ['electron', '.'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electron.on('close', (code) => {
    vite.kill();
    process.exit(code);
  });
}, 5000);

process.on('SIGINT', () => {
  vite.kill();
  process.exit(0);
});
