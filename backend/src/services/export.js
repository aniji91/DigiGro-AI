export function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'digigro-project'
  );
}

export function buildProjectBundle(projectName, files) {
  const slug = slugify(projectName);
  const appFile = files.find((f) => f.path === 'App.jsx' || f.path === 'src/App.jsx');
  const cssFile = files.find((f) => f.path === 'index.css' || f.path === 'src/index.css');

  const appContent = appFile?.content || `export default function App() {
  return <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>Hello from DIGIGRO AI</div>;
}`;

  const cssContent = cssFile?.content || `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; }`;

  const packageJson = {
    name: slug,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.4',
      vite: '^6.0.7',
    },
  };

  return [
    { path: 'package.json', content: JSON.stringify(packageJson, null, 2) },
    {
      path: 'vite.config.js',
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    },
    {
      path: '.gitignore',
      content: `node_modules/
dist/
.env
*.log
`,
    },
    {
      path: 'README.md',
      content: `# ${projectName}

Generated with [DIGIGRO AI](https://github.com).

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

Open http://localhost:5173
`,
    },
    {
      path: 'src/main.jsx',
      content: `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
    },
    { path: 'src/App.jsx', content: appContent },
    { path: 'src/index.css', content: cssContent },
  ];
}
