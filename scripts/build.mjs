import { cp, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
// Publish site files only, never the surrounding IMS source or deployment scripts.
for (const name of await readdir(path.join(root, 'site'))) {
  await cp(path.join(root, 'site', name), path.join(output, name), { recursive: true });
}
console.log('Static site prepared in dist/. No dependencies or Docker required.');
