# Posture-checker

## Backend setup (Windows)

From the project root:

1. Create a virtual environment (if you do not already have one):
	- `py -m venv .venv`
2. Activate it:
	- `\.venv\Scripts\Activate.ps1`
3. Install dependencies:
	- `python -m pip install -r backend/requirements.txt`

## Run posture checker

From the project root:

- `uvicorn backend.capstoneStat:app --reload`

From /frontend
- `npm install`
- `npm run dev`

Press `q` in the OpenCV window to quit.

⸻

Posture Checker

A real-time posture monitoring web application that uses MediaPipe Pose detection to analyze posture from a webcam feed.
The system consists of:
	•	Frontend: React + Vite (camera UI and dashboard)
	•	Backend: FastAPI + OpenCV + MediaPipe (posture analysis)

The frontend captures webcam frames and sends them to the backend for posture analysis.

⸻

Project Structure

posture_project
│
├── Backend
│   ├── capstoneStat.py
│   └── requirements.txt
│
├── Posture-checker
│   ├── src
│   ├── package.json
│   └── vite.config.js
│
└── README.md


⸻

Requirements

Install the following:

Node.js

Version 20.19+

Check version:

node -v


⸻

Python

Python 3.10 – 3.12

Check version:

python3 --version


⸻

Backend Setup (FastAPI)

1. Navigate to backend

cd Backend


⸻

2. Create virtual environment

python3 -m venv venv

Activate it:

Mac / Linux

source venv/bin/activate

Windows

venv\Scripts\activate


⸻

3. Install dependencies

pip install fastapi uvicorn opencv-python mediapipe numpy

Optional:

pip install python-multipart


⸻

4. Run backend

uvicorn capstoneStat:app --reload

Server should start at:

http://localhost:8000

Test it in browser:

http://localhost:8000

Expected response:

{"message":"Posture backend is running"}


⸻

Frontend Setup (React + Vite)

1. Navigate to frontend

cd Posture-checker


⸻

2. Install dependencies

npm install


⸻

3. Run development server

npm run dev

You should see something like:

Local: http://localhost:5173

Open it in your browser.

⸻

How It Works
	1.	User turns camera ON in the UI.
	2.	The browser captures frames from the webcam.
	3.	Frames are sent to the backend API:

POST /analyze-frame

	4.	Backend runs MediaPipe Pose detection.
	5.	Posture is classified as:

GOOD
BAD
CALIBRATING
NO PERSON
LOW CONF


Calibration

When a session starts, the system performs automatic posture calibration.

The user should:
	1.	Sit upright
	2.	Keep shoulders visible
	3.	Face the camera

Calibration takes about 30 frames (~2–3 seconds).


