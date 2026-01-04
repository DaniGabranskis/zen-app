// scripts/countEmotionPaths.cjs
// Exact combinatorics audit for L1 + L2 swipe flows.
// Comments in English only.
//
// What you get after running this script:
// - Exact number of unique swipe-paths (2^N) for L1+L2
// - Exact distribution of outcomes (single / mix / probe) from the evidence engine
// - Exact counts per dominant emotion (for single), and per (dominant|secondary) pair (for mix/probe)
// - A Markdown report + JSON/CSV outputs
// - Optional NDJSON(.gz) with per-path outcomes (disabled by default)
//
// Usage examples:
//   node scripts/countEmotionPaths.cjs --inDir src/data --outDir analysis/path_counts
//   node scripts/countEmotionPaths.cjs --emitPaths --maxEmitPaths 50000
//
// Notes:
// - This script intentionally uses the SAME TAG_RULES + thresholds from src/utils/evidenceEngine.js
//   by extracting them from the source file, so the audit stays aligned with the app.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pathToFileURL } = require('url');

function parseArgs(argv) {
  const args = {
    inDir: null,
    outDir: 'analysis/path_counts',
    emitPaths: false,
    maxEmitPaths: 0, // 0 = no limit; can create huge files
    temperature: 0.9,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--inDir') args.inDir = argv[++i];
    else if (a === '--outDir') args.outDir = argv[++i];
    else if (a === '--emitPaths') args.emitPaths = true;
    else if (a === '--maxEmitPaths') args.maxEmitPaths = Number(argv[++i] || '0');
    else if (a === '--temperature') args.temperature = Number(argv[++i] || '0.9');
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

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

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function extractConstNumber(src, name) {
  const re = new RegExp(`\\bconst\\s+${name}\\s*=\\s*([^;]+);`);
  const m = src.match(re);
  if (!m) throw new Error(`Failed to find const ${name} in evidenceEngine.js`);
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
      return src.slice(begin, end + 1);
    }
  }
  throw new Error(`Unbalanced braces while extracting ${constName}`);
}

async function importEsm(filePath) {
  const url = pathToFileURL(filePath).href;
  return import(url);
}

