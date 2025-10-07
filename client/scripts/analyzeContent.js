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
  const out = { dataDir: 'client/data', outDir: 'analysis', format: 'both' };
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
  (function walk(p) {
    for (const name of fs.readdirSync(p)) {
      const full = path.join(p, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile() && name.toLowerCase().endsWith('.json')) files.push(full);
    }
  })(dir);
  return files;
}

// Try to normalize different content shapes into a unified "cards" array
function extractCardsFromJson(json, file) {
  // Accept common shapes:
  // - { cards: [...] }
  // - [ ...cards ]
  // - { data: { cards: [...] } }
  // Each "card" expected fields (best-effort): id, layer, type, question, options[], routing
  const out = [];
  const pushIfCard = (c) => {
    if (c && typeof c === 'object') out.push(c);
  };

  const tryArrays = [];
  if (Array.isArray(json)) tryArrays.push(json);
  if (json && Array.isArray(json.cards)) tryArrays.push(json.cards);
  if (json && json.data && Array.isArray(json.data.cards)) tryArrays.push(json.data.cards);
  if (json && Array.isArray(json.questions)) tryArrays.push(json.questions);

  if (tryArrays.length === 0) {
    // Heuristic: if object keys look like ids -> values are cards
    const values = json && typeof json === 'object' ? Object.values(json) : [];
    if (values.every(v => typeof v === 'object')) {
      values.forEach(pushIfCard);
    }
  } else {
    tryArrays.forEach(arr => arr.forEach(pushIfCard));
  }

  if (out.length === 0) {
    console.warn(`[WARN] No cards found in ${file}`);
  }
  return out;
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
  // Build a graph of potential flows:
  // Node: card.id (label: "Layer X: question")
  // Edge: from card A -> card B if B.layer > A.layer and B.routing "might" be satisfied
  //
  // "Might" heuristic:
  // - If B.routing.showIf references a questionId that is unknown, skip
  // - If B.routing.showIf exists, we create dependency edges from that questionId to B
  // - If B.routing.showIfTagsAny exists, we connect from ANY previous-layer card to B (tag availability depends on options)
  //
  // Note: This is a static approximation (no runtime answers).
  const nodes = new Map(); // id -> node
  const edges = new Set(); // "from->to"

  const byId = new Map();
  cards.forEach(c => { if (c.id) byId.set(String(c.id), c); });

  cards.forEach(c => {
    const id = String(c.id || `card_${Math.random().toString(36).slice(2)}`);
    const layer = Number(c.layer ?? 0);
    const question = String(c.question || c.title || c.name || id);
    nodes.set(id, { id, layer, label: `L${layer}: ${question}` });
  });

  const prevLayers = (L) => cards.filter(x => Number(x.layer ?? 0) < L);

  cards.forEach(target => {
    const targetId = String(target.id || '');
    const L = Number(target.layer ?? 0);
    const routing = target.routing || {};
    const showIf = safeArray(routing.showIf);
    const showIfTagsAny = safeArray(routing.showIfTagsAny);

    // 1) showIf: create edges from referenced questionId(s) to target
    showIf.forEach(rule => {
      const qid = rule && rule.questionId ? String(rule.questionId) : null;
      if (!qid) return;
      if (!byId.has(qid)) return; // unknown question id
      edges.add(`${qid}->${targetId}`);
    });

    // 2) showIfTagsAny: connect from all previous-layer cards (tags can come from many places)
    if (showIfTagsAny.length > 0) {
      prevLayers(L).forEach(src => {
        const sid = String(src.id || '');
        if (sid && sid !== targetId) edges.add(`${sid}->${targetId}`);
      });
    }

    // 3) If no routing at all, connect from all previous-layer cards to indicate linear flow
    if (showIf.length === 0 && showIfTagsAny.length === 0 && L > 0) {
      prevLayers(L).forEach(src => {
        const sid = String(src.id || '');
        if (sid && sid !== targetId) edges.add(`${sid}->${targetId}`);
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

  files.forEach(file => {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const json = JSON.parse(raw);
      const cards = extractCardsFromJson(json, file);
      if (!cards.length) return;

      cards.forEach(card => {
        totalCards += 1;
        const id = card.id || null;
        if (!id) problems.cardsWithoutId.push({ file, card });

        const options = safeArray(card.options);
        totalOptions += options.length;

        options.forEach(opt => {
          const optText = String(opt?.text || '').trim();
          const tags = safeArray(opt?.tags).filter(Boolean);

          if (tags.length === 0) {
            problems.optionsWithoutTags.push({
              file,
              cardId: card.id || '(missing id)',
              question: String(card.question || card.title || card.name || '').slice(0, 120),
              optionText: optText.slice(0, 120),
            });
          } else {
            tags.forEach(t => tagFreq.set(t, (tagFreq.get(t) || 0) + 1));
          }
        });

        allCards.push(card);
      });
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
