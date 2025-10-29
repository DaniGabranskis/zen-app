// scripts/lint-weights-and-mapping.js
import fs from 'fs';
import path from 'path';
import registry from '../src/data/tag_registry.json' assert { type: 'json' };
import emo20 from '../src/data/emotions20.json' assert { type: 'json' };

const canon = new Set(registry.map(x => x.key));
function fail(msg){ console.error('[DATA-LINT]', msg); process.exitCode = 2; }

function checkWeights(file) {
  const j = JSON.parse(fs.readFileSync(file,'utf8'));
  for (const tag of Object.keys(j)) {
    if (!canon.has(tag)) fail(`unknown tag in weights: ${tag}`);
    for (const emo of Object.keys(j[tag])) {
      if (!emo20.includes(emo)) fail(`unknown emotion in weights[${tag}]: ${emo}`);
    }
  }
  console.log('[OK] weights:', file);
}

function checkMapping(file) {
  const j = JSON.parse(fs.readFileSync(file,'utf8'));
  for (const k of Object.keys(j)) {
    if (!canon.has(k) && k.toLowerCase() !== k) {
      // mapping может хранить внутренние ярлыки — разрешим, но требуем значение из emo20
    }
    if (!emo20.includes(j[k])) fail(`mapping -> not in emotions20: ${k} -> ${j[k]}`);
  }
  console.log('[OK] mapping:', file);
}

const root = process.cwd();
checkWeights(path.join(root,'src/data/weights.tag2emotion.v1.json'));
checkMapping(path.join(root,'src/data/mapping.internal-to-emotions20.json'));
