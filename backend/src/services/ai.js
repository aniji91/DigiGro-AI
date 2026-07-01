import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { getAiMode } from '../config/ai.js';
import { buildPreviewHtml } from '../services/preview.js';

const SYSTEM_PROMPT = `You are DIGIGRO AI, an expert full-stack developer that builds beautiful React web applications.
When the user describes an app or feature, you generate clean, modern React JSX code.

RULES:
1. Return ONLY valid JSON with this exact structure:
{
  "message": "Brief friendly explanation of what you built (1-3 sentences)",
  "files": [
    { "path": "App.jsx", "language": "javascript", "content": "...full component code..." },
    { "path": "index.css", "language": "css", "content": "...styles..." }
  ]
}
2. App.jsx must export default function App() with inline styles or reference index.css
3. Use modern React patterns (hooks, functional components)
4. Make UIs beautiful with gradients, good typography, spacing, and responsive design
5. Use a dark aesthetic with DigiGro brand accent orange (#f14e27) unless user specifies otherwise
6. Do NOT include markdown code fences in the JSON
7. Escape quotes properly in JSON strings
8. Keep components self-contained — no import or export statements; React hooks are already available globally`;

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function extractSchoolInfo(prompt) {
  const pick = (re) => prompt.match(re)?.[1]?.trim();
  return {
    name: pick(/School name:\s*([^\n]+)/i) || pick(/school name[:\s]+([^\n]+)/i) || 'Our School',
    address: pick(/Address:\s*([^\n]+)/i) || 'Kerala, India',
    phone: pick(/Phone:\s*([^\n]+)/i) || '+91 98765 43210',
    email: pick(/Email:\s*([^\n]+)/i) || 'info@school.edu',
  };
}

function getAiFailureNote(err) {
  const msg = err?.message || '';
  if (msg.includes('credit balance') || msg.includes('billing') || msg.includes('purchase credits')) {
    return 'Claude API: your Anthropic account has no credits. Add funds at console.anthropic.com/settings/billing — then regenerate for a full AI-built site.';
  }
  if (msg.includes('authentication') || msg.includes('invalid') || msg.includes('api_key')) {
    return 'Claude API key error. Check ANTHROPIC_API_KEY in backend/.env.';
  }
  return null;
}

function generateSchoolWebsiteDemo(prompt) {
  const school = extractSchoolInfo(prompt);
  const schoolJson = JSON.stringify(school);
  return `export default function App() {
  const school = ${schoolJson};
  const [form, setForm] = useState({ name: '', grade: '', phone: '' });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>{school.name}</div>
          <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
            <span>Home</span><span>Admissions</span><span>About</span><span>Contact</span>
          </nav>
        </div>
      </header>

      <section style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Admissions Open 2026–27</h1>
        <p style={{ fontSize: '1.15rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 2rem' }}>
          Quality education in a nurturing environment. Apply online today.
        </p>
        <button style={{ padding: '0.9rem 2rem', background: '#fff', color: '#1e40af', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
          Apply Now
        </button>
      </section>

      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h2 style={{ color: '#1e40af', marginBottom: '1rem' }}>About Us</h2>
          <p style={{ color: '#475569', lineHeight: 1.7 }}>
            {school.name} is committed to academic excellence and holistic development of every student.
          </p>
        </div>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h2 style={{ color: '#1e40af', marginBottom: '1rem' }}>Contact</h2>
          <p style={{ color: '#475569', lineHeight: 1.8 }}>📍 {school.address}</p>
          <p style={{ color: '#475569' }}>📞 {school.phone}</p>
          <p style={{ color: '#475569' }}>✉️ {school.email}</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h2 style={{ color: '#1e40af', marginBottom: '1rem' }}>Quick Apply</h2>
          <input placeholder="Student name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: '100%', padding: '0.6rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          <input placeholder="Grade" value={form.grade} onChange={e => setForm({...form, grade: e.target.value})} style={{ width: '100%', padding: '0.6rem', marginBottom: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          <button style={{ width: '100%', padding: '0.7rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' }}>Submit Application</button>
        </div>
      </section>

      <footer style={{ background: '#1e293b', color: '#94a3b8', textAlign: 'center', padding: '1.5rem' }}>
        © 2026 {school.name}. Built with DIGIGRO AI.
      </footer>
    </div>
  );
}`;
}

