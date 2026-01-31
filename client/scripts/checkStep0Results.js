// checkStep0Results.js
// Step 0: Strict validation of new fields (gateHitRatesCardsOnly, macroDistributionFlat)
// 1.1: Schema-first validation
// 1.2: askedL2 invariants
// 1.3: gateHitRatesCardsOnly structural validity
// 1.4: macroDistributionFlat sum consistency

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { validateReportOrThrow } from './utils/validateReport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function main() {
  const args = process.argv.slice(2);
  const allowLegacy = args.includes('--allowLegacy');
  const reportPath = args.find(arg => !arg.startsWith('--')) || path.join(__dirname, 'out', 'deep_balance_noisy_mixed_deep-realistic_seed42.json');
  
  console.log(`Checking report: ${reportPath}\n`);
  
  try {
    const report = readJson(reportPath);
    
    // 1.1: Schema-first validation (with reportVersion check)
    console.log('1.1 Schema validation...');
    try {
      validateReportOrThrow(report);
      console.log('   ✅ Schema validation passed');
      if (report.reportVersion) {
        console.log(`   Report version: ${report.reportVersion}\n`);
      }
    } catch (e) {
      // Check specifically for reportVersion missing
      if (e.message.includes('reportVersion')) {
        if (allowLegacy) {
          console.warn(`   ⚠️  Schema validation warning (legacy report): ${e.message}`);
          console.warn('   Continuing with --allowLegacy flag...\n');
        } else {
          console.error(`   ❌ Schema validation failed: ${e.message}`);
          console.error('   Use --allowLegacy to allow legacy reports without reportVersion');
          process.exit(1);
        }
      } else {
        console.error(`   ❌ Schema validation failed: ${e.message}`);
        process.exit(1);
      }
    }
    
    const dr = report.derived?.deepRealistic;
    const config = report.metadata?.config || {};
    const runs = report.metadata?.runs || 0;
    
    if (!dr) {
      console.error('❌ No deepRealistic section found in report');
      process.exit(1);
    }
    
    console.log('=== Step 0: Enhanced Field Validation ===\n');
    
    let allPass = true;
    
    // 1.2: askedL2 invariants
    console.log('1.2 askedL2 invariants...');
    const maxL2 = config.maxL2 || 0;
    const askedL2Avg = dr.askedL2?.avg ?? null;
    const askedL2P95 = dr.askedL2?.p95 ?? null;
    
    if (maxL2 > 0) {
      const avgPass = askedL2Avg !== null && askedL2Avg > 0;
      const p95Pass = askedL2P95 !== null && askedL2P95 > 0;
      const rangeInTarget = askedL2Avg >= 0.8 && askedL2Avg <= 1.0;
      
      console.log(`   askedL2.avg: ${askedL2Avg !== null ? askedL2Avg.toFixed(2) : 'MISSING'} ${avgPass ? '✅' : '❌'} ${rangeInTarget ? '(target range)' : '(outside target)'}`);
      console.log(`   askedL2.p95: ${askedL2P95 !== null ? askedL2P95.toFixed(2) : 'MISSING'} ${p95Pass ? '✅' : '❌'}`);
      
      // Hard invariants: avg > 0 and p95 > 0 (fail)
      if (!avgPass || !p95Pass) {
        console.error(`   ❌ FAIL: maxL2=${maxL2} but askedL2 invariants violated`);
        allPass = false;
      }
      
      // Soft target: range 0.8-1.0 (warn, not fail)
      if (avgPass && !rangeInTarget) {
        console.warn(`   ⚠️  WARN: askedL2.avg (${askedL2Avg.toFixed(2)}) outside target range [0.8..1.0]`);
        console.warn(`      This may be expected if maxL2/minL2/stopOnGates/profile changed`);
      }
    } else {
      console.log(`   ⏭️  Skipped (maxL2=0)`);
    }
    console.log('');
    
    // 1.3: gateHitRatesCardsOnly structural validity
    console.log('1.3 gateHitRatesCardsOnly structural validity...');
    const gateHitRates = dr.gateHitRatesCardsOnly || dr.gateHitCardsOnlyRates || null;
    const coreGates = ['valence', 'arousal', 'agency', 'clarity'];
    
    // Normalize rate: accept either ratio [0..1] or percent [0..100]; normalize to ratio
    const normalizeRate = (v) => {
      if (v === null || v === undefined || isNaN(v)) return null;
      return v > 1 ? v / 100 : v; // If > 1, assume percent, convert to ratio
    };
    
    if (gateHitRates === null || typeof gateHitRates !== 'object') {
      console.error(`   ❌ FAIL: gateHitRatesCardsOnly is missing or not an object`);
      allPass = false;
    } else {
      // Detect scale (ratio vs percent) for logging
      const sampleValues = coreGates.map(g => gateHitRates[g]).filter(v => v != null && !isNaN(v));
      const detectedScale = sampleValues.length > 0 && sampleValues.some(v => v > 1) ? 'percent' : 'ratio';
      console.log(`   [DEBUG] Detected scale: ${detectedScale} (${detectedScale === 'percent' ? '0..100' : '0..1'})`);
      
      const missingGates = coreGates.filter(gate => !(gate in gateHitRates));
      const invalidValues = coreGates.filter(gate => {
        const val = normalizeRate(gateHitRates[gate]);
        return val === null || val < 0 || val > 1;
      });
      
      if (missingGates.length > 0) {
        console.error(`   ❌ FAIL: Missing core gates: ${missingGates.join(', ')}`);
        allPass = false;
      } else if (invalidValues.length > 0) {
        console.error(`   ❌ FAIL: Invalid values for gates: ${invalidValues.join(', ')}`);
        allPass = false;
      } else {
        console.log(`   ✅ All core gates present and valid`);
        const normalized = coreGates.slice(0, 2).map(g => {
          const val = normalizeRate(gateHitRates[g]);
          return `${g}=${(val * 100).toFixed(1)}%`;
        });
        console.log(`   Sample: ${normalized.join(', ')}`);
      }
    }
    console.log('');
    
    // 1.4: macroDistributionFlat sum consistency
    console.log('1.4 macroDistributionFlat sum consistency...');
    const macroDistFlat = dr.macroDistributionFlat || null;
    const microDistOverall = report.microDistributionOverall || {};
    
    // Service micro keys to exclude (consistent with checkDeepBalance.js)
    const SERVICE_MICROS = ['none', 'fallback', 'mixed'];
    
    // Helper: check if two numbers are close within tolerance
    const isClose = (a, b, tol) => Math.abs(a - b) <= tol;
    
    if (macroDistFlat === null || typeof macroDistFlat !== 'object' || Object.keys(macroDistFlat).length === 0) {
      console.error(`   ❌ FAIL: macroDistributionFlat is missing or empty`);
      allPass = false;
    } else {
      // Explicit check: macroDistributionFlat should not contain service macros
      const serviceMacrosInFlat = Object.keys(macroDistFlat).filter(k => SERVICE_MICROS.includes(k));
      if (serviceMacrosInFlat.length > 0) {
        console.error(`   ❌ FAIL: macroDistributionFlat contains service macros: ${serviceMacrosInFlat.join(', ')}`);
        console.error(`   Service macros should be excluded during computation`);
        allPass = false;
      } else {
        console.log(`   ✅ Service macros excluded: ${SERVICE_MICROS.join(', ')}`);
      }
      
      const macroSum = Object.values(macroDistFlat).reduce((a, b) => a + b, 0);
      
      // Calculate expected sum from microDistributionOverall (excluding service buckets)
      const microSum = Object.entries(microDistOverall)
        .filter(([k]) => {
          // Exclude service values: none, fallback, mixed
          if (SERVICE_MICROS.includes(k)) return false;
          // Also exclude if it's a macro key (not a micro key like "down.sad_heavy")
          // We only want micro keys (containing '.')
          return k.includes('.');
        })
        .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);
      
      // Auto-detect format: counts vs ratios
      const tolRatio = 0.01; // 1% tolerance for ratios (sum should be ~1.0)
      const tolCount = runs > 0 ? Math.max(10, runs * 0.01) : 10; // 1% tolerance for counts, min 10
      
      const looksLikeRatio = isClose(macroSum, 1.0, tolRatio);
      const looksLikeCount = runs > 0 && isClose(macroSum, runs, tolCount);
      const looksLikeMicroSum = microSum > 0 && isClose(macroSum, microSum, tolCount);
      
      let format = 'unknown';
      let expectedSum = null;
      let tolerance = null;
      
      if (looksLikeRatio) {
        format = 'ratios';
        expectedSum = 1.0;
        tolerance = tolRatio;
      } else if (looksLikeMicroSum) {
        format = 'counts (matches microDistributionOverall)';
        expectedSum = microSum;
        tolerance = tolCount;
      } else if (looksLikeCount) {
        format = 'counts (matches runs)';
        expectedSum = runs;
        tolerance = tolCount;
      } else {
        format = 'unclear';
        expectedSum = microSum > 0 ? microSum : runs;
        tolerance = tolCount;
      }
      
      const sumMatch = expectedSum !== null && isClose(macroSum, expectedSum, tolerance);
      
      console.log(`   macroDistributionFlat sum: ${macroSum}`);
      console.log(`   Format detected: ${format}`);
      console.log(`   Expected: ${expectedSum !== null ? expectedSum.toFixed(2) : 'N/A'}`);
      console.log(`   Match: ${sumMatch ? '✅' : '❌'} (tolerance: ±${tolerance.toFixed(2)})`);
      
      if (!sumMatch) {
        console.error(`   ❌ FAIL: Sum mismatch suggests wrong microDistribution source or format`);
        console.error(`   macroSum=${macroSum}, expected=${expectedSum}, runs=${runs}, microSum=${microSum}`);
        allPass = false;
      } else {
        const top3 = Object.entries(macroDistFlat).sort((a, b) => b[1] - a[1]).slice(0, 3);
        console.log(`   Top-3 macros: ${top3.map(([k, v]) => `${k}=${v}`).join(', ')}`);
      }
    }
    console.log('');

    // POST-05: KPI gates for micro quality (microFallbackRate + diagnostics)
    console.log('1.5 micro KPI gates...');
    // NOTE: In these reports, rates are stored as PERCENT (0..100), not ratio (0..1).
    const microFallbackRatePct = Number(report?.derived?.microFallbackRate ?? NaN);
    const microZeroScorePickRatePct = Number(report?.derived?.microZeroScorePickRate ?? NaN);
    const scoringTagsEmptyRatePct = Number(report?.derived?.scoringTagsEmptyRate ?? NaN);
    const scoringTagsLenP95 = Number(report?.derived?.scoringTagsLenP95 ?? NaN);

    if (!Number.isFinite(microFallbackRatePct)) {
      console.warn('   ⚠️  WARN: derived.microFallbackRate is missing/invalid');
    } else {
      // Acceptance: Fail > 0.25, Warn > 0.15 (soft gates for now)
      // Interpret thresholds as FRACTIONS (25% / 15%) from the task, but compare in percent space.
      const fail = microFallbackRatePct > 25;
      const warn = microFallbackRatePct > 15;
      if (fail) {
        console.error(`   ❌ FAIL: microFallbackRate=${microFallbackRatePct.toFixed(2)}% (> 25%)`);
        allPass = false;
      } else if (warn) {
        console.warn(`   ⚠️  WARN: microFallbackRate=${microFallbackRatePct.toFixed(2)}% (> 15%)`);
      } else {
        console.log(`   ✅ microFallbackRate=${microFallbackRatePct.toFixed(2)}%`);
      }
    }

    // STAB-KPI-01: microZeroScorePickRate gates (values in percent)
    if (!Number.isFinite(microZeroScorePickRatePct)) {
      console.warn('   ⚠️  WARN: derived.microZeroScorePickRate is missing/invalid');
    } else {
      const failThreshold = 50; // STAB-KPI-01: Stricter threshold (was 60%)
      const warnThreshold = 35; // STAB-KPI-01: Stricter threshold (was 40%)
      const failZero = microZeroScorePickRatePct > failThreshold;
      const warnZero = microZeroScorePickRatePct > warnThreshold;
      if (failZero) {
        console.error(`   ❌ FAIL: microZeroScorePickRate=${microZeroScorePickRatePct.toFixed(2)}% (threshold: ${failThreshold}%)`);
        console.error(`      High zero-score pick rate indicates weak evidence or scoring issues.`);
        console.error(`      Investigate: npm run zero-score:report`);
        allPass = false;
      } else if (warnZero) {
        console.warn(`   ⚠️  WARN: microZeroScorePickRate=${microZeroScorePickRatePct.toFixed(2)}% (threshold: ${warnThreshold}%)`);
        console.warn(`      Consider reviewing: npm run zero-score:report`);
      } else {
        console.log(`   ✅ microZeroScorePickRate=${microZeroScorePickRatePct.toFixed(2)}%`);
      }
    }

    // STAB-KPI-01: scoringTagsEmptyRate gates (values in percent)
    if (!Number.isFinite(scoringTagsEmptyRatePct)) {
      console.warn('   ⚠️  WARN: derived.scoringTagsEmptyRate is missing/invalid');
    } else {
      const failThreshold = 8; // STAB-KPI-01: Stricter threshold (was 10%)
      const warnThreshold = 5; // STAB-KPI-01: New warn threshold
      const failEmpty = scoringTagsEmptyRatePct > failThreshold;
      const warnEmpty = scoringTagsEmptyRatePct > warnThreshold;
      if (failEmpty) {
        console.error(`   ❌ FAIL: scoringTagsEmptyRate=${scoringTagsEmptyRatePct.toFixed(2)}% (threshold: ${failThreshold}%)`);
        console.error(`      Empty scoringTags indicate tag filtering issues or missing evidence.`);
        console.error(`      Investigate: Check tagAliasMap normalization and scoringTags filtering logic.`);
        allPass = false;
      } else if (warnEmpty) {
        console.warn(`   ⚠️  WARN: scoringTagsEmptyRate=${scoringTagsEmptyRatePct.toFixed(2)}% (threshold: ${warnThreshold}%)`);
        console.warn(`      Review tag normalization and filtering.`);
      } else {
        console.log(`   ✅ scoringTagsEmptyRate=${scoringTagsEmptyRatePct.toFixed(2)}%`);
      }
    }

    // STAB-KPI-01: scoringTagsLenP95 gates (values in count)
    if (!Number.isFinite(scoringTagsLenP95)) {
      console.warn('   ⚠️  WARN: derived.scoringTagsLenP95 is missing/invalid');
    } else {
      const failThreshold = 2; // STAB-KPI-01: Fail if P95 < 2 tags
      const warnThreshold = 3; // STAB-KPI-01: Warn if P95 < 3 tags
      const failLen = scoringTagsLenP95 < failThreshold;
      const warnLen = scoringTagsLenP95 < warnThreshold;
      if (failLen) {
        console.error(`   ❌ FAIL: scoringTagsLenP95=${scoringTagsLenP95.toFixed(2)} (threshold: >= ${failThreshold})`);
        console.error(`      Very low tag count indicates insufficient evidence or over-aggressive filtering.`);
        console.error(`      Investigate: Check scoringTags filtering and tag normalization.`);
        allPass = false;
      } else if (warnLen) {
        console.warn(`   ⚠️  WARN: scoringTagsLenP95=${scoringTagsLenP95.toFixed(2)} (threshold: >= ${warnThreshold})`);
        console.warn(`      Low tag count may indicate filtering issues.`);
      } else {
        console.log(`   ✅ scoringTagsLenP95=${scoringTagsLenP95.toFixed(2)}`);
      }
    }

    console.log('');
    
    console.log(`=== Overall: ${allPass ? '✅ PASS' : '❌ FAIL'} ===\n`);
    
    if (!allPass) {
      console.log('⚠️  Validation failed. This may indicate:');
      console.log('   - Report was generated with old/incomplete code');
      console.log('   - Data collection bugs in checkDeepBalance.js');
      console.log('   - Wrong microDistribution source used');
      console.log('\n   Recommendation: Review code and re-run simulation.');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
