// src/utils/evidenceEngine.node.v2.cjs
// Node.js-compatible loader/shim for the app's evidence engine.
// Comments in English only.
//
// Why this file exists:
// - The React Native app uses ESM + Metro and can import JS/JSON freely.
// - Node scripts (validation/simulation) need the SAME routing math, but Node ESM JSON imports
//   can be a friction point. This shim avoids JSON imports by reusing emotionSpace (pure ESM)
//   and by extracting TAG_RULES + thresholds directly from the source evidenceEngine.js.
//
// Usage (from Node scripts):
//   const { loadEvidenceEngine } = require('../src/utils/evidenceEngine.node.v2.cjs');
//   (async () => {
//     const { classifyTags, routeEmotionFromCards } = await loadEvidenceEngine();
//     const { decision } = classifyTags(['L1_MOOD_NEG', 'L2_FOCUS_PAST']);
//     console.log(decision);
//   })();

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function fileExists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function resolveFirstExisting(candidates) {
  for (const p of candidates) {
    if (fileExists(p)) return p;
  }
  return null;
}

function findProjectFile(relativePaths) {
  const bases = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    // Also try relative to the current file location (useful when the script is executed from elsewhere).
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname, '..', '..', '..'),
  ];

  const candidates = [];
  for (const base of bases) {
    for (const rel of relativePaths) {
      candidates.push(path.resolve(base, rel));
    }
  }

  const hit = resolveFirstExisting(candidates);
  if (!hit) {
    const msg =
      'Cannot locate required project file.\n' +
      'Tried:\n' + candidates.map((x) => `- ${x}`).join('\n');
    throw new Error(msg);
  }
  return hit;
}

function extractConstNumber(src, name) {
  const re = new RegExp(`\\bconst\\s+${name}\\s*=\\s*([^;]+);`);
  const m = src.match(re);
  if (!m) throw new Error(`Failed to find const ${name} in evidenceEngine.js`);
  // Evaluate numeric expression safely-ish (expects only numbers, dots, + - * / parentheses).
  const expr = String(m[1]).trim();
  if (!/^[0-9eE+*/().\\s-]+$/.test(expr)) {
    throw new Error(`Unsafe expression for ${name}: ${expr}`);
  }
  // eslint-disable-next-line no-eval
  return eval(expr);
}

function extractObjectLiteral(src, constName) {
  const startIdx = src.indexOf(`const ${constName} = {`);
  if (startIdx < 0) throw new Error(`Failed to find const ${constName} = { ... }`);
  let i = src.indexOf('{', startIdx);
  if (i < 0) throw new Error(`Failed to find opening { for ${constName}`);
  let depth = 0;
  let inStr = false;
  let strCh = '';
  let esc = false;

  const begin = i;
  for (; i < src.length; i++) {
    const ch = src[i];

    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\\\') { esc = true; continue; }
      if (ch === strCh) { inStr = false; strCh = ''; }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inStr = true;
      strCh = ch;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') depth--;

    if (depth === 0) {
      const end = i;
      const literal = src.slice(begin, end + 1);
      return literal;
    }
  }
  throw new Error(`Unbalanced braces while extracting ${constName}`);
}

async function importEsm(filePath) {
  const url = pathToFileURL(filePath).href;
  return import(url);
}

let _cache = null;

/**
 * Load engine helpers from the app source.
 * @returns {Promise<{ classifyTags: Function, routeEmotionFromCards: Function, accumulateTagsFromCards: Function, __config: Object }>}
 */
