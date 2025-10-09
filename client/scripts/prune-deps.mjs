// Run with: npm run deps:prune
// This will remove unused deps reported by depcheck (be cautious, review output first).

import depcheck from 'depcheck';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(process.cwd());
const pkgPath = path.join(root, 'package.json');

function sh(cmd) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

(async () => {
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  const res = await depcheck(root, {
    ignoreBinPackage: false,
    skipMissing: false,
    package: pkg,
    specials: [depcheck.special.babel, depcheck.special.expo]
  });

  const toRemove = [...res.dependencies, ...res.devDependencies];
  if (toRemove.length === 0) {
    console.log('No unused deps detected.');
    process.exit(0);
  }

  console.log('Will remove:', toRemove);
  sh(`npm remove ${toRemove.join(' ')}`);
  console.log('Done. Consider running: npm install && npx expo start -c');
})();
