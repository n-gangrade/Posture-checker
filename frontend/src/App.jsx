import { useState } from 'react';
import './App.css';
import Home from './components/Home';
import StatsDash from './components/StatsDash';
import Settings from './components/Settings';

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
          <h1 className="sidebar-title">POSTURE</h1>
          <h2 className="sidebar-subtitle">PROTECTOR</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeNav === 'home' ? 'active' : ''}`}
            onClick={() => setActiveNav('home')}
          >
            <span className="nav-icon">🏠</span> Home
          </button>
          <button 
            className={`nav-item ${activeNav === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveNav('stats')}
          >
            <span className="nav-icon">📊</span> Stats Dash
          </button>
          <button 
            className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveNav('settings')}
          >
            <span className="nav-icon">👤</span> Settings
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