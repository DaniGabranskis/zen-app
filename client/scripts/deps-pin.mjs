// deps-pin.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const lockPath = path.join(root, 'package-lock.json');
const pkgPath  = path.join(root, 'package.json');
const backup   = path.join(root, 'package.backup.json');

const lock = JSON.parse(await readFile(lockPath, 'utf8'));
const pkg  = JSON.parse(await readFile(pkgPath,  'utf8'));

function pin(deps = {}) {
  const out = { ...deps };
  for (const name of Object.keys(out)) {
    const info = lock.packages?.[`node_modules/${name}`];
    if (info?.version) out[name] = info.version; // точная версия
  }
  return out;
}

await writeFile(backup, JSON.stringify(pkg, null, 2), 'utf8');

pkg.dependencies    = pin(pkg.dependencies);
pkg.devDependencies = pin(pkg.devDependencies);

await writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

console.log('✔ package.json pinned to exact versions (backup: package.backup.json)');
console.log('ℹ  Run: npm install && npx expo start -c');
