// compareStabilitySummary.js
// STAB-06: Compare current stability summary against a frozen baseline.
// Comments in English only.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function parseMeanPercent(obj, pathStr) {
  if (!obj) {
    throw new Error(`Missing section for ${pathStr}`);
  }
  const raw = obj.mean ?? obj;
  const v = Number(raw);
  if (!Number.isFinite(v)) {
    throw new Error(`Invalid numeric value at ${pathStr}: ${raw}`);
  }
  // Stored as percent (0..100); convert to fraction (0..1) for comparison thresholds.
  return v / 100;
}

function main() {
  const baselinePath = path.join(__dirname, 'baselines', 'A3_2_3_STABILITY_BASELINE.json');
  const currentPath = path.join(__dirname, 'out', 'A3_2_3_STABILITY_SUMMARY.json');

  let baseline;
  let current;
  try {
    baseline = readJson(baselinePath);
  } catch (e) {
    console.warn(`[stability:diff] Baseline file not found or invalid: ${baselinePath}`);
    console.warn(`[stability:diff] Skipping diff gate (no baseline).`);
    process.exit(0);
  }

  try {
    current = readJson(currentPath);
  } catch (e) {
    console.warn(`[stability:diff] Current summary not found: ${currentPath}`);
    console.warn(`[stability:diff] Run stability:a3_2_3 before running stability:diff.`);
    process.exit(0);
  }

  // Guard: ensure we compare same mode (e.g., smoke vs smoke)
  if (baseline?.mode !== current?.mode) {
    console.error(`Baseline mode (${baseline?.mode}) != current mode (${current?.mode}). Rebuild baseline or run matching mode.`);
    process.exit(1);
  }

  // Guard: ensure engine is consistent (prefer metadata.engine if present)
  const baselineEngine = baseline?.metadata?.engine
    || baseline?.deepRealistic?.engine
    || baseline?.fixed?.engine
    || null;
  const currentEngine = current?.metadata?.engine
    || current?.deepRealistic?.engine
    || current?.fixed?.engine
    || null;

  if (baselineEngine !== null || currentEngine !== null) {
    if (baselineEngine !== currentEngine) {
      console.error(`Baseline engine (${baselineEngine}) != current engine (${currentEngine}).`);
      process.exit(1);
    }
  }

  const bDeep = baseline.deepRealistic || {};
  const cDeep = current.deepRealistic || {};

  const bFallback = parseMeanPercent(bDeep.fallbackRate, 'baseline.deepRealistic.fallbackRate.mean');
  const cFallback = parseMeanPercent(cDeep.fallbackRate, 'current.deepRealistic.fallbackRate.mean');

  const bZero = parseMeanPercent(bDeep.microZeroScorePickRate, 'baseline.deepRealistic.microZeroScorePickRate.mean');
  const cZero = parseMeanPercent(cDeep.microZeroScorePickRate, 'current.deepRealistic.microZeroScorePickRate.mean');

  const bEmpty = parseMeanPercent(bDeep.scoringTagsEmptyRate, 'baseline.deepRealistic.scoringTagsEmptyRate.mean');
  const cEmpty = parseMeanPercent(cDeep.scoringTagsEmptyRate, 'current.deepRealistic.scoringTagsEmptyRate.mean');

  const deltaFallback = cFallback - bFallback;
  const deltaZero = cZero - bZero;
  const deltaEmpty = cEmpty - bEmpty;

  // Thresholds are in FRACTIONS (not percent): 0.005 => +0.5 p.p.
  const limits = {
    fallback: 0.005,
    zeroScorePick: 0.05,
    emptyRate: 0.02,
  };

  console.log('=== Stability diff vs baseline (deepRealistic) ===');
  console.log(`fallbackRate.mean: baseline=${(bFallback * 100).toFixed(2)}%, current=${(cFallback * 100).toFixed(2)}%, delta=${(deltaFallback * 100).toFixed(2)} p.p. (limit=+${(limits.fallback * 100).toFixed(2)} p.p.)`);
  console.log(`microZeroScorePickRate.mean: baseline=${(bZero * 100).toFixed(2)}%, current=${(cZero * 100).toFixed(2)}%, delta=${(deltaZero * 100).toFixed(2)} p.p. (limit=+${(limits.zeroScorePick * 100).toFixed(2)} p.p.)`);
  console.log(`scoringTagsEmptyRate.mean: baseline=${(bEmpty * 100).toFixed(2)}%, current=${(cEmpty * 100).toFixed(2)}%, delta=${(deltaEmpty * 100).toFixed(2)} p.p. (limit=+${(limits.emptyRate * 100).toFixed(2)} p.p.)`);

  let fail = false;

  if (deltaZero > limits.zeroScorePick) {
    console.error(`❌ FAIL: microZeroScorePickRate.mean increased by ${(deltaZero * 100).toFixed(2)} p.p. (> ${(limits.zeroScorePick * 100).toFixed(2)} p.p.)`);
    fail = true;
  }

  if (deltaEmpty > limits.emptyRate) {
    console.error(`❌ FAIL: scoringTagsEmptyRate.mean increased by ${(deltaEmpty * 100).toFixed(2)} p.p. (> ${(limits.emptyRate * 100).toFixed(2)} p.p.)`);
    fail = true;
  }

  if (deltaFallback > limits.fallback) {
    console.error(`❌ FAIL: fallbackRate.mean increased by ${(deltaFallback * 100).toFixed(2)} p.p. (> ${(limits.fallback * 100).toFixed(2)} p.p.)`);
    fail = true;
  }

  if (fail) {
    process.exit(1);
  } else {
    console.log('✅ Stability diff within baseline limits.');
    process.exit(0);
  }
}

main();

