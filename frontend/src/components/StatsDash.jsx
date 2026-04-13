import {useState } from 'react';
import './StatsDash.css';

function StatsDash() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('Past 7 days');

  return (
    <div className="stats-dash-page">
      <div className="page-header">
        <h1>Statistics Dashboard</h1>
        <p>Track your posture performance over time</p>
      </div>
      <div className="stats-content">
        <p>Selected Time Range:</p>
        <select className="time-range" value={selectedTimeRange} onChange={(e) => setSelectedTimeRange(e.target.value)}>

          <option value="Past hour">Past Hour</option>
          <option value="Past Day">Past Day</option>
          <option value="Past 7 Days">Past 7 Days</option>
          <option value="Past 30 Days">Past 30 Days</option>
        </select>
        <button className="export-button">Export Data</button>
        <div className="stats-section">
          <h2>Posture Score Over Time: {selectedTimeRange}</h2>
          {/* Placeholder for a line chart showing posture score trends */}
        </div>
        <div className="stats-section">
          <h2>Average Posture Score Over {selectedTimeRange}</h2>
          {/* Placeholder for a gauge or bar chart showing average posture score */}
        </div>
        {/* score over a session*, posture score over time, avg posture score, adjust the time range */} 
        {/* text file: user id, username, posture data w/ timestamps */}
        {/* export button to download the data as a CSV or JSON file */}
      </div>
    </div>
  );
}

export default StatsDash;
