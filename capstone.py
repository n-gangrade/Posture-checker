import cv2
import mediapipe as mp
import numpy as np
import time

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()
mp_drawing = mp.solutions.drawing_utils

# Threshold (tune this later)
FORWARD_HEAD_THRESHOLD = 0.05  # normalized distance

# def calculate_forward_head(landmarks):
#     """
#     Measures horizontal distance between ear and shoulder.
#     Returns normalized forward head metric.
#     """
#     left_ear = landmarks[mp_pose.PoseLandmark.LEFT_EAR.value]
#     left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]

#     # Horizontal distance
#     forward_distance = abs(left_ear.x - left_shoulder.x)
#     return forward_distance
# def classify_posture(forward_metric):
#     if forward_metric > FORWARD_HEAD_THRESHOLD:
#         return "BAD"
#     return "GOOD"



mp_drawing = mp.solutions.drawing_utils
def draw_points(frame, landmarks, idxs, radius=6):
    h, w = frame.shape[:2]
    for i in idxs:
        lm = landmarks[i]
        cx, cy = int(lm.x * w), int(lm.y * h)
        cv2.circle(frame, (cx, cy), radius, (0, 255, 0), -1)


from collections import deque

scores = deque(maxlen=10)

def posture_metrics(landmarks, min_vis=0.6):
    le = landmarks[mp_pose.PoseLandmark.LEFT_EAR.value]
    re = landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value]
    ls = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
    rs = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]

    pts = [le, re, ls, rs]
    if any(getattr(p, "visibility", 1.0) < min_vis for p in pts):
        return None

    ear_x = (le.x + re.x) / 2.0
    sh_x  = (ls.x + rs.x) / 2.0
    shoulder_width = abs(ls.x - rs.x) + 1e-6

    dx = abs(ear_x - sh_x) / shoulder_width

    # Depth: ear vs shoulder (forward head tends to change this)
    ear_z = (le.z + re.z) / 2.0
    sh_z  = (ls.z + rs.z) / 2.0
    dz = abs(ear_z - sh_z)

    return dx, dz

def posture_zscore(dx, dz, baseline, w_dx=1.0, w_dz=2.0):
    z_dx = (dx - baseline["dx_mean"]) / baseline["dx_std"]
    z_dz = (dz - baseline["dz_mean"]) / baseline["dz_std"]
    return w_dx * z_dx + w_dz * z_dz

Z_BAD_THRESHOLD = 2.5  # tune

def classify_from_z(z):
    return "BAD" if z > Z_BAD_THRESHOLD else "GOOD"

def calibrate_baseline(cap, seconds=5, fps_assumed=30):
    """
    Ask user to sit with good posture for `seconds`.
    Collect metrics and return baseline stats.
    """
    print(f"✅ Calibration: Sit with GOOD posture for {seconds} seconds...")

    dx_samples = []
    dz_samples = []

    start = time.time()
    while time.time() - start < seconds:
        ret, frame = cap.read()
        if not ret:
            continue

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        if results.pose_landmarks:
            m = posture_metrics(results.pose_landmarks.landmark)
            if m is not None:
                dx, dz = m
                dx_samples.append(dx)
                dz_samples.append(dz)

        # Optional: show calibration window
        cv2.putText(frame, "CALIBRATING... sit tall",
                    (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
        cv2.imshow("Posture Checker", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    if len(dx_samples) < 20:
        raise RuntimeError("Calibration failed: not enough confident frames. Improve lighting and keep shoulders visible.")

    baseline = {
        "dx_mean": float(np.mean(dx_samples)),
        "dx_std": float(np.std(dx_samples) + 1e-6),
        "dz_mean": float(np.mean(dz_samples)),
        "dz_std": float(np.std(dz_samples) + 1e-6),
    }

    print("✅ Baseline set:", baseline)
    return baseline

from collections import deque

def main():
    cap = cv2.VideoCapture(0, cv2.CAP_AVFOUNDATION)

    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Check macOS Camera permissions for Terminal/VS Code.")

    baseline = calibrate_baseline(cap, seconds=5)

    z_hist = deque(maxlen=10)

    bad_start_time = None
    last_alert_time = 0
    ALERT_AFTER = 5
    ALERT_COOLDOWN = 30
    

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        posture_label = "NO PERSON"

        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS
            )
            m = posture_metrics(results.pose_landmarks.landmark)
            if m is not None:
                dx, dz = m
                z = posture_zscore(dx, dz, baseline)
                z_hist.append(z)
                z_smooth = sum(z_hist) / len(z_hist)

                posture_label = classify_from_z(z_smooth)
                print(f"dx={dx:.3f} dz={dz:.3f} z={z:.2f} z_smooth={z_smooth:.2f} label={posture_label}")

                # Alert logic with cooldown
                now = time.time()
                if posture_label == "BAD":
                    if bad_start_time is None:
                        bad_start_time = now
                    elif now - bad_start_time > ALERT_AFTER and now - last_alert_time > ALERT_COOLDOWN:
                        print("⚠️ Slouching detected (calibrated)!")
                        last_alert_time = now
                else:
                    bad_start_time = None
            else:
                posture_label = "LOW CONF"
        else:
            posture_label = "NO PERSON"
            z_hist.clear()
            bad_start_time = None

        cv2.putText(frame, f"Posture: {posture_label}",
                    (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1,
                    (0, 0, 255) if posture_label == "BAD" else (0, 255, 0), 2)

        cv2.imshow("Posture Checker", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()