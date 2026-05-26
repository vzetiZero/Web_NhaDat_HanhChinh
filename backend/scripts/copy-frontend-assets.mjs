import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..');
const outRoot = path.join(backendRoot, 'dist', 'web');
const outSrc = path.join(outRoot, 'src');

const folders = ['frontend', 'admin', 'config'];

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(source, target);
    } else if (entry.isFile()) {
      fs.copyFileSync(source, target);
    }
  }
}

fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outSrc, { recursive: true });

for (const folder of folders) {
  const from = path.join(repoRoot, 'src', folder);
  const to = path.join(outSrc, folder);
  if (!fs.existsSync(from)) {
    throw new Error(`Missing frontend source folder: ${from}`);
  }
  copyDir(from, to);
}

fs.writeFileSync(
  path.join(outRoot, 'package.json'),
  JSON.stringify({ type: 'module' }, null, 2) + '\n',
  'utf8'
);

console.log(`Copied frontend/admin renderers to ${path.relative(backendRoot, outRoot)}`);