function toCsvRow(cells) {
  return cells.map((c) => {
    const s = String(c ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(',');
}

function trailingZeroes32(x) {
  // x is a 32-bit integer
  return Math.clz32(x & -x) ^ 31;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function formatPct(p) {
  const v = (p * 100);
  return `${v.toFixed(2)}%`;
}

function bitString(n, width) {
  let s = n.toString(2);
  while (s.length < width) s = '0' + s;
  return s;
}

function pickTopK(list, k) {
  return list
    .slice()
    .sort((a, b) => (b.confidence - a.confidence))
    .slice(0, k);
}

(async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log([
      'countEmotionPaths.cjs',
      '',
      'Flags:',
      '  --inDir <dir>           Base dir for flow JSON (default: auto-detect)',
      '  --outDir <dir>          Output directory (default: analysis/path_counts)',
      '  --emitPaths             Write per-path outcomes to NDJSON(.gz)',
      '  --maxEmitPaths <N>      Safety cap for emitPaths (0 = unlimited)',
      '  --temperature <float>   Softmax temperature (default: 0.9; should match app)',
      '',
    ].join('\n'));
    process.exit(0);
  }

  // Locate evidence engine source & emotionSpace
  const evidenceEnginePath = findProjectFile([
    'src/utils/evidenceEngine.js',
    'client/src/utils/evidenceEngine.js',
  ]);

  const emotionSpacePath = findProjectFile([
    'src/utils/emotionSpace.js',
    'client/src/utils/emotionSpace.js',
  ]);

  const engineSrc = fs.readFileSync(evidenceEnginePath, 'utf8');

  const config = {
    T_DOM: extractConstNumber(engineSrc, 'T_DOM'),
    T_MIX: extractConstNumber(engineSrc, 'T_MIX'),
    DELTA_MIX: extractConstNumber(engineSrc, 'DELTA_MIX'),
    DELTA_PROBE: extractConstNumber(engineSrc, 'DELTA_PROBE'),
    TEMPERATURE: args.temperature,
  };

  const tagRulesLiteral = extractObjectLiteral(engineSrc, 'TAG_RULES');
  // eslint-disable-next-line no-eval
  const TAG_RULES = eval(`(${tagRulesLiteral})`);

  const emotionSpace = await importEsm(emotionSpacePath);
  const { emptyState, clampState, rankEmotions } = emotionSpace;

  // Locate flow JSON
  const baseInDir = args.inDir
    ? path.resolve(process.cwd(), args.inDir)
    : null;

  const flowCandidates = baseInDir
    ? [
        path.join(baseInDir, 'flow', 'L1.json'),
        path.join(baseInDir, 'flow', 'L2.json'),
      ]
    : null;

  let l1Path = null;
  let l2Path = null;

  if (flowCandidates && fileExists(flowCandidates[0]) && fileExists(flowCandidates[1])) {
    l1Path = flowCandidates[0];
    l2Path = flowCandidates[1];
  } else {
    l1Path = findProjectFile([
      'src/data/flow/L1.json',
      'client/src/data/flow/L1.json',
      'src/data/flow/L1.json',
    ]);
    l2Path = findProjectFile([
      'src/data/flow/L2.json',
      'client/src/data/flow/L2.json',
      'src/data/flow/L2.json',
    ]);
  }

  const L1 = readJson(l1Path);
  const L2 = readJson(l2Path);

  const cards = [...L1, ...L2];

  // Validate: swipe with exactly 2 options
  const invalid = [];
  const optLabels = [];
  const optTags = []; // [ [tagsLeft, tagsRight], ... ]
  const cardIds = [];
  for (const c of cards) {
    if (!c || c.type !== 'swipe' || !Array.isArray(c.options) || c.options.length !== 2) {
      invalid.push(c?.id || '(missing id)');
      continue;
    }
    cardIds.push(c.id);
    optLabels.push([c.options[0].label, c.options[1].label]);
    optTags.push([c.options[0].tags || [], c.options[1].tags || []]);
  }

  if (invalid.length) {
    console.warn('[WARN] Some cards are not swipe with exactly 2 options; they are ignored:', invalid);
  }

  const N = cardIds.length;
  if (N === 0) throw new Error('No swipe cards found in L1/L2.');

  if (N > 26) {
    // 2^27 = 134M — still possible but can be slow. Guardrail.
    console.warn(`[WARN] You have ${N} binary cards (2^N paths). This may take a long time.`);
  }
  if (N > 30) {
    throw new Error(`Refusing to brute-force 2^${N} paths. Reduce scope or implement DP.`);
  }

  const totalPaths = 1 << N;

  ensureDir(args.outDir);

  // Precompute per-card delta vectors for left/right options.
  // We apply TAG_RULES for UNIQUE tags within the option.
  const DIM_KEYS = Object.keys(emptyState());
  function deltaFromTags(tagsArr) {
    const unique = Array.from(new Set(tagsArr));
    const d = {};
    for (const dim of DIM_KEYS) d[dim] = 0;
    for (const t of unique) {
      const rule = TAG_RULES[t];
      if (!rule) continue;
      for (const [dim, dv] of Object.entries(rule)) {
        d[dim] = (d[dim] ?? 0) + dv;
      }
    }
    return d;
  }

  const deltas = optTags.map(([t0, t1]) => [deltaFromTags(t0), deltaFromTags(t1)]);

  function addDelta(state, delta, sign = 1) {
    for (const dim of DIM_KEYS) {
      state[dim] = (state[dim] ?? 0) + sign * (delta[dim] ?? 0);
    }
  }

  function softmaxTop2(sortedScores) {
    // sortedScores is already sorted descending by score [{key, score}, ...]
    const temp = Math.max(config.TEMPERATURE, 0.1);
    const exps = sortedScores.map(({ score }) => Math.exp(score / temp));
    const denom = exps.reduce((a, b) => a + b, 0) + 1e-6;
    const p1 = exps[0] / denom;
    const p2 = exps[1] / denom;
    return { p1, p2, denom, exps };
  }

  function decideMode(top1, p1, top2, p2) {
    const delta = p1 - p2;
    const base = {
      dominant: top1 || 'unknown',
      secondary: top2 || null,
      confidence: p1 || 0,
      delta,
      mode: 'single',
    };

    if (p1 >= config.T_DOM) return { ...base, mode: 'single' };
    if (p1 >= config.T_MIX && delta < config.DELTA_MIX && top2) return { ...base, mode: 'mix' };
    if (delta < config.DELTA_PROBE && top2) return { ...base, mode: 'probe' };
    return { ...base, mode: 'single' };
  }

  function classifyState(state) {
    const clamped = clampState(state);
    const ranked = rankEmotions(clamped); // sorted
    const top1 = ranked[0]?.key || 'unknown';
    const top2 = ranked[1]?.key || null;
    const { p1, p2 } = softmaxTop2(ranked);
    return decideMode(top1, p1, top2, p2);
  }

  // Counters
  const counts = {
    totalPaths,
    modes: { single: 0, mix: 0, probe: 0 },
    singleDominant: {},
    mixPairs: {},
    probePairs: {},
  };

  // Per-card influence: for each card and side, count dominant emotions for SINGLE only.
  const influence = cardIds.map(() => ({
    left: {},
    right: {},
    leftTotal: 0,
    rightTotal: 0,
  }));

  // Keep top-K most confident paths per final key.
  const TOP_K = 8;
  const topPaths = {}; // key -> [{confidence, pathBits, choices:[{id,label}...]}]

  function pushTop(key, item) {
    if (!topPaths[key]) topPaths[key] = [];
    const arr = topPaths[key];
    arr.push(item);
    arr.sort((a, b) => b.confidence - a.confidence);
    if (arr.length > TOP_K) arr.length = TOP_K;
  }

  // Optional per-path emission
  let ndjsonStream = null;
  let gzipStream = null;
  let emitted = 0;
  if (args.emitPaths) {
    const outPath = path.join(args.outDir, 'paths.ndjson.gz');
    gzipStream = zlib.createGzip({ level: 6 });
    ndjsonStream = fs.createWriteStream(outPath);
    gzipStream.pipe(ndjsonStream);
    console.log(`[INFO] Writing per-path outcomes to ${outPath}`);
  }

  // Enumerate paths using Gray code for efficiency.
  let prevGray = 0;
  let state = emptyState(); // all-left path initially (gray=0 => choose option 0 for all cards)
  // Start state = sum of option0 deltas
  for (let i = 0; i < N; i++) addDelta(state, deltas[i][0], +1);

  // Helper to materialize choices only when needed (top paths / emitPaths)
  function materializeChoices(gray) {
    const res = [];
    for (let i = 0; i < N; i++) {
      const bit = (gray >> i) & 1;
      res.push({ id: cardIds[i], label: optLabels[i][bit] });
    }
    return res;
  }

  for (let k = 0; k < totalPaths; k++) {
    const gray = k ^ (k >> 1);

    if (k !== 0) {
      const diff = gray ^ prevGray;
      const idx = trailingZeroes32(diff);
      const prevBit = (prevGray >> idx) & 1;
      const newBit = (gray >> idx) & 1;

      // Remove old option delta and add new option delta
      addDelta(state, deltas[idx][prevBit], -1);
      addDelta(state, deltas[idx][newBit], +1);

      prevGray = gray;
    }

    const decision = classifyState(state);

    counts.modes[decision.mode] = (counts.modes[decision.mode] || 0) + 1;

    if (decision.mode === 'single') {
      counts.singleDominant[decision.dominant] = (counts.singleDominant[decision.dominant] || 0) + 1;
    } else if (decision.mode === 'mix') {
      const key = `${decision.dominant}|${decision.secondary || ''}`;
      counts.mixPairs[key] = (counts.mixPairs[key] || 0) + 1;
    } else if (decision.mode === 'probe') {
      const key = `${decision.dominant}|${decision.secondary || ''}`;
      counts.probePairs[key] = (counts.probePairs[key] || 0) + 1;
    }

    // Influence counters (single only)
    if (decision.mode === 'single') {
      for (let i = 0; i < N; i++) {
        const bit = (gray >> i) & 1;
        const side = bit === 0 ? 'left' : 'right';
        influence[i][`${side}Total`] += 1;
        const m = influence[i][side];
        m[decision.dominant] = (m[decision.dominant] || 0) + 1;
      }
    }

    // Track top paths per outcome key (dominant for single, pair for mix/probe)
    const outKey = decision.mode === 'single'
      ? decision.dominant
      : `${decision.mode}:${decision.dominant}|${decision.secondary || ''}`;

    pushTop(outKey, {
      confidence: decision.confidence,
      pathBits: bitString(gray, N),
      choices: null, // filled lazily for report
    });

    // Optional per-path output (bounded)
    if (args.emitPaths) {
      emitted += 1;
      if (args.maxEmitPaths > 0 && emitted > args.maxEmitPaths) {
        // Stop emitting but continue counting
      } else {
        const rec = {
          path: bitString(gray, N),
          mode: decision.mode,
          dominant: decision.dominant,
          secondary: decision.secondary,
          confidence: decision.confidence,
          delta: decision.delta,
        };
        gzipStream.write(JSON.stringify(rec) + '\n');
      }
    }
  }

  if (args.emitPaths) {
    gzipStream.end();
    await new Promise((resolve) => ndjsonStream.on('close', resolve));
  }

  // Enrich top paths with choices
  for (const [k, list] of Object.entries(topPaths)) {
    for (const item of list) item.choices = materializeChoices(parseInt(item.pathBits, 2));
  }

  // Write JSON outputs
  fs.writeFileSync(path.join(args.outDir, 'counts.json'), JSON.stringify(counts, null, 2), 'utf8');
  fs.writeFileSync(path.join(args.outDir, 'topPaths.json'), JSON.stringify(topPaths, null, 2), 'utf8');
  fs.writeFileSync(path.join(args.outDir, 'config.json'), JSON.stringify({
    ...config,
    evidenceEnginePath,
    emotionSpacePath,
    l1Path,
    l2Path,
    cards: cardIds,
  }, null, 2), 'utf8');

  // CSV: single dominant counts
  const singleRows = Object.entries(counts.singleDominant)
    .sort((a, b) => b[1] - a[1])
    .map(([emotion, n]) => ({ emotion, n, share: n / counts.modes.single }));

  const csvPath = path.join(args.outDir, 'singleDominant.csv');
  const csv = [
    toCsvRow(['emotion', 'paths', 'share_of_single']),
    ...singleRows.map((r) => toCsvRow([r.emotion, r.n, r.share])),
  ].join('\n');
  fs.writeFileSync(csvPath, csv, 'utf8');

  // Markdown report
  const reportLines = [];

  reportLines.push('# L1+L2 Path Audit');
  reportLines.push('');
  reportLines.push(`- Evidence engine source: \`${evidenceEnginePath}\``);
  reportLines.push(`- Flow files: \`${l1Path}\`, \`${l2Path}\``);
  reportLines.push(`- Cards audited: **${N}** (binary swipe)`);
  reportLines.push(`- Total paths: **${totalPaths.toLocaleString()}**`);
  reportLines.push('');
  reportLines.push('## Thresholds');
  reportLines.push('');
  reportLines.push(`- T_DOM: ${config.T_DOM}`);
  reportLines.push(`- T_MIX: ${config.T_MIX}`);
  reportLines.push(`- DELTA_MIX: ${config.DELTA_MIX}`);
  reportLines.push(`- DELTA_PROBE: ${config.DELTA_PROBE}`);
  reportLines.push(`- Softmax temperature: ${config.TEMPERATURE}`);
  reportLines.push('');
  reportLines.push('## Outcome modes');
  reportLines.push('');
  const modeTotal = totalPaths;
  for (const m of ['single', 'mix', 'probe']) {
    const n = counts.modes[m] || 0;
    reportLines.push(`- ${m}: **${n.toLocaleString()}** (${formatPct(n / modeTotal)})`);
  }
  reportLines.push('');
  reportLines.push('## Single mode: dominant emotions');
  reportLines.push('');
  reportLines.push('| Emotion | Paths | Share of single |');
  reportLines.push('|---|---:|---:|');
  for (const r of singleRows) {
    reportLines.push(`| ${r.emotion} | ${r.n.toLocaleString()} | ${formatPct(r.share)} |`);
  }

  function renderPairTable(title, pairsObj) {
    const rows = Object.entries(pairsObj).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return;
    reportLines.push('');
    reportLines.push(`## ${title}`);
    reportLines.push('');
    reportLines.push('| Pair | Paths | Share |');
    reportLines.push('|---|---:|---:|');
    const denom = rows.reduce((a, [, v]) => a + v, 0);
    for (const [pair, n] of rows.slice(0, 50)) {
      reportLines.push(`| ${pair} | ${n.toLocaleString()} | ${formatPct(n / denom)} |`);
    }
    if (rows.length > 50) reportLines.push(`\n_Only top 50 shown. Full data in counts.json._`);
  }

  renderPairTable('Mix mode: dominant|secondary', counts.mixPairs);
  renderPairTable('Probe mode: dominant|secondary', counts.probePairs);

  reportLines.push('');
  reportLines.push('## Top paths (most confident)');
  reportLines.push('');
  reportLines.push('_For each outcome key we keep the top paths by confidence._');
  reportLines.push('');

  const topKeys = Object.keys(topPaths).sort((a, b) => {
    const ca = topPaths[a][0]?.confidence || 0;
    const cb = topPaths[b][0]?.confidence || 0;
    return cb - ca;
  });

  for (const key of topKeys.slice(0, 40)) {
    reportLines.push(`### ${key}`);
    reportLines.push('');
    const list = pickTopK(topPaths[key], TOP_K);
    for (const item of list) {
      reportLines.push(`- confidence=${item.confidence.toFixed(4)} path=${item.pathBits}`);
    }
    reportLines.push('');
  }

  // Influence report (compact): per card, show top 3 emotions for left vs right
  reportLines.push('## Per-card influence (single only)');
  reportLines.push('');
  reportLines.push('_Counts are computed only on outcomes in **single** mode._');
  reportLines.push('');
  reportLines.push('| Card | Left: top emotions | Right: top emotions |');
  reportLines.push('|---|---|---|');

  function top3(map) {
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} (${v})`)
      .join(', ');
  }

  for (let i = 0; i < N; i++) {
    reportLines.push(`| ${cardIds[i]} | ${top3(influence[i].left)} | ${top3(influence[i].right)} |`);
  }

  fs.writeFileSync(path.join(args.outDir, 'report.md'), reportLines.join('\n'), 'utf8');

  // Write influence JSON (raw)
  fs.writeFileSync(path.join(args.outDir, 'influence.json'), JSON.stringify(influence, null, 2), 'utf8');

  console.log('[DONE] Wrote outputs to:', args.outDir);
  console.log('- counts.json');
  console.log('- report.md');
  console.log('- singleDominant.csv');
  console.log('- topPaths.json');
  if (args.emitPaths) console.log('- paths.ndjson.gz');
})().catch((err) => {
  console.error('[ERROR]', err && err.stack ? err.stack : err);
  process.exit(1);
});