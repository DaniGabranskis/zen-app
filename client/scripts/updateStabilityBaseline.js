// updateStabilityBaseline.js
// STAB-BASE-01: Copy current smoke stability summary into baseline.
// Comments in English only.

import { copyFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  const src = path.join(__dirname, 'out', 'A3_2_3_STABILITY_SUMMARY.json');
  const dest = path.join(__dirname, 'baselines', 'A3_2_3_STABILITY_BASELINE.json');

  if (!existsSync(src)) {
    console.error(`[stability:baseline] Source summary not found: ${src}`);
    console.error('[stability:baseline] Run `npm run stability:smoke` first.');
    process.exit(1);
  }

  copyFileSync(src, dest);
  console.log(`[stability:baseline] Baseline updated from ${src} -> ${dest}`);
}

main();

