import base64
import csv
import json
import os
import urllib.request
import time
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Optional

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pathlib

# ── Download model if missing ──────────────────────────────────────────────────
MODEL_PATH = str(pathlib.Path.home() / "posture_checker_model" / "pose_landmarker_lite.task")
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
MODEL_URL  = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_lite/float16/latest/"
    "pose_landmarker_lite.task"
)
if not os.path.exists(MODEL_PATH):
    print("Downloading pose model (~3 MB)...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Download complete.")

# ── Build landmarker ───────────────────────────────────────────────────────────
base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options      = vision.PoseLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.IMAGE,
)
landmarker = vision.PoseLandmarker.create_from_options(options)

# ── Landmark indices ───────────────────────────────────────────────────────────
LEFT_EAR       = 7
RIGHT_EAR      = 8
LEFT_SHOULDER  = 11
RIGHT_SHOULDER = 12

Z_BAD_THRESHOLD = 2.5

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# SESSION STATE
# -----------------------------
current_session = {
    "running": False,
    "start_time": None,
    "username": "anonymous",
    "session_id": None,
    "good_frames": 0,
    "bad_frames": 0,
    "low_conf_frames": 0,
    "no_person_frames": 0,
    "alerts_today": 0,
    "last_alert_time": 0,
    "bad_start_time": None,
    "z_hist": deque(maxlen=10),
    "baseline": None,
    "calibration_samples_dx": [],
    "calibration_samples_dz": [],
    "calibrating": False,
}

session_history = []

# -----------------------------
# REQUEST MODELS
# -----------------------------
class FrameRequest(BaseModel):
    image: str  # base64 image string


class StartSessionRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None


class UserProfileRequest(BaseModel):
    name: str
    email: str


# -----------------------------
# LOCAL CSV PERSISTENCE
# -----------------------------
SESSION_CSV_PATH = pathlib.Path(__file__).resolve().parent / "session_stats.csv"
USER_PROFILE_PATH = pathlib.Path.home() / ".posture_checker" / "user_profile.json"
# posture_score is the full-session average posture score (not an instantaneous score).
SESSION_CSV_HEADERS = [
    "timestamp",
    "username",
    "session_start",
    "session_end",
    "posture_score",
    "alert_count",
    "session_id",
    "session_duration_seconds",
]


def get_session_duration_seconds(start_time, end_time=None):
    if not start_time:
        return 0
    if end_time is None:
        end_time = time.time()
    return max(0, int(end_time - start_time))


def append_session_to_csv(row):
    SESSION_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    should_write_header = (
        not SESSION_CSV_PATH.exists() or SESSION_CSV_PATH.stat().st_size == 0
    )

    try:
        with open(SESSION_CSV_PATH, "a", newline="", encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=SESSION_CSV_HEADERS)
            if should_write_header:
                writer.writeheader()
            writer.writerow(row)
        return True, None
    except OSError as exc:
        return False, str(exc)


def load_user_profile():
    if not USER_PROFILE_PATH.exists() or USER_PROFILE_PATH.stat().st_size == 0:
        return None

    try:
        with open(USER_PROFILE_PATH, "r", encoding="utf-8") as profile_file:
            return json.load(profile_file)
    except (OSError, json.JSONDecodeError):
        return None


def save_user_profile(name, email):
    existing_profile = load_user_profile() or {}
    created_at = existing_profile.get("created_at")
    if not created_at:
        created_at = datetime.now(timezone.utc).isoformat()

    profile = {
        "name": name,
        "email": email,
        "created_at": created_at,
    }

    USER_PROFILE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(USER_PROFILE_PATH, "w", encoding="utf-8") as profile_file:
        json.dump(profile, profile_file, indent=2)

    return profile

# -----------------------------
# POSTURE LOGIC
# -----------------------------
def get_landmarks(frame):
    """Run landmarker on one BGR frame, return landmark list or None."""
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(mp_image)
    if result.pose_landmarks:
        return result.pose_landmarks[0]  # first person
    return None

def posture_metrics(landmarks, min_vis=0.45):
    le = landmarks[LEFT_EAR]
    re = landmarks[RIGHT_EAR]
    ls = landmarks[LEFT_SHOULDER]
    rs = landmarks[RIGHT_SHOULDER]

    if any(getattr(p, "visibility", 1.0) < min_vis for p in [le, re, ls, rs]):
        return None

    ear_x = (le.x + re.x) / 2.0
    sh_x  = (ls.x + rs.x) / 2.0
    shoulder_width = abs(ls.x - rs.x) + 1e-6
    dx = abs(ear_x - sh_x) / shoulder_width

    ear_z = (le.z + re.z) / 2.0
    sh_z  = (ls.z + rs.z) / 2.0
    dz = abs(ear_z - sh_z)

    return dx, dz

