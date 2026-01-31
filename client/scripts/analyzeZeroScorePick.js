// analyzeZeroScorePick.js
// STAB-04: Analyze zero_score_pick samples and generate a human-readable report.
// Comments in English only.

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function safeReadJsonLines(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const out = [];
    for (const line of lines) {
      try {
        out.push(JSON.parse(line));
      } catch (e) {
        console.warn(`[analyzeZeroScorePick] Skipping invalid JSONL line from ${filePath}: ${e.message}`);
      }
    }
    return out;
  } catch (e) {
    console.warn(`[analyzeZeroScorePick] File not found or unreadable: ${filePath}`);
    return [];
  }
}

function topNCounts(map, limit = 10) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

async function main() {
  const outDir = path.join(__dirname, 'out');
  let files = [];
  try {
    files = readdirSync(outDir)
      .filter((f) => f.startsWith('micro_fallback_samples_') && f.endsWith('.jsonl'));
  } catch (e) {
    console.warn(`[analyzeZeroScorePick] Output directory not readable: ${outDir}`);
  }

  const samples = [];
  for (const f of files) {
    const fullPath = path.join(outDir, f);
    const parsed = safeReadJsonLines(fullPath);
    samples.push(...parsed);
  }

  if (samples.length === 0) {
    console.log('[analyzeZeroScorePick] No samples found, writing empty report.');
  }

  const axisTagCounts = {};
  const macroCounts = {};
  const microKeyCounts = {};

  let totalSamples = 0;
  let emptyMatchedTagsCount = 0;

  for (const s of samples) {
    totalSamples += 1;

    const axisTags = Array.isArray(s.axisTags) ? s.axisTags : [];
    for (const t of axisTags) {
      axisTagCounts[t] = (axisTagCounts[t] || 0) + 1;
    }

    const macro = s.macroAfter || 'unknown';
    macroCounts[macro] = (macroCounts[macro] || 0) + 1;

    const topCand = s.microTopCandidate || {};
    const microKey = topCand.microKey || topCand.key || 'unknown';
    microKeyCounts[microKey] = (microKeyCounts[microKey] || 0) + 1;

    // "Пустые matchedTags" on topCandidate
    const matched = Array.isArray(topCand.matchedTags) ? topCand.matchedTags : [];
    if (matched.length === 0) {
      emptyMatchedTagsCount += 1;
    }
  }

  const axisTop = topNCounts(axisTagCounts, 10);
  const macroTop = topNCounts(macroCounts, 10);
  const microTop = topNCounts(microKeyCounts, 10);

  const emptyMatchedShare = totalSamples > 0
    ? ((emptyMatchedTagsCount / totalSamples) * 100).toFixed(2)
    : '0.00';

  let md = '# ZERO_SCORE_PICK_REPORT\n\n';
  if (files.length === 0) {
    md += 'Source: _no micro_fallback_samples_*.jsonl files found_\n\n';
  } else {
    md += 'Sources:\n\n';
    for (const f of files) {
      md += `- \`${path.join(outDir, f)}\`\n`;
    }
    md += '\n';
  }
  md += `Total samples: **${totalSamples}**\n`;
  md += `Share of samples with **empty matchedTags** on topCandidate: **${emptyMatchedShare}%**\n\n`;

  md += '## Top axisTags (top-10)\n\n';
  if (axisTop.length === 0) {
    md += '_No axisTags found._\n\n';
  } else {
    md += '| axisTag | count |\n|--------|-------|\n';
    for (const [tag, count] of axisTop) {
      md += `| ${tag} | ${count} |\n`;
    }
    md += '\n';
  }

  md += '## Top macroAfter (top-10)\n\n';
  if (macroTop.length === 0) {
    md += '_No macroAfter values found._\n\n';
  } else {
    md += '| macro | count |\n|-------|-------|\n';
    for (const [macro, count] of macroTop) {
      md += `| ${macro} | ${count} |\n`;
    }
    md += '\n';
  }

  md += '## Top microTopCandidate.microKey (top-10)\n\n';
  if (microTop.length === 0) {
    md += '_No microTopCandidate keys found._\n\n';
  } else {
    md += '| microKey | count |\n|----------|-------|\n';
    for (const [key, count] of microTop) {
      md += `| ${key} | ${count} |\n`;
    }
    md += '\n';
  }

  // ZS-REPORT-01: Add section for invalid tags (if TAGS-01 stats available)
  try {
    const { getInvalidTagsStats } = await import('../src/data/tagAliasMap.js');
    const invalidTagsStats = getInvalidTagsStats();
    if (invalidTagsStats.total > 0) {
      md += '## Most common raw tags that failed normalization (top-20)\n\n';
      md += `**Total invalid tag occurrences:** ${invalidTagsStats.total}\n\n`;
      if (invalidTagsStats.top20.length > 0) {
        md += '| Tag | Count | Sample Contexts |\n|-----|-------|----------------|\n';
        for (const { tag, count, sampleContexts } of invalidTagsStats.top20) {
          const contextsStr = sampleContexts
            .map(ctx => `${ctx.cardId || 'unknown'} (${ctx.flow || 'unknown'})`)
            .join('; ');
          md += `| \`${tag}\` | ${count} | ${contextsStr || 'N/A'} |\n`;
        }
        md += '\n';
      } else {
        md += '_No invalid tags tracked._\n\n';
      }
    }
  } catch (e) {
    // Stats not available (e.g., in production mode or if TAGS-01 not implemented)
    md += '## Most common raw tags that failed normalization\n\n';
    md += '_Tag normalization stats not available. Run with TAGS-01 implementation enabled._\n\n';
  }

  const outPath = path.join(__dirname, 'out', 'ZERO_SCORE_PICK_REPORT.md');
  writeFileSync(outPath, md, 'utf8');
  console.log(`[analyzeZeroScorePick] Report written to ${outPath}`);
}

main().catch((e) => {
  console.error('[analyzeZeroScorePick] Fatal error:', e);
  process.exit(1);
});

