// client/scripts/simulateAllFlows.js
// Simulate all flows across L1..L5 using the same pairing logic your app uses now.
// - No swipedata: pairs are taken from left/right when present,
//   or from options[] when exactly 2,
//   or the max-contrast pair by Jaccard when options.length >= 3.
// - Classify after L1/L2 using evidenceEngine.classifyTags(tags).
// - Optionally traverse L3 (probes), then L4/L5.
//
// Usage:
//   node scripts/simulateAllFlows.js \
//     --inDir src/data \
//     --mode exhaustive \
//     --maxPaths 300000 \
//     --out analysis/sim_all
//
//   node scripts/simulateAllFlows.js \
//     --inDir src/data \
//     --mode sample --samples 20000 \
//     --out analysis/sim_sample
//
// Input expectation (JSON files if present):
//   L1.json, L2.json, L3.json (probes, optional), L4.json (optional), L5.json (optional)
//
// Dependencies already in your project (same ones your other scripts use):
//   ../utils/evidenceEngine   -> classifyTags(tags)
//   ../utils/tagCanon         -> canonicalizeTags(tags)

const fs = require('fs');
const path = require('path');
// Resolve from client/src/utils/*
let classifyTags;
try {
  // Try the Node-friendly shim first
  ({ classifyTags } = require('../src/utils/evidenceEngine.node.cjs'));
} catch (_) {}
if (!classifyTags) {
  // Fallback to original (may be ESM; can still fail on JSON import in Node)
  const evidenceMod = require('../src/utils/evidenceEngine');
  classifyTags =
    evidenceMod.classifyTags || (evidenceMod.default && evidenceMod.default.classifyTags);
}

// --- canonicalizeTags loader (prefer Node-friendly shim first)
let canonicalizeTags;
try {
  // 1) Node/CJS shim avoids ESM JSON import issues on Node 22+
  ({ canonicalizeTags } = require('../src/utils/canonicalizeTags.node.cjs'));
} catch (_) {}

if (!canonicalizeTags) {
  // 2) Fallback to original module (may be ESM)
  const tagCanonMod = require('../src/utils/canonicalizeTags');
  canonicalizeTags =
    tagCanonMod.canonicalizeTags ||
    (tagCanonMod.default && tagCanonMod.default.canonicalizeTags);
}

if (typeof canonicalizeTags !== 'function') {
  throw new Error('Failed to load canonicalizeTags from utils. Check shim/exports.');
}

if (typeof classifyTags !== 'function' || typeof canonicalizeTags !== 'function') {
  throw new Error('Failed to load classifyTags/canonicalizeTags from src/utils. Check exports.');
}

// --- debug flags & helpers ---
let DEBUG = false;
let DEBUG_DIR = null;
let UNKNOWN_SAMPLES_LIMIT = 200;

function saveJSON(p, obj) {
  try { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); } catch (_) {}
}
function openWriteStream(p) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    return fs.createWriteStream(p, { encoding: 'utf8' });
  } catch (_) {
    return null;
  }
}


// Load emotions20 list (public spectrum) and optional internal->public mapping
let EMO20 = [];
try {
  const emo20Raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'client', 'src', 'data', 'emotions20.json'), 'utf8'));
  EMO20 = Array.isArray(emo20Raw) ? emo20Raw.map(x => (x.key || x.id || x.label)).filter(Boolean) : [];
} catch (e) {
  try {
    // fallback: resolve relative to cfg.inDir later (if run from client/)
    const maybe = JSON.parse(fs.readFileSync(path.join('src', 'data', 'emotions20.json'), 'utf8'));
    EMO20 = Array.isArray(maybe) ? maybe.map(x => (x.key || x.id || x.label)).filter(Boolean) : [];
  } catch (_) {}
}

let MAP_INT2E20 = {};
try {
  const mp = path.join('src', 'data', 'mapping.internal-to-emotions20.json');
  if (fs.existsSync(mp)) MAP_INT2E20 = JSON.parse(fs.readFileSync(mp, 'utf8'));
} catch (_) {}

// ---- Label normalization & robust mapper ----
const LABEL_ALIASES = {
  // unify near-synonyms and spelling variants into emotions20 keys
  overload: 'overwhelm',
  overwhelmed: 'overwhelm',
  overwhelming: 'overwhelm',
  tired: 'tiredness',
  fatigue: 'tiredness',
  fatigued: 'tiredness',
  calmness: 'calm',
  clarity2: 'clarity',
  confuse: 'confusion',
  confused: 'confusion',
  irritation: 'irritation',
  irritable: 'irritation',
  grateful: 'gratitude',
  content: 'contentment',
  loneliness: 'loneliness',
  disconnected: 'disconnection',
  disconn: 'disconnection',
};

const EMO20_SET = new Set(EMO20);

function splitLabelTokens(raw) {
  // 1) split CamelCase -> tokens
  const camel = String(raw)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
  // 2) replace separators to space
  const sep = camel.replace(/[_\-\/]/g, ' ');
  // 3) drop punctuation, lower, trim
  const cleaned = sep.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s/g, ' ').trim();
  return cleaned ? cleaned.split(' ') : [];
}

function normalizeSingleToken(tok) {
  if (!tok) return null;
  if (MAP_INT2E20[tok]) return MAP_INT2E20[tok];
  if (EMO20_SET.has(tok)) return tok;
  if (LABEL_ALIASES[tok]) return LABEL_ALIASES[tok];
  // prefix hints
  if (tok.startsWith('anger')) return 'anger';
  if (tok.startsWith('anx')) return 'anxiety';
  if (tok.startsWith('sad')) return 'sadness';
  if (tok.startsWith('frustrat')) return 'frustration';
  if (tok.startsWith('confus')) return 'confusion';
  if (tok.startsWith('overwhelm') || tok === 'overload') return 'overwhelm';
  if (tok.startsWith('tired') || tok.startsWith('fatig')) return 'tiredness';
  if (tok.startsWith('calm')) return 'calm';
  if (tok.startsWith('clar')) return 'clarity';
  if (tok.startsWith('grat')) return 'gratitude';
  if (tok.startsWith('content')) return 'contentment';
  if (tok.startsWith('irrit')) return 'irritation';
  if (tok.startsWith('lonel')) return 'loneliness';
  if (tok.startsWith('disconnect')) return 'disconnection';
  return null;
}

function normalizeInternalLabel(raw) {
  if (!raw) return null;
  // try exact first (including '?' suffix)
  if (MAP_INT2E20[raw]) return MAP_INT2E20[raw];
  if (MAP_INT2E20[raw + '?']) return MAP_INT2E20[raw + '?'];
  if (EMO20_SET.has(raw)) return raw;
  const qless = String(raw).replace(/\?$/,'');
  if (EMO20_SET.has(qless)) return qless;
  // split into tokens and attempt to map any constituent
  const toks = splitLabelTokens(raw);
  for (const t of toks) {
    const m = normalizeSingleToken(t);
    if (m && EMO20_SET.has(m)) return m;
  }
  // last resort: join pair tokens like "frustration anger" -> prefer first match
  for (let i = 0; i < toks.length - 1; i++) {
    const pair = normalizeSingleToken(toks[i]) || normalizeSingleToken(toks[i+1]);
    if (pair && EMO20_SET.has(pair)) return pair;
  }
  return null;
}

function mapInternalToE20(label) {
  const mapped = normalizeInternalLabel(label);
    if (!mapped && DEBUG) {
    ensureDebug();
    WS_UNKNOWN && WS_UNKNOWN.write(
      JSON.stringify({
        kind: 'map_fail',
        raw: label,
        toks: splitLabelTokens(label)
      }) + '\n'
    );
  }
  return mapped || null;
}

