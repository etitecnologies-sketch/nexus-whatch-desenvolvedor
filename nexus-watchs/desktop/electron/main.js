const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let mediamtxProcess;

const isDev = process.env.NODE_ENV === 'development';

function startMediaMTX() {
  const platform = process.platform;
  const binaryName = platform === 'win32' ? 'mediamtx.exe' : 'mediamtx';
  
  const mediamtxPath = isDev
    ? path.join(__dirname, '..', 'mediamtx', binaryName)
    : path.join(process.resourcesPath, 'mediamtx', binaryName);

  const configPath = isDev
    ? path.join(__dirname, '..', 'mediamtx', 'mediamtx.yml')
    : path.join(process.resourcesPath, 'mediamtx', 'mediamtx.yml');

  try {
    mediamtxProcess = spawn(mediamtxPath, [configPath], { stdio: 'pipe' });

    mediamtxProcess.stdout.on('data', (data) => console.log(`[MediaMTX] ${data}`));
    mediamtxProcess.stderr.on('data', (data) => console.error(`[MediaMTX Error] ${data}`));
    mediamtxProcess.on('close', (code) => console.log(`[MediaMTX] Encerrado com código ${code}`));
    console.log('[MediaMTX] Iniciado com sucesso!');
  } catch (err) {
    console.error('[MediaMTX] Falha ao iniciar:', err.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'Nexus Watch',
    backgroundColor: '#0A0E27',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('store:get', (_, key) => store.get(key));
ipcMain.handle('store:set', (_, key, value) => store.set(key, value));
ipcMain.handle('store:delete', (_, key) => store.delete(key));

ipcMain.handle('mediamtx:addStream', async (_, { name, rtspUrl }) => {
  try {
    const axios = require('axios');
    await axios.post(`http://localhost:9997/v3/config/paths/add/${name}`, {
      source: rtspUrl,
      sourceOnDemand: true,
    });
    return { success: true, hlsUrl: `http://localhost:8888/${name}/index.m3u8` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mediamtx:removeStream', async (_, name) => {
  try {
    const axios = require('axios');
    await axios.delete(`http://localhost:9997/v3/config/paths/delete/${name}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shell:openExternal', (_, url) => shell.openExternal(url));

app.whenReady().then(() => {
  startMediaMTX();
  setTimeout(createWindow, 1500);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (mediamtxProcess) mediamtxProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { if (mediamtxProcess) mediamtxProcess.kill(); });
