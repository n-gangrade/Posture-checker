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
        {/* <p className="placeholder-text">Stats Dashboard - Coming Soon</p> */}
        {/* Add your stats charts and data here */}
        <p>Selected Time Range:</p>
        <select className="time-range" value={selectedTimeRange} onChange={(e) => setSelectedTimeRange(e.target.value)}>

          <option value="Past hour">Past Hour</option>
          <option value="Past Day">Past Day</option>
          <option value="Past 7 Days">Past 7 Days</option>
          <option value="Past Month">Past Month</option>
          <option value="Past 3 Months">Past 3 Months</option>
          <option value="Past 6 Months">Past 6 Months</option>
          <option value="Past Year">Past Year</option>
          <option value="All time">All Time</option>
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
        <div className="stats-section">
          <h2>Most Common Issue</h2>
          {/* Placeholder for a text or chart showing the most common posture issue */}
        </div>
        {/* score over a session*, posture score over time, avg posture score, adjust the time range */} 
        {/* text file: user id, username, posture data w/ timestamps */}
        {/* export button to download the data as a CSV or JSON file */}
        { /* limit time range to 30 days */}
        { /* all the user crap is kind of irrelevant, no one cares about device type height etc, just the posture data and timestamps */}
        {/* create profile button & change profile using a dropdown / pop up. */}
      </div>
    </div>
  );
}

export default StatsDash;
