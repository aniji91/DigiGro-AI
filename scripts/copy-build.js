import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'frontend', 'dist');
const dest = path.join(root, 'public');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

if (!fs.existsSync(src)) {
  console.error('frontend/dist not found — run vite build first');
  process.exit(1);
}

if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
copyDir(src, dest);
console.log('✅ Copied frontend build to public/');