// --- Probe emulation helpers ---

/**
 * Crude axis estimator from accumulated tags.
 * We intentionally keep it simple and data-driven enough to match app behavior.
 * Return normalized axis values in [-1..1].
 */
function estimateAxesFromTags(tags) {
  const set = new Set(tags);
  // Tag buckets. Extend as needed to mirror your tagCanon mapping.
  const POS_VAL = ['support', 'gratitude?', 'safe', 'mind_calm', 'uncertainty_low', 'work_ok', 'self_ok', 'clarity?'];
  const NEG_VAL = ['mood_negative', 'anxiety?', 'sadness?', 'disconnection?', 'overwhelm?', 'threat?', 'anger?'];

  const HI_ARO = ['tension?', 'overwhelm?', 'anxiety?', 'anger?', 'panic?'];
  const LO_ARO = ['energy_low', 'tiredness?', 'numb?', 'calm?'];

  const HI_CTL = ['agency_high', 'coping?', 'problem_focused?'];
  const LO_CTL = ['low_control', 'helpless?', 'stuck?'];

  const score = (arr) => arr.reduce((s, t) => s + (set.has(t) ? 1 : 0), 0);

  const val = score(POS_VAL) - score(NEG_VAL);
  const aro = score(HI_ARO) - score(LO_ARO);
  const ctl = score(HI_CTL) - score(LO_CTL);

  // normalize to [-1..1] by a soft divisor; avoid NaN
  const norm = (x) => Math.max(-1, Math.min(1, x / 3));
  return { valence: norm(val), arousal: norm(aro), control: norm(ctl) };
}

// Returns exactly ONE public tag to nudge the state per round.
function deriveProbeTag(axes, topTwo) {
  // broaden candidates to reduce bias: add anger, confusion
  const cand = [];
  // arousal low -> tiredness
  cand.push({ tag: 'tiredness', score: -axes.arousal });
  // valenceagency -> clarity
  cand.push({ tag: 'clarity', score: axes.valence + 0.5 * axes.control });
  // positive & low arousal -> calm
  cand.push({ tag: 'calm', score: axes.valence - 0.25 * Math.abs(axes.arousal) });
  // high arousal & low control -> overwhelm
  cand.push({ tag: 'overwhelm', score: axes.arousal - 0.25 * axes.control });
  // high arousal & negative valence -> anxiety / anger
  cand.push({ tag: 'anxiety', score: axes.arousal - 0.25 * axes.valence });
  cand.push({ tag: 'anger', score: axes.arousal + 0.25 * (1 - axes.control) - 0.1 * axes.valence });
  // mid arousal & low certainty -> confusion
  cand.push({ tag: 'confusion', score: (0.5 - Math.abs(axes.arousal - 0.5)) + (0.5 - axes.control) });
  cand.push({ tag: 'sadness',      score: -axes.valence - 0.25 * Math.max(0, axes.arousal) });
  cand.push({ tag: 'disconnection', score: -axes.valence + 0.25 * (1 - axes.control) });
  cand.push({ tag: 'joy',          score:  axes.valence + 0.25 * Math.max(0, axes.arousal) });
  cand.push({ tag: 'gratitude',    score:  axes.valence + 0.25 * axes.control });

  cand.sort((a, b) => b.score - a.score);
  let pick = cand[0].tag;

  // Gentle nudge using top-two labels
  const pair = (topTwo || []).slice(0, 2).join(',');
  if (/fatigue|tired/i.test(pair) && axes.arousal <= 0) pick = 'tiredness';
  else if (/calm|safe/i.test(pair) && axes.valence >= 0) pick = 'calm';
  else if (/clarity|focus|control/i.test(pair)) pick = 'clarity';
  else if (/anger|irritation|frustration/i.test(pair)) pick = 'anger';
  else if (/confus|uncertain/i.test(pair)) pick = 'confusion';

    if (DEBUG) {
    ensureDebug();
    WS_PROBE && WS_PROBE.write(
      JSON.stringify({
        kind: 'probe_pick',
        axes,
        cand: cand.slice(0, 5), // top-5 candidates with scores
        pick,
        topTwo
      }) + '\n'
    );
  }
  return pick;
}

