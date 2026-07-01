import { useState, useEffect } from 'react';
import { X, Link2, Check, Users } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import './ShareModal.css';

export default function ShareModal({ projectId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [workspaceAccess, setWorkspaceAccess] = useState('edit');

  const loadShare = () => {
    setLoading(true);
    api.getShareInfo(projectId)
      .then((res) => {
        setData(res);
        setWorkspaceAccess(res.project?.workspaceAccess || 'edit');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadShare();
  }, [projectId]);

  const copyText = async (text, key) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviteLoading(true);
    setError('');
    try {
      await api.inviteCollaborator(projectId, { email: email.trim(), role: 'editor' });
      setEmail('');
      loadShare();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleInviteAction = async (inviteId, action) => {
    try {
      await api.respondToInvite(projectId, inviteId, action);
      loadShare();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update invite');
    }
  };

  const toggleInviteLink = async () => {
    if (!data?.project) return;
    try {
      const { project } = await api.updateShareSettings(projectId, {
        inviteLinkEnabled: !data.project.inviteLinkEnabled,
      });
      setData((prev) => ({ ...prev, project }));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update invite link');
    }
  };

  const handleWorkspaceAccess = async (value) => {
    setWorkspaceAccess(value);
    try {
      const { project } = await api.updateShareSettings(projectId, { workspaceAccess: value });
      setData((prev) => ({ ...prev, project }));
    } catch (err) {
      console.error(err);
    }
  };

  const inviteUrl = data?.project?.inviteLinkEnabled ? data?.project?.inviteUrl : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2>Share project</h2>
          <div className="share-modal-header-actions">
            {inviteUrl && (
              <button
                type="button"
                className="share-copy-link"
                onClick={() => copyText(inviteUrl, 'invite')}
              >
                <Link2 size={14} />
                {copied === 'invite' ? 'Copied!' : 'Copy invite link'}
              </button>
            )}
            <button type="button" className="modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="share-loading"><div className="spinner" /></div>
        ) : (
          <>
            <form className="share-invite-form" onSubmit={handleInvite}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Invite by email"
              />
              <button type="submit" className="btn-primary btn-sm" disabled={inviteLoading || !email.trim()}>
                {inviteLoading ? 'Inviting...' : 'Invite'}
              </button>
            </form>

            {error && <div className="share-error">{error}</div>}

            {data?.pendingInvites?.length > 0 && (
              <div className="share-section">
                <h3>Requests ({data.pendingInvites.length})</h3>
                {data.pendingInvites.map((invite) => (
                  <div key={invite.id} className="share-request">
                    <div className="share-user-avatar">
                      {(invite.name || invite.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="share-request-info">
                      <strong>{invite.name || invite.email.split('@')[0]}</strong>
                      <span>{invite.email}</span>
                      <span className="share-role">{invite.role === 'editor' ? 'Editor' : 'Viewer'}</span>
                    </div>
                    <div className="share-request-actions">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => handleInviteAction(invite.id, 'decline')}>
                        Decline
                      </button>
                      <button type="button" className="btn-primary btn-sm" onClick={() => handleInviteAction(invite.id, 'approve')}>
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="share-section">
              <div className="share-row">
                <span>Invite link</span>
                <button type="button" className="share-toggle" onClick={toggleInviteLink}>
                  {data?.project?.inviteLinkEnabled ? 'Invite link enabled' : 'Invite link disabled'}
                </button>
              </div>
            </div>

            <div className="share-section">
              <h3>People with access</h3>
              <div className="share-person">
                <div className="share-user-avatar owner">
                  {data?.owner?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="share-person-info">
                  <strong>{data?.owner?.name} (you)</strong>
                  <span>{data?.owner?.email}</span>
                </div>
                <span className="share-role-badge">Owner</span>
              </div>

              {data?.members?.map((member) => (
                <div key={member.id} className="share-person">
                  <div className="share-user-avatar">
                    {member.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="share-person-info">
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                  </div>
                  <span className="share-role-badge">{member.role === 'editor' ? 'Editor' : 'Viewer'}</span>
                </div>
              ))}
            </div>

            <div className="share-section">
              <h3>General access</h3>
              <div className="share-general">
                <Users size={18} />
                <div>
                  <strong>{data?.owner?.name}&apos;s workspace</strong>
                  <select
                    value={workspaceAccess}
                    onChange={(e) => handleWorkspaceAccess(e.target.value)}
                  >
                    <option value="edit">Can edit</option>
                    <option value="view">Can view</option>
                    <option value="none">No access</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="share-preview-btn"
              onClick={() => {
                const url = data?.previewUrl || `${window.location.origin}/project/${projectId}`;
                copyText(url, 'preview');
              }}
            >
              <Link2 size={16} />
              {copied === 'preview' ? 'Preview link copied!' : 'Share preview'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
