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
  const notify = new BrowserWindow({
    width: 320,
    height: 75,
    x: 20,
    y: 20,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  notify.loadFile(path.join(__dirname, 'notification.html'));

  // Pass the message data to the window once it loads
  notify.webContents.on('did-finish-load', () => {
    notify.webContents.send('notification-data', { title, body });
  });

  // Auto close after 5 seconds
  setTimeout(() => {
    if (!notify.isDestroyed()) notify.close();
  }, 5000);
});

ipcMain.on('focus-main-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
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