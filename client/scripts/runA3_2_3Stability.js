// runA3_2_3Stability.js
// A3.2.3: Full stability test (50k × 3 seeds + fixed)
// 2.1: Manifest generation (commit hash, config, timestamp)
// 2.2: Auto-validation after each run
// 2.3: Stability summary table

import { spawn } from 'child_process';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { validateReportOrThrow } from './utils/validateReport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TASK 14.6: Parse smoke mode flag
const isSmoke = process.argv.includes('--smoke');
const runsCount = isSmoke ? 5000 : 50000;

const commonArgs = [
  '--flow', 'deep-realistic',
  '--mode', 'noisy-mixed',
  '--runs', String(runsCount),
  '--outDir', './scripts/out',
  '--maxL1', '5', '--maxL2', '5',
  '--minL1', '3', '--minL2', '2',
  '--stopOnGates', '1',
  '--notSureRate', '0.2',
  '--profile', 'mix',
];

const seeds = [42, 1337, 2025];

function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD', { cwd: path.join(__dirname, '..'), encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function readJson(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeManifest(outDir, flow, seed, config) {
  const baselineSampler = flow === 'fixed' ? 'fixed-control' : 'grid';
  const manifest = {
    flow,
    mode: config.mode ?? 'noisy-mixed',
    runs: config.runs ?? 50000,
    seed,
    maxL1: config.maxL1 ?? 5,
    maxL2: config.maxL2 ?? 5,
    minL1: config.minL1 ?? 3,
    minL2: config.minL2 ?? 2,
    stopOnGates: config.stopOnGates !== false,
    notSureRate: config.notSureRate ?? 0.2,
    profile: config.profile ?? 'mix',
    baselineSampler,
    gitCommit: getGitCommit(),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  };
  
  const manifestPath = path.join(outDir, `manifest_${flow}_seed${seed}.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`   📄 Manifest saved: ${manifestPath}`);
}

async function runCommand(args, description) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['scripts/checkDeepBalance.js', ...args], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${description || 'Command'} failed with code ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function validateReport(reportPath, description) {
  // TASK 14.3: Schema-first validation
  const report = readJson(reportPath);
  validateReportOrThrow(report);
  
  // TASK 14.3: Fail-fast check for engine type
  const engine = report?.metadata?.engine;
  const flow = report?.metadata?.flow || report?.metadata?.effectiveFlow;
  
  if ((flow === 'deep-realistic' || flow === 'fixed') && engine !== 'runner') {
    throw new Error(`[TASK 14.3] ${description}: Flow "${flow}" must use runner engine, but report has engine="${engine}".`);
  }
  
  if (!engine) {
    throw new Error(`[TASK 14.3] ${description}: Report missing required metadata.engine field.`);
  }
  
  // TASK 14.3: Run Step0 validation
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['scripts/checkStep0Results.js', reportPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${description}: Step0 validation failed`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function validateSanity(reportPath, description) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['scripts/checkSanityResults.js', reportPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${description}: Sanity validation failed`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// TASK 14.4: Enhanced stability summary generation
function generateStabilitySummary(outDir) {
  const results = [];
  const fixedResults = [];
  const fallbackReasonAgg = {};
  const endedReasonAgg = {};
  
  // TASK 14.4: Load deep-realistic runs
  for (const seed of seeds) {
    const patterns = [
      `deep_balance_noisy_mixed_deep-realistic_seed${seed}.json`,
      `deep_balance_noisy_mixed_seed${seed}.json`,
    ];
    
    let report = null;
    for (const pattern of patterns) {
      const reportPath = path.join(outDir, pattern);
      try {
        report = readJson(reportPath);
        break;
      } catch {
        // Try next pattern
      }
    }
    
    if (report) {
      // TASK 14.3: Verify engine type
      const engine = report?.metadata?.engine;
      if (engine !== 'runner') {
        console.warn(`[TASK 14.3] Warning: Report for seed ${seed} has engine="${engine}", expected "runner"`);
      }
      
      const dr = report.derived?.deepRealistic || {};
      const derived = report.derived || {};
      // NOTE: report.derived.* rates are stored as PERCENT (0..100), not ratios.
      const fallbackRatePct = Number(derived.microFallbackRate || 0);
      const zeroScorePickRatePct = Number(derived.microZeroScorePickRate || 0);
      const scoringTagsEmptyRatePct = Number(derived.scoringTagsEmptyRate || 0);

      // TASK D/E: Aggregate fallback reasons from report (counts)
      const fallbackReasonBreakdown = derived.fallbackReasonBreakdown || {};
      for (const [reason, count] of Object.entries(fallbackReasonBreakdown)) {
        fallbackReasonAgg[reason] = (fallbackReasonAgg[reason] || 0) + Number(count || 0);
      }
      
      const gateRates = dr.gateHitRatesCardsOnly || dr.gateHitCardsOnlyRates || {};
      const coreGates = ['valence', 'arousal', 'agency', 'clarity'];
      const coreGateRates = coreGates.map(g => {
        const rate = gateRates[g];
        if (typeof rate === 'number') return rate * 100;
        if (typeof rate === 'string') return parseFloat(rate) || 0;
        return 0;
      });
      
      // TASK D: endedReason lives in dr.endedReasons (counts), not endedReasonBreakdown
      const endedReasons = dr.endedReasons || dr.endedReasonCounts || dr.endedReasonBreakdown || {};
      const totalEndedReasons = Object.values(endedReasons).reduce((a, b) => a + Number(b || 0), 0);
      const topEndedReason = Object.entries(endedReasons).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || ['unknown', 0];

      // Aggregate ended reasons across seeds
      for (const [reason, count] of Object.entries(endedReasons)) {
        endedReasonAgg[reason] = (endedReasonAgg[reason] || 0) + Number(count || 0);
      }
      
      const macroDist = dr.macroDistributionFlat || {};
      const top3Macros = Object.entries(macroDist).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
      
      results.push({
        seed,
        flow: 'deep-realistic',
        fallbackRate: fallbackRatePct,
        microFallbackRate: Number(derived.microFallbackRate ?? fallbackRatePct),
        microZeroScorePickRate: zeroScorePickRatePct,
        scoringTagsEmptyRate: scoringTagsEmptyRatePct,
        // Macro fallback is not used in this pipeline; keep explicit 0 so we can see it's not the source.
        macroFallbackRate: 0,
        topFallbackReasons: Object.entries(fallbackReasonBreakdown)
          .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
          .slice(0, 3)
          .map(([reason, count]) => ({ reason, count: Number(count || 0) })),
        askedL2Avg: dr.askedL2?.avg || 0,
        coreGateRates,
        topEndedReason: topEndedReason[0],
        topEndedReasonPct: totalEndedReasons > 0 ? ((topEndedReason[1] / totalEndedReasons) * 100).toFixed(1) : '0.0',
        top3Macros,
        engine: report?.metadata?.engine || 'unknown',
      });
    }
  }
  
  // TASK 14.4: Load fixed flow run (seed 42)
  const fixedPatterns = [
    `deep_balance_noisy_mixed_fixed_seed42.json`,
    `deep_balance_noisy_mixed_seed42.json`,
  ];
  
  let fixedReport = null;
  for (const pattern of fixedPatterns) {
    const reportPath = path.join(outDir, pattern);
    try {
      const testReport = readJson(reportPath);
      if (testReport?.metadata?.flow === 'fixed' || testReport?.metadata?.effectiveFlow === 'fixed') {
        fixedReport = testReport;
        break;
      }
    } catch {
      // Try next pattern
    }
  }
  
  if (fixedReport) {
    const derived = fixedReport.derived || {};
    const dr = fixedReport.derived?.deepRealistic || {};
    // NOTE: report.derived.* rates are stored as PERCENT (0..100), not ratios.
    const fallbackRatePct = Number(derived.microFallbackRate || 0);
    const zeroScorePickRatePct = Number(derived.microZeroScorePickRate || 0);
    const scoringTagsEmptyRatePct = Number(derived.scoringTagsEmptyRate || 0);

    const fallbackReasonBreakdown = derived.fallbackReasonBreakdown || {};
    const endedReasons = dr.endedReasons || dr.endedReasonCounts || dr.endedReasonBreakdown || {};
    const totalEndedReasons = Object.values(endedReasons).reduce((a, b) => a + Number(b || 0), 0);
    const topEndedReason = Object.entries(endedReasons).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || ['unknown', 0];
    
    fixedResults.push({
      seed: 42,
      flow: 'fixed',
      fallbackRate: fallbackRatePct,
      microFallbackRate: Number(derived.microFallbackRate ?? fallbackRatePct),
      microZeroScorePickRate: zeroScorePickRatePct,
      scoringTagsEmptyRate: scoringTagsEmptyRatePct,
      macroFallbackRate: 0,
      topFallbackReasons: Object.entries(fallbackReasonBreakdown)
        .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
        .slice(0, 3)
        .map(([reason, count]) => ({ reason, count: Number(count || 0) })),
      topEndedReason: topEndedReason[0],
      topEndedReasonPct: totalEndedReasons > 0 ? ((topEndedReason[1] / totalEndedReasons) * 100).toFixed(1) : '0.0',
      engine: fixedReport?.metadata?.engine || 'unknown',
      runMeta: {
        mode: fixedReport?.metadata?.mode || null,
        runs: fixedReport?.metadata?.runs || fixedReport?.config?.runs || null,
        seed: fixedReport?.metadata?.seed ?? 42,
        totalBaselines: fixedReport?.config?.totalBaselines ?? null,
      },
    });
  }
  
  // TASK 14.4: Calculate statistics with proper spread calculation
  const fallbackRates = results.map(r => r.fallbackRate).filter(r => !isNaN(r));
  const askedL2Avgs = results.map(r => r.askedL2Avg).filter(r => !isNaN(r));
  
  const coreGateMeans = results.reduce((acc, r) => {
    r.coreGateRates.forEach((rate, i) => {
      if (!isNaN(rate)) {
        acc[i] = (acc[i] || 0) + rate;
      }
    });
    return acc;
  }, []);
  coreGateMeans.forEach((sum, i) => {
    coreGateMeans[i] = results.length > 0 ? sum / results.length : 0;
  });
  
  // TASK 14.4: Aggregate ended reasons and macros
  const allMacros = {};
  results.forEach(r => {
    // Aggregate macros
    r.top3Macros.forEach(macro => {
      allMacros[macro] = (allMacros[macro] || 0) + 1;
    });
  });
  
  const endedAggTotal = Object.values(endedReasonAgg).reduce((a, b) => a + Number(b || 0), 0);
  const topEndedReasonAggregatedEntry = Object.entries(endedReasonAgg).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || ['unknown', 0];
  const topEndedReasonAggregated = topEndedReasonAggregatedEntry[0];
  const topEndedReasonAggregatedPct = endedAggTotal > 0 ? ((Number(topEndedReasonAggregatedEntry[1] || 0) / endedAggTotal) * 100).toFixed(1) : '0.0';
  const top3MacrosAggregated = Object.entries(allMacros).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

  const topFallbackReasonsAgg = Object.entries(fallbackReasonAgg)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count: Number(count || 0) }));
  
  const summary = {
    timestamp: new Date().toISOString(),
    gitCommit: getGitCommit(),
    mode: isSmoke ? 'smoke' : 'full', // TASK 14.6
    deepRealistic: {
      fallbackRate: {
        mean: fallbackRates.length > 0 ? (fallbackRates.reduce((a, b) => a + b, 0) / fallbackRates.length).toFixed(2) : 'MISSING',
        min: fallbackRates.length > 0 ? Math.min(...fallbackRates).toFixed(2) : 'MISSING',
        max: fallbackRates.length > 0 ? Math.max(...fallbackRates).toFixed(2) : 'MISSING',
        spread: fallbackRates.length > 0 ? (Math.max(...fallbackRates) - Math.min(...fallbackRates)).toFixed(2) : 'MISSING',
      },
      macroFallbackRate: {
        mean: '0.00',
      },
      microFallbackRate: {
        mean: (fallbackRates.length > 0 ? (fallbackRates.reduce((a, b) => a + b, 0) / fallbackRates.length) : 0).toFixed(2),
      },
      microZeroScorePickRate: {
        mean: (results.length > 0 ? (results.reduce((a, r) => a + Number(r.microZeroScorePickRate || 0), 0) / results.length) : 0).toFixed(2),
        min: (results.length > 0 ? Math.min(...results.map(r => Number(r.microZeroScorePickRate || 0))) : 0).toFixed(2),
        max: (results.length > 0 ? Math.max(...results.map(r => Number(r.microZeroScorePickRate || 0))) : 0).toFixed(2),
        spread: (results.length > 0 ? (Math.max(...results.map(r => Number(r.microZeroScorePickRate || 0))) - Math.min(...results.map(r => Number(r.microZeroScorePickRate || 0)))) : 0).toFixed(2),
      },
      scoringTagsEmptyRate: {
        mean: (results.length > 0 ? (results.reduce((a, r) => a + Number(r.scoringTagsEmptyRate || 0), 0) / results.length) : 0).toFixed(2),
        min: (results.length > 0 ? Math.min(...results.map(r => Number(r.scoringTagsEmptyRate || 0))) : 0).toFixed(2),
        max: (results.length > 0 ? Math.max(...results.map(r => Number(r.scoringTagsEmptyRate || 0))) : 0).toFixed(2),
        spread: (results.length > 0 ? (Math.max(...results.map(r => Number(r.scoringTagsEmptyRate || 0))) - Math.min(...results.map(r => Number(r.scoringTagsEmptyRate || 0)))) : 0).toFixed(2),
      },
      topFallbackReasons: topFallbackReasonsAgg,
      askedL2Avg: {
        mean: askedL2Avgs.length > 0 ? (askedL2Avgs.reduce((a, b) => a + b, 0) / askedL2Avgs.length).toFixed(2) : 'MISSING',
        spread: askedL2Avgs.length > 0 ? (Math.max(...askedL2Avgs) - Math.min(...askedL2Avgs)).toFixed(2) : 'MISSING',
      },
      coreGateRates: {
        // TASK C: treat 0 as valid, only null/undefined/NaN is missing
        valence: (coreGateMeans[0] === null || coreGateMeans[0] === undefined || Number.isNaN(coreGateMeans[0])) ? 'MISSING' : coreGateMeans[0].toFixed(1),
        arousal: (coreGateMeans[1] === null || coreGateMeans[1] === undefined || Number.isNaN(coreGateMeans[1])) ? 'MISSING' : coreGateMeans[1].toFixed(1),
        agency: (coreGateMeans[2] === null || coreGateMeans[2] === undefined || Number.isNaN(coreGateMeans[2])) ? 'MISSING' : coreGateMeans[2].toFixed(1),
        clarity: (coreGateMeans[3] === null || coreGateMeans[3] === undefined || Number.isNaN(coreGateMeans[3])) ? 'MISSING' : coreGateMeans[3].toFixed(1),
      },
      topEndedReason: topEndedReasonAggregated,
      topEndedReasonPct: topEndedReasonAggregatedPct,
      top3Macros: top3MacrosAggregated.length > 0 ? top3MacrosAggregated : (results[0]?.top3Macros || []),
    },
    fixed: fixedResults.length > 0 ? {
      fallbackRate: fixedResults[0].fallbackRate.toFixed(2),
      microFallbackRate: fixedResults[0].microFallbackRate.toFixed(2),
      microZeroScorePickRate: fixedResults[0].microZeroScorePickRate.toFixed(2),
      scoringTagsEmptyRate: fixedResults[0].scoringTagsEmptyRate.toFixed(2),
      macroFallbackRate: fixedResults[0].macroFallbackRate,
      topFallbackReasons: fixedResults[0].topFallbackReasons,
      topEndedReason: fixedResults[0].topEndedReason,
      topEndedReasonPct: fixedResults[0].topEndedReasonPct,
      runMeta: fixedResults[0].runMeta,
      engine: fixedResults[0].engine,
    } : null,
    perSeed: results,
  };
  
  const summaryPath = path.join(outDir, 'A3_2_3_STABILITY_SUMMARY.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  // TASK 14.4: Generate markdown summary
  let md = `# A3.2.3: Stability Summary\n\n`;
  md += `Generated: ${summary.timestamp}\n`;
  md += `Git commit: ${summary.gitCommit}\n`;
  md += `Mode: ${summary.mode}\n\n`;
  md += `## Deep-Realistic Stability (${results.length} seeds)\n\n`;
  md += `### Fallback Rate\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Mean | ${summary.deepRealistic.fallbackRate.mean}% |\n`;
  md += `| Min | ${summary.deepRealistic.fallbackRate.min}% |\n`;
  md += `| Max | ${summary.deepRealistic.fallbackRate.max}% |\n`;
  md += `| Spread | ${summary.deepRealistic.fallbackRate.spread} p.p. |\n\n`;
  md += `### Asked L2 Average\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Mean | ${summary.deepRealistic.askedL2Avg.mean} |\n`;
  md += `| Spread | ${summary.deepRealistic.askedL2Avg.spread} |\n\n`;
  md += `### Core Gate Hit Rates (CardsOnly)\n`;
  md += `| Gate | Mean Rate |\n`;
  md += `|------|-----------|\n`;
  md += `| Valence | ${summary.deepRealistic.coreGateRates.valence}% |\n`;
  md += `| Arousal | ${summary.deepRealistic.coreGateRates.arousal}% |\n`;
  md += `| Agency | ${summary.deepRealistic.coreGateRates.agency}% |\n`;
  md += `| Clarity | ${summary.deepRealistic.coreGateRates.clarity}% |\n\n`;
  md += `### Top Ended Reason (Aggregated)\n`;
  md += `- **Reason:** ${summary.deepRealistic.topEndedReason} (${summary.deepRealistic.topEndedReasonPct}%)\n\n`;

  md += `### Fallback Breakdown\n`;
  md += `- **microFallbackRate (mean):** ${summary.deepRealistic.microFallbackRate.mean}%\n`;
  md += `- **macroFallbackRate (mean):** ${summary.deepRealistic.macroFallbackRate.mean}%\n`;
  md += `- **microZeroScorePickRate (mean/min/max/spread):** ${summary.deepRealistic.microZeroScorePickRate.mean}% / ${summary.deepRealistic.microZeroScorePickRate.min}% / ${summary.deepRealistic.microZeroScorePickRate.max}% / ${summary.deepRealistic.microZeroScorePickRate.spread} p.p.\n`;
  md += `- **scoringTagsEmptyRate (mean/min/max/spread):** ${summary.deepRealistic.scoringTagsEmptyRate.mean}% / ${summary.deepRealistic.scoringTagsEmptyRate.min}% / ${summary.deepRealistic.scoringTagsEmptyRate.max}% / ${summary.deepRealistic.scoringTagsEmptyRate.spread} p.p.\n`;
  md += `- **Top fallback reasons:**\n`;
  md += `${(summary.deepRealistic.topFallbackReasons || []).map(x => `  - ${x.reason}: ${x.count}`).join('\n') || '  - (none)'}\n\n`;
  md += `### Top-3 Macros (Aggregated)\n`;
  md += `- ${summary.deepRealistic.top3Macros.join(', ')}\n\n`;
  
  if (summary.fixed) {
    md += `## Fixed Flow (seed 42)\n\n`;
    md += `- **Fallback Rate:** ${summary.fixed.fallbackRate}%\n`;
    md += `- **Engine:** ${summary.fixed.engine}\n\n`;
    md += `- **Top endedReason:** ${summary.fixed.topEndedReason} (${summary.fixed.topEndedReasonPct}%)\n`;
    md += `- **microZeroScorePickRate:** ${summary.fixed.microZeroScorePickRate}%\n`;
    md += `- **scoringTagsEmptyRate:** ${summary.fixed.scoringTagsEmptyRate}%\n`;
    md += `- **Top fallback reasons:**\n`;
    md += `${(summary.fixed.topFallbackReasons || []).map(x => `  - ${x.reason}: ${x.count}`).join('\n') || '  - (none)'}\n\n`;
  }
  
  md += `## Per-Seed Details\n\n`;
  md += `| Seed | Fallback % | AskedL2 Avg | Top Ended Reason | Engine |\n`;
  md += `|------|------------|---------------|-------------------|--------|\n`;
  results.forEach(r => {
    md += `| ${r.seed} | ${r.fallbackRate.toFixed(2)}% | ${r.askedL2Avg.toFixed(2)} | ${r.topEndedReason} (${r.topEndedReasonPct}%) | ${r.engine} |\n`;
  });
  
  const mdPath = path.join(outDir, 'A3_2_3_STABILITY_SUMMARY.md');
  writeFileSync(mdPath, md);
  
  console.log(`\n📊 Stability summary saved:`);
  console.log(`   JSON: ${summaryPath}`);
  console.log(`   MD: ${mdPath}`);
}

async function main() {
  console.log('='.repeat(80));
  console.log('A3.2.3: Full Stability Test');
  console.log('='.repeat(80));
  console.log(`Git commit: ${getGitCommit()}`);
  console.log(`Node version: ${process.version}\n`);
  
  const outDir = path.join(__dirname, 'out');
  
  try {
    const results = [];
    
    // Deep-realistic runs
    for (const seed of seeds) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Running deep-realistic seed ${seed}...`);
      console.log('='.repeat(80));
      
      await runCommand([...commonArgs, '--seed', String(seed)], `deep-realistic seed ${seed}`);
      
      // TASK 14.3: Generate manifest
      const config = {
        mode: 'noisy-mixed',
        runs: runsCount,
        maxL1: 5,
        maxL2: 5,
        minL1: 3,
        minL2: 2,
        stopOnGates: true,
        notSureRate: 0.2,
        profile: 'mix',
      };
      writeManifest(outDir, 'deep-realistic', seed, config);
      
      // TASK 14.3: Auto-validate after each run
      const reportPatterns = [
        path.join(outDir, `deep_balance_noisy_mixed_deep-realistic_seed${seed}.json`),
        path.join(outDir, `deep_balance_noisy_mixed_seed${seed}.json`),
        path.join(outDir, `deep_balance_noisy_mixed.json`), // Fallback: file without suffixes
      ];
      
      let reportPath = null;
      for (const pattern of reportPatterns) {
        try {
          readFileSync(pattern, 'utf8');
          reportPath = pattern;
          break;
        } catch {
          // Try next
        }
      }
      
      if (reportPath) {
        console.log(`\n🔍 Validating report (schema + engine check)...`);
        await validateReport(reportPath, `Seed ${seed}`); // TASK 14.3: Includes schema + engine check
        await validateSanity(reportPath, `Seed ${seed}`);
        console.log(`✅ Seed ${seed} validation passed`);
      } else {
        throw new Error(`Report file not found for seed ${seed}`);
      }
      
      results.push({ seed, flow: 'deep-realistic' });
    }
    
    // TASK 14.3: Fixed run (seed 42)
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running fixed flow seed 42 (${runsCount} runs)...`);
    console.log('='.repeat(80));
    
    await runCommand([
      '--flow', 'fixed',
      '--mode', 'fixed-control',
      '--runs', String(runsCount),
      '--seed', '42',
      '--outDir', './scripts/out',
      '--notSureRate', '0',
      '--profile', 'decisive',
    ], 'fixed flow');
    
    writeManifest(outDir, 'fixed', 42, {
      mode: 'fixed-control',
      runs: runsCount,
      notSureRate: 0,
      profile: 'decisive',
    });
    
    const fixedReportPath = path.join(outDir, 'deep_balance_noisy_mixed_fixed_seed42.json');
    try {
      readFileSync(fixedReportPath, 'utf8');
      console.log(`\n🔍 Validating fixed report (schema + engine check)...`);
      await validateReport(fixedReportPath, 'Fixed flow'); // TASK 14.3: Includes schema + engine check
      await validateSanity(fixedReportPath, 'Fixed flow');
      console.log(`✅ Fixed flow validation passed`);
    } catch (e) {
      if (e.message.includes('not found')) {
        console.warn(`⚠️  Fixed report validation skipped (file not found)`);
      } else {
        throw e; // Re-throw validation errors
      }
    }
    
    // Generate regression report
    console.log(`\n${'='.repeat(80)}`);
    console.log('Generating regression report...');
    console.log('='.repeat(80));
    await runCommand(['scripts/analyzeP3_10_4Regression.js'], 'regression report');
    
    // 2.3: Generate stability summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('Generating stability summary...');
    console.log('='.repeat(80));
    generateStabilitySummary(outDir);
    
    console.log('\n' + '='.repeat(80));
    console.log('A3.2.3: All runs completed successfully');
    console.log('='.repeat(80));
    console.log('\n📋 Next steps:');
    console.log('1. Review scripts/out/A3_2_3_STABILITY_SUMMARY.md');
    console.log('2. Review scripts/out/P3_10_4_REGRESSION_REPORT.md');
    console.log('3. Check stability criteria:');
    console.log('   - fallbackRate spread ≤ 1-2 p.p.');
    console.log('   - askedL2.avg spread ≤ 0.1-0.2');
    console.log('   - fixed fallback ≤ 2%');
    console.log('   - gateHitRatesCardsOnly and macroDistributionFlat present');
    
  } catch (e) {
    console.error(`\n❌ Error: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
