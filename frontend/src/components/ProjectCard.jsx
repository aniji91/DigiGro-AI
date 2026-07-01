import { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  ArrowUpRight,
  BarChart3,
  FolderInput,
  Copy,
  Globe,
  MoreHorizontal,
  Link2,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import './ProjectCard.css';

function formatEdited(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 3600000) return `Edited ${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < 86400000) return `Edited ${Math.floor(diff / 3600000)}h ago`;
  if (diff < 1209600000) return `Edited ${Math.floor(diff / 86400000)}d ago`;
  return `Edited ${d.toLocaleDateString()}`;
}

const MENU_ITEMS = [
  { id: 'open-tab', label: 'Open in new tab', icon: ExternalLink },
  { id: 'view-published', label: 'View published site', icon: ArrowUpRight },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'folder', label: 'Move to folder', icon: FolderInput },
  { id: 'remix', label: 'Remix', icon: Copy },
  { id: 'publish', label: 'Publish to profile', icon: Globe },
];

export default function ProjectCard({ project, onUpdate, onDelete, folders }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [copiedHint, setCopiedHint] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [modal, setModal] = useState(null);
  const [folderName, setFolderName] = useState(project.folder || '');
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (project.has_preview) {
      api.getThumbnail(project.id)
        .then(({ previewHtml: html }) => setPreviewHtml(html))
        .catch(() => {});
    }
  }, [project.id, project.has_preview]);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setLinkMenuOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const projectLink = `${window.location.origin}/project/${project.id}`;
  const publishedLink = `${window.location.origin}/p/${project.id}`;

  const copyToClipboard = async (text, hint) => {
    await navigator.clipboard.writeText(text);
    setCopiedHint(hint);
    setTimeout(() => setCopiedHint(''), 2000);
  };

  const handleLinkAction = async (type, e) => {
    e.preventDefault();
    e.stopPropagation();
    setLinkMenuOpen(false);
    setMenuOpen(false);

    if (type === 'project') {
      await copyToClipboard(projectLink, 'Project link copied');
    } else if (type === 'published') {
      if (!project.published) {
        alert('Publish this project first to get a public app link.');
        return;
      }
      await copyToClipboard(publishedLink, 'Published link copied');
    }
  };

  const handleMenuAction = async (actionId) => {
    setMenuOpen(false);

    switch (actionId) {
      case 'open-tab':
        window.open(`/project/${project.id}`, '_blank');
        break;
      case 'view-published':
        if (project.published) {
          window.open(`/p/${project.id}`, '_blank');
        } else {
          alert('Publish this project first to view the live site.');
        }
        break;
      case 'analytics':
        navigate(`/project/${project.id}/analytics`);
        break;
      case 'folder':
        setFolderName(project.folder || '');
        setModal('folder');
        break;
      case 'remix':
        setLoading(true);
        try {
          const { project: remixed } = await api.remixProject(project.id);
          navigate(`/project/${remixed.id}`);
        } catch {
          alert('Failed to remix project');
        } finally {
          setLoading(false);
        }
        break;
      case 'publish':
        setLoading(true);
        try {
          const next = !project.published;
          const { project: updated } = await api.updateProject(project.id, {
            published: next,
            status: next ? 'ready' : project.status,
          });
          onUpdate(updated);
        } catch {
          alert('Failed to update publish status');
        } finally {
          setLoading(false);
        }
        break;
      default:
        break;
    }
  };

  const saveFolder = async () => {
    setLoading(true);
    try {
      const { project: updated } = await api.updateProject(project.id, { folder: folderName.trim() || null });
      onUpdate(updated);
      setModal(null);
    } catch {
      alert('Failed to move project');
    } finally {
      setLoading(false);
    }
  };

  const unpublish = async () => {
    const { project: updated } = await api.updateProject(project.id, { published: false });
    onUpdate(updated);
  };

  return (
    <>
      <article
        className={`project-card${menuOpen || linkMenuOpen ? ' is-menu-open' : ''}`}
        onClick={() => navigate(`/project/${project.id}`)}
      >
        <div className="project-thumb">
          {previewHtml ? (
            <iframe title={project.name} srcDoc={previewHtml} sandbox="allow-scripts allow-same-origin" tabIndex={-1} />
          ) : (
            <div className="project-thumb-empty">No preview yet</div>
          )}
          {project.published ? <span className="project-published-badge">Published</span> : null}
        </div>

        <div className="project-card-footer">
          <div className="project-card-info">
            <div className="project-avatar">{project.name.charAt(0).toUpperCase()}</div>
            <div>
              <h3>{project.name}</h3>
              <p>{formatEdited(project.updated_at)}</p>
            </div>
          </div>

          <div className="project-card-actions" ref={menuRef}>
            <div className="project-action-wrap">
              <button
                className={`project-action-btn ${linkMenuOpen ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLinkMenuOpen((v) => !v);
                  setMenuOpen(false);
                }}
                title="Copy link"
              >
                <Link2 size={16} />
              </button>

              {linkMenuOpen && (
                <div className="project-menu project-link-menu" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="project-menu-item"
                    onClick={(e) => handleLinkAction('project', e)}
                  >
                    <Copy size={16} />
                    Copy project link
                  </button>
                  <button
                    className={`project-menu-item ${!project.published ? 'muted' : ''}`}
                    onClick={(e) => handleLinkAction('published', e)}
                  >
                    <Copy size={16} />
                    Copy published app link
                  </button>
                </div>
              )}
            </div>

            <div className="project-action-wrap">
              <button
                className={`project-action-btn ${menuOpen ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                  setLinkMenuOpen(false);
                }}
                title="More options"
              >
                <MoreHorizontal size={16} />
              </button>

              {menuOpen && (
                <div className="project-menu" onClick={(e) => e.stopPropagation()}>
                  {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
                    <button key={id} className="project-menu-item" onClick={() => handleMenuAction(id)} disabled={loading}>
                      <Icon size={16} />
                      {id === 'publish' && project.published ? 'Unpublish from profile' : label}
                    </button>
                  ))}
                  <div className="project-menu-divider" />
                  <button
                    className="project-menu-item danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete(project.id);
                    }}
                  >
                    <Trash2 size={16} />
                    Delete project
                  </button>
                </div>
              )}
            </div>

            {copiedHint && <span className="copy-toast">{copiedHint}</span>}
          </div>
        </div>
      </article>

      {modal === 'folder' && (
        <div className="project-modal-overlay" onClick={() => setModal(null)}>
          <div className="project-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Move to folder</h2>
            <input
              className="folder-input"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Folder name (e.g. Work, Personal)"
              list="folder-suggestions"
            />
            <datalist id="folder-suggestions">
              {folders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <div className="project-modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveFolder} disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
            {project.published && (
              <button className="btn-link" onClick={unpublish}>Unpublish from profile</button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
