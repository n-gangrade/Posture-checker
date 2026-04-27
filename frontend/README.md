# Frontend Documentation

This frontend is a React + Vite application embedded inside Electron.

## Stack

- React
- Vite
- CSS modules by component file convention (plain CSS files)

Main entry points:

- src/main.jsx
- src/App.jsx

## Navigation and Views

The app uses a sidebar and three main views:

- Home
- Statistics
- Settings

Component mapping:

- src/components/Home.jsx
- src/components/StatsDash.jsx
- src/components/Settings.jsx

## Backend Dependency

The frontend expects the backend API at:

- http://localhost:8000

Used endpoints include:

- GET /profile
- POST /profile
- POST /start-session
- POST /analyze-frame
- POST /end-session

## Home Flow

Home handles live posture monitoring:

- Enables webcam via navigator.mediaDevices.getUserMedia.
- Starts backend session when camera is turned on.
- Sends frames every 200ms to POST /analyze-frame.
- Displays posture score, posture label, session time, alert count, and average score.
- Ends session and camera stream on stop/unmount.

Alert behavior:

- User chooses alert mode: popup, system alert, or none.
- User chooses delay before local alert trigger.
- Alerts are sent through Electron IPC bridge (window.electronAPI).

## Statistics Flow

Stats dashboard:

- Fetches session rows via Electron IPC getSessionStats().
- Optionally filters by current profile user if available.
- Supports time ranges:
	- Past Hour
	- Past Day
	- Past 7 Days
	- Past 30 Days
- Renders an SVG line chart from CSV session history.
- Supports CSV export through Electron IPC exportSessionData().

## Settings Flow

Settings manages local profile data:

- Loads profile from GET /profile.
- Saves profile via POST /profile.
- Requires email for save.
- Displays profile created timestamp.

## Running Frontend Only (Web)

From frontend:

```powershell
npm install
npm run dev
```

Important:

- Desktop-only features (notifications, stats CSV export, session CSV reading) depend on Electron preload APIs and will show fallback messages in browser-only mode.

## Build

```powershell
npm run build
```

Build output goes to frontend/dist and is copied to electron/out by root scripts.

## Notes

- There are leftover Next.js scaffold files in this folder, but the active runtime app path is Vite + React under src.
