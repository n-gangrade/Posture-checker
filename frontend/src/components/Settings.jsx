import {useState, useEffect} from 'react';
import './Settings.css';

function Settings() {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Simulate authentication state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    memberSince: '',
    postureScore: 0
  });

  useEffect(() => {
    // Simulate fetching profile data from an API
    // In a real application, you would replace this with an actual API call
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
    localStorage.removeItem('user');
    localStorage.removeItem('profileData');
  };
  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('user', 'dummyUser');
    setProfileData({
      name: 'Barbie',
      email: 'barbie@tamu.edu',
      memberSince: '2026-04-08',
      postureScore: 67
    });
  }
  const handleCreateAccount = () => {
    setIsAuthenticated(true);
    localStorage.setItem('user', 'dummyUser');
    setProfileData({
      name: '',
      email: '',
      memberSince: new Date().toLocaleDateString(),
      postureScore: 0
    });
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
            <button className="auth-button" onClick={handleLogin}>Login</button>
            <button className="auth-button" onClick={handleCreateAccount}>Create Account</button>
          </div>
        ) : (
          <div className="profile-section">
            <h2>Personal Information</h2>
            <h3>Name:</h3><input type="text" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} />
            <h3>Email:</h3><input type="email" value={profileData.email} onChange={(e) => setProfileData({...profileData, email: e.target.value})} />
            <h3>Member Since: {profileData.memberSince}</h3>
            <h3>Posture Score: {profileData.postureScore}</h3>
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
