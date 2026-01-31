// src/domain/tags/canonicalizeTags.js
// Task A2.5: Real implementation (migrated from utils)
// This is the domain layer - single source of truth for tag canonicalization
// Comments in English only.

import registry from '../../data/tag_registry.json' with { type: 'json' };

// ===== Token normalization =====
function normalizeToken(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[\/\s\-]+/g, '_') // spaces, slashes and dashes → _
    .replace(/[?,!]+/g, '');   // remove punctuation (dot removed to preserve sig.* and l1_*)
}

// ===== Build alias dictionary from registry =====
const aliasDict = (() => {
  const dict = Object.create(null);
  for (const item of registry) {
    const key = normalizeToken(item.key);
    dict[key] = item.emits || [item.key];
    if (item.aliases) {
      for (const a of item.aliases) {
        dict[normalizeToken(a)] = item.emits || [item.key];
      }
    }
  }
  return dict;
})();

// ===== P3.10.3.3: Sig.* tag aliases (CANONICALIZE strategy) =====
// These are sig.* tags that should be canonicalized to existing signals
const sigTagAliases = {
  // P3.10.3.3: sig.safety.low - semantically closer to tension/uncertainty than exhausted
  'sig.safety.low': 'sig.tension.high',
  
  // P3.10.3.3: sig.safety.high - semantically closer to calm/clarity than exhausted
  'sig.safety.high': 'sig.tension.low',
};

// ===== Canonicalize single tag =====
export function canonicalizeTag(tag) {
  if (!tag) return null;
  
  // PATCH 1: Fast-path for signal-like tags (sig.* and l1_*)
  // Do not normalize these tags; dots are meaningful (sig.* namespace).
  const raw = String(tag).trim();
  const lower = raw.toLowerCase();

  if (lower.startsWith('sig.')) {
    // Apply sigTagAliases for sig.* tags
    return sigTagAliases[lower] || lower;
  }
  
  if (lower.startsWith('l1_')) {
    // L1_* tags are already normalized, just lowercase
    return lower;
  }
  
  // PATCH 2: For other tags, normalize via registry
  const normalized = normalizeToken(raw);
  const aliases = aliasDict[normalized];
  
  if (aliases && aliases.length > 0) {
    // Return first alias (primary canonical form)
    return aliases[0];
  }
  
  // If no alias found, return normalized form
  return normalized || null;
}

// ===== Canonicalize array of tags =====
// P3.10.3B: canonicalizeTags now only does normalization/aliasing, no derivation
// Derivation should be done explicitly in scoring pipeline via deriveSigTags()
export function canonicalizeTags(rawTags = []) {
  const arr = Array.isArray(rawTags) ? rawTags : [rawTags];
  const seen = new Set();
  const out = [];

  for (const t of arr) {
    const c = canonicalizeTag(t);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
    // P3.10.3B: Removed deriveSigTags call - derivation should be explicit in scoring pipeline
  }
  return out;
}

// ===== For debugging / tests =====
export function getAliasMap() {
  return { ...aliasDict };
}
