import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Copy, Link2, Globe, Shield, Settings, BarChart3, Check, ExternalLink, Triangle,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import './PublishPopover.css';

function displayUrl(project) {
  if (project?.customDomain) return project.customDomain;
  if (project?.vercelUrl) {
    try {
      return new URL(project.vercelUrl).host;
    } catch {
      return project.vercelUrl.replace(/^https?:\/\//, '');
    }
  }
  try {
    const url = new URL(project?.publishedUrl || '');
    return url.host + url.pathname;
  } catch {
    return project?.publishedUrl || '';
  }
}

function copyTarget(project) {
  if (project?.customDomain) return `https://${project.customDomain}`;
  return project?.publishedUrl || project?.vercelUrl || '';
}

export default function PublishPopover({
  projectId,
  project,
  onClose,
  onPublished,
  ensureSaved,
  anchorRef,
}) {
  const navigate = useNavigate();
  const popoverRef = useRef(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);

  useEffect(() => {
    api.getPublishInfo(projectId)
      .then((data) => {
        setInfo(data);
        setCustomDomain(data.project?.customDomain || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        popoverRef.current?.contains(e.target)
        || anchorRef?.current?.contains(e.target)
      ) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (ensureSaved) await ensureSaved();
      const result = await api.publishProject(projectId);
      setInfo((prev) => ({ ...prev, ...result, project: result.project }));
      onPublished?.(result.project);
      if (result.vercelWarning) {
        alert(`Published locally. Vercel: ${result.vercelWarning}`);
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      const { project: updated } = await api.unpublishProject(projectId);
      setInfo((prev) => ({ ...prev, project: updated }));
      onPublished?.(updated);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to unpublish');
    } finally {
      setPublishing(false);
    }
  };

  const copyUrl = async () => {
    const url = copyTarget(info?.project);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveDomain = async () => {
    setSavingDomain(true);
    try {
      const { project: updated } = await api.updateShareSettings(projectId, {
        customDomain: customDomain.trim() || null,
      });
      setInfo((prev) => ({ ...prev, project: updated }));
      setShowSettings(true);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to save domain');
    } finally {
      setSavingDomain(false);
    }
  };

  const published = info?.project?.published;
  const url = copyTarget(info?.project);
  const isVercel = info?.project?.hosting === 'vercel';
  const dns = info?.project?.domainDns;

  return (
    <div className="publish-popover" ref={popoverRef}>
      <div className="publish-popover-header">
        <h3>{published ? 'Published' : 'Publish'}</h3>
        <div className="publish-popover-header-right">
          {published && (
            <button
              type="button"
              className="publish-visitors"
              onClick={() => {
                onClose();
                navigate(`/project/${projectId}/analytics`);
              }}
            >
              <BarChart3 size={14} />
              {info?.visitors ?? 0} Visitors
            </button>
          )}
          <button type="button" className="publish-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="publish-loading"><div className="spinner" /></div>
      ) : (
        <>
          {!info?.vercelConfigured && (
            <div className="publish-notice">
              Add <code>VERCEL_TOKEN</code> to backend/.env to deploy on Vercel.
            </div>
          )}

          {published && (
            <>
              {isVercel && (
                <div className="publish-vercel-badge">
                  <Triangle size={12} fill="currentColor" />
                  Hosted on Vercel
                </div>
              )}

              <div className="publish-section">
                <div className="publish-section-label">
                  <span>Website URL</span>
                  <button type="button" className="publish-link-btn" onClick={() => setShowSettings(true)}>
                    <Link2 size={13} />
                    Add custom domain
                  </button>
                </div>
                <div className="publish-url-row">
                  <span className="publish-url">{displayUrl(info.project)}</span>
                  <button type="button" className="publish-copy" onClick={copyUrl} title="Copy URL">
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
                {info.project.vercelUrl && (
                  <p className="publish-url-sub">
                    Vercel: <a href={info.project.vercelUrl} target="_blank" rel="noreferrer">{info.project.vercelUrl.replace('https://', '')}</a>
                  </p>
                )}
              </div>

              <div className="publish-section">
                <p className="publish-section-title">Who can see this website</p>
                <div className="publish-visibility">
                  <Globe size={18} />
                  <div>
                    <strong>Public</strong>
                    <span>Anyone with the URL</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {showSettings && (
            <div className="publish-settings">
              <label>
                Custom domain
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="app.yourdomain.com"
                />
              </label>
              <p className="publish-settings-hint">
                Domain is connected via Vercel. Add the DNS records below at your registrar.
              </p>

              {dns?.records?.length > 0 && (
                <div className="publish-dns">
                  <p className="publish-dns-title">DNS records</p>
                  {dns.records.map((r, i) => (
                    <div key={i} className="publish-dns-row">
                      <span className="publish-dns-type">{r.type}</span>
                      <span className="publish-dns-name">{r.name}</span>
                      <code className="publish-dns-value">{r.value}</code>
                    </div>
                  ))}
                  {info?.project?.customDomainStatus && (
                    <p className="publish-dns-status">
                      Status: {info.project.customDomainStatus}
                    </p>
                  )}
                </div>
              )}

              <div className="publish-settings-actions">
                <button type="button" className="btn-secondary btn-sm" onClick={() => setShowSettings(false)}>
                  Cancel
                </button>
                <button type="button" className="btn-primary btn-sm" onClick={saveDomain} disabled={savingDomain}>
                  {savingDomain ? 'Saving...' : 'Connect domain'}
                </button>
              </div>
            </div>
          )}

          <div className="publish-actions">
            {published && (
              <>
                <button type="button" className="publish-action-btn">
                  <Shield size={15} />
                  Review security
                  {(info?.securityIssues ?? 0) > 0 && (
                    <span className="publish-badge">{info.securityIssues}</span>
                  )}
                </button>
                <button type="button" className="publish-action-btn" onClick={() => setShowSettings(true)}>
                  <Settings size={15} />
                  Edit settings
                </button>
              </>
            )}
          </div>

          <div className="publish-footer">
            {published ? (
              <>
                <button
                  type="button"
                  className="publish-status-btn"
                  disabled={publishing}
                  onClick={handlePublish}
                >
                  {publishing ? 'Deploying to Vercel...' : isVercel ? 'Redeploy on Vercel' : 'Up to date'}
                </button>
                <div className="publish-footer-links">
                  <button type="button" className="publish-text-btn" onClick={handleUnpublish}>
                    Unpublish
                  </button>
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="publish-text-btn">
                      <ExternalLink size={13} />
                      Open site
                    </a>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                className="btn-primary publish-btn-full"
                disabled={publishing}
                onClick={handlePublish}
              >
                {publishing ? 'Publishing to Vercel...' : info?.vercelConfigured ? 'Publish to Vercel' : 'Publish'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
