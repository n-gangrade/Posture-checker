import { useEffect, useState } from 'react';
import './Settings.css';

const API_BASE = 'http://localhost:8000';

function Settings() {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    createdAt: '',
  });
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/profile`);
        if (!res.ok) {
          throw new Error(`Failed to load profile: ${res.status}`);
        }

        const data = await res.json();
        if (data.profile) {
          setProfileData({
            name: data.profile.name || '',
            email: data.profile.email || '',
            createdAt: data.profile.created_at || '',
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    const email = profileData.email.trim().toLowerCase();
    if (!email) {
      setStatusMessage('Email is required to save profile.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name.trim(),
          email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save profile');
      }

      setProfileData({
        name: data.profile.name || '',
        email: data.profile.email || '',
        createdAt: data.profile.created_at || '',
      });
      setStatusMessage('Profile saved locally.');
    } catch (err) {
      console.error('Error saving profile:', err);
      setStatusMessage('Could not save profile.');
    }
  };

  const createdAtLabel = profileData.createdAt
    ? new Date(profileData.createdAt).toLocaleString()
    : 'Not created yet';

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>User Profile</h1>
        <p>Manage your account and preferences</p>
      </div>
      <div className="profile-content">
        <div className="profile-section">
          <h2>Personal Information</h2>
          <h3>Name:</h3>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
          />
          <h3>Email:</h3>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
          />
          <h3>Profile Created: {createdAtLabel}</h3>
          <button className="auth-button" onClick={handleSaveProfile}>Save Profile</button>
          {statusMessage && <p>{statusMessage}</p>}
        </div>
      </div>
    </div>
  );
}

export default Settings;
