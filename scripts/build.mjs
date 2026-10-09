import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
// Publish site files only, never the surrounding IMS source or deployment scripts.
for (const name of await readdir(path.join(root, 'site'))) {
  await cp(path.join(root, 'site', name), path.join(output, name), { recursive: true });
}
// GitHub Pages lets browsers cache files for 10 minutes. Versioned URLs make every
// deploy load its own scripts instead of a stale copy of the previous release.
const version = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 12);
const assets = ['app.js', 'config.js', 'status-model.js', 'styles.css'];
for (const name of ['index.html', 'app.js', 'status-model.js']) {
  const file = path.join(output, name);
  let source = await readFile(file, 'utf8');
  for (const asset of assets) source = source.replaceAll(`'./${asset}'`, `'./${asset}?v=${version}'`).replaceAll(`"./${asset}"`, `"./${asset}?v=${version}"`);
  await writeFile(file, source);
}
console.log('Static site prepared in dist/. No dependencies or Docker required.');
