import base64
import os
import urllib.request
import time
from collections import deque

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
from fastapi import FastAPI
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

@app.post("/start-session")
def start_session():
    current_session["running"] = True
    current_session["start_time"] = time.time()
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
    return {"message": "Session started. Calibrating..."}

@app.post("/end-session")
def end_session():
    if not current_session["running"]:
        return {"message": "No active session"}

    result = {
        "session_time": get_session_time_string(current_session["start_time"]),
        "posture_score": compute_score(
            current_session["good_frames"],
            current_session["bad_frames"]
        ),
        "alerts_today": current_session["alerts_today"],
        "avg_score": compute_score(
            current_session["good_frames"],
            current_session["bad_frames"]
        ),
    }
    session_history.append(result)
    current_session["running"] = False
    current_session["start_time"] = None
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