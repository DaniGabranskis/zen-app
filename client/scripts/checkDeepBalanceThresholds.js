// checkDeepBalanceThresholds.js (Task G)
// Validates deep balance results against thresholds for CI

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thresholds (Task G)
const THRESHOLDS = {
  fixed: {
    fallbackRate: 2.0, // ≤ 2%
    microNone: 0, // = 0
    illegalFlip: 0, // = 0
    top1ShareWarning: 0.90, // Warning if > 90% (not blocking)
  },
  'l1-full': {
    fallbackRate: 1.0, // ≤ 1% (should be 0% ideally)
    microNone: 0, // = 0
    illegalFlip: 0, // = 0
  },
  'adaptiveL1': {
    fallbackRate: 1.0, // ≤ 1% (should be 0% ideally)
    microNone: 0, // = 0
    illegalFlip: 0, // = 0
  },
  'deep-realistic': {
    // Task P3.9: Separate fail (CI blocker) vs warning (target) thresholds
    fail: {
      fallbackRate: 10.0, // ≤ 10% (fail), ≤ 5% (target/warn)
      microNone: 0, // = 0 (fail)
      illegalFlip: 0, // = 0 (fail)
      askedL2AvgMin: 0.8, // ≥ 0.8 (fail), ≥ 1.5 (target/warn)
      gateCoverageScore: 0.50, // ≥ 0.50 (fail), ≥ 0.70 (target/warn) - Any (backward compatibility)
      gateCoverageScoreCardsOnly: 0.40, // ≥ 0.40 (fail), ≥ 0.60 (target/warn) - CardsOnly for core gates
      coreGatesAllHitRate: 30.0, // ≥ 30% (fail), ≥ 60% (target/warn) - Any (backward compatibility)
      coreGatesAllHitRateCardsOnly: 20.0, // ≥ 20% (fail), ≥ 50% (target/warn) - CardsOnly for core gates
      // Task P3.7: Core gates (valence/arousal/agency/clarity) use CardsOnly, load/social use Any
      gateCoverageRatesCardsOnly: {
        valence: 50.0, // ≥ 50% (fail), ≥ 70% (target/warn) - CardsOnly
        arousal: 50.0, // ≥ 50% (fail), ≥ 70% (target/warn) - CardsOnly
        agency: 60.0, // ≥ 60% (fail), ≥ 80% (target/warn) - CardsOnly
        clarity: 60.0, // ≥ 60% (fail), ≥ 80% (target/warn) - CardsOnly
      },
      gateCoverageRatesAny: {
        load: 30.0, // ≥ 30% (fail), ≥ 80% (target/warn) - Any (baseline OK)
        social: 40.0, // ≥ 40% (fail), ≥ 60% (target/warn) - Any (baseline OK)
      },
      weakEvidenceShare: 20.0, // ≤ 20% (fail), ≤ 10% (target/warn)
    },
    warn: {
      fallbackRate: 5.0, // ≤ 5% (target)
      askedL2AvgMin: 1.5, // ≥ 1.5 (target)
      gateCoverageScore: 0.70, // ≥ 0.70 (target) - Any (backward compatibility)
      gateCoverageScoreCardsOnly: 0.60, // ≥ 0.60 (target) - CardsOnly for core gates
      coreGatesAllHitRate: 60.0, // ≥ 60% (target) - Any (backward compatibility)
      coreGatesAllHitRateCardsOnly: 50.0, // ≥ 50% (target) - CardsOnly for core gates
      // Task P3.7: Core gates (CardsOnly), load/social (Any)
      gateCoverageRatesCardsOnly: {
        valence: 70.0,
        arousal: 70.0,
        agency: 80.0,
        clarity: 80.0,
      },
      gateCoverageRatesAny: {
        load: 80.0,
        social: 60.0,
      },
      weakEvidenceShare: 10.0, // ≤ 10% (target)
    },
  },
};

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function checkThresholds(report, flow, thresholds) {
  const derived = report.derived || {};
  const metadata = report.metadata || {};
  const effectiveFlow = metadata.effectiveFlow || metadata.flow || flow;
  const errors = [];
  const warnings = [];
  
  // Task P2.6.1: Special checks for deep-realistic
  if (effectiveFlow === 'deep-realistic') {
    if (!derived.deepRealistic) {
      errors.push('Missing deepRealistic section in report - simulation may have failed');
      return { errors, warnings };
    }
    
    const dr = derived.deepRealistic;
    const maxL1 = metadata.maxL1 || 6;
    const maxL2 = metadata.maxL2 || 6;
    
    // Task 3 + Invariants CI: Check invariant maxL2>0 => askedL2.avg>0
    if (maxL2 > 0 && (dr.askedL2?.avg ?? 0) === 0) {
      errors.push(`[INVARIANT VIOLATION] maxL2=${maxL2} > 0 but askedL2.avg=0. Run is not realistic. This should never happen.`);
    }
    
    // Task P3.9: Check L2 avg (fail vs warn)
    const askedL2Avg = dr.askedL2?.avg ?? 0;
    const failL2Min = thresholds.fail?.askedL2AvgMin || 0.8;
    const warnL2Min = thresholds.warn?.askedL2AvgMin || 1.5;
    if (askedL2Avg < failL2Min) {
      errors.push(`[FAIL] L2 avg ${askedL2Avg.toFixed(2)} < fail threshold ${failL2Min} (target: ${warnL2Min})`);
    } else if (askedL2Avg < warnL2Min) {
      warnings.push(`[WARN] L2 avg ${askedL2Avg.toFixed(2)} < target threshold ${warnL2Min} (current: ${failL2Min} fail threshold)`);
    }
    
    // Task P2.13: Check L1-only runs rate
    const l1OnlyRate = dr.l1OnlyRunsRate ?? 0;
    if (l1OnlyRate > 50) {
      errors.push(`L1-only runs rate is too high (${l1OnlyRate.toFixed(2)}%, expected <= 50%) - L2 is not being used`);
    }
    
    // Task P2.11: Check empty L2 plans
    const noL2Candidates = dr.noL2CandidatesCount ?? 0;
    if (noL2Candidates > 0) {
      warnings.push(`Empty L2 plans detected: ${noL2Candidates} runs had no_l2_candidates - investigate probe plan building`);
    }
    
    // Check that avgSteps is less than maxL1+maxL2 (not ask-all)
    const avgSteps = derived.avgSteps || 0;
    if (avgSteps >= (maxL1 + maxL2)) {
      errors.push(`avgSteps (${avgSteps.toFixed(2)}) >= maxL1+maxL2 (${maxL1 + maxL2}) - possible ask-all regression`);
    }
    
    // Check that askedL1 is not always max (not ask-all)
    const askedL1Avg = dr.askedL1?.avg ?? 0;
    const askedL1Max = dr.askedL1?.max ?? 0;
    if (askedL1Avg >= maxL1 * 0.95 && askedL1Max === maxL1) {
      warnings.push(`askedL1 avg (${askedL1Avg.toFixed(2)}) is very close to max (${maxL1}) - possible ask-all behavior`);
    }
    
    // Check that endedReason has variety (not just one reason)
    const endedReasons = Object.keys(dr.endedReasons || {});
    if (endedReasons.length < 2) {
      warnings.push(`endedReason has only ${endedReasons.length} value(s) - early stop logic may be broken`);
    }
    
    // Task P3.7 + P3.9: Check gate coverage metrics (core gates use CardsOnly, load/social use Any)
    const gateCoverage = dr.gateCoverage || {};
    const gateHitRatesAny = dr.gateHitRates || {};
    const gateHitRatesCardsOnly = dr.gateHitCardsOnlyRates || {};
    
    // Check gate coverage score for CardsOnly (core gates requirement)
    const gateCoverageScoreCardsOnly = gateCoverage.gateCoverageScoreCardsOnly || 0;
    const failGateScoreCardsOnly = thresholds.fail?.gateCoverageScoreCardsOnly || 0.40;
    const warnGateScoreCardsOnly = thresholds.warn?.gateCoverageScoreCardsOnly || 0.60;
    if (gateCoverageScoreCardsOnly < failGateScoreCardsOnly) {
      errors.push(`[FAIL] Gate Coverage Score (CardsOnly) ${gateCoverageScoreCardsOnly.toFixed(4)} < fail threshold ${failGateScoreCardsOnly} (target: ${warnGateScoreCardsOnly})`);
    } else if (gateCoverageScoreCardsOnly < warnGateScoreCardsOnly) {
      warnings.push(`[WARN] Gate Coverage Score (CardsOnly) ${gateCoverageScoreCardsOnly.toFixed(4)} < target threshold ${warnGateScoreCardsOnly} (current: ${failGateScoreCardsOnly} fail threshold)`);
    }
    
    // Check core gates all-hit rate for CardsOnly
    const coreGatesAllHitRateCardsOnly = gateCoverage.coreGatesAllHitRateCardsOnly || 0;
    const failCoreRateCardsOnly = thresholds.fail?.coreGatesAllHitRateCardsOnly || 20.0;
    const warnCoreRateCardsOnly = thresholds.warn?.coreGatesAllHitRateCardsOnly || 50.0;
    if (coreGatesAllHitRateCardsOnly < failCoreRateCardsOnly) {
      errors.push(`[FAIL] Core Gates All-Hit Rate (CardsOnly) ${coreGatesAllHitRateCardsOnly.toFixed(2)}% < fail threshold ${failCoreRateCardsOnly}% (target: ${warnCoreRateCardsOnly}%)`);
    } else if (coreGatesAllHitRateCardsOnly < warnCoreRateCardsOnly) {
      warnings.push(`[WARN] Core Gates All-Hit Rate (CardsOnly) ${coreGatesAllHitRateCardsOnly.toFixed(2)}% < target threshold ${warnCoreRateCardsOnly}% (current: ${failCoreRateCardsOnly}% fail threshold)`);
    }
    
    // Task P3.7: Check individual gate hit rates (core gates use CardsOnly, load/social use Any)
    // Note: gateHitRatesAny and gateHitRatesCardsOnly already declared above (lines 149-150)
    
    // Core gates: check CardsOnly
    const failRatesCardsOnly = thresholds.fail?.gateCoverageRatesCardsOnly || {};
    const warnRatesCardsOnly = thresholds.warn?.gateCoverageRatesCardsOnly || {};
    for (const gateName of ['valence', 'arousal', 'agency', 'clarity']) {
      const rate = (gateHitRatesCardsOnly[gateName] || 0) * 100;
      const failRate = failRatesCardsOnly[gateName] || 0;
      const warnRate = warnRatesCardsOnly[gateName] || 0;
      if (rate < failRate) {
        errors.push(`[FAIL] ${gateName} gate hit rate (CardsOnly) ${rate.toFixed(2)}% < fail threshold ${failRate}% (target: ${warnRate}%)`);
      } else if (rate < warnRate) {
        warnings.push(`[WARN] ${gateName} gate hit rate (CardsOnly) ${rate.toFixed(2)}% < target threshold ${warnRate}% (current: ${failRate}% fail threshold)`);
      }
    }
    
    // Load/Social: check Any (baseline OK)
    const failRatesAny = thresholds.fail?.gateCoverageRatesAny || {};
    const warnRatesAny = thresholds.warn?.gateCoverageRatesAny || {};
    for (const gateName of ['load', 'social']) {
      const rate = (gateHitRatesAny[gateName] || 0) * 100;
      const failRate = failRatesAny[gateName] || 0;
      const warnRate = warnRatesAny[gateName] || 0;
      if (rate < failRate) {
        errors.push(`[FAIL] ${gateName} gate hit rate (Any) ${rate.toFixed(2)}% < fail threshold ${failRate}% (target: ${warnRate}%)`);
      } else if (rate < warnRate) {
        warnings.push(`[WARN] ${gateName} gate hit rate (Any) ${rate.toFixed(2)}% < target threshold ${warnRate}% (current: ${failRate}% fail threshold)`);
      }
    }
    
    // Task P2.26: Check avgSteps is reasonable (not ask-all)
    // Note: avgSteps already declared above (line 129)
    const maxSteps = maxL1 + maxL2;
    if (avgSteps >= maxSteps * 0.9) {
      warnings.push(`avgSteps (${avgSteps.toFixed(2)}) is close to max (${maxSteps}) - may be ask-all behavior`);
    }
  }
  
  // Task P3.9: Check fallback rate (fail vs warn) - only if thresholds has fail/warn structure
  if (thresholds.fail && thresholds.warn) {
    const fallbackRate = derived.microFallbackRate || 0;
    const failThreshold = thresholds.fail.fallbackRate || 10.0;
    const warnThreshold = thresholds.warn.fallbackRate || 5.0;
    if (fallbackRate > failThreshold) {
      errors.push(`[FAIL] Fallback rate ${fallbackRate.toFixed(2)}% > fail threshold ${failThreshold}% (target: ${warnThreshold}%)`);
    } else if (fallbackRate > warnThreshold) {
      warnings.push(`[WARN] Fallback rate ${fallbackRate.toFixed(2)}% > target threshold ${warnThreshold}% (current: ${failThreshold}% fail threshold)`);
    }
  } else {
    // Legacy: single threshold
    const fallbackRate = derived.microFallbackRate || 0;
    if (fallbackRate > (thresholds.fallbackRate || 10.0)) {
      errors.push(`Fallback rate ${fallbackRate.toFixed(2)}% exceeds threshold ${thresholds.fallbackRate}%`);
    }
  }
  
  // Check micro none (always fail)
  const microNoneRate = derived.microNoneRate || 0;
  const microNoneThreshold = thresholds.fail?.microNone ?? thresholds.microNone ?? 0;
  if (microNoneRate > microNoneThreshold) {
    errors.push(`Micro none rate ${microNoneRate.toFixed(2)}% exceeds threshold ${microNoneThreshold}%`);
  }
  
  // Check illegal flip (always fail)
  const illegalFlipRate = derived.illegalFlipRate || 0;
  const illegalFlipThreshold = thresholds.fail?.illegalFlip ?? thresholds.illegalFlip ?? 0;
  if (illegalFlipRate > illegalFlipThreshold) {
    errors.push(`Illegal flip rate ${illegalFlipRate.toFixed(2)}% exceeds threshold ${illegalFlipThreshold}%`);
  }
  
  // Check top1 share warnings (non-blocking)
  const diversity = derived.microDiversityByMacro || {};
  for (const [macro, stats] of Object.entries(diversity)) {
    if (stats.top1Share > thresholds.top1ShareWarning) {
      warnings.push(`${macro}: Top1 share ${(stats.top1Share * 100).toFixed(2)}% > ${(thresholds.top1ShareWarning * 100)}% (low diversity)`);
    }
  }
  
  return { errors, warnings };
}

async function main() {
  const args = process.argv.slice(2);
  const reportPath = args[0] || path.join(__dirname, 'out', 'deep_balance_noisy_mixed.json');
  const flow = args[1] || 'fixed';
  
  console.log('='.repeat(80));
  console.log('DEEP BALANCE THRESHOLD CHECK (Task P2.6)');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Report: ${reportPath}`);
  console.log(`Flow: ${flow}`);
  console.log('');
  
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Report file not found: ${reportPath}`);
    process.exit(1);
  }
  
  const report = readJson(reportPath);
  const metadata = report.metadata || {};
  const effectiveFlow = metadata.effectiveFlow || metadata.flow || flow;
  
  // Task P2.6.1: Use effectiveFlow for threshold selection
  const thresholds = THRESHOLDS[effectiveFlow] || THRESHOLDS[flow] || THRESHOLDS.fixed;
  
  console.log('Thresholds:');
  if (thresholds.fail && thresholds.warn) {
    // Task P3.9: Show fail vs warn thresholds
    console.log(`  Fallback rate: ≤ ${thresholds.fail.fallbackRate}% (fail), ≤ ${thresholds.warn.fallbackRate}% (target/warn)`);
    console.log(`  Micro none: = ${thresholds.fail.microNone}% (fail)`);
    console.log(`  Illegal flip: = ${thresholds.fail.illegalFlip}% (fail)`);
    console.log(`  Asked L2 avg: ≥ ${thresholds.fail.askedL2AvgMin} (fail), ≥ ${thresholds.warn.askedL2AvgMin} || 'N/A'} (target/warn)`);
    console.log(`  Gate coverage score: ≥ ${thresholds.fail.gateCoverageScore} (fail), ≥ ${thresholds.warn.gateCoverageScore} (target/warn)`);
    console.log(`  Core gates all-hit rate: ≥ ${thresholds.fail.coreGatesAllHitRate}% (fail), ≥ ${thresholds.warn.coreGatesAllHitRate}% (target/warn)`);
    if (thresholds.fail.gateCoverageRates) {
      console.log(`  Individual gate hit rates (fail / target):`);
      for (const gateName of ['valence', 'arousal', 'agency', 'clarity', 'load', 'social']) {
        const failRate = thresholds.fail.gateCoverageRates[gateName] || 0;
        const warnRate = thresholds.warn.gateCoverageRates[gateName] || 0;
        console.log(`    ${gateName}: ≥ ${failRate}% / ≥ ${warnRate}%`);
      }
    }
  } else {
    // Legacy: single thresholds
    console.log(`  Fallback rate: ≤ ${thresholds.fallbackRate || 'N/A'}%`);
    console.log(`  Micro none: = ${thresholds.microNone || 0}%`);
    console.log(`  Illegal flip: = ${thresholds.illegalFlip || 0}%`);
    if (thresholds.top1ShareWarning) {
      console.log(`  Top1 share warning: > ${(thresholds.top1ShareWarning * 100)}%`);
    }
    if (thresholds.gateCoverageScore) {
      console.log(`  Gate coverage score: ≥ ${thresholds.gateCoverageScore}`);
    }
    if (thresholds.coreGatesAllHitRate) {
      console.log(`  Core gates all-hit rate: ≥ ${thresholds.coreGatesAllHitRate}%`);
    }
    if (thresholds.gateCoverageRates) {
      console.log(`  Individual gate hit rates:`);
      for (const [gate, rate] of Object.entries(thresholds.gateCoverageRates)) {
        console.log(`    ${gate}: ≥ ${rate}%`);
      }
    }
  }
  console.log('');
  
  const { errors, warnings } = checkThresholds(report, flow, thresholds);
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings (non-blocking):');
    for (const w of warnings) {
      console.log(`  - ${w}`);
    }
    console.log('');
  }
  
  if (errors.length > 0) {
    console.log('❌ Threshold violations:');
    for (const e of errors) {
      console.log(`  - ${e}`);
    }
    console.log('');
    console.log('❌ CI check FAILED');
    process.exit(1);
  }
  
  console.log('✅ All thresholds passed');
  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} warning(s) (non-blocking)`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
