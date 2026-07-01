const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem('digigro_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || 'Request failed', res.status);
  }
  return data;
}

export const api = {
  health: () => request('/health'),

  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  listProjects: () => request('/projects'),
  createProject: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  getProject: (id) => request(`/projects/${id}`),
  updateProject: (id, body) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  updateFiles: (id, files) => request(`/projects/${id}/files`, { method: 'PUT', body: JSON.stringify({ files }) }),

  generate: (projectId, prompt) =>
    request(`/ai/${projectId}/generate`, { method: 'POST', body: JSON.stringify({ prompt }) }),
  getMessages: (projectId) => request(`/ai/${projectId}/messages`),

  downloadProject: async (id, filename) => {
    const token = localStorage.getItem('digigro_token');
    const res = await fetch(`${API_BASE}/projects/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error || 'Download failed', res.status);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'project.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  pushToGithub: (id, body) =>
    request(`/projects/${id}/github`, { method: 'POST', body: JSON.stringify(body) }),

  remixProject: (id) => request(`/projects/${id}/remix`, { method: 'POST' }),
  getAnalytics: (id, range = '7d') => request(`/projects/${id}/analytics?range=${range}`),
  trackView: (id, body) =>
    request(`/preview/${id}/track`, { method: 'POST', body: JSON.stringify(body) }),
  getThumbnail: (id) => request(`/projects/${id}/thumbnail`),

  getPublishInfo: (id) => request(`/projects/${id}/publish`),
  publishProject: (id) => request(`/projects/${id}/publish`, { method: 'POST' }),
  unpublishProject: (id) => request(`/projects/${id}/unpublish`, { method: 'POST' }),
  getShareInfo: (id) => request(`/projects/${id}/share`),
  updateShareSettings: (id, body) =>
    request(`/projects/${id}/share`, { method: 'PATCH', body: JSON.stringify(body) }),
  inviteCollaborator: (id, body) =>
    request(`/projects/${id}/share/invite`, { method: 'POST', body: JSON.stringify(body) }),
  respondToInvite: (id, inviteId, action) =>
    request(`/projects/${id}/share/invites/${inviteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }),
  removeCollaborator: (id, memberId) =>
    request(`/projects/${id}/share/members/${memberId}`, { method: 'DELETE' }),
};

export { ApiError };
