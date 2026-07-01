import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../hooks/useAuth';
import { api, ApiError } from '../lib/api';
import './AuthModal.css';
import './Navbar.css';

export default function AuthModal({
  mode: initialMode,
  pendingPrompt,
  returnTo,
  onClose,
  onSuccess,
}) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const handleSuccess = async () => {
    if (onSuccess) {
      onSuccess();
      onClose();
      return;
    }

    if (pendingPrompt) {
      const { project } = await api.createProject({
        name: pendingPrompt.slice(0, 50),
        prompt: pendingPrompt,
      });
      onClose();
      navigate(`/project/${project.id}`, { state: { autoGenerate: true } });
      return;
    }

    onClose();
    navigate(returnTo || '/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      await handleSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `${mode === 'login' ? 'Login' : 'Registration'} failed`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <Logo size="md" className="auth-logo-img" />
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">
          {mode === 'register' && pendingPrompt
            ? 'Sign up to start building your app'
            : mode === 'login'
              ? 'Sign in to continue building'
              : 'Start building apps with AI today'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoFocus
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus={mode === 'login'}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
              minLength={mode === 'register' ? 6 : undefined}
              required
            />
          </label>
          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading
              ? mode === 'login' ? 'Signing in...' : 'Creating account...'
              : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => switchMode('register')}>Create one</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')}>Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
