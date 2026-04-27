# Posture Checker

Posture Checker is a local desktop app that monitors posture in real time from webcam frames, raises alerts for sustained bad posture, and stores session metrics for dashboarding.

## Architecture Overview

- Frontend: React + Vite UI for Home, Statistics, and Settings
- Backend: FastAPI + MediaPipe posture analysis and local persistence
- Desktop shell: Electron app that launches backend and hosts frontend build
- Packaging: PyInstaller (backend executable) + electron-builder (desktop installer)

## Repository Structure

```text
Posture-checker/
  backend/
    capstoneStat.py
    capstone.py
    requirements.txt
    smoke_test_session_csv.py
    session_stats.csv
  electron/
    main.js
    preload.js
    notification.html
    package.json
  frontend/
    src/
      App.jsx
      components/
        Home.jsx
        StatsDash.jsx
        Settings.jsx
    package.json
  package.json
  README.md
```

## Core User Flows

### 1. Start monitoring

- User enables Camera in Home view.
- Frontend calls POST /start-session.
- Frontend streams webcam frames to POST /analyze-frame every 200ms.
- Backend calibrates first, then classifies posture as GOOD or BAD.
- Frontend displays session metrics and current posture label.

### 2. Receive alerts

- User selects alert type (popup, system, or none) and delay threshold.
- Frontend triggers Electron IPC to show notifications when threshold is crossed.
- Backend separately tracks alert counters for session stats.

### 3. Review and export statistics

- Stats view requests parsed CSV rows via Electron IPC.
- Data is filtered by range and current profile user when available.
- User can export session CSV through save dialog.

### 4. Manage profile

- Settings view loads/saves local profile via backend profile endpoints.
- Email is required for profile save.

## Data Persistence

- Session CSV:
  - backend/session_stats.csv
- User profile JSON:
  - %USERPROFILE%\\.posture_checker\\user_profile.json
- Pose model download cache:
  - %USERPROFILE%\\posture_checker_model\\pose_landmarker_lite.task

## API Summary

Backend default host/port:

- http://127.0.0.1:8000

Primary routes:

- GET /
- GET /profile
- POST /profile
- POST /start-session
- POST /analyze-frame
- GET /status
- POST /end-session

For route payload examples and behavior details, see backend/README.md.

## Prerequisites

- Python 3.10+ recommended
- Node.js 18+ recommended
- npm

## First-Time Setup (Windows)

From project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install pyinstaller

cd ..
npm run install-all
```

## First-Time Setup (macOS)

From project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install pyinstaller

cd ..
npm run install-all
```

## Run the App

From project root:

```powershell
npm start
```

What npm start does:

- Builds backend executable via PyInstaller
- Builds frontend via Vite
- Copies frontend build into electron/out
- Launches Electron app

## Build Installer

From project root:

```powershell
npm run dist
```

This runs the same build chain and then electron-builder packaging.

## Root Scripts

Defined in package.json:

- install-all
- build-backend
- build-frontend
- copy-frontend
- start
- dist

## Development Notes

- The active UI runtime uses Vite + React under frontend/src.
- The repository also contains Next.js scaffold files that are not part of the Electron runtime path.
- capstone.py is a legacy webcam script; capstoneStat.py is the backend used by packaging and desktop runtime.

## Known Path Caveat

When packaged, backend CSV write location may differ from paths Electron currently checks for stats/export.

Electron currently searches:

- backend/session_stats.csv
- backend/dist/session_stats.csv

If packaged runs produce no stats in dashboard/export, verify CSV location used by the bundled backend executable.

## Troubleshooting

### Backend executable build fails

- Ensure backend venv is activated.
- Reinstall dependencies:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install pyinstaller
```

### Blank Electron window

- Ensure frontend/dist exists.
- Ensure frontend build was copied to electron/out.

### Camera permission issues

- Allow camera permissions for the app/process in OS privacy settings.
- Close other apps that may hold the camera.

### Clean rebuild

Windows:

```powershell
Remove-Item backend\dist -Recurse -Force
Remove-Item frontend\dist -Recurse -Force
Remove-Item electron\out -Recurse -Force
npm start
```

macOS/Linux:

```bash
rm -rf backend/dist
rm -rf frontend/dist
rm -rf electron/out
npm start
```

## Module-Level Documentation

- Backend details: backend/README.md
- Frontend details: frontend/README.md
- Electron details: electron/README.md
