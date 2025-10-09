// Run with: npm run deps:audit
// Goal: 1) list unused deps; 2) list missing deps; 3) show Expo SDK expected versions hints.

import depcheck from 'depcheck';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(process.cwd());
const pkgPath = path.join(root, 'package.json');

function sh(cmd) {
  try { return execSync(cmd, { stdio: 'pipe' }).toString().trim(); }
  catch (e) { return e.stdout?.toString?.() || e.message; }
}

(async () => {
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

  console.log('=== Expo doctor ===');
  console.log(sh('npx expo doctor || true'));
  console.log('\n=== depcheck ===');

  const res = await depcheck(root, {
    ignoreBinPackage: false,
    skipMissing: false,
    package: pkg,
    specials: [depcheck.special.babel, depcheck.special.expo]
  });

  console.log('Unused dependencies:', res.dependencies);
  console.log('Unused devDependencies:', res.devDependencies);
  console.log('Missing (imported but not in package.json):', res.missing);
  console.log('Invalid files:', res.invalidFiles);
  console.log('Invalid dirs:', res.invalidDirs);

  // Reanimated guard: ensure v3, not v4 (Expo Go profile)
  const rnr = pkg.dependencies?.['react-native-reanimated'] || pkg.devDependencies?.['react-native-reanimated'];
  if (rnr && /^~?4\./.test(rnr)) {
    console.warn('\n[WARN] react-native-reanimated v4 detected. For Expo Go use v3 (e.g., ~3.10.1).');
  }
})();