async function loadEvidenceEngine() {
  if (_cache) return _cache;

  const evidenceEnginePath = findProjectFile([
    'src/utils/evidenceEngine.js',
    'client/src/utils/evidenceEngine.js',
  ]);

  const emotionSpacePath = findProjectFile([
    'src/utils/emotionSpace.js',
    'client/src/utils/emotionSpace.js',
  ]);

  const src = fs.readFileSync(evidenceEnginePath, 'utf8');

  // Extract thresholds & TAG_RULES from the SAME source as the app.
  const config = {
    T_DOM: extractConstNumber(src, 'T_DOM'),
    T_MIX: extractConstNumber(src, 'T_MIX'),
    DELTA_MIX: extractConstNumber(src, 'DELTA_MIX'),
    DELTA_PROBE: extractConstNumber(src, 'DELTA_PROBE'),
  };

  const tagRulesLiteral = extractObjectLiteral(src, 'TAG_RULES');
  // Evaluate TAG_RULES object literal.
  // It must be a plain object of numbers; it must not reference external variables.
  // eslint-disable-next-line no-eval
  const TAG_RULES = eval(`(${tagRulesLiteral})`);

  const emotionSpace = await importEsm(emotionSpacePath);
  const { emptyState, clampState, rankEmotions } = emotionSpace;

  function buildStateFromTags(rawTags = []) {
    const unique = Array.from(new Set(rawTags));
    let state = emptyState();

    for (const tag of unique) {
      const rule = TAG_RULES[tag];
      if (!rule) continue;
      for (const [dim, delta] of Object.entries(rule)) {
        state[dim] = (state[dim] ?? 0) + delta;
      }
    }
    return clampState(state);
  }

  function softmaxFromScores(pairs, temperature = 0.9, eps = 1e-6) {
    if (!pairs || pairs.length === 0) return [];
    const scaled = pairs.map(({ key, score }) => ({
      key,
      v: Math.exp((score / Math.max(temperature, 0.1)) || 0),
    }));
    const sum = scaled.reduce((acc, x) => acc + x.v, 0) + eps;
    return scaled.map(({ key, v }) => ({ key, p: v / sum }));
  }

  function decideMixOrSingle(pairs) {
    const [first, second] = pairs;
    const [e1, p1] = first || [];
    const [e2, p2] = second || [];
    const delta = (p1 ?? 0) - (p2 ?? 0);

    const base = {
      dominant: e1 || 'unknown',
      secondary: e2 || null,
      confidence: p1 ?? 0,
      delta,
      mode: 'single',
    };

    // Keep the app logging optional (silence by default).
    // If you want it, set process.env.EVIDENCE_DEBUG=1.
    if (process.env.EVIDENCE_DEBUG === '1') {
      console.log('[evidenceEngine.node] decideMixOrSingle', {
        e1, p1, e2, p2, delta,
        T_DOM: config.T_DOM, T_MIX: config.T_MIX, DELTA_PROBE: config.DELTA_PROBE, DELTA_MIX: config.DELTA_MIX,
      });
    }

    // 1) Very confident single emotion
    if (p1 >= config.T_DOM) return { ...base, mode: 'single' };

    // 2) Mix of two (close gap) if top is strong enough
    if (p1 >= config.T_MIX && delta < config.DELTA_MIX && e2) return { ...base, mode: 'mix' };

    // 3) Probe if top-2 are almost equal
    if (delta < config.DELTA_PROBE && e2) return { ...base, mode: 'probe' };

    // 4) Default single
    return { ...base, mode: 'single' };
  }

  function accumulateTagsFromCards(cards = []) {
    const raw = [];
    for (const c of cards) {
      const opt = c.options?.[c.selectedOption];
      const tags = Array.isArray(opt) ? opt : (opt?.tags || []);
      for (const t of tags) raw.push(t);
    }
    return raw;
  }

  function classifyTags(tags = []) {
    const state = buildStateFromTags(tags);
    const similarityRank = rankEmotions(state); // [{ key, score }, ...]
    const withProb = softmaxFromScores(similarityRank); // [{ key, p }, ...]
    const pairs = withProb.map(({ key, p }) => [key, p]);
    const decision = decideMixOrSingle(pairs);
    return { decision, probsSorted: pairs, state };
  }

  function routeEmotionFromCards(acceptedCards) {
    const tags = accumulateTagsFromCards(acceptedCards || []);
    const tagFreq = {};
    for (const t of tags) tagFreq[t] = (tagFreq[t] || 0) + 1;

    const { decision, probsSorted, state } = classifyTags(tags);
    const probs = {};
    for (const [k, p] of probsSorted) probs[k] = p;

    return {
      dominant: decision.dominant || 'unknown',
      secondary: decision.secondary || null,
      confidence: decision.confidence || 0,
      delta: decision.delta || 0,
      probs,
      tagFreq,
      mode: decision.mode,
      vector: state,
    };
  }

  _cache = {
    classifyTags,
    routeEmotionFromCards,
    accumulateTagsFromCards,
    __config: { ...config, evidenceEnginePath, emotionSpacePath },
  };
  return _cache;
}

module.exports = { loadEvidenceEngine };