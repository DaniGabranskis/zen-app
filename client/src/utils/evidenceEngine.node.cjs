// client/src/utils/evidenceEngine.node.cjs
// CJS-friendly shim for Node scripts to avoid ESM JSON import issues.
const fs = require('fs');
const path = require('path');

// Read weights JSON via fs (works in CJS/Node without import assertions)
const WEIGHTS_PATH = path.join(__dirname, '../data/weights.tag2emotion.v1.json');
let WEIGHTS = {};
try {
  WEIGHTS = JSON.parse(fs.readFileSync(WEIGHTS_PATH, 'utf8'));
} catch (e) {
  console.warn('[evidenceEngine.node.cjs] Failed to load weights JSON:', WEIGHTS_PATH, e?.message);
  WEIGHTS = {};
}

// Normalize weights shape to: { emotion: { tag: number, ... }, ... }
function normalizeWeights(raw) {
  if (!raw || typeof raw !== 'object') return {};
  // Accept both shapes:
  // 1) { emotion: { tag: weight } }
  // 2) { tag: { emotion: weight } }  -> transpose
  const keys = Object.keys(raw);
  if (!keys.length) return {};
  const looksLikeEmotionFirst = typeof raw[keys[0]] === 'object' && !Array.isArray(raw[keys[0]]);
  const firstInnerKeys = looksLikeEmotionFirst ? Object.keys(raw[keys[0]] || {}) : [];

  // Heuristic: if inner keys look like tags (contain '?' or '_' etc.), assume emotion-first
  const isEmotionFirst =
    looksLikeEmotionFirst &&
    firstInnerKeys.some(k => typeof k === 'string' && (k.includes('?') || k.includes('_') || k.includes('mood') || k.includes('anxiety')));

  if (isEmotionFirst) {
    return raw;
  } else {
    // Transpose: tag-first -> emotion-first
    const acc = {};
    for (const tag of Object.keys(raw)) {
      const emos = raw[tag] || {};
      for (const emo of Object.keys(emos)) {
        acc[emo] = acc[emo] || {};
        acc[emo][tag] = emos[emo];
      }
    }
    return acc;
  }
}

const W = normalizeWeights(WEIGHTS);

// Simple scorer: sum weights by emotion for present tags.
function scoreByEmotion(tags) {
  const scores = {};
  const tagSet = new Set(tags || []);
  for (const emo of Object.keys(W)) {
    let s = 0;
    const mp = W[emo] || {};
    for (const t of tagSet) {
      const w = mp[t];
      if (typeof w === 'number' && Number.isFinite(w)) s += w;
    }
    scores[emo] = s;
  }
  return scores;
}

// Convert raw scores to a decision close to the app’s behavior.
function classifyTags(tags) {
  const scores = scoreByEmotion(tags);
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    return { mode: 'probe', dominant: 'Unknown', top: [], confidence: 0 };
  }

  const [topEmo, topVal] = entries[0];
  const secondVal = entries[1]?.[1] ?? 0;

  // Confidence heuristic: margin to top sum (avoid NaN)
  const posSum = entries.reduce((sum, [, v]) => sum + Math.max(0, v), 0) || 1;
  const margin = Math.max(0, topVal - secondVal);
  const confidence = Math.min(1, margin / posSum);

  // If margin small -> probe; else direct
  const mode = confidence >= 0.25 ? 'direct' : 'probe';

  return {
    mode,
    dominant: topEmo,
    top: entries.slice(0, 3).map(([k]) => k),
    confidence,
    scores,
  };
}

module.exports = { classifyTags };
