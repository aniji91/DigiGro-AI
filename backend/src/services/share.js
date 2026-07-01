import { v4 as uuidv4 } from 'uuid';
import { slugify } from './export.js';

const SECURITY_PATTERNS = [
  /eval\s*\(/,
  /innerHTML\s*=/,
  /dangerouslySetInnerHTML/,
  /document\.write\s*\(/,
  /new Function\s*\(/,
];

export function countSecurityIssues(files = []) {
  let count = 0;
  for (const file of files) {
    for (const pattern of SECURITY_PATTERNS) {
      if (pattern.test(file.content || '')) count += 1;
    }
  }
  return count;
}

export async function ensureProjectSlug(pool, projectId, projectName) {
  const [rows] = await pool.query('SELECT slug FROM projects WHERE id = ?', [projectId]);
  if (rows[0]?.slug) return rows[0].slug;

  const base = slugify(projectName || 'project');
  let slug = `${base}-${projectId.slice(0, 6)}`;
  let attempt = 0;

  while (attempt < 5) {
    const [existing] = await pool.query('SELECT id FROM projects WHERE slug = ? AND id != ?', [slug, projectId]);
    if (existing.length === 0) break;
    attempt += 1;
    slug = `${base}-${projectId.slice(0, 6)}-${attempt}`;
  }

  await pool.query('UPDATE projects SET slug = ? WHERE id = ?', [slug, projectId]);
  return slug;
}

export async function ensureInviteToken(pool, projectId) {
  const [rows] = await pool.query('SELECT invite_token FROM projects WHERE id = ?', [projectId]);
  if (rows[0]?.invite_token) return rows[0].invite_token;

  const token = uuidv4().replace(/-/g, '').slice(0, 24);
  await pool.query('UPDATE projects SET invite_token = ? WHERE id = ?', [token, projectId]);
  return token;
}

export function formatProjectForClient(project, origin) {
  const slug = project.slug || project.id;
  const localUrl = `${origin}/p/${slug}`;
  const vercelUrl = project.vercel_url || null;
  const publishedUrl = vercelUrl || localUrl;

  let domainDns = null;
  if (project.vercel_domain_dns) {
    try {
      domainDns = typeof project.vercel_domain_dns === 'string'
        ? JSON.parse(project.vercel_domain_dns)
        : project.vercel_domain_dns;
    } catch {
      domainDns = null;
    }
  }

  return {
    id: project.id,
    name: project.name,
    published: !!project.published,
    publishedAt: project.published_at,
    slug,
    visibility: project.visibility || 'public',
    inviteLinkEnabled: !!project.invite_link_enabled,
    customDomain: project.custom_domain || null,
    customDomainStatus: project.vercel_domain_status || null,
    domainDns,
    workspaceAccess: project.workspace_access || 'edit',
    hosting: vercelUrl ? 'vercel' : 'local',
    vercelUrl,
    localUrl,
    publishedUrl,
    inviteUrl: project.invite_token ? `${origin}/invite/${project.invite_token}` : null,
  };
}
