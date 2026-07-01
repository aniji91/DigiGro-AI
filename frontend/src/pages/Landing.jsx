import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Zap, Code2, Eye, MessageSquare } from 'lucide-react';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../hooks/useAuthModal';
import { api } from '../lib/api';
import './Landing.css';

const EXAMPLES = [
  'A todo app with dark theme and checkboxes',
  'SaaS landing page with hero and pricing',
  'Analytics dashboard with stat cards',
  'Recipe finder with search and cards',
];

export default function Landing() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { openAuth } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.auth) {
      openAuth(location.state.auth, {
        pendingPrompt: location.state.prompt,
        returnTo: location.state.returnTo,
      });
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, openAuth, navigate]);

  const handleStart = async () => {
    if (!prompt.trim()) return;

    if (!user) {
      openAuth('register', { pendingPrompt: prompt.trim() });
      return;
    }

    setLoading(true);
    try {
      const { project } = await api.createProject({
        name: prompt.slice(0, 50),
        prompt: prompt.trim(),
      });
      navigate(`/project/${project.id}`, { state: { autoGenerate: true } });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <Navbar />

      <main className="landing-main">
        <div className="hero-glow" />

        <div className="hero-badge">
          <span className="hero-badge-dot" />
          AI-powered app builder
        </div>

        <h1 className="hero-title">
          Build apps with
          <span className="gradient-text"> natural language</span>
        </h1>

        <p className="hero-subtitle">
          Describe what you want. DigiGro AI generates beautiful React apps
          instantly — no coding required.
        </p>

        <div className="prompt-box">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleStart();
              }
            }}
            placeholder="Describe the app you want to build..."
            rows={3}
          />
          <button
            className="btn-primary prompt-submit"
            onClick={handleStart}
            disabled={!prompt.trim() || loading}
          >
            {loading ? 'Creating...' : 'Start building'}
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="examples">
          <span className="examples-label">Try an example:</span>
          <div className="examples-list">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="example-chip" onClick={() => setPrompt(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="features">
          <div className="feature-card">
            <div className="feature-icon"><MessageSquare size={22} /></div>
            <h3>Chat to build</h3>
            <p>Describe features in plain English and iterate with conversation.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Eye size={22} /></div>
            <h3>Live preview</h3>
            <p>See your app come to life instantly in a real-time preview panel.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Code2 size={22} /></div>
            <h3>Real code</h3>
            <p>Export clean React JSX you can customize and deploy anywhere.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Zap size={22} /></div>
            <h3>Powered by Claude</h3>
            <p>Uses Anthropic Claude like Lovable — or demo mode without an API key.</p>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <Logo size="sm" linkTo="/" />
        <p>© 2026 DigiGro AI — Build the future, one prompt at a time.</p>
      </footer>
    </div>
  );
}
