// deps-snapshot.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const lockPath = path.join(root, 'package-lock.json');
const pkgPath  = path.join(root, 'package.json');

const lock = JSON.parse(await readFile(lockPath, 'utf8'));
const pkg  = JSON.parse(await readFile(pkgPath,  'utf8'));

function pickExactVersions(deps = {}) {
  const out = {};
  for (const name of Object.keys(deps)) {
    const key = `node_modules/${name}`;
    const n = lock.packages?.[key];
    if (n?.version) out[name] = n.version;
  }
  return out;
}

const snapshot = {
  timestamp: new Date().toISOString(),
  expo: lock.packages?.['node_modules/expo']?.version ?? null,
  dependencies: pickExactVersions(pkg.dependencies),
  devDependencies: pickExactVersions(pkg.devDependencies)
};

await writeFile(
  path.join(root, 'deps.versions.json'),
  JSON.stringify(snapshot, null, 2),
  'utf8'
);

console.log('✔ Wrote deps.versions.json with exact resolved versions');
