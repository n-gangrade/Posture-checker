# Electron Shell Documentation

This folder contains the desktop shell that launches the packaged backend and serves the built frontend.

## Stack

- Electron
- electron-builder

Main files:

- main.js
- preload.js
- notification.html

## Responsibilities

- Starts the packaged backend executable.
- Loads frontend build from electron/out/index.html.
- Bridges renderer-to-main IPC through preload.
- Handles notifications.
- Reads and exports session CSV for the dashboard.

## Run Electron Alone

Electron expects prepared assets:

- backend executable in backend/dist
- frontend build copied to electron/out

From project root:

```powershell
cd electron
npm install
npm start
```

In normal development, use root scripts so build/copy steps happen automatically.

## Backend Executable Path Logic

In main.js:

- Dev path:
  - ../backend/dist/capstoneStat.exe (Windows)
  - ../backend/dist/capstoneStat (macOS/Linux)
- Packaged path:
  - process.resourcesPath/bin/capstoneStat(.exe)

## Frontend Load

Main window loads:

- out/index.html

There is a startup delay before load to give the backend time to boot.

## IPC API Surface (preload.js)

The following renderer APIs are exposed under window.electronAPI:

- sendNotification(data)
- sendSystemNotification(data)
- onNotificationData(callback)
- focusMainWindow()
- getSessionStats()
- exportSessionData()

## Notification Modes

- Custom popup window using notification.html (send-notification)
- Native OS notification using Electron Notification (send-system-notification)

## CSV Discovery for Dashboard and Export

main.js searches for session_stats.csv in:

- ../backend/session_stats.csv
- ../backend/dist/session_stats.csv

Used by:

- get-session-stats
- export-session-data

## Packaging

electron/package.json config:

- appId: com.posturechecker.app
- Windows target: nsis
- macOS target: dmg
- extraResources copies ../backend/dist into resources/bin

## Known Operational Note

The backend writes CSV relative to its runtime location. In packaged environments, verify the shell can still discover the produced session_stats.csv path used by the backend binary.
