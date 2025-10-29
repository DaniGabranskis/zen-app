// client/src/utils/canonicalizeTags.node.cjs
const fs = require('fs');
const path = require('path');

// Try common locations for tag_registry.json
const REG_PATHS = [
  path.join(process.cwd(), 'client', 'src', 'data', 'tag_registry.json'),
  path.join(process.cwd(), 'src', 'data', 'tag_registry.json'),
  path.join(__dirname, '..', 'data', 'tag_registry.json'),
];

let REG = [];
for (const p of REG_PATHS) {
  if (fs.existsSync(p)) {
    REG = JSON.parse(fs.readFileSync(p, 'utf8'));
    break;
  }
}
if (!Array.isArray(REG)) REG = [];

// Build alias -> emits map
const aliasMap = new Map();
function normalizeToken(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[\/\s\-]+/g, '_') // spaces, slashes, dashes -> _
    .replace(/[?.,!]+/g, '');   // strip punctuation (incl. trailing ?)
}
for (const row of REG) {
  const key = normalizeToken(row.key || '');
  const emits = Array.isArray(row.emits) && row.emits.length ? row.emits.slice() : (key ? [key] : []);
  if (key) aliasMap.set(key, emits);
  for (const a of (row.aliases || [])) {
    const norm = normalizeToken(a);
    if (norm) aliasMap.set(norm, emits);
  }
}

function canonicalizeTags(input) {
  const out = [];
  const seen = new Set();
  const arr = Array.isArray(input) ? input : (input ? [input] : []);
  for (const raw of arr) {
    if (!raw && raw !== 0) continue;
    const norm = normalizeToken(raw);
    const emits = aliasMap.get(norm) || [norm];
    for (const t of emits) {
      const tag = String(t).trim();
      if (tag && !seen.has(tag)) {
        seen.add(tag);
        out.push(tag);
      }
    }
  }
  return out;
}

module.exports = { canonicalizeTags };
