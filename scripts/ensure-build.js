import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const hasBuild = ['public/index.html', 'frontend/dist/index.html'].some((rel) =>
  fs.existsSync(path.join(root, rel))
);

if (hasBuild) {
  console.log('Frontend build found');
  process.exit(0);
}

console.log('Frontend not built — running npm run build...');
execSync('npm run build', { stdio: 'inherit', cwd: root });
