import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { buildPreviewHtml } from '../services/preview.js';
import { aggregateAnalytics } from '../services/analytics.js';
import {
  countSecurityIssues,
  ensureProjectSlug,
  ensureInviteToken,
  formatProjectForClient,
} from '../services/share.js';
import {
  isVercelConfigured,
  deployStaticSite,
  addProjectDomain,
  getDomainDnsInstructions,
  removeProjectDomain,
} from '../services/vercel.js';

function getOrigin(req) {
  return process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
}

async function getOwnedProject(projectId, userId) {
  const [projects] = await pool.query(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?',
    [projectId, userId]
  );
  return projects[0] || null;
}

export async function publishProject(req, res) {
  try {
    const { id } = req.params;
    const project = await getOwnedProject(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [files] = await pool.query(
      'SELECT path, content, language FROM project_files WHERE project_id = ?',
      [id]
    );
    const previewHtml = buildPreviewHtml(files);
    const slug = await ensureProjectSlug(pool, id, project.name);

    let vercelProjectId = project.vercel_project_id || null;
    let vercelDeploymentId = null;
    let vercelUrl = project.vercel_url || null;
    let vercelWarning = null;

    if (isVercelConfigured()) {
      try {
        const deployment = await deployStaticSite({
          slug,
          html: previewHtml,
          vercelProjectId,
        });
        vercelProjectId = deployment.projectId;
        vercelDeploymentId = deployment.deploymentId;
        vercelUrl = deployment.url;

        if (project.custom_domain && vercelProjectId) {
          const domainResult = await addProjectDomain(vercelProjectId, project.custom_domain);
          await pool.query(
            'UPDATE projects SET vercel_domain_status = ?, vercel_domain_dns = ? WHERE id = ?',
            [
              domainResult.verified ? 'verified' : 'pending',
              JSON.stringify(domainResult.dns || { domain: project.custom_domain }),
              id,
            ]
          );
        }
      } catch (err) {
        console.error('Vercel deploy error:', err);
        vercelWarning = err.message;
      }
    }

    await pool.query(
      `UPDATE projects
       SET published = 1, status = 'ready', preview_html = ?, published_at = NOW(),
           vercel_project_id = ?, vercel_deployment_id = ?, vercel_url = ?
       WHERE id = ?`,
      [previewHtml, vercelProjectId, vercelDeploymentId, vercelUrl, id]
    );

    const [updated] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    const securityIssues = countSecurityIssues(files);
    const origin = getOrigin(req);

    res.json({
      project: formatProjectForClient(updated[0], origin),
      securityIssues,
      vercelConfigured: isVercelConfigured(),
      vercelWarning,
      message: vercelUrl
        ? 'Published to Vercel'
        : vercelWarning
          ? 'Published locally (Vercel deploy failed)'
          : 'Published successfully',
    });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: 'Failed to publish project' });
  }
}

