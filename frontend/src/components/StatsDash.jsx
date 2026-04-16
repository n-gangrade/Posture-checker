import { useEffect, useMemo, useState } from "react";
import "./StatsDash.css";

const API_BASE = "http://localhost:8000";

function toLower(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function withinRange(timestamp, selectedTimeRange) {
  const now = Date.now();
  const ms = now - timestamp;

  if (selectedTimeRange === "Past Hour") return ms <= 60 * 60 * 1000;
  if (selectedTimeRange === "Past Day") return ms <= 24 * 60 * 60 * 1000;
  if (selectedTimeRange === "Past 7 Days") return ms <= 7 * 24 * 60 * 60 * 1000;
  if (selectedTimeRange === "Past 30 Days")
    return ms <= 30 * 24 * 60 * 60 * 1000;
  return true;
}

function formatChartDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function StatsDash() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("Past Hour");
  const [exportMessage, setExportMessage] = useState("");
  const [graphMessage, setGraphMessage] = useState("Loading session data...");
  const [sessions, setSessions] = useState([]);
  const [currentUser, setCurrentUser] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!window.electronAPI?.getSessionStats) {
        setGraphMessage("Session graph is only available in the desktop app.");
        setSessions([]);
        return;
      }

      try {
        const statsResult = await window.electronAPI.getSessionStats();
        if (!statsResult?.ok) {
          setGraphMessage(statsResult?.error || "Could not load session data.");
          setSessions([]);
          return;
        }

        const normalized = (statsResult.rows || [])
          .map((row) => {
            const rawTime =
              row.session_start || row.timestamp || row.session_end;
            const sessionTime = Date.parse(rawTime);
            const postureScore = Number(row.posture_score);
            const username = toLower(row.username);

            if (
              !Number.isFinite(sessionTime) ||
              !Number.isFinite(postureScore)
            ) {
              return null;
            }

            return {
              username,
              postureScore,
              sessionTime,
              labelTime: new Date(sessionTime).toLocaleString(),
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.sessionTime - b.sessionTime);

        setSessions(normalized);

        try {
          const profileRes = await fetch(`${API_BASE}/profile`);
          if (profileRes.ok) {
            const payload = await profileRes.json();
            setCurrentUser(
              toLower(payload?.profile?.email || payload?.profile?.name),
            );
          }
        } catch (error) {
          setCurrentUser("");
        }

        setGraphMessage(normalized.length ? "" : "No session data found yet.");
      } catch (error) {
        setGraphMessage("Could not load session data.");
        setSessions([]);
      }
    };

    loadData();
  }, []);

  const filteredSessions = useMemo(() => {
    const fromRange = sessions.filter((session) =>
      withinRange(session.sessionTime, selectedTimeRange),
    );

    if (!currentUser) {
      return fromRange;
    }

    const byUser = fromRange.filter(
      (session) => session.username === currentUser,
    );
    return byUser.length ? byUser : fromRange;
  }, [sessions, selectedTimeRange, currentUser]);

  const chartData = useMemo(() => {
    const width = 760;
    const height = 320;
    const paddingLeft = 56;
    const paddingRight = 24;
    const paddingTop = 20;
    const paddingBottom = 76;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const points = filteredSessions.map((session, index) => {
      const x =
        filteredSessions.length === 1
          ? paddingLeft + plotWidth / 2
          : paddingLeft + (index / (filteredSessions.length - 1)) * plotWidth;
      const y = paddingTop + ((100 - session.postureScore) / 100) * plotHeight;
      return { ...session, x, y };
    });

    const tickIndexes =
      points.length <= 1
        ? [0]
        : Array.from({ length: Math.min(5, points.length) }, (_, index) =>
            Math.round((index * (points.length - 1)) / 4),
          );
    const xTicks = [...new Set(tickIndexes)].map((index) => {
      const point = points[index];
      return {
        x: point.x,
        label: formatChartDate(point.sessionTime),
      };
    });

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(" "),
      yTicks: [0, 25, 50, 75, 100],
      xTicks,
    };
  }, [filteredSessions]);

  const handleExport = async () => {
    if (!window.electronAPI?.exportSessionData) {
      setExportMessage("Export is only available in the desktop app.");
      return;
    }

    setExportMessage("");
    const result = await window.electronAPI.exportSessionData();

    if (result?.ok) {
      setExportMessage(`Exported to: ${result.filePath}`);
      return;
    }

    if (result?.canceled) {
      setExportMessage("Export canceled.");
      return;
    }

    setExportMessage(result?.error || "Could not export data.");
  };

  return (
    <div className="stats-dash-page">
      <div className="page-header">
        <h1>Statistics Dashboard</h1>
        <p>Track your posture performance over time</p>
      </div>
      <div className="stats-content">
        <div className="stats-toolbar">
          <p className="time-range-label">Selected Time Range:</p>
          <select
            className="time-range"
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
          >
            <option value="Past Hour">Past Hour</option>
            <option value="Past Day">Past Day</option>
            <option value="Past 7 Days">Past 7 Days</option>
            <option value="Past 30 Days">Past 30 Days</option>
          </select>
          <button className="export-button" onClick={handleExport}>
            Export Data
          </button>
        </div>
        {exportMessage ? (
          <p className="export-message">{exportMessage}</p>
        ) : null}

        <div className="stats-section chart-section">
          <h2>Session Performance Over Time</h2>
          <p className="chart-subtitle">
            {currentUser
              ? `Showing sessions for ${currentUser} (${selectedTimeRange})`
              : `Showing all users (${selectedTimeRange})`}
          </p>

          {graphMessage ? (
            <div className="chart-placeholder">{graphMessage}</div>
          ) : filteredSessions.length === 0 ? (
            <div className="chart-placeholder">
              No sessions in this time range.
            </div>
          ) : (
            <div className="chart-wrap">
              <svg
                className="session-chart"
                viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                role="img"
                aria-label="Line graph of posture score by session date"
              >
                <text
                  x={16}
                  y={chartData.height / 2}
                  className="chart-axis-title"
                  transform={`rotate(-90 16 ${chartData.height / 2})`}
                >
                  Posture Score (%)
                </text>

                {chartData.yTicks.map((tick) => {
                  const y =
                    chartData.paddingTop +
                    ((100 - tick) / 100) *
                      (chartData.height -
                        chartData.paddingTop -
                        chartData.paddingBottom);
                  return (
                    <g key={tick}>
                      <line
                        x1={chartData.paddingLeft}
                        y1={y}
                        x2={chartData.width - chartData.paddingRight}
                        y2={y}
                        className="chart-grid-line"
                      />
                      <text x={8} y={y + 4} className="chart-axis-label">
                        {tick}
                      </text>
                    </g>
                  );
                })}

                <polyline
                  className="chart-line"
                  fill="none"
                  points={chartData.polyline}
                />

                {chartData.xTicks.map((tick) => {
                  const tickTop = chartData.height - chartData.paddingBottom;
                  return (
                    <g key={`${tick.x}-${tick.label}`}>
                      <line
                        x1={tick.x}
                        y1={tickTop}
                        x2={tick.x}
                        y2={tickTop + 6}
                        className="chart-axis-tick"
                      />
                      <text
                        x={tick.x}
                        y={chartData.height - 20}
                        textAnchor="middle"
                        className="chart-x-axis-label"
                      >
                        {tick.label}
                      </text>
                    </g>
                  );
                })}

                {chartData.points.map((point) => (
                  <g key={`${point.sessionTime}-${point.x}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      className="chart-point"
                    />
                    <title>{`${point.labelTime}: ${point.postureScore}%`}</title>
                  </g>
                ))}

                <text
                  x={chartData.width / 2}
                  y={chartData.height - 8}
                  textAnchor="middle"
                  className="chart-axis-title"
                >
                  Session Date
                </text>
              </svg>
            </div>
          )}

          <p className="chart-summary">
            Sessions shown: {filteredSessions.length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default StatsDash;
