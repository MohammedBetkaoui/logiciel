const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

let mainWindow;
let pythonProcess = null;
let backendReady = false;

// ─── Find a working Python executable (dev mode only) ───────────
function findPython() {
  const candidates = process.platform === 'win32'
    ? ['python', 'python3', 'py']
    : ['python3', 'python'];

  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: 'pipe', timeout: 5000 });
      return cmd;
    } catch {
      // try next
    }
  }
  return null;
}

// ─── Find the bundled backend executable (production) ───────────
function findBundledBackend() {
  const possiblePaths = [
    path.join(process.resourcesPath, 'backend-dist', 'bba-backend.exe'),
    path.join(process.resourcesPath, 'backend-dist', 'bba-backend'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// ─── Start Python Backend ───────────────────────────────────────
function startPythonBackend() {
  return new Promise((resolve) => {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // ── Development: use system Python ──
      const pythonCmd = findPython();
      if (!pythonCmd) {
        console.error('Python introuvable sur le système');
        dialog.showMessageBox({
          type: 'warning',
          title: 'Backend indisponible',
          message: 'Python n\'est pas installé ou introuvable.\n\nL\'application s\'ouvrira mais les fonctionnalités backend seront indisponibles.\nInstallez Python 3.8+ depuis python.org puis relancez.',
        });
        resolve(false);
        return;
      }

      const backendPath = path.join(__dirname, '..', 'backend');
      const serverScript = path.join(backendPath, 'server.py');
      if (!fs.existsSync(serverScript)) {
        console.error(`server.py introuvable: ${serverScript}`);
        resolve(false);
        return;
      }

      console.log(`[DEV] Starting Python backend: ${pythonCmd} ${serverScript}`);
      try {
        pythonProcess = spawn(pythonCmd, [serverScript], {
          cwd: backendPath,
          env: { ...process.env },
          windowsHide: true,
        });
      } catch (err) {
        console.error('spawn failed:', err);
        resolve(false);
        return;
      }
    } else {
      // ── Production: use bundled .exe ──
      const bundledExe = findBundledBackend();
      if (!bundledExe) {
        console.error('Backend .exe introuvable dans les ressources');
        dialog.showMessageBox({
          type: 'error',
          title: 'Erreur Backend',
          message: 'Le backend intégré est introuvable.\nL\'application ne fonctionnera pas correctement.\nRéinstallez l\'application.',
        });
        resolve(false);
        return;
      }

      const backendDir = path.dirname(bundledExe);
      // Data directory: persistent location in user's appData
      const dataDir = path.join(app.getPath('userData'), 'backend-data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      console.log(`[PROD] Starting bundled backend: ${bundledExe}`);
      console.log(`[PROD] Data directory: ${dataDir}`);

      try {
        pythonProcess = spawn(bundledExe, [], {
          cwd: backendDir,
          env: { ...process.env, BBA_DATA_DIR: dataDir },
          windowsHide: true,
        });
      } catch (err) {
        console.error('spawn failed:', err);
        resolve(false);
        return;
      }
    }

    pythonProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log(`[Backend] ${msg}`);
      if (msg.includes('Uvicorn running') || msg.includes('Application startup complete')) {
        backendReady = true;
        console.log('Backend is ready!');
        resolve(true);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      console.error(`[Backend] ${msg}`);
      // Uvicorn prints to stderr too
      if (msg.includes('Uvicorn running') || msg.includes('Application startup complete')) {
        backendReady = true;
        resolve(true);
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      resolve(false);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Backend exited with code ${code}`);
      pythonProcess = null;
    });

    // Timeout fallback – resolve anyway so the window always opens
    setTimeout(() => {
      if (!backendReady) {
        console.log('Backend timeout – opening window anyway');
        backendReady = pythonProcess != null;
      }
      resolve(backendReady);
    }, 15000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, // Frameless window for custom titlebar
    transparent: false,
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Dev or production URL
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Stop Python backend when main window closes
    if (pythonProcess) {
      pythonProcess.kill();
      pythonProcess = null;
    }
  });
}

// ─── Window Controls ────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());

// ─── Python Backend Health Check (placeholder) ──────────────────
ipcMain.handle('python:health', async () => {
  try {
    const response = await fetch('http://localhost:8000/health');
    const data = await response.json();
    return { online: true, data };
  } catch {
    return { online: false };
  }
});

// ─── Execute Python Script (placeholder) ────────────────────────
ipcMain.handle('python:run-script', async (_event, scriptName) => {
  try {
    const response = await fetch(`http://localhost:8000/run/${scriptName}`, {
      method: 'POST',
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── SQLite Query via Python backend (placeholder) ──────────────
ipcMain.handle('db:query', async (_event, query) => {
  try {
    const response = await fetch('http://localhost:8000/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── Medical API Routes ─────────────────────────────────────────
const medicalRoutes = {
  'medical:patients': (search) => fetch(`http://localhost:8000/api/patients${search ? '?search=' + encodeURIComponent(search) : ''}`),
  'medical:patient': (id) => fetch(`http://localhost:8000/api/patients/${id}`),
  'medical:dashboard-stats': () => fetch('http://localhost:8000/api/dashboard/stats'),
  'medical:anomalies': () => fetch('http://localhost:8000/api/dashboard/anomalies'),
  'medical:pio-history': () => fetch('http://localhost:8000/api/dashboard/pio-history'),
  'medical:demographics': () => fetch('http://localhost:8000/api/dashboard/demographics'),
  'medical:alerts': () => fetch('http://localhost:8000/api/dashboard/alerts'),
  'medical:export-rgpd': () => fetch('http://localhost:8000/api/rgpd/export-csv'),
};

for (const [channel, fetchFn] of Object.entries(medicalRoutes)) {
  ipcMain.handle(channel, async (_event, arg) => {
    try {
      const response = await fetchFn(arg);
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

ipcMain.handle('medical:create-patient', async (_event, data) => {
  try {
    const response = await fetch('http://localhost:8000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('medical:create-examen', async (_event, data) => {
  try {
    const response = await fetch('http://localhost:8000/api/examens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  // Always create the window first so the user sees the app
  createWindow();

  // Then start backend in background – never block the UI
  try {
    const ok = await startPythonBackend();
    if (!ok) {
      console.warn('Backend did not start – app running in frontend-only mode');
    }
  } catch (error) {
    console.error('Backend startup error (non-fatal):', error);
  }
});

app.on('window-all-closed', () => {
  // Kill Python backend process
  if (pythonProcess) {
    console.log('Stopping Python backend...');
    pythonProcess.kill();
    pythonProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Clean up Python backend on app quit
app.on('quit', () => {
  if (pythonProcess) {
    console.log('Cleaning up Python backend...');
    pythonProcess.kill();
    pythonProcess = null;
  }
});
