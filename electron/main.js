const { app, BrowserWindow, session, ipcMain, Notification } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let backendProcess;
let mainWindow;

function getBackendPath() {
  const bin = process.platform === 'win32' ? 'capstoneStat.exe' : 'capstoneStat';
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', bin);
  }
  return path.join(__dirname, '..', 'backend', 'dist', bin);
}

function startBackend() {
  backendProcess = spawn(getBackendPath(), [], {
    stdio: 'ignore',
    detached: false,
  });
  backendProcess.on('error', (err) => console.error('Backend failed to start:', err));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  setTimeout(() => {
    mainWindow.loadFile(path.join(__dirname, 'out', 'index.html'));
  }, 4000);
}

ipcMain.on('send-notification', (event, { title, body }) => {
  new Notification({ title, body }).show();
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true)
    } else {
      callback(false)
    }
  })
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  app.quit();
});