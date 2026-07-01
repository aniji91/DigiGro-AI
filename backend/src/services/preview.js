import babel from '@babel/standalone';

export function stripModuleSyntax(source) {
  return source
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
    .replace(/import\s+['"][^'"]+['"];?/g, '')
    .replace(/export\s+default\s+function\s+\w+/g, 'function App')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ')
    .replace(/export\s+\{[\s\S]*?\};?/g, '')
    .trim();
}

export function compileJsxForPreview(jsx) {
  const stripped = stripModuleSyntax(jsx);
  const { code } = babel.transform(stripped, {
    presets: [['react', { runtime: 'classic' }]],
    filename: 'App.jsx',
  });
  return code;
}

export function buildPreviewHtml(files) {
  const appFile = files.find((f) => f.path === 'App.jsx' || f.path === 'src/App.jsx') || files[0];
  const cssFile = files.find((f) => f.path.endsWith('.css'));
  const jsx = appFile?.content || '';

  let compiled;
  try {
    compiled = compileJsxForPreview(jsx);
  } catch (err) {
    compiled = `
      function App() {
        return React.createElement('div', {
          style: { padding: '2rem', color: '#ef4444', fontFamily: 'sans-serif' }
        }, 'Preview error: ${err.message.replace(/'/g, "\\'")}');
      }
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <style>${cssFile?.content || ''}</style>
</head>
<body>
  <div id="root"></div>
  <script>
    (function() {
      const { useState, useEffect, useRef, useCallback, useMemo } = React;
      try {
        ${compiled}
        const el = document.getElementById('root');
        if (typeof App === 'undefined') {
          throw new Error('App component not found');
        }
        if (ReactDOM.createRoot) {
          ReactDOM.createRoot(el).render(React.createElement(App));
        } else {
          ReactDOM.render(React.createElement(App), el);
        }
      } catch (e) {
        document.getElementById('root').innerHTML =
          '<pre style="color:#ef4444;padding:1rem;font-family:sans-serif;white-space:pre-wrap">' + e.message + '</pre>';
      }
    })();
  </script>
</body>
</html>`;
}
