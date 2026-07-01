import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export function frontendExists() {
  const root = process.cwd();
  return ['public/index.html', 'frontend/dist/index.html'].some((rel) =>
    fs.existsSync(path.join(root, rel))
  );
}

export function ensureFrontendBuild() {
  if (frontendExists()) {
    console.log('Frontend build found');
    return;
  }

  console.log('Frontend not built — running npm run build...');
  execSync('npm run build', { stdio: 'inherit', cwd: process.cwd(), env: process.env });
  console.log('Frontend build complete');
}
