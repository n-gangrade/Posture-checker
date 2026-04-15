import {useState, useEffect} from 'react';
import './Settings.css';

function Settings() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    memberSince: '',
    postureScore: 0
  });

  useEffect(() => {
    // Check if user is already authenticated
    const savedUser = localStorage.getItem('user');
    const savedProfile = localStorage.getItem('profileData');
    if (savedUser) {
      setIsAuthenticated(true);
    }
    if (savedProfile) {
      setProfileData(JSON.parse(savedProfile));
    }
  }, []);

  useEffect(() => {
    // Save profile data to localStorage whenever it changes
    if (isAuthenticated) {
      localStorage.setItem('profileData', JSON.stringify(profileData));
    }
  }, [profileData, isAuthenticated]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginEmail('');
    localStorage.removeItem('user');
    localStorage.removeItem('profileData');
  };

  const handleLogin = () => {
    if (!loginEmail.trim()) {
      alert('Please enter your email');
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      alert('Please enter a valid email address');
      return;
    }
    
    setIsAuthenticated(true);
    localStorage.setItem('user', loginEmail);
    setProfileData({
      name: '',
      email: loginEmail,
      memberSince: new Date().toLocaleDateString(),
      postureScore: 0
    });
    setLoginEmail('');
  };

  const handleCreateAccount = () => {
    if (!loginEmail.trim()) {
      alert('Please enter your email');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      alert('Please enter a valid email address');
      return;
    }
    
    setIsAuthenticated(true);
    localStorage.setItem('user', loginEmail);
    setProfileData({
      name: '',
      email: loginEmail,
      memberSince: new Date().toLocaleDateString(),
      postureScore: 0
    });
    setLoginEmail('');
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>User Profile</h1>
        <p>Manage your account and preferences</p>
      </div>
      <div className="profile-content">
        {!isAuthenticated ? (
          <div className="auth-section">
            <h2>Login or Create Account</h2>
            <div className="login-form">
              <label htmlFor="email">Email Address:</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <div className="auth-buttons">
                <button className="auth-button" onClick={handleLogin}>Login</button>
                <button className="auth-button" onClick={handleCreateAccount}>Create Account</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-section">
            <h2>Personal Information</h2>
            <h3>Name:</h3><input type="text" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} />
            <h3>Email:</h3><input type="email" value={profileData.email} onChange={(e) => setProfileData({...profileData, email: e.target.value})} />
            <h3>Member Since: {profileData.memberSince}</h3>
            <button className="logout-button" onClick={handleLogout}>Logout</button>
            <button onClick={() => alert("Add new profile here")}>Add Profile</button>
          </div>
        )}
        { /* all the user crap is kind of irrelevant, no one cares about device type height etc, just the posture data and timestamps */}
        {/* create profile button & change profile using a dropdown / pop up. */}
      </div>
    </div>
  );
}

export default Settings;
