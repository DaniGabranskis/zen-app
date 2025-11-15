#!/usr/bin/env node
// scripts/seed-history.mjs
// Usage:
//   node scripts/seed-history.mjs --template ./seeds/positive-week.json
//
// Writes: src/dev/seed.payload.json  and  src/dev/devSeed.config.json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// small arg parser
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const templatePath = getArg('--template');

if (!templatePath) {
  console.error('ERROR: provide --template <path-to-json>');
  process.exit(1);
}

const tplAbs = path.resolve(process.cwd(), templatePath);
if (!fs.existsSync(tplAbs)) {
  console.error('ERROR: template not found:', tplAbs);
  process.exit(1);
}

let rows;
try {
  const raw = fs.readFileSync(tplAbs, 'utf8');
  rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error('Template must be an array of objects.');
} catch (e) {
  console.error('ERROR: bad JSON template:', e.message);
  process.exit(1);
}

// normalize rows: expand {count} into multiple entries
const expanded = [];
for (const r of rows) {
  const {
    date,          // ISO string or 'YYYY-MM-DD' (local date)
    emotion,       // e.g., "Joy", "Calm", "Gratitude", "Clarity", "Anxious", ...
    intensity = 5, // 0..10
    accuracy = 3,  // 1..5
    count = 1,     // replicate row N times
    tags = [],
  } = r;

  if (!date || !emotion) {
    console.warn('WARN: skip row without date/emotion:', r);
    continue;
  }

  for (let i = 0; i < count; i++) {
    // if date is YYYY-MM-DD -> convert to ISO at 10:00 with small jitter
    let iso;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const d = new Date(date + 'T10:00:00');
      d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
      iso = d.toISOString();
    } else {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        console.warn('WARN: bad date, skip:', date);
        continue;
      }
      iso = d.toISOString();
    }

    expanded.push({
      date: iso,
      emotion,
      intensity: Number(intensity),
      accuracy: Number(accuracy),
      tags: Array.isArray(tags) ? tags : [],
    });
  }
}

// payload with nonce (to prevent duplicates)
const nonce = Date.now();
const payload = { nonce, rows: expanded };

const outDir = path.resolve(__dirname, '../src/dev');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'seed.payload.json'), JSON.stringify(payload, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'devSeed.config.json'), JSON.stringify({ enabled: true, nonce }, null, 2), 'utf8');

console.log('[seed-cli] Wrote src/dev/seed.payload.json with', expanded.length, 'rows');
console.log('[seed-cli] Wrote src/dev/devSeed.config.json { enabled: true, nonce:', nonce, '}');
console.log('[seed-cli] Now reload the app to apply seed once.');
