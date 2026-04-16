const {
  app,
  BrowserWindow,
  session,
  ipcMain,
  Notification,
  dialog,
} = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

let backendProcess;
let mainWindow;

function findSessionCsvPath() {
  const canonical = path.join(os.homedir(), ".posture_checker", "session_stats.csv");
  if (fs.existsSync(canonical)) return canonical;

  // Fallback for legacy/dev locations
  const fallbacks = [
    path.join(__dirname, "..", "backend", "session_stats.csv"),
    path.join(__dirname, "..", "backend", "dist", "session_stats.csv"),
  ];
  return fallbacks.find((p) => fs.existsSync(p));
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseSessionCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function getBackendPath() {
  const bin =
    process.platform === "win32" ? "capstoneStat.exe" : "capstoneStat";
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bin", bin);
  }
  return path.join(__dirname, "..", "backend", "dist", bin);
}

function startBackend() {
  backendProcess = spawn(getBackendPath(), [], {
    stdio: "ignore",
    detached: false,
  });
  backendProcess.on("error", (err) =>
    console.error("Backend failed to start:", err),
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  setTimeout(() => {
    mainWindow.loadFile(path.join(__dirname, "out", "index.html"));
  }, 4000);
}

ipcMain.on("send-notification", (event, { title, body }) => {
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
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  notify.loadFile(path.join(__dirname, "notification.html"));

  // Pass the message data to the window once it loads
  notify.webContents.on("did-finish-load", () => {
    notify.webContents.send("notification-data", { title, body });
  });

  // Auto close after 5 seconds
  setTimeout(() => {
    if (!notify.isDestroyed()) notify.close();
  }, 5000);
});

ipcMain.on("focus-main-window", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

ipcMain.handle("export-session-data", async () => {
  const sourcePath = findSessionCsvPath();
  if (!sourcePath) {
    return { ok: false, error: "Could not find session_stats.csv to export." };
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export Session Data",
    defaultPath: "session_stats.csv",
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }

  try {
    await fs.promises.copyFile(sourcePath, result.filePath);
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return { ok: false, error: error.message || "Export failed." };
  }
});

ipcMain.handle("get-session-stats", async () => {
  const sourcePath = findSessionCsvPath();
  if (!sourcePath) {
    return { ok: true, rows: [] };
  }

  try {
    const csvText = await fs.promises.readFile(sourcePath, "utf-8");
    const rows = parseSessionCsv(csvText);
    return { ok: true, rows };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "Could not read session data.",
    };
  }
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") {
        callback(true);
      } else {
        callback(false);
      }
    },
  );
  startBackend();
  createWindow();
});

app.on("window-all-closed", () => {
  if (backendProcess) backendProcess.kill();
  app.quit();
});
