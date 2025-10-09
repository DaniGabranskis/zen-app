// deps-check.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const lockPath = path.join(root, 'package-lock.json');
const pkgPath  = path.join(root, 'package.json');

const lock = JSON.parse(await readFile(lockPath, 'utf8'));
const pkg  = JSON.parse(await readFile(pkgPath,  'utf8'));

function gather(deps = {}) {
  const rows = [];
  for (const [name, wanted] of Object.entries(deps)) {
    const resolved = lock.packages?.[`node_modules/${name}`]?.version ?? 'MISSING';
    rows.push({ name, wanted, resolved, ok: wanted.replace(/^[~^]/, '') === resolved });
  }
  return rows;
}

const rows = [
  ...gather(pkg.dependencies),
  ...gather(pkg.devDependencies)
];

const bad = rows.filter(r => !r.ok);
if (bad.length === 0) {
  console.log('✔ All dependencies match exact resolved versions.');
} else {
  console.log('⚠ Mismatches:');
  for (const r of bad) console.log(` - ${r.name}: wanted ${r.wanted}, resolved ${r.resolved}`);
  process.exitCode = 1;
}