def posture_zscore(dx, dz, baseline, w_dx=1.0, w_dz=2.0):
    z_dx = (dx - baseline["dx_mean"]) / baseline["dx_std"]
    z_dz = (dz - baseline["dz_mean"]) / baseline["dz_std"]
    return w_dx * z_dx + w_dz * z_dz

def classify_from_z(z):
    return "BAD" if z > Z_BAD_THRESHOLD else "GOOD"

def decode_base64_image(data_url: str):
    if "," in data_url:
        _, encoded = data_url.split(",", 1)
    else:
        encoded = data_url
    image_bytes = base64.b64decode(encoded)
    np_arr = np.frombuffer(image_bytes, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

def compute_score(good_frames, bad_frames):
    tracked = good_frames + bad_frames
    if tracked == 0:
        return 0
    return round((good_frames / tracked) * 100, 2)


def compute_session_average_posture_score(good_frames, bad_frames):
    return compute_score(good_frames, bad_frames)

def get_session_time_string(start_time):
    if not start_time:
        return "0m"
    elapsed = int(time.time() - start_time)
    hours = elapsed // 3600
    minutes = (elapsed % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"

# -----------------------------
# API ROUTES
# -----------------------------
@app.get("/")
def root():
    return {"message": "Posture backend is running"}


@app.get("/profile")
def get_profile():
    return {"profile": load_user_profile()}


@app.post("/profile")
def upsert_profile(payload: UserProfileRequest):
    name = payload.name.strip()
    email = payload.email.strip().lower()

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    try:
        profile = save_user_profile(name=name, email=email)
        return {"message": "Profile saved", "profile": profile}
    except OSError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/start-session")
def start_session(payload: Optional[StartSessionRequest] = None):
    username = "anonymous"
    if payload:
        candidate = ""
        if payload.email:
            candidate = payload.email.strip().lower()
        elif payload.username:
            candidate = payload.username.strip()
        if candidate:
            username = candidate

    current_session["running"] = True
    current_session["start_time"] = time.time()
    current_session["username"] = username
    current_session["session_id"] = str(uuid.uuid4())
    current_session["good_frames"] = 0
    current_session["bad_frames"] = 0
    current_session["low_conf_frames"] = 0
    current_session["no_person_frames"] = 0
    current_session["alerts_today"] = 0
    current_session["last_alert_time"] = 0
    current_session["bad_start_time"] = None
    current_session["z_hist"] = deque(maxlen=10)
    current_session["baseline"] = None
    current_session["calibration_samples_dx"] = []
    current_session["calibration_samples_dz"] = []
    current_session["calibrating"] = True
    return {
        "message": "Session started. Calibrating...",
        "username": current_session["username"],
        "session_id": current_session["session_id"],
    }

@app.post("/end-session")
def end_session():
    if not current_session["running"]:
        return {"message": "No active session"}

    end_time = time.time()
    start_time = current_session["start_time"]
    session_avg_posture_score = compute_session_average_posture_score(
        current_session["good_frames"],
        current_session["bad_frames"]
    )
    session_duration_seconds = get_session_duration_seconds(start_time, end_time)

    session_start_iso = ""
    if start_time:
        session_start_iso = datetime.fromtimestamp(
            start_time,
            tz=timezone.utc
        ).isoformat()
    session_end_iso = datetime.fromtimestamp(end_time, tz=timezone.utc).isoformat()
    timestamp_iso = datetime.now(timezone.utc).isoformat()

    csv_row = {
        "timestamp": timestamp_iso,
        "username": current_session["username"],
        "session_start": session_start_iso,
        "session_end": session_end_iso,
        "posture_score": session_avg_posture_score,
        "alert_count": current_session["alerts_today"],
        "session_id": current_session["session_id"],
        "session_duration_seconds": session_duration_seconds,
    }
    csv_saved, csv_error = append_session_to_csv(csv_row)

    result = {
        "session_time": get_session_time_string(current_session["start_time"]),
        "posture_score": session_avg_posture_score,
        "session_avg_posture_score": session_avg_posture_score,
        "alerts_today": current_session["alerts_today"],
        "avg_score": session_avg_posture_score,
        "username": current_session["username"],
        "session_id": current_session["session_id"],
        "session_duration_seconds": session_duration_seconds,
        "csv_saved": csv_saved,
    }
    if csv_error:
        result["csv_error"] = csv_error

    session_history.append(result)
    current_session["running"] = False
    current_session["start_time"] = None
    current_session["session_id"] = None
    return {"message": "Session ended", "summary": result}

@app.get("/status")
def get_status():
    posture_score = compute_score(
        current_session["good_frames"],
        current_session["bad_frames"]
    )
    avg_score = posture_score if not session_history else round(
        sum(s["avg_score"] for s in session_history) / len(session_history), 2
    )
    return {
        "running": current_session["running"],
        "calibrating": current_session["calibrating"],
        "posture_score": posture_score,
        "session_time": get_session_time_string(current_session["start_time"]),
        "alerts_today": current_session["alerts_today"],
        "avg_score": avg_score,
        "good_frames": current_session["good_frames"],
        "bad_frames": current_session["bad_frames"],
        "low_conf_frames": current_session["low_conf_frames"],
        "no_person_frames": current_session["no_person_frames"],
    }

@app.post("/analyze-frame")
def analyze_frame(payload: FrameRequest):
    if not current_session["running"]:
        return {
            "posture_label": "SESSION NOT STARTED",
            "posture_score": 0,
            "session_time": "0m",
            "alerts_today": 0,
            "avg_score": 0,
        }

    frame = decode_base64_image(payload.image)
    if frame is None:
        return {"error": "Could not decode image"}

    # ── New Tasks API call ─────────────────────────────────────────────────────
    lms = get_landmarks(frame)

    posture_label = "NO PERSON"
    now = time.time()

    if lms:
        m = posture_metrics(lms)

        if m is not None:
            dx, dz = m

            if current_session["calibrating"]:
                current_session["calibration_samples_dx"].append(dx)
                current_session["calibration_samples_dz"].append(dz)

                if len(current_session["calibration_samples_dx"]) >= 30:
                    current_session["baseline"] = {
                        "dx_mean": float(np.mean(current_session["calibration_samples_dx"])),
                        "dx_std":  float(np.std(current_session["calibration_samples_dx"]) + 1e-6),
                        "dz_mean": float(np.mean(current_session["calibration_samples_dz"])),
                        "dz_std":  float(np.std(current_session["calibration_samples_dz"]) + 1e-6),
                    }
                    current_session["calibrating"] = False

                posture_label = "CALIBRATING"

            else:
                baseline = current_session["baseline"]
                z = posture_zscore(dx, dz, baseline)
                current_session["z_hist"].append(z)
                z_smooth = sum(current_session["z_hist"]) / len(current_session["z_hist"])
                posture_label = classify_from_z(z_smooth)

                if posture_label == "BAD":
                    current_session["bad_frames"] += 1
                    if current_session["bad_start_time"] is None:
                        current_session["bad_start_time"] = now
                    elif (now - current_session["bad_start_time"] > 5
                          and now - current_session["last_alert_time"] > 30):
                        current_session["alerts_today"] += 1
                        current_session["last_alert_time"] = now
                else:
                    current_session["good_frames"] += 1
                    current_session["bad_start_time"] = None
        else:
            posture_label = "LOW CONF"
            current_session["low_conf_frames"] += 1
    else:
        posture_label = "NO PERSON"
        current_session["no_person_frames"] += 1
        current_session["z_hist"].clear()
        current_session["bad_start_time"] = None

    posture_score = compute_score(
        current_session["good_frames"],
        current_session["bad_frames"]
    )
    avg_score = posture_score if not session_history else round(
        (sum(s["avg_score"] for s in session_history) + posture_score)
        / (len(session_history) + 1),
        2
    )

    return {
        "posture_label": posture_label,
        "calibrating": current_session["calibrating"],
        "posture_score": posture_score,
        "session_time": get_session_time_string(current_session["start_time"]),
        "alerts_today": current_session["alerts_today"],
        "avg_score": avg_score,
        "good_frames": current_session["good_frames"],
        "bad_frames": current_session["bad_frames"],
        "low_conf_frames": current_session["low_conf_frames"],
        "no_person_frames": current_session["no_person_frames"],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)