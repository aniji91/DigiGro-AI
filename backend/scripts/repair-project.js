import pool from '../src/config/database.js';
import { buildPreviewHtml } from '../src/services/preview.js';
import { generateDemoResponse } from '../src/services/ai.js';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/repair-project.js <project-id>');
  process.exit(1);
}

const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
if (!projects.length) {
  console.error('Project not found');
  process.exit(1);
}

const [msgs] = await pool.query(
  "SELECT content FROM messages WHERE project_id = ? AND role = 'user' ORDER BY created_at DESC LIMIT 1",
  [id]
);
const prompt = msgs[0]?.content || projects[0].name;
const result = generateDemoResponse(prompt, [], {
  failureNote: 'Claude API: add Anthropic billing credits for full AI generation.',
});

const previewHtml = buildPreviewHtml(result.files);

for (const file of result.files) {
  await pool.query(
    'UPDATE project_files SET content = ?, language = ? WHERE project_id = ? AND path = ?',
    [file.content, file.language || 'javascript', id, file.path]
  );
}

await pool.query('UPDATE projects SET preview_html = ?, status = ? WHERE id = ?', [
  previewHtml,
  'ready',
  id,
]);

console.log('✅ Project repaired with school demo template + fixed preview');
await pool.end();
