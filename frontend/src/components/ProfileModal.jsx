import { useState, useEffect } from 'react';
import { X, User, Lock } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import './ProfileModal.css';

export default function ProfileModal({ mode = 'profile', onClose, onUpdated }) {
  const [tab, setTab] = useState(mode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.me()
      .then(({ user }) => {
        setName(user.name || '');
        setEmail(user.email || '');
      })
      .catch(() => {});
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { user, token } = await api.updateProfile({ name: name.trim(), email: email.trim() });
      localStorage.setItem('digigro_token', token);
      onUpdated?.(user);
      setSuccess('Profile updated successfully');
      setTimeout(onClose, 800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ currentPassword, newPassword });
      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(onClose, 1000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>Account settings</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="profile-tabs">
          <button
            type="button"
            className={`profile-tab ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => { setTab('profile'); setError(''); setSuccess(''); }}
          >
            <User size={15} />
            Edit profile
          </button>
          <button
            type="button"
            className={`profile-tab ${tab === 'password' ? 'active' : ''}`}
            onClick={() => { setTab('password'); setError(''); setSuccess(''); }}
          >
            <Lock size={15} />
            Reset password
          </button>
        </div>

        {error && <div className="profile-error">{error}</div>}
        {success && <div className="profile-success">{success}</div>}

        {tab === 'profile' ? (
          <form onSubmit={handleProfileSubmit} className="profile-form">
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <div className="profile-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </label>
            <div className="profile-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
