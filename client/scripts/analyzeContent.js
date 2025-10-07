// client/scripts/analyzeContent.js
// Usage:
//   node client/scripts/analyzeContent.js --data client/data --out analysis --format both
//
// What it does:
// 1) Loads all *.json under --data
// 2) Extracts cards/questions with options, tags, emotions, routing
// 3) Produces counts (cards, options, unique tags, tag frequency)
// 4) Finds options with missing or empty tags
// 5) Builds a potential flow graph across layers and routing (best-effort static analysis)
// 6) Writes:
//    - report.md (human-readable summary)
//    - graph.mmd (Mermaid flowchart)
//    - graph.dot (Graphviz DOT)
//    - tags.csv (tag frequencies)
//    - problems.json (options without tags etc.)

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dataDir: 'src/data', outDir: 'analysis', format: 'both' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--data' && args[i + 1]) out.dataDir = args[++i];
    else if (a === '--out' && args[i + 1]) out.outDir = args[++i];
    else if (a === '--format' && args[i + 1]) out.format = args[++i]; // "mermaid" | "dot" | "both"
  }
  return out;
}

function readJsonFilesRecursive(dir) {
  const files = [];
  const IGNORES = new Set([
    'node_modules', '.git', '.expo', 'analysis', 'dist', 'build', 'android', 'ios'
  ]);

  (function walk(p) {
    for (const name of fs.readdirSync(p)) {
      if (IGNORES.has(name)) continue;
      const full = path.join(p, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (stat.isFile() && name.toLowerCase().endsWith('.json')) {
        files.push(full);
      }
    }
  })(dir);

  return files;
}

// Normalize diverse card shapes into a single shape we can analyze:
// - swipe: leftOption/rightOption OR options: { "text": ["tag1","tag2"] }
// - choice: options: [{ text, tags }]
// - input: no options
// - step-based (L3 confirm/branch): parse branch options with tags
function normalizeCard(raw, layer) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id ? String(raw.id) : null;
  if (!id) return null;

  const options = [];

  // swipe (ZenDataExtend): left/right option
  if (raw.leftOption || raw.rightOption) {
    if (raw.leftOption) {
      options.push({
        text: String(raw.leftOption.text || '').trim(),
        tags: safeArray(raw.leftOption.tags).filter(Boolean),
        next: raw.leftOption.next || null,
      });
    }
    if (raw.rightOption) {
      options.push({
        text: String(raw.rightOption.text || '').trim(),
        tags: safeArray(raw.rightOption.tags).filter(Boolean),
        next: raw.rightOption.next || null,
      });
    }
  }

  // swipe (SwipeData): options is an object { "Option text": ["Tag1","Tag2"] }
  if (!options.length && raw.options && typeof raw.options === 'object' && !Array.isArray(raw.options)) {
    Object.entries(raw.options).forEach(([text, tags]) => {
      options.push({ text: String(text || '').trim(), tags: safeArray(tags).filter(Boolean) });
    });
  }

  // choice: options is an array
  if (Array.isArray(raw.options)) {
    raw.options.forEach(o => {
      if (!o) return;
      const text = typeof o === 'string' ? o : String(o.text || '').trim();
      const tags = typeof o === 'string' ? [] : safeArray(o.tags).filter(Boolean);
      options.push({ text, tags });
    });
  }

  // step-based branching (SwipeData L3 / ZenDataExtend L3): only branch carries tag arrays
  if (Array.isArray(raw.step)) {
    raw.step.forEach(step => {
      if (step && step.type === 'branch' && step.options && typeof step.options === 'object') {
        Object.entries(step.options).forEach(([text, tags]) => {
          options.push({ text: String(text || '').trim(), tags: safeArray(tags).filter(Boolean) });
        });
      }
      // NOTE: we intentionally skip "confirm" (token-like) and "exit" (no tags) steps
    });
  }

  // routing normalization
  const routing = {};
  if (raw.showIf && typeof raw.showIf === 'object' && !Array.isArray(raw.showIf)) {
    // showIf is like: { "QID": ["Acceptable Answer 1", ...] }
    routing.showIf = raw.showIf;
  }
  if (Array.isArray(raw.showIfTags)) {
    routing.showIfTagsAny = raw.showIfTags;
  }

  // collect next ids from per-option "next"
  const nextIds = Array.from(new Set(options.map(o => o.next).filter(Boolean)));

  return {
    id,
    layer: Number(layer || 0),
    type: raw.type || (raw.leftOption || raw.rightOption ? 'swipe'
          : (Array.isArray(raw.options) ? 'choice'
          : (raw.question || raw.text) ? 'input' : 'unknown')),
    question: String(raw.text || raw.question || '').trim(),
    options,
    routing,
    nextIds,
  };
}

