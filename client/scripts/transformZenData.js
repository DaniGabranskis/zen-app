// client/scripts/transformZenData.js
// Usage:
//   node scripts/transformZenData.js --in src/data/ZenDataExtend.json --out src/data/ZenDataExtend.balanced.json
//
// What it does:
// - Reads ZenDataExtend.json (L1..L5)
// - Fixes common showIfTags mismatches (e.g., "monotony" -> "routine")
// - Canonicalizes and de-duplicates showIfTags
// - Keeps showIf AS IS (no removal)
// - Writes a new JSON next to the original

const fs = require('fs');
const path = require('path');

// Adjust this map to your real vocabulary.
// Left side = seen in data, right side = desired normalized form.
const TAG_NORMALIZE = {
  // frequent mismatches in your data
  monotony: 'routine',

  // if you want to merge anxiety family:
  // anxiety: 'Anxious',
  // anxious: 'Anxious',

  // if you want to title-case everything later, leave as is and rely on canonicalizeTags() at runtime
};

function canonicalToken(s) {
  if (!s) return s;
  const x = String(s).trim();
  // Normalize by our explicit map first (case-insensitive keys)
  const key = x.toLowerCase();
  if (TAG_NORMALIZE[key]) return TAG_NORMALIZE[key];

  // Otherwise keep as-is (no forced title case here; runtime compares canonically)
  return x;
}

function uniq(arr) {
  return [...new Set(arr)];
}

function normalizeShowIfTags(arr) {
  if (!Array.isArray(arr)) return arr;
  const out = arr.map(canonicalToken).filter(Boolean);
  return uniq(out);
}

function processFile(inPath, outPath) {
  if (!fs.existsSync(inPath)) {
    console.error(`[ERROR] Input file not found: ${inPath}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(inPath, 'utf8'));

  ['L1','L2','L3','L4','L5'].forEach((L) => {
    if (!Array.isArray(raw[L])) return;

    raw[L] = raw[L].map((card) => {
      const c = { ...card };

      // Keep showIf as is
      // Normalize showIfTags (if present)
      if (Array.isArray(c.showIfTags)) {
        c.showIfTags = normalizeShowIfTags(c.showIfTags);
        if (c.showIfTags.length === 0) delete c.showIfTags;
      }

      // Also normalize tags inside options/left/right (non-destructive)
      const normalizeOption = (opt) => {
        if (!opt) return opt;
        const o = { ...opt };
        if (Array.isArray(o.tags)) o.tags = normalizeShowIfTags(o.tags);
        return o;
      };

      if (c.leftOption) c.leftOption = normalizeOption(c.leftOption);
      if (c.rightOption) c.rightOption = normalizeOption(c.rightOption);
      if (Array.isArray(c.options)) c.options = c.options.map(normalizeOption);

      return c;
    });
  });

  fs.writeFileSync(outPath, JSON.stringify(raw, null, 2), 'utf8');
  console.log(`✅ Wrote: ${outPath}`);
}

(function main() {
  const args = process.argv.slice(2);
  let inPath = 'src/data/ZenDataExtend.json';
  let outPath = 'src/data/ZenDataExtend.balanced.json';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--in' && args[i + 1]) inPath = args[++i];
    else if (a === '--out' && args[i + 1]) outPath = args[++i];
  }

  processFile(inPath, outPath);
})();