function applyProbeRound(tags, topTwo) {
  const axes = estimateAxesFromTags(tags);
  const one = deriveProbeTag(axes, topTwo);
  const next = canonicalizeTags([...tags, one]);

  if (DEBUG) {
    ensureDebug();
    WS_PROBE && WS_PROBE.write(JSON.stringify({
      axes,
      added: one,
      topTwo
    }) + '\n');
  }
  return next;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    inDir: 'src/data',
    outDir: 'analysis/sim_all',
    mode: 'exhaustive',      // 'exhaustive' | 'sample'
    samples: 20000,
    maxPaths: 250000,        // safety cap
    includeL3: true,
    includeL4L5: true,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--inDir' && args[i + 1]) cfg.inDir = args[++i];
    else if (a === '--out' && args[i + 1]) cfg.outDir = args[++i];
    else if (a === '--mode' && args[i + 1]) cfg.mode = args[++i];
    else if (a === '--samples' && args[i + 1]) cfg.samples = Number(args[++i]);
    else if (a === '--maxPaths' && args[i + 1]) cfg.maxPaths = Number(args[++i]);
    else if (a === '--noL3') cfg.includeL3 = false;
    else if (a === '--noL45') cfg.includeL4L5 = false;
    else if (a === '--debug') DEBUG = true;
    else if (a === '--debugDir' && args[i + 1]) DEBUG_DIR = args[++i];
    else if (a === '--unknownSamples' && args[i + 1]) UNKNOWN_SAMPLES_LIMIT = Number(args[++i]);
  }
  return cfg;
}

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function asArr(x) { return Array.isArray(x) ? x : []; }
function uniq(a) { return [...new Set(a)]; }

function loadJsonMaybe(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadLayers(inDir) {
  const tryLoad = (name) => {
    const p1 = path.join(inDir, name);                 // src/data/L1.json
    const p2 = path.join(inDir, 'flow', name);         // src/data/flow/L1.json
    return loadJsonMaybe(fs.existsSync(p1) ? p1 : p2);
  };

  const L1 = tryLoad('L1.json');
  const L2 = tryLoad('L2.json');
  const L3 = []; // нет формализованных карточек — оставляем пустым
  const L4 = [];
  const L5 = [];

  // (опционально) полезный лог загрузки
  if (DEBUG) {
    console.log(`[SIM] Loaded cards: L1=${Array.isArray(L1)?L1.length:0}, L2=${Array.isArray(L2)?L2.length:0}`);
  }

  return { L1, L2, L3, L4, L5 };
}

// Normalize a "card" into a traversable structure.
function normalizeCard(raw, layerName) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ? String(raw.id) : null;
  if (!id) return null;

  const left = raw.leftOption ? normOption(raw.leftOption) : null;
  const right = raw.rightOption ? normOption(raw.rightOption) : null;
  const opts = Array.isArray(raw.options)
    ? raw.options.map(o => typeof o === 'string' ? { text: o, tags: [] } : normOption(o)).filter(Boolean)
    : [];

  const routing = {};
  if (raw.showIf && typeof raw.showIf === 'object' && !Array.isArray(raw.showIf)) routing.showIf = raw.showIf;
  if (Array.isArray(raw.showIfTags)) routing.showIfTagsAny = [...raw.showIfTags];

  return {
    id,
    layer: layerName,
    question: String(raw.text || raw.title || raw.question || '').trim(),
    leftOption: left,
    rightOption: right,
    options: opts,
    routing,
  };
}

function normOption(o) {
  const text = String(o.text || '').trim();
  const tags = canonicalizeTags(asArr(o.tags).filter(Boolean));
  return { text, tags };
}