// Extract structured data depending on known shapes:
// - ZenDataExtend/SwipeData: { L1: [...], L2: [...], ... }
// - QuestionBlockData: { id: [strings] }
// - emotionDetails: [ { group, display, ... } ]
// - tagGroups: { groups: {...}, ... }
function extractData(json, file) {
  const result = { cards: [], qbBlocks: [], meta: {} };
  const pushCard = (c) => { if (c && c.id) result.cards.push(c); };

  // A) Level-based structures: L1..L5 arrays of cards
  if (json && typeof json === 'object') {
    const levelKeys = Object.keys(json).filter(k => /^L\d+$/i.test(k) && Array.isArray(json[k]));
    if (levelKeys.length > 0) {
      levelKeys.forEach(levelKey => {
        const layer = Number(levelKey.slice(1));
        json[levelKey].forEach(raw => {
          const c = normalizeCard(raw, layer);
          if (c) pushCard(c);
        });
      });
      return result;
    }
  }

  // B) QuestionBlockData: object of id -> array of strings
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const values = Object.values(json);
    if (values.length && values.every(v => Array.isArray(v) && v.every(x => typeof x === 'string'))) {
      result.qbBlocks = Object.keys(json).map(id => ({ id: String(id), options: json[id] }));
      return result;
    }
  }

  // C) emotionDetails: array of objects with "group"/"display"
  if (Array.isArray(json) && json.length && typeof json[0] === 'object' && 'group' in json[0] && 'display' in json[0]) {
    result.meta.emotions = json.length;
    return result;
  }

  // D) tagGroups: not cards; optionally collect groups count
  if (json && typeof json === 'object' && (json.groups || json.Groups)) {
    const g = json.groups || json.Groups;
    result.meta.tagGroups = g && typeof g === 'object' ? Object.keys(g).length : 0;
    return result;
  }

  // Unknown / ignore
  return result;
}


