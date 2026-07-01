import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, LayoutDashboard, User, Lock, ChevronDown } from 'lucide-react';
import Logo from './Logo';
import ProfileModal from './ProfileModal';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../hooks/useAuthModal';
import './Navbar.css';
import './ProfileModal.css';

export default function Navbar({ minimal }) {
  const { user, logout, setUser } = useAuth();
  const { openAuth } = useAuthModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileModal, setProfileModal] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openProfile = (mode) => {
    setMenuOpen(false);
    setProfileModal(mode);
  };

  return (
    <>
      <nav className="navbar">
        <Logo size="sm" />

        <div className="navbar-actions">
          {user ? (
            <>
              {!minimal && (
                <Link to="/dashboard" className="nav-link">
                  <LayoutDashboard size={16} />
                  Projects
                </Link>
              )}

              <div className="nav-user-menu" ref={menuRef}>
                <button
                  type="button"
                  className={`nav-user-btn ${menuOpen ? 'open' : ''}`}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <span className="nav-user-avatar">{user.name?.charAt(0).toUpperCase()}</span>
                  <span>{user.name}</span>
                  <ChevronDown size={14} />
                </button>

                {menuOpen && (
                  <div className="nav-user-dropdown">
                    <div className="nav-user-dropdown-head">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <button type="button" className="nav-user-dropdown-item" onClick={() => openProfile('profile')}>
                      <User size={15} />
                      Edit profile
                    </button>
                    <button type="button" className="nav-user-dropdown-item" onClick={() => openProfile('password')}>
                      <Lock size={15} />
                      Reset password
                    </button>
                    <div className="nav-user-dropdown-divider" />
                    <button
                      type="button"
                      className="nav-user-dropdown-item danger"
                      onClick={() => { setMenuOpen(false); logout(); }}
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button type="button" className="nav-link nav-btn" onClick={() => openAuth('login')}>
                Sign in
              </button>
              <button type="button" className="btn-primary btn-sm" onClick={() => openAuth('register')}>
                Get started
              </button>
            </>
          )}
        </div>
      </nav>

      {profileModal && (
        <ProfileModal
          mode={profileModal}
          onClose={() => setProfileModal(null)}
          onUpdated={(updatedUser) => setUser(updatedUser)}
        />
      )}
    </>
  );
}