// Jaccard distance on sets of tags
function jaccardDist(aTags, bTags) {
  const A = new Set(aTags);
  const B = new Set(bTags);
  const inter = [...A].filter(x => B.has(x)).length;
  const uni = uniq([...A, ...B]).length;
  return uni === 0 ? 0 : 1 - inter / uni;
}

// Build a two-sided pair for swipe-like choice (your current behavior).
function buildPairForCard(card) {
  // Priority 1: explicit left/right
  if (card.leftOption && card.rightOption) {
    return { left: card.leftOption, right: card.rightOption };
  }
  // Priority 2: exactly two options
  if (card.options && card.options.length === 2) {
    return { left: card.options[0], right: card.options[1] };
  }
  // Priority 3: 3+ options -> pick max Jaccard-contrast pair
  if (card.options && card.options.length >= 3) {
    let best = null;
    for (let i = 0; i < card.options.length; i++) {
      for (let j = i + 1; j < card.options.length; j++) {
        const a = card.options[i], b = card.options[j];
        const d = jaccardDist(a.tags, b.tags);
        if (!best || d > best.d) best = { d, left: a, right: b };
      }
    }
    if (best) return { left: best.left, right: best.right };
  }
  if (card.leftOption && card.rightOption) {
    if (DEBUG) {
      ensureDebug();
      WS_PAIRS && WS_PAIRS.write(JSON.stringify({
        kind: 'explicit_lr',
        cardId: card.id,
        layer: card.layer,
        left: card.leftOption.tags,
        right: card.rightOption.tags
      }) + '\n');
    }
    return { left: card.leftOption, right: card.rightOption };
  }
  if (card.options && card.options.length === 2) {
    if (DEBUG) {
      ensureDebug();
      WS_PAIRS && WS_PAIRS.write(JSON.stringify({
        kind: 'two_options',
        cardId: card.id,
        layer: card.layer,
        opt0: card.options[0].tags,
        opt1: card.options[1].tags
      }) + '\n');
    }
    return { left: card.options[0], right: card.options[1] };
  }
  if (card.options && card.options.length >= 3) {
    let best = null;
    for (let i = 0; i < card.options.length; i++) {
      for (let j = i + 1; j < card.options.length; j++) {
        const a = card.options[i], b = card.options[j];
        const d = jaccardDist(a.tags, b.tags);
        if (!best || d > best.d) best = { d, left: a, right: b, i, j };
      }
    }
    if (best) {
      if (DEBUG) {
        ensureDebug();
        WS_PAIRS && WS_PAIRS.write(JSON.stringify({
          kind: 'jaccard_pick',
          cardId: card.id,
          layer: card.layer,
          pick_i: best.i,
          pick_j: best.j,
          distance: best.d,
          left: best.left.tags,
          right: best.right.tags,
          optionsCount: card.options.length
        }) + '\n');
      }
      return { left: best.left, right: best.right };
    }
  }
  if (DEBUG) {
    ensureDebug();
    WS_PAIRS && WS_PAIRS.write(JSON.stringify({
      kind: 'no_pair',
      cardId: card.id,
      layer: card.layer
    }) + '\n');
  }
  // Fallback: no options -> null pair
  return null;
}

function visible(card, answersById, accTags) {
  const r = card.routing || {};
  if (r.showIf) {
    const ok = Object.entries(r.showIf).every(([qid, allowed]) => {
      const picked = answersById[qid]?.text;
      return picked && asArr(allowed).includes(picked);
    });
    if (!ok) return false;
  }
  if (r.showIfTagsAny && r.showIfTagsAny.length > 0) {
    const hasAny = r.showIfTagsAny.some(t => accTags.includes(t));
    if (!hasAny) return false;
  }
  return true;
}

function normalizeLayer(rawArr, layerName) {
  return asArr(rawArr).map(c => normalizeCard(c, layerName)).filter(Boolean);
}

