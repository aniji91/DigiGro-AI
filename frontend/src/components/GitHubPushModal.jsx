import { useState } from 'react';
import { X, Github, ExternalLink } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import './GitHubPushModal.css';

export default function GitHubPushModal({ projectId, projectName, onClose, onBeforePush }) {
  const [token, setToken] = useState('');
  const [repoName, setRepoName] = useState(projectName || '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (onBeforePush) await onBeforePush();
      const data = await api.pushToGithub(projectId, {
        token,
        repoName,
        isPrivate,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to push to GitHub');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Github size={20} />
            Push to GitHub
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="modal-success">
            <p>Successfully pushed to GitHub!</p>
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="github-link">
              {result.url}
              <ExternalLink size={14} />
            </a>
            <p className="modal-meta">{result.filesPushed} files pushed</p>
            <button type="button" className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="modal-desc">
              Create a new GitHub repo with your project files. You need a{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=DIGIGRO%20AI"
                target="_blank"
                rel="noopener noreferrer"
              >
                Personal Access Token
              </a>{' '}
              with <code>repo</code> scope. Your token is never stored.
            </p>

            {error && <div className="modal-error">{error}</div>}

            <label>
              GitHub Token
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                required
                autoComplete="off"
              />
            </label>

            <label>
              Repository name
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-app"
                required
              />
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              Private repository
            </label>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading || !token.trim()}>
                {loading ? 'Pushing...' : 'Push to GitHub'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
