import { v4 as uuidv4 } from 'uuid';
import { ZipArchive } from 'archiver';
import pool from '../config/database.js';
import { buildProjectBundle, slugify } from '../services/export.js';
import { pushProjectToGitHub } from '../services/github.js';
import { buildPreviewHtml } from '../services/preview.js';
import { aggregateAnalytics, parseDevice, parseSource, parseCountry } from '../services/analytics.js';

const DEFAULT_FILES = [
  {
    path: 'App.jsx',
    language: 'javascript',
    content: `export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1b2a 100%)',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '3rem',
        marginBottom: '1rem',
        background: 'linear-gradient(90deg, #f14e27, #ff6b3d)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        ✨ Welcome
      </div>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Your App Starts Here</h1>
      <p style={{ color: '#94a3b8', maxWidth: '400px' }}>
        Describe what you want to build in the chat, and DIGIGRO AI will create it for you.
      </p>
    </div>
  );
}`,
  },
  {
    path: 'index.css',
    language: 'css',
    content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; }`,
  },
];

export async function listProjects(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, description, status, folder, published,
              created_at, updated_at,
              CASE WHEN preview_html IS NOT NULL AND LENGTH(preview_html) > 0 THEN 1 ELSE 0 END AS has_preview
       FROM projects WHERE user_id = ? ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json({ projects: rows });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
}

export async function createProject(req, res) {
  try {
    const { name, description, prompt } = req.body;
    const projectId = uuidv4();
    const projectName = name || 'Untitled Project';

    const previewHtml = buildPreviewHtml(DEFAULT_FILES);

    await pool.query(
      `INSERT INTO projects (id, user_id, name, description, status, preview_html)
       VALUES (?, ?, ?, ?, 'draft', ?)`,
      [projectId, req.user.id, projectName, description || '', previewHtml]
    );

    for (const file of DEFAULT_FILES) {
      await pool.query(
        `INSERT INTO project_files (id, project_id, path, content, language)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), projectId, file.path, file.content, file.language]
      );
    }

    if (prompt) {
      const msgId = uuidv4();
      await pool.query(
        'INSERT INTO messages (id, project_id, role, content) VALUES (?, ?, ?, ?)',
        [msgId, projectId, 'user', prompt]
      );
    }

    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    res.status(201).json({ project: projects[0], initialPrompt: prompt || null });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
}

export async function getProject(req, res) {
  try {
    const { id } = req.params;
    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [files] = await pool.query(
      'SELECT id, path, content, language, updated_at FROM project_files WHERE project_id = ?',
      [id]
    );
    const [messages] = await pool.query(
      'SELECT id, role, content, created_at FROM messages WHERE project_id = ? ORDER BY created_at ASC',
      [id]
    );

    const previewHtml = buildPreviewHtml(files);
    const project = { ...projects[0], preview_html: previewHtml };

    res.json({ project, files, messages });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
}

export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const { name, description, status, folder, published } = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updates = [];
    const values = [];
    if (name) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (folder !== undefined) { updates.push('folder = ?'); values.push(folder || null); }
    if (published !== undefined) { updates.push('published = ?'); values.push(published ? 1 : 0); }

    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    res.json({ project: projects[0] });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
}

export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      'DELETE FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
}

export async function updateFiles(req, res) {
  try {
    const { id } = req.params;
    const { files } = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    for (const file of files) {
      await pool.query(
        `INSERT INTO project_files (id, project_id, path, content, language)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content), language = VALUES(language)`,
        [uuidv4(), id, file.path, file.content, file.language || 'javascript']
      );
    }

    const previewHtml = buildPreviewHtml(files);
    await pool.query(
      'UPDATE projects SET preview_html = ?, status = ? WHERE id = ?',
      [previewHtml, 'ready', id]
    );

    res.json({ success: true, previewHtml });
  } catch (err) {
    console.error('Update files error:', err);
    res.status(500).json({ error: 'Failed to update files' });
  }
}

async function getOwnedProjectFiles(req, res) {
  const { id } = req.params;
  const [projects] = await pool.query(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?',
    [id, req.user.id]
  );
  if (projects.length === 0) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }
  const [files] = await pool.query(
    'SELECT path, content, language FROM project_files WHERE project_id = ?',
    [id]
  );
  return { project: projects[0], files };
}

