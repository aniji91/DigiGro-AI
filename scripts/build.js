import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const publicIndex = path.join(process.cwd(), 'public', 'index.html');

if (fs.existsSync(publicIndex)) {
  console.log('✅ public/index.html exists — skipping frontend build');
  process.exit(0);
}

console.log('Building frontend...');
execSync('npm install --prefix frontend --include=dev && npm run build --prefix frontend', {
  stdio: 'inherit',
  cwd: process.cwd(),
});
