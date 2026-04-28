import { useState } from 'react';
import './App.css';
import Home from './components/Home';
import StatsDash from './components/StatsDash';
import Settings from './components/Settings';

/** Root SPA component that switches between Home, Stats, and Settings pages. */
function App() {
  const [activeNav, setActiveNav] = useState('home');

  const renderPage = () => {
    switch (activeNav) {
      case 'home':
        return <Home />;
      case 'stats':
        return <StatsDash />;
      case 'settings':
        return <Settings />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img className="logo" height="100" src="posturelogo.png" alt="Logo" />
          <div className="sidebar-heading">
            <h1 className="sidebar-title">POSTURE</h1>
            <h2 className="sidebar-subtitle">PROTECTOR</h2>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeNav === 'home' ? 'active' : ''}`}
            onClick={() => setActiveNav('home')}>
            <img className="nav-icon nav-icon-image" src="house_icon.png" alt="Home" />
            Home
          </button>

          <button 
            className={`nav-item ${activeNav === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveNav('stats')}>
            <img className="nav-icon nav-icon-image" src="stats_icon.png" alt="Stats" />
            Statistics
          </button>

          <button 
            className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveNav('settings')}>
            <img className="nav-icon nav-icon-image" src="settings_icon.png" alt="Settings" />
            Settings
          </button>
        </nav>
        <div className="sidebar-footer">v1.0.0 Prototype</div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;