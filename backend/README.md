# Backend Documentation

This backend powers posture analysis, profile storage, and session tracking for the desktop app.

## Stack

- Python
- FastAPI
- MediaPipe Pose Landmarker Tasks API
- OpenCV
- NumPy

Main file: capstoneStat.py

## What It Does

- Downloads the pose model automatically on first run to:
  - %USERPROFILE%\\posture_checker_model\\pose_landmarker_lite.task
- Starts a local API server on:
  - http://127.0.0.1:8000
- Accepts webcam frames from the frontend and classifies posture.
- Stores session summaries in CSV.
- Stores a local user profile in JSON.

## Local Data Paths

- Session CSV:
  - backend/session_stats.csv
- User profile JSON:
  - %USERPROFILE%\\.posture_checker\\user_profile.json

## Running Backend Directly (Dev)

From project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python capstoneStat.py
```

## API Endpoints

### GET /
Health check.

Response:

```json
{ "message": "Posture backend is running" }
```

### GET /profile
Returns locally stored profile or null.

Response:

```json
{
  "profile": {
    "name": "Jane",
    "email": "jane@example.com",
    "created_at": "2026-04-26T00:00:00+00:00"
  }
}
```

### POST /profile
Creates or updates local profile.

Request:

```json
{
  "name": "Jane",
  "email": "jane@example.com"
}
```

Validation:

- Email is required.
- Email is normalized to lowercase.

### POST /start-session
Starts a new posture session and enters calibration mode.

Request (optional):

```json
{
  "username": "jane@example.com",
  "email": "jane@example.com"
}
```

Behavior:

- Uses email if provided, else username, else anonymous.
- Resets counters.
- Creates a new session_id.
- Starts calibration collection.

### POST /analyze-frame
Analyzes one base64 image frame.

Request:

```json
{
  "image": "data:image/jpeg;base64,..."
}
```

High-level logic:

- If no active session, returns SESSION NOT STARTED with zeroed stats.
- During calibration, collects 30 confident samples.
- After calibration, computes weighted z-score using:
  - ear/shoulder horizontal ratio
  - ear/shoulder depth ratio
- Classifies GOOD or BAD.
- Increments alert counter when bad posture lasts more than 5 seconds with 30 second cooldown.

Response fields include:

- posture_label
- calibrating
- posture_score
- session_time
- alerts_today
- avg_score
- good_frames
- bad_frames
- low_conf_frames
- no_person_frames

### GET /status
Returns current session status and aggregate counters.

### POST /end-session
Ends session, computes summary, appends a row to CSV, and returns summary.

Summary includes:

- session_time
- posture_score
- session_avg_posture_score
- alerts_today
- avg_score
- username
- session_id
- session_duration_seconds
- csv_saved
- csv_error (only when write fails)

## CSV Format

Header:

- timestamp
- username
- session_start
- session_end
- posture_score
- alert_count
- session_id
- session_duration_seconds

## Smoke Test

There is a small CSV persistence smoke test script:

```powershell
cd backend
python smoke_test_session_csv.py --base-url http://127.0.0.1:8000
```

It verifies:

- A session can start and end.
- CSV row count increases.
- session_id consistency.
- Username persistence.

## Legacy Script

capstone.py is a webcam-only prototype runner and is not used by Electron packaging.

## Known Notes

- The FastAPI app keeps active session state in memory.
- It is currently single-process session state, intended for local desktop use.
- CORS is configured open for local integration.
