import { useState, useRef, useEffect } from 'react';
import './Home.css';

function Home() {
  const [cameraOn, setCameraOn] = useState(false);
  const [heightAdjust, setHeightAdjust] = useState(50);
  const [warningType, setWarningType] = useState('banner');
  const [duration, setDuration] = useState(3);
  const [postureScore, setPostureScore] = useState(78);
  const [sessionTime, setSessionTime] = useState('2h 34m');
  const [alertsToday, setAlertsToday] = useState(12);
  const [avgScore, setAvgScore] = useState(85);
  const videoRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (cameraOn) {
      startCamera();
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
      {/* Header */}
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
        {/* Left Column */}
        <div className="left-column">
          {/* Camera Settings */}
          <section className="card">
            <h2 className="card-title">Camera Settings</h2>
            <div className="setting-group">
              <label className="setting-label">Select Camera</label>
              <select className="select-input">
                <option>Built-in Camera</option>
                <option>External Camera</option>
              </select>
            </div>
            <div className="setting-group">
              <label className="setting-label">Adjust Height {heightAdjust}%</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={heightAdjust}
                onChange={(e) => setHeightAdjust(e.target.value)}
                className="slider-input"
              />
            </div>
          </section>

          {/* Warning Alert */}
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
              <label className="setting-label">Duration: {duration} minutes</label>
              <input 
                type="range" 
                min="1" 
                max="30" 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="slider-input"
              />
            </div>
            <button className="test-alert-btn" onClick={handleTestAlert}>
              🔔 Test Alert
            </button>
          </section>
        </div>

        {/* Right Column */}
        <div className="right-column">
          {/* Preview */}
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
              </div>
            </div>
          </section>

          {/* Stats */}
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