function classifyFromTags(tags) {
  // Must mirror app behavior after L1/L2 (and after L3)
  const out = classifyTags(canonicalizeTags(tags));
  return {
    mode: out.mode,                                // 'probe' or something else
    dominant: out.dominant || out.top?.[0] || 'Unknown',
    confidence: out.confidence ?? null,
    top: out.top || [],
  };
}

// Lazy-initialized debug streams (only if DEBUG)
let WS_PAIRS = null;
let WS_PROBE = null;
let WS_UNKNOWN = null;

function ensureDebug() {
  if (!DEBUG) return;
  if (!WS_PAIRS)  WS_PAIRS  = openWriteStream(path.join(DEBUG_DIR, 'debug_pairs.ndjson'));
  if (!WS_PROBE)  WS_PROBE  = openWriteStream(path.join(DEBUG_DIR, 'debug_probe_rounds.ndjson'));
  if (!WS_UNKNOWN) WS_UNKNOWN = openWriteStream(path.join(DEBUG_DIR, 'unknown_samples.ndjson'));
}

// DFS traversal with cap and sample mode
function simulate(cfg, layers) {
  const L1 = normalizeLayer(layers.L1, 'L1');
  const L2 = normalizeLayer(layers.L2, 'L2');
  const L3 = normalizeLayer(layers.L3, 'L3');
  const L4 = normalizeLayer(layers.L4, 'L4');
  const L5 = normalizeLayer(layers.L5, 'L5');

  const res = [];
  const hist = {};
  let visited = 0;
  let cutByCap = false;

  const mkRec = () => ({ picks: [], tags: [], answersById: {}, final: null });

  function recordPick(rec, layer, cardId, option, sideLabel) {
    const pick = {
      layer,
      cardId,
      optionText: option?.text || '(none)',
      tags: asArr(option?.tags),
      side: sideLabel, // 'left' | 'right'
    };
    const next = structuredClone(rec);
    next.picks.push(pick);
    next.tags = canonicalizeTags([...next.tags, ...pick.tags]);
    next.answersById[cardId] = { text: pick.optionText, tags: pick.tags };
    return next;
  }

  function stepLayer(cards, inSet, layerName) {
    if (!cards.length) return inSet;
    let outSet = [];
    for (const rec of inSet) {
      // gather visible, unanswered cards
      const answeredIds = new Set(rec.picks.filter(p => p.layer === layerName).map(p => p.cardId));
      const vis = cards.filter(c => visible(c, rec.answersById, rec.tags) && !answeredIds.has(c.id));
      if (!vis.length) { outSet.push(rec); continue; }

      let frontier = [rec];
      for (const card of vis) {
        const pair = buildPairForCard(card);
        const choices = [];

        if (pair?.left && pair?.right) {
          // two-way choice (swipe-like)
          if (cfg.mode === 'sample') {
            // sample one of the two
            const pickLeft = Math.random() < 0.5;
            choices.push(pickLeft ? { opt: pair.left, side: 'left' } : { opt: pair.right, side: 'right' });
          } else {
            choices.push({ opt: pair.left, side: 'left' }, { opt: pair.right, side: 'right' });
          }
        } else if (card.options?.length) {
          // multi-option (non-swipe) choice
          if (cfg.mode === 'sample') {
            const r = card.options[Math.floor(Math.random() * card.options.length)];
            choices.push({ opt: r, side: 'auto' });
          } else {
            for (const o of card.options) choices.push({ opt: o, side: 'auto' });
          }
        } else {
          // confirm/input-only
          choices.push({ opt: { text: '(input)', tags: [] }, side: 'auto' });
        }

        const nextFrontier = [];
        for (const base of frontier) {
          for (const ch of choices) {
            const n = recordPick(base, layerName, card.id, ch.opt, ch.side);
            nextFrontier.push(n);
          }
        }
        frontier = nextFrontier;

        visited += frontier.length;
        if (visited >= cfg.maxPaths) { cutByCap = true; break; }
      }
      outSet.push(...frontier);
      if (visited >= cfg.maxPaths) break;
    }
    return outSet;
  }

  // L1 → L2
  let set = [mkRec()];
  set = stepLayer(L1, set, 'L1');
  if (visited >= cfg.maxPaths) return summarize(set);

  set = stepLayer(L2, set, 'L2');
  if (visited >= cfg.maxPaths) return summarize(set);

  // classify after L1/L2, decide probes
function emulateL3(recSet) {
  const out = [];
  for (const rec of recSet) {
    const cls = classifyFromTags(rec.tags);
    if (!cfg.includeL3 || cls.mode !== 'probe') {
      const fin = structuredClone(rec);
      fin.final = { ...cls, probesUsed: 0, steps: fin.picks.length };
      out.push(fin);
      continue;
    }

    let working = structuredClone(rec);
    let rounds = 0;
    let last = cls;

    if (DEBUG) {
      ensureDebug();
      WS_PROBE && WS_PROBE.write(JSON.stringify({
        pathIdHint: working.picks.map(p => `${p.layer}:${p.cardId}`).join('>'),
        stage: 'before',
        tagsCount: working.tags.length,
        classify: last
      }) + '\n');
    }

    while (rounds < 3 && last.mode === 'probe') {
      working.tags = applyProbeRound(working.tags, last.top);
      last = classifyFromTags(working.tags);
      rounds += 1;
    }

    if (DEBUG) {
      WS_PROBE && WS_PROBE.write(JSON.stringify({
        pathIdHint: working.picks.map(p => `${p.layer}:${p.cardId}`).join('>'),
        stage: 'after',
        tagsCount: working.tags.length,
        probesUsed: rounds,
        classify: last
      }) + '\n');
    }

    working.final = { ...last, probesUsed: rounds, steps: working.picks.length };
    out.push(working);
  }
  return out;
}

  set = emulateL3(set);
  if (visited >= cfg.maxPaths) return summarize(set);

  // L4 / L5 (optional)
  if (cfg.includeL4L5 && L4.length) set = stepLayer(L4, set, 'L4');
  if (visited >= cfg.maxPaths) return summarize(set);

  if (cfg.includeL4L5 && L5.length) set = stepLayer(L5, set, 'L5');

  return summarize(set);

  function summarize(finalSet) {
    const histogram = {};
    let probesSum = 0;

    const internalLabelHist = {};
    const tagsFreq = {};
    const unknownSamples = [];
    let unknownCount = 0;

    for (const r of finalSet) {
      if (!r.final) {
        const cls = classifyFromTags(r.tags);
        r.final = { ...cls, probesUsed: r.picks.filter(p => p.layer === 'L3').length, steps: r.picks.length };
      }

      // count internal labels
      internalLabelHist[r.final.dominant] = (internalLabelHist[r.final.dominant] || 0) + 1;

      // map internal label -> public emotions20 label
      let mapped = mapInternalToE20(r.final.dominant);
      if (!mapped) {
      // fallback: if dominant_internal did not match,
      // let's take the re-classification by tags that the engine can already do
      const re = classifyFromTags(r.tags); // это даёт эмоцию из emotions20
      if (re?.dominant) mapped = re.dominant;
      }
      mapped = mapped || 'unknown';

      r.final.mapped = mapped;

      histogram[mapped] = (histogram[mapped] || 0) + 1;
      probesSum += (r.final.probesUsed || 0);
      res.push(r);

      // tags vocab
      for (const t of r.tags) tagsFreq[t] = (tagsFreq[t] || 0) + 1;

      // collect unknown samples
      if (mapped === 'unknown' && unknownSamples.length < UNKNOWN_SAMPLES_LIMIT) {
          const tokens = splitLabelTokens(r.final.dominant || '');
          const tokenMaps = tokens.map(t => ({ t, norm: normalizeSingleToken(t) }));
          const scores = {};
          const re = classifyFromTags(r.tags);
          const top5 = (re?.top || []).slice(0,5);
        unknownSamples.push({
          dominant_internal: r.final.dominant,
          top: r.final.top,
          confidence: r.final.confidence,
          tags: r.tags.slice(-30), // last tags snapshot
          picks: r.picks.slice(-5).map(p => ({ layer: p.layer, id: p.cardId, side: p.side })),
          tokens,
          tokenMaps,
          reclass_top: top5
        });
      }
      if (mapped === 'unknown') unknownCount += 1;
    }

    const avgProbes = res.length ? probesSum / res.length : 0;

    // Coverage report (как было)
    const covered = new Set(Object.keys(histogram).filter(k => EMO20.includes(k)));
    const missing = EMO20.filter(k => !covered.has(k));

    // persist coverage + internals
    try {
      saveJSON(path.join(cfg.outDir, 'coverage.json'), { present: Array.from(covered).sort(), missing: missing.sort() });
      saveJSON(path.join(DEBUG_DIR, 'internal_label_histogram.json'), internalLabelHist);
      saveJSON(path.join(DEBUG_DIR, 'tags_vocab.json'), sortDesc(tagsFreq));
      if (unknownSamples.length) {
        ensureDebug();
        saveJSON(path.join(DEBUG_DIR, 'unknown_samples.head.json'), unknownSamples);
      }
    } catch (_) {}

    if (DEBUG && unknownCount) {
      ensureDebug();
      WS_UNKNOWN && WS_UNKNOWN.write(JSON.stringify({
        totalUnknown: unknownCount,
        sampleSaved: unknownSamples.length,
        hint: "Check mapping.internal-to-emotions20.json and mapInternalToE20() heuristics. Ensure emotions20 keys match."
      }) + '\n');
    }

    return { results: res, histogram: sortDesc(histogram), avgProbes, paths: res.length, visited, cutByCap };
  }
}