export async function unpublishProject(req, res) {
  try {
    const { id } = req.params;
    const project = await getOwnedProject(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await pool.query('UPDATE projects SET published = 0 WHERE id = ?', [id]);
    const [updated] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    const origin = getOrigin(req);

    res.json({ project: formatProjectForClient(updated[0], origin) });
  } catch (err) {
    console.error('Unpublish error:', err);
    res.status(500).json({ error: 'Failed to unpublish project' });
  }
}

export async function getPublishInfo(req, res) {
  try {
    const { id } = req.params;
    const project = await getOwnedProject(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [files] = await pool.query(
      'SELECT path, content FROM project_files WHERE project_id = ?',
      [id]
    );
    const traffic = await aggregateAnalytics(pool, id, '7d');
    const origin = getOrigin(req);
    const slug = project.slug || await ensureProjectSlug(pool, id, project.name);
    const updatedProject = { ...project, slug };

    res.json({
      project: formatProjectForClient(updatedProject, origin),
      visitors: traffic.summary.visitors,
      securityIssues: countSecurityIssues(files),
      hasUnpublishedChanges: false,
      vercelConfigured: isVercelConfigured(),
    });
  } catch (err) {
    console.error('Publish info error:', err);
    res.status(500).json({ error: 'Failed to fetch publish info' });
  }
}

export async function getShareInfo(req, res) {
  try {
    const { id } = req.params;
    const project = await getOwnedProject(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await ensureInviteToken(pool, id);
    const [updated] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    const origin = getOrigin(req);

    const [ownerRows] = await pool.query(
      'SELECT id, name, email FROM users WHERE id = ?',
      [req.user.id]
    );

    const [members] = await pool.query(
      `SELECT pm.id, pm.role, pm.status, u.id AS user_id, u.name, u.email
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ? AND pm.status = 'accepted'`,
      [id]
    );

    const [invites] = await pool.query(
      `SELECT pi.id, pi.email, pi.role, pi.status, pi.created_at, u.name
       FROM project_invites pi
       LEFT JOIN users u ON u.email = pi.email
       WHERE pi.project_id = ? AND pi.status = 'pending'
       ORDER BY pi.created_at DESC`,
      [id]
    );

    res.json({
      project: formatProjectForClient(updated[0], origin),
      owner: ownerRows[0],
      members,
      pendingInvites: invites,
      previewUrl: updated[0].published
        ? `${origin}/p/${updated[0].slug || updated[0].id}`
        : null,
    });
  } catch (err) {
    console.error('Share info error:', err);
    res.status(500).json({ error: 'Failed to fetch share info' });
  }
}

export async function updateShareSettings(req, res) {
  try {
    const { id } = req.params;
    const { inviteLinkEnabled, visibility, customDomain, workspaceAccess } = req.body;
    const project = await getOwnedProject(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updates = [];
    const values = [];

    if (inviteLinkEnabled !== undefined) {
      updates.push('invite_link_enabled = ?');
      values.push(inviteLinkEnabled ? 1 : 0);
      if (inviteLinkEnabled) await ensureInviteToken(pool, id);
    }
    if (visibility !== undefined) {
      updates.push('visibility = ?');
      values.push(visibility);
    }
    if (customDomain !== undefined) {
      const domain = customDomain?.trim() || null;
      updates.push('custom_domain = ?');
      values.push(domain);

      if (domain && project.vercel_project_id && isVercelConfigured()) {
        try {
          const domainResult = await addProjectDomain(project.vercel_project_id, domain);
          updates.push('vercel_domain_status = ?');
          values.push(domainResult.verified ? 'verified' : 'pending');
          updates.push('vercel_domain_dns = ?');
          values.push(JSON.stringify(domainResult.dns || { domain }));
        } catch (err) {
          console.error('Vercel domain error:', err);
          return res.status(400).json({ error: err.message || 'Failed to add domain on Vercel' });
        }
      } else if (!domain && project.custom_domain && project.vercel_project_id && isVercelConfigured()) {
        try {
          await removeProjectDomain(project.vercel_project_id, project.custom_domain);
        } catch {
          /* domain may already be removed */
        }
        updates.push('vercel_domain_status = ?');
        values.push(null);
        updates.push('vercel_domain_dns = ?');
        values.push(null);
      }
    }
    if (workspaceAccess !== undefined) {
      updates.push('workspace_access = ?');
      values.push(workspaceAccess);
    }

    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [updated] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    const origin = getOrigin(req);
    res.json({ project: formatProjectForClient(updated[0], origin) });
  } catch (err) {
    console.error('Update share settings error:', err);
    res.status(500).json({ error: 'Failed to update share settings' });
  }
}

export async function inviteCollaborator(req, res) {
  try {
    const { id } = req.params;
    const { email, role = 'editor' } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const project = await getOwnedProject(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'You are already the owner' });
    }

    const [existingInvite] = await pool.query(
      'SELECT id FROM project_invites WHERE project_id = ? AND email = ? AND status = ?',
      [id, normalizedEmail, 'pending']
    );
    if (existingInvite.length > 0) {
      return res.status(409).json({ error: 'Invite already pending for this email' });
    }

    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUser.length > 0) {
      const [existingMember] = await pool.query(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
        [id, existingUser[0].id]
      );
      if (existingMember.length > 0) {
        return res.status(409).json({ error: 'User already has access' });
      }
    }

    const inviteId = uuidv4();
    await pool.query(
      `INSERT INTO project_invites (id, project_id, email, role, status, invited_by)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [inviteId, id, normalizedEmail, role, req.user.id]
    );

    const [invites] = await pool.query(
      `SELECT pi.id, pi.email, pi.role, pi.status, pi.created_at, u.name
       FROM project_invites pi
       LEFT JOIN users u ON u.email = pi.email
       WHERE pi.id = ?`,
      [inviteId]
    );

    res.status(201).json({ invite: invites[0] });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Failed to send invite' });
  }
}

export async function respondToInvite(req, res) {
  try {
    const { id, inviteId } = req.params;
    const { action } = req.body;

    const project = await getOwnedProject(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [invites] = await pool.query(
      'SELECT * FROM project_invites WHERE id = ? AND project_id = ?',
      [inviteId, id]
    );
    if (invites.length === 0) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    const invite = invites[0];

    if (action === 'decline') {
      await pool.query('UPDATE project_invites SET status = ? WHERE id = ?', ['declined', inviteId]);
      return res.json({ success: true, status: 'declined' });
    }

    if (action === 'approve') {
      await pool.query('UPDATE project_invites SET status = ? WHERE id = ?', ['accepted', inviteId]);

      const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [invite.email]);
      if (users.length > 0) {
        await pool.query(
          `INSERT INTO project_members (id, project_id, user_id, role, status)
           VALUES (?, ?, ?, ?, 'accepted')
           ON DUPLICATE KEY UPDATE role = VALUES(role), status = 'accepted'`,
          [uuidv4(), id, users[0].id, invite.role]
        );
      }

      return res.json({ success: true, status: 'accepted' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('Respond invite error:', err);
    res.status(500).json({ error: 'Failed to update invite' });
  }
}

export async function removeCollaborator(req, res) {
  try {
    const { id, memberId } = req.params;
    const project = await getOwnedProject(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await pool.query(
      'DELETE FROM project_members WHERE id = ? AND project_id = ?',
      [memberId, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Remove collaborator error:', err);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
}

export async function getDomainDns(req, res) {
  try {
    const { domain } = req.query;
    if (!domain) {
      return res.status(400).json({ error: 'domain query param is required' });
    }
    if (!isVercelConfigured()) {
      return res.status(400).json({ error: 'Vercel is not configured' });
    }
    const dns = await getDomainDnsInstructions(domain);
    res.json({ dns });
  } catch (err) {
    console.error('Domain DNS error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch DNS config' });
  }
}
