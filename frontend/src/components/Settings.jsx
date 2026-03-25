import {useState, useEffect} from 'react';
import './Settings.css';

function Settings() {
  const [profileData, setProfileData] = useState({
    name: 'Barbie',
    email: 'barbie@tamu.edu',
    memberSince: 'March 2026',
    height: '180',
    heightUnit: 'cm',
    deviceType: 'laptop',
    preferredPosture: 'Sitting',
    postureScore: 67
  });

  useEffect(() => {
    // Simulate fetching profile data from an API
    // In a real application, you would replace this with an actual API call
    const saved = localStorage.getItem('profileData');
    if (saved) {
      setProfileData(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Save profile data to localStorage whenever it changes
    localStorage.setItem('profileData', JSON.stringify(profileData));
  }, [profileData]);

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>User Profile</h1>
        <p>Manage your account and preferences</p>
      </div>
      <div className="profile-content">
        <div className="profile-section">
          <h2>Personal Information</h2>
          <h3>Name:</h3><input type="text" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} />
          <h3>Email:</h3><input type="email" value={profileData.email} onChange={(e) => setProfileData({...profileData, email: e.target.value})} />
          <h3>Member Since: {profileData.memberSince}</h3>
        </div>
        <div className="profile-section">
          <h2>Physical Attributes</h2>
          <h3>Height:</h3><input type="text" value={profileData.height} onChange={(e) => setProfileData({...profileData, height: e.target.value})} />
          <h3>Height Unit:</h3>
          <select value={profileData.heightUnit} onChange={(e) => setProfileData({...profileData, heightUnit: e.target.value})}>
            <option value="cm">cm</option>
            <option value="in">inches</option>
          </select>
        </div>
        <div className="profile-section">
          <h2>Device Information</h2>
          <select value={profileData.deviceType} onChange={(e) => setProfileData({...profileData, deviceType: e.target.value})}>
            <option value="laptop">Laptop</option>
            <option value="desktop">Desktop</option>
          </select>
        </div>
        <div className="profile-section">
          <h2>Posture Information</h2>
          <h3>Preferred Posture:</h3>
          <select value={profileData.preferredPosture} onChange={(e) => setProfileData({...profileData, preferredPosture: e.target.value})}>
            <option value="sitting">Sitting</option>
            <option value="standing">Standing</option>
          </select>
          <h3>Average Posture Score (Past Week): {profileData.postureScore}/100</h3>
        </div>
      </div>
    </div>
  );
}

export default Settings;