function toTitle(s) {
  return String(s || '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildGraph(cards) {
  // Nodes: card.id, label: "Lx: question"
  // Edges: 
  //   - from showIf: QID -> target
  //   - from showIfTagsAny: connect all previous-layer cards to target (heuristic)
  //   - from nextIds: source -> listed next ids
  const nodes = new Map();
  const edges = new Set();

  const byId = new Map();
  cards.forEach(c => byId.set(c.id, c));

  cards.forEach(c => {
    const q = c.question || c.id;
    nodes.set(c.id, { id: c.id, layer: c.layer, label: `L${c.layer}: ${q}` });
  });

  const prevLayers = (L) => cards.filter(x => Number(x.layer ?? 0) < L);

  cards.forEach(target => {
    const targetId = target.id;
    const L = target.layer;
    const routing = target.routing || {};
    const showIfObj = routing.showIf || {}; // object: { QID: [answers...] }
    const showIfTagsAny = safeArray(routing.showIfTagsAny);

    // 1) showIf -> edges from referenced question ids
    Object.keys(showIfObj).forEach(qid => {
      if (byId.has(qid)) edges.add(`${qid}->${targetId}`);
    });

    // 2) showIfTagsAny -> edges from all prior-layer cards (tags can come from many places)
    if (showIfTagsAny.length > 0) {
      prevLayers(L).forEach(src => {
        if (src.id !== targetId) edges.add(`${src.id}->${targetId}`);
      });
    }

    // 3) nextIds (explicit next pointers on options)
    safeArray(target.nextIds).forEach(nid => {
      if (byId.has(nid)) edges.add(`${targetId}->${nid}`);
    });

    // 4) If no routing and no next, connect linearly from all prior-layer cards
    if (Object.keys(showIfObj).length === 0 && showIfTagsAny.length === 0 && (!target.nextIds || target.nextIds.length === 0) && L > 0) {
      prevLayers(L).forEach(src => {
        if (src.id !== targetId) edges.add(`${src.id}->${targetId}`);
      });
    }
  });

  return { nodes: Array.from(nodes.values()), edges: Array.from(edges) };
}

function renderMermaid(nodes, edges) {
  // Flowchart TD by default
  const lines = ['flowchart TD'];
  // Node lines
  nodes.forEach(n => {
    const safeId = n.id.replace(/[^A-Za-z0-9_]/g, '_');
    const label = n.label.replace(/"/g, '\\"');
    lines.push(`  ${safeId}["${label}"]`);
  });
  // Edge lines
  edges.forEach(e => {
    const [from, to] = e.split('->');
    const f = from.replace(/[^A-Za-z0-9_]/g, '_');
    const t = to.replace(/[^A-Za-z0-9_]/g, '_');
    lines.push(`  ${f} --> ${t}`);
  });
  return lines.join('\n');
}

function renderDot(nodes, edges) {
  const lines = ['digraph ZenFlow {', '  rankdir=LR;', '  node [shape=box, fontsize=10];'];
  nodes.forEach(n => {
    const id = n.id.replace(/[^A-Za-z0-9_]/g, '_');
    const label = n.label.replace(/"/g, '\\"');
    lines.push(`  ${id} [label="${label}"];`);
  });
  edges.forEach(e => {
    const [from, to] = e.split('->');
    const f = from.replace(/[^A-Za-z0-9_]/g, '_');
    const t = to.replace(/[^A-Za-z0-9_]/g, '_');
    lines.push(`  ${f} -> ${t};`);
  });
  lines.push('}');
  return lines.join('\n');
}

(function main() {
  const { dataDir, outDir, format } = parseArgs();

  if (!fs.existsSync(dataDir)) {
    console.error(`[ERROR] Data directory not found: ${dataDir}`);
    console.error(`[INFO] CWD: ${process.cwd()}`);
    console.error(`[TIP] From /client use:  node scripts/analyzeContent.js --data src/data --out analysis --format both`);
    process.exit(1);
  }
  ensureDir(outDir);

  const files = readJsonFilesRecursive(dataDir);
  if (files.length === 0) {
    console.warn(`[WARN] No JSON files found in ${dataDir}`);
  }

  const allCards = [];
  const problems = { optionsWithoutTags: [], cardsWithoutId: [] };
  const tagFreq = new Map();
  let totalCards = 0;
  let totalOptions = 0;

  // Extra stats for QuestionBlockData
  let qbQuestions = 0;
  let qbOptionsTotal = 0;

  files.forEach(file => {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const json = JSON.parse(raw);

      const { cards, qbBlocks } = extractData(json, file);

      // Count QuestionBlockData (do not treat as cards)
      if (qbBlocks && qbBlocks.length) {
        qbQuestions += qbBlocks.length;
        qbBlocks.forEach(b => { qbOptionsTotal += b.options.length; });
      }

      // Count cards and options/tags
      if (cards && cards.length) {
        cards.forEach(card => {
          totalCards += 1;

          if (!card.id) {
            problems.cardsWithoutId.push({ file, card });
            return;
          }

          // options
          const opts = safeArray(card.options);
          totalOptions += opts.length;

          opts.forEach(opt => {
            const tags = safeArray(opt.tags).filter(Boolean);
            if (tags.length === 0) {
              // Only consider "missing tags" for swipe/choice; skip input/confirm-like options
              if (card.type === 'swipe' || card.type === 'choice') {
                problems.optionsWithoutTags.push({
                  file,
                  cardId: card.id,
                  question: card.question.slice(0, 120),
                  optionText: String(opt.text || '').slice(0, 120),
                });
              }
            } else {
              tags.forEach(t => tagFreq.set(t, (tagFreq.get(t) || 0) + 1));
            }
          });

          allCards.push(card);
        });
      }
    } catch (e) {
      console.error(`[ERROR] Failed to parse ${file}: ${e.message}`);
    }
  });

  // Build graph
  const graph = buildGraph(allCards);
  const nodes = graph.nodes.sort((a, b) => (a.layer - b.layer) || a.id.localeCompare(b.id));
  const edges = graph.edges;

  // Render formats
  if (format === 'mermaid' || format === 'both') {
    const mermaid = renderMermaid(nodes, edges);
    fs.writeFileSync(path.join(outDir, 'graph.mmd'), mermaid, 'utf8');
  }
  if (format === 'dot' || format === 'both') {
    const dot = renderDot(nodes, edges);
    fs.writeFileSync(path.join(outDir, 'graph.dot'), dot, 'utf8');
  }

  // tags.csv
  const tagsCsv = ['tag,count', ...Array.from(tagFreq.entries()).sort((a, b) => b[1] - a[1]).map(([t, c]) => `${JSON.stringify(t)},${c}`)].join('\n');
  fs.writeFileSync(path.join(outDir, 'tags.csv'), tagsCsv, 'utf8');

  // problems.json
  fs.writeFileSync(path.join(outDir, 'problems.json'), JSON.stringify(problems, null, 2), 'utf8');

  // report.md
  const uniqueTags = tagFreq.size;
  const topTags = Array.from(tagFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const report = `
# Zen Content Report

**Data directory:** \`${dataDir}\`  
**Scanned JSON files:** ${files.length}  
**Cards found:** ${totalCards}  
**Options found:** ${totalOptions}  
**Unique tags:** ${uniqueTags}

---

## Top 20 tags
${topTags.map(([t, c], i) => `${i + 1}. \`${t}\` — ${c}`).join('\n') || '_no tags found_'}

---

## Problems
- Options without tags: **${problems.optionsWithoutTags.length}**
- Cards without id: **${problems.cardsWithoutId.length}**

See \`problems.json\` for details.

---

## Flowchart artifacts
- Mermaid: \`graph.mmd\`
- Graphviz DOT: \`graph.dot\`

> Tip:
> - Preview Mermaid online (paste \`graph.mmd\` into a Mermaid live editor) or use VSCode Mermaid extension.
> - To render DOT locally: \`dot -Tpng analysis/graph.dot -o analysis/graph.png\`.
`.trim() + '\n';

  fs.writeFileSync(path.join(outDir, 'report.md'), report, 'utf8');

  console.log('✅ Analysis complete.');
  console.log(`- Report:        ${path.join(outDir, 'report.md')}`);
  if (format === 'mermaid' || format === 'both') console.log(`- Mermaid:       ${path.join(outDir, 'graph.mmd')}`);
  if (format === 'dot' || format === 'both') console.log(`- Graphviz DOT:  ${path.join(outDir, 'graph.dot')}`);
  console.log(`- Tags CSV:      ${path.join(outDir, 'tags.csv')}`);
  console.log(`- Problems JSON: ${path.join(outDir, 'problems.json')}`);
})();