function sortDesc(obj) {
  return Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]));
}

function writeOutputs(outDir, sim) {
  ensureDir(outDir);

  fs.writeFileSync(
    path.join(outDir, 'summary.json'),
    JSON.stringify({
      histogram: sim.histogram,
      avgProbes: sim.avgProbes,
      paths: sim.paths,
      visitedPaths: sim.visited,
      cutByCap: sim.cutByCap,
    }, null, 2),
    'utf8'
  );

  const csv = [
    'label,count',
    Object.entries(sim.histogram).map(([k, v]) => `${JSON.stringify(k)},${v}`)
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'histogram.csv'), csv, 'utf8');

  const stream = fs.createWriteStream(path.join(outDir, 'paths.ndjson'), { encoding: 'utf8' });
  for (const r of sim.results) stream.write(JSON.stringify(r) + '\n');
  stream.end();

  console.log('✅ Simulation complete:');
  console.log(`- Summary:   ${path.join(outDir, 'summary.json')}`);
  console.log(`- Histogram: ${path.join(outDir, 'histogram.csv')}`);
  console.log(`- Paths:     ${path.join(outDir, 'paths.ndjson')}`);
  try { WS_PAIRS && WS_PAIRS.end(); } catch (_) {}
  try { WS_PROBE && WS_PROBE.end(); } catch (_) {}
  try { WS_UNKNOWN && WS_UNKNOWN.end(); } catch (_) {}
}

(function main() {
  const cfg = parseArgs();
  DEBUG = DEBUG || false;
  DEBUG_DIR = DEBUG_DIR || path.join(cfg.outDir, '_debug');
  ensureDir(cfg.outDir);
  const layers = loadLayers(cfg.inDir);
  const sim = simulate(cfg, layers);
  writeOutputs(cfg.outDir, sim);
})();