export async function downloadProject(req, res) {
  try {
    const data = await getOwnedProjectFiles(req, res);
    if (!data) return;

    const bundle = buildProjectBundle(data.project.name, data.files);
    const filename = `${slugify(data.project.name)}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to create archive' });
    });

    archive.pipe(res);
    for (const file of bundle) {
      archive.append(file.content, { name: file.path });
    }
    await archive.finalize();
  } catch (err) {
    console.error('Download error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to download project' });
  }
}

export async function pushToGithub(req, res) {
  try {
    const { token, repoName, isPrivate } = req.body;
    if (!token?.trim()) {
      return res.status(400).json({ error: 'GitHub personal access token is required' });
    }

    const data = await getOwnedProjectFiles(req, res);
    if (!data) return;

    const bundle = buildProjectBundle(data.project.name, data.files);
    const result = await pushProjectToGitHub({
      token: token.trim(),
      repoName: repoName?.trim() || data.project.name,
      projectName: data.project.name,
      files: bundle,
      isPrivate: Boolean(isPrivate),
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('GitHub push error:', err);
    const message =
      err.status === 401
        ? 'Invalid GitHub token'
        : err.message || 'Failed to push to GitHub';
    res.status(err.status === 401 ? 401 : 500).json({ error: message });
  }
}

export async function remixProject(req, res) {
  try {
    const { id } = req.params;
    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const source = projects[0];
    const newId = uuidv4();
    const newName = `${source.name} (Remix)`;

    const [files] = await pool.query(
      'SELECT path, content, language FROM project_files WHERE project_id = ?',
      [id]
    );

    const previewHtml = files.length ? buildPreviewHtml(files) : source.preview_html;

    await pool.query(
      `INSERT INTO projects (id, user_id, name, description, status, preview_html, folder, published)
       VALUES (?, ?, ?, ?, 'draft', ?, NULL, 0)`,
      [newId, req.user.id, newName, source.description || '', previewHtml]
    );

    for (const file of files) {
      await pool.query(
        `INSERT INTO project_files (id, project_id, path, content, language)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), newId, file.path, file.content, file.language]
      );
    }

    const [created] = await pool.query('SELECT * FROM projects WHERE id = ?', [newId]);
    res.status(201).json({ project: created[0] });
  } catch (err) {
    console.error('Remix project error:', err);
    res.status(500).json({ error: 'Failed to remix project' });
  }
}

export async function getProjectAnalytics(req, res) {
  try {
    const { id } = req.params;
    const range = req.query.range || '7d';

    const [projects] = await pool.query(
      'SELECT id, name, status, published, created_at, updated_at FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [[fileStats]] = await pool.query(
      'SELECT COUNT(*) AS file_count FROM project_files WHERE project_id = ?',
      [id]
    );
    const [[msgStats]] = await pool.query(
      'SELECT COUNT(*) AS message_count, SUM(role = "user") AS user_messages FROM messages WHERE project_id = ?',
      [id]
    );

    const traffic = await aggregateAnalytics(pool, id, range);

    res.json({
      analytics: {
        project: projects[0],
        fileCount: fileStats.file_count,
        messageCount: msgStats.message_count,
        userMessages: msgStats.user_messages || 0,
        range,
        ...traffic,
      },
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

export async function trackProjectView(req, res) {
  try {
    const { id } = req.params;
    const { sessionId, page } = req.body;

    const [projects] = await pool.query(
      'SELECT id, published FROM projects WHERE id = ? OR slug = ?',
      [id, id]
    );
    if (projects.length === 0 || !projects[0].published) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectId = projects[0].id;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const userAgent = req.headers['user-agent'] || '';
    await pool.query(
      `INSERT INTO project_views (id, project_id, session_id, source, page, device, country)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        projectId,
        sessionId.slice(0, 64),
        parseSource(req.headers.referer),
        (page || '/').slice(0, 512),
        parseDevice(userAgent),
        parseCountry(req),
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Track view error:', err);
    res.status(500).json({ error: 'Failed to track view' });
  }
}

export async function getProjectPreview(req, res) {
  try {
    const { id } = req.params;
    const [projects] = await pool.query(
      'SELECT id, name, preview_html, published, status, slug FROM projects WHERE id = ? OR slug = ?',
      [id, id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projects[0];
    if (!project.published) {
      return res.status(403).json({ error: 'This project is not published' });
    }

    res.json({ name: project.name, previewHtml: project.preview_html });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: 'Failed to fetch preview' });
  }
}

export async function getProjectThumbnail(req, res) {
  try {
    const { id } = req.params;
    const [projects] = await pool.query(
      'SELECT preview_html FROM projects WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ previewHtml: projects[0].preview_html || '' });
  } catch (err) {
    console.error('Thumbnail error:', err);
    res.status(500).json({ error: 'Failed to fetch thumbnail' });
  }
}

export { buildPreviewHtml } from '../services/preview.js';