export function generateDemoResponse(prompt, existingFiles, options = {}) {
  const { failureNote } = options;
  const lower = prompt.toLowerCase();
  let appContent = '';
  let cssContent = `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; }`;

  if (lower.includes('school') || lower.includes('admission') || lower.includes('naavu') || (lower.includes('website') && lower.includes('school'))) {
    appContent = generateSchoolWebsiteDemo(prompt);
    cssContent += `\ninput, button { font-family: inherit; }`;
  } else if (lower.includes('todo') || lower.includes('task')) {
    appContent = `export default function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input, done: false }]);
    setInput('');
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTodo = (id) => setTodos(todos.filter(t => t.id !== id));

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <h1 style={{ color: '#f8fafc', fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          ✓ My Tasks
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            placeholder="Add a new task..."
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', fontSize: '1rem' }}
          />
          <button onClick={addTodo} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Add
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {todos.map(todo => (
            <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
              <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} style={{ width: '18px', height: '18px', accentColor: '#6366f1' }} />
              <span style={{ flex: 1, color: todo.done ? '#64748b' : '#f8fafc', textDecoration: todo.done ? 'line-through' : 'none' }}>{todo.text}</span>
              <button onClick={() => deleteTodo(todo.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>
          ))}
          {todos.length === 0 && (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>No tasks yet. Add one above!</p>
          )}
        </div>
      </div>
    </div>
  );
}`;
  } else if (lower.includes('landing') || lower.includes('saas') || lower.includes('startup')) {
    appContent = `export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 3rem', borderBottom: '1px solid #1f1f2e' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(90deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LaunchPad</div>
        <button style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Get Started</button>
      </nav>
      <section style={{ textAlign: 'center', padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem' }}>
          Build the Future<br />
          <span style={{ background: 'linear-gradient(90deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Today</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#94a3b8', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          The all-in-one platform to launch, grow, and scale your next big idea.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button style={{ padding: '1rem 2rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer' }}>Start Free Trial</button>
          <button style={{ padding: '1rem 2rem', borderRadius: '12px', border: '1px solid #334155', background: 'transparent', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}>Watch Demo</button>
        </div>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', padding: '4rem 3rem', maxWidth: '1000px', margin: '0 auto' }}>
        {['⚡ Lightning Fast', '🎨 Beautiful Design', '🔒 Secure'].map((f, i) => (
          <div key={i} style={{ padding: '2rem', background: '#12121a', borderRadius: '16px', border: '1px solid #1f1f2e', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.split(' ')[0]}</div>
            <h3 style={{ marginBottom: '0.5rem' }}>{f.slice(2)}</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Built with modern tech for peak performance.</p>
          </div>
        ))}
      </section>
    </div>
  );
}`;
  } else if (lower.includes('dashboard') || lower.includes('analytics')) {
    appContent = `export default function App() {
  const stats = [
    { label: 'Total Users', value: '12,847', change: '+12%', color: '#6366f1' },
    { label: 'Revenue', value: '$48,290', change: '+8%', color: '#10b981' },
    { label: 'Active Sessions', value: '1,429', change: '+23%', color: '#f59e0b' },
    { label: 'Conversion', value: '3.2%', change: '+0.4%', color: '#ec4899' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#e2e8f0', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '2rem' }}>📊 Analytics Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: '#1a1a2e', borderRadius: '16px', padding: '1.5rem', border: '1px solid #2a2a3e' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{s.label}</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.25rem' }}>{s.change}</p>
          </div>
        ))}
      </div>
      <div style={{ background: '#1a1a2e', borderRadius: '16px', padding: '2rem', border: '1px solid #2a2a3e', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b' }}>📈 Chart visualization area</p>
      </div>
    </div>
  );
}`;
  } else {
    appContent = `export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0c0c1d 0%, #1a1040 50%, #0d2137 100%)',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '3rem',
        border: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '1rem',
          background: 'linear-gradient(90deg, #818cf8, #c084fc, #f472b6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          ${prompt.slice(0, 40).replace(/"/g, "'")}${prompt.length > 40 ? '...' : ''}
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6 }}>
          Built by DIGIGRO AI based on your description. Click the button to interact!
        </p>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{
            padding: '1rem 2.5rem',
            fontSize: '1.1rem',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(99,102,241,0.3)'
          }}
        >
          Clicked {count} times
        </button>
      </div>
    </div>
  );
}`;
  }

  const note = failureNote
    ? `\n\n⚠️ ${failureNote}`
    : getAiMode() === 'demo'
      ? '\n\n(Demo mode — add ANTHROPIC_API_KEY with billing credits for full AI generation.)'
      : '';

  return {
    message: `I've built a demo template for your request.${note} Check the preview and let me know what to change!`,
    files: [
      { path: 'App.jsx', language: 'javascript', content: appContent },
      { path: 'index.css', language: 'css', content: cssContent },
    ],
  };
}

function parseAiJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw?.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('AI returned invalid JSON');
  }
}

function buildFileContext(existingFiles) {
  return existingFiles?.length
    ? `\n\nCurrent project files:\n${existingFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n')}`
    : '';
}

function buildHistoryMessages(history) {
  return history
    .slice(-10)
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));
}

async function callClaude(prompt, existingFiles, history) {
  const anthropic = getAnthropic();
  if (!anthropic) return null;

  const fileContext = buildFileContext(existingFiles);
  const contextMessages = buildHistoryMessages(history);

  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      ...contextMessages,
      { role: 'user', content: prompt + fileContext },
    ],
  });

  const raw = response.content.find((block) => block.type === 'text')?.text;
  return parseAiJson(raw);
}

async function callOpenAI(prompt, existingFiles, history) {
  const openai = getOpenAI();
  if (!openai) return null;

  const fileContext = buildFileContext(existingFiles);
  const contextMessages = buildHistoryMessages(history);

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...contextMessages,
      { role: 'user', content: prompt + fileContext },
    ],
    temperature: 0.7,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content;
  return parseAiJson(raw);
}

async function callAI(prompt, existingFiles, history) {
  const mode = getAiMode();

  if (mode === 'claude') {
    const result = await callClaude(prompt, existingFiles, history);
    if (result) return result;
  }

  if (mode === 'openai') {
    const result = await callOpenAI(prompt, existingFiles, history);
    if (result) return result;
  }

  return generateDemoResponse(prompt, existingFiles);
}

export async function generateCode(req, res) {
  try {
    const { projectId } = req.params;
    const { prompt } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await pool.query('UPDATE projects SET status = ? WHERE id = ?', ['building', projectId]);

    const userMsgId = uuidv4();
    await pool.query(
      'INSERT INTO messages (id, project_id, role, content) VALUES (?, ?, ?, ?)',
      [userMsgId, projectId, 'user', prompt]
    );

    const [existingFiles] = await pool.query(
      'SELECT path, content, language FROM project_files WHERE project_id = ?',
      [projectId]
    );
    const [history] = await pool.query(
      'SELECT role, content FROM messages WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );

    let result;
    let aiWarning = null;
    try {
      result = await callAI(prompt, existingFiles, history);
    } catch (aiErr) {
      console.error('AI error, falling back to demo:', aiErr.message);
      aiWarning = getAiFailureNote(aiErr);
      result = generateDemoResponse(prompt, existingFiles, { failureNote: aiWarning });
    }

    for (const file of result.files) {
      await pool.query(
        `INSERT INTO project_files (id, project_id, path, content, language)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content), language = VALUES(language)`,
        [uuidv4(), projectId, file.path, file.content, file.language || 'javascript']
      );
    }

    const previewHtml = buildPreviewHtml(result.files);
    await pool.query(
      'UPDATE projects SET preview_html = ?, status = ? WHERE id = ?',
      [previewHtml, 'ready', projectId]
    );

    const assistantMsgId = uuidv4();
    await pool.query(
      'INSERT INTO messages (id, project_id, role, content) VALUES (?, ?, ?, ?)',
      [assistantMsgId, projectId, 'assistant', result.message]
    );

    const [files] = await pool.query(
      'SELECT id, path, content, language FROM project_files WHERE project_id = ?',
      [projectId]
    );

    res.json({
      message: result.message,
      files,
      previewHtml,
      aiWarning,
    });
  } catch (err) {
    console.error('Generate error:', err);
    await pool.query('UPDATE projects SET status = ? WHERE id = ?', ['draft', req.params.projectId]).catch(() => {});
    res.status(500).json({ error: 'Code generation failed' });
  }
}

export async function getMessages(req, res) {
  try {
    const { projectId } = req.params;
    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, req.user.id]
    );
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [messages] = await pool.query(
      'SELECT id, role, content, created_at FROM messages WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}
