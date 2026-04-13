import { useState, useRef, useEffect } from 'react';
import './Home.css';

const API_BASE = 'http://localhost:8000';

const durationOptions = [0.5, 1, 2, 3, 4, 5];
const formatDuration = (val) => val === 0.5 ? '30 seconds' : `${val} min`;

function Home() {
  const [cameraOn, setCameraOn] = useState(false);
  const [heightAdjust, setHeightAdjust] = useState(50);
  const [warningType, setWarningType] = useState('banner');
  const [duration, setDuration] = useState(1);
  const [showDurationHelp, setShowDurationHelp] = useState(false);
  const [postureScore, setPostureScore] = useState(78);
  const [sessionTime, setSessionTime] = useState('2h 34m');
  const [alertsToday, setAlertsToday] = useState(12);
  const [avgScore, setAvgScore] = useState(85);
  const [postureLabel, setPostureLabel] = useState("UNKNOWN");

  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  const startCamera = async () => {
    try {
      await fetch(`${API_BASE}/start-session`, { method: 'POST' });

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = async () => {
    try {
      await fetch(`${API_BASE}/end-session`, { method: 'POST' });
    } catch (err) {
      console.error('Error ending session:', err);
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureAndSendFrame = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.7);

    try {
      const res = await fetch(`${API_BASE}/analyze-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });

      const data = await res.json();

      if (data.posture_score !== undefined) setPostureScore(data.posture_score);
      if (data.session_time) setSessionTime(data.session_time);
      if (data.alerts_today !== undefined) setAlertsToday(data.alerts_today);
      if (data.avg_score !== undefined) setAvgScore(data.avg_score);
      if (data.posture_label) setPostureLabel(data.posture_label);

    } catch (err) {
      console.error('Error sending frame:', err);
    }
  };

  useEffect(() => {
    if (cameraOn) {
      startCamera().then(() => {
        intervalRef.current = setInterval(captureAndSendFrame, 200);
      });
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [cameraOn]);

  const handleTestAlert = () => {
    alert('Test Alert: Check your posture!');
  };

  return (
    <div className="home-page">
      <header className="header">
        <h1 className="header-title">Posture Checker</h1>
        <div className="camera-toggle">
          <span className="toggle-label">Camera</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={cameraOn}
              onChange={(e) => setCameraOn(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
          <span className="toggle-status">{cameraOn ? 'ON' : 'OFF'}</span>
        </div>
      </header>

      <div className="content-grid">
        <div className="left-column">
          <section className="card">
            <h2 className="card-title">Warning Alert</h2>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="warning"
                  value="banner"
                  checked={warningType === 'banner'}
                  onChange={(e) => setWarningType(e.target.value)}
                />
                <span>Banner alert</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="warning"
                  value="popup"
                  checked={warningType === 'popup'}
                  onChange={(e) => setWarningType(e.target.value)}
                />
                <span>Pop up alert</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="warning"
                  value="none"
                  checked={warningType === 'none'}
                  onChange={(e) => setWarningType(e.target.value)}
                />
                <span>None</span>
              </label>
            </div>
            <div className="setting-group">
              <div className="setting-label-row">
                <label className="setting-label">
                  Alert me after this time: {formatDuration(durationOptions[duration])}
                </label>
                <button
                  type="button"
                  className="info-icon-btn"
                  onClick={() => setShowDurationHelp((prev) => !prev)}
                  aria-expanded={showDurationHelp}
                  aria-controls="duration-help"
                  aria-label="Toggle duration help"
                >
                  i
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="slider-input"
              />
              {showDurationHelp && (
                <div className="help-dropdown" id="duration-help">
                  <p>
                    Choose how long you want to maintain bad posture before receiving an alert.
                    Adjust this based on your preferences and how frequently you want to be reminded to correct your posture.
                  </p>
                  <button
                    type="button"
                    className="collapse-help-btn"
                    onClick={() => setShowDurationHelp(false)}
                  >
                    Collapse
                  </button>
                </div>
              )}
            </div>
            <button className="test-alert-btn" onClick={handleTestAlert}>
              🔔 Test Alert
            </button>
          </section>
        </div>

        <div className="right-column">
          <section className="card preview-card">
            <h2 className="card-title">Preview</h2>
            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="video-preview"
              />
              {!cameraOn && (
                <div className="video-placeholder">
                  <div className="placeholder-silhouette"></div>
                </div>
              )}
              <div className="posture-score-badge">
                <div className="score-label">Posture Score</div>
                <div className="score-value">{postureScore}%</div>
                <div className={`posture-label ${postureLabel === "BAD" ? "bad" : "good"}`}>
                  {postureLabel}
                </div>
              </div>
            </div>
          </section>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{sessionTime}</div>
              <div className="stat-label">Session Time</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{alertsToday}</div>
              <div className="stat-label">Alerts Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{avgScore}%</div>
              <div className="stat-label">Avg Score</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;