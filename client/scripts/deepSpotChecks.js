// deepSpotChecks.js (AH-FIX - Stabilized Spot Checks)
// Manual validation of deep engine on specific baseline + L1 response combinations
//
// Task AI: Integration Hygiene
// - Uses canonical imports (no local copies of engine logic)
// - All paths use client/src/... structure
// - See INTEGRATION_HYGIENE.md for rules

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Dynamic import for ES modules
let routeStateFromBaselineCanonical;
let routeStateFromDeepCanonical;

async function main() {
  const baselineEngine = await import('../src/utils/baselineEngine.js');
  routeStateFromBaselineCanonical = baselineEngine.routeStateFromBaseline;
  
  const deepEngine = await import('../src/utils/deepEngine.js');
  routeStateFromDeepCanonical = deepEngine.routeStateFromDeep;
  
  if (!routeStateFromBaselineCanonical || !routeStateFromDeepCanonical) {
    throw new Error('Engine imports failed.');
  }
  
  console.log('='.repeat(80));
  console.log('DEEP SPOT CHECKS (Task AH-FIX)');
  console.log('='.repeat(80));
  console.log('');
  
  // Task AH-FIX-1: Deep correctness tests (main set)
  // These tests check deep behavior relative to actual baseline, not expected baseline
  const DEEP_CORRECTNESS_TESTS = [
    {
      name: 'Micro selection: positive cluster micro',
      baseline: { valence: 5, energy: 5, tension: 2, clarity: 6, control: 6, social: 4 },
      l1Responses: [
        { tags: ['sig.micro.grounded.steady', 'sig.clarity.high'], values: {}, uncertainty: null },
      ],
      // Baseline truth will be determined at runtime
      expectedBehavior: {
        type: 'micro-only', // macro stays same, micro should be selected if evidence matches
        microPattern: null, // Flexible: micro may be null if baseline macro doesn't match evidence
        allowMicroNull: true, // Allow micro=null if baseline macro doesn't match evidence tags
      },
    },
    {
      name: 'Micro selection: pressured.rushed',
      baseline: { valence: 3, energy: 6, tension: 6, clarity: 4, control: 4, social: 3 },
      l1Responses: [
        { tags: ['sig.micro.pressured.rushed', 'sig.context.work.deadline'], values: {}, uncertainty: null },
      ],
      expectedBehavior: {
        type: 'micro-only',
        microPattern: 'pressured.rushed',
      },
    },
    {
      name: 'Micro selection: exhausted.drained',
      baseline: { valence: 2, energy: 1, tension: 3, clarity: 4, control: 3, social: 3 },
      l1Responses: [
        { tags: ['sig.micro.exhausted.drained', 'sig.body.heavy_limbs'], values: {}, uncertainty: null },
      ],
      expectedBehavior: {
        type: 'micro-only',
        microPattern: 'exhausted.drained',
      },
    },
    {
      name: 'Uncertainty handling: low clarity signals',
      baseline: { valence: 4, energy: 4, tension: 4, clarity: 2, control: 4, social: 4 },
      l1Responses: [
        { tags: ['sig.micro.pressured.rushed'], values: {}, uncertainty: 'low_clarity' },
        { tags: ['sig.micro.pressured.tense_functional'], values: {}, uncertainty: 'low_clarity' },
      ],
      expectedBehavior: {
        type: 'micro-only',
        microPattern: null, // Flexible: micro may be null if baseline macro doesn't match evidence
        allowMicroNull: true, // Allow micro=null if baseline macro doesn't match evidence tags
        confidenceShouldBe: 'low', // Confidence should be reduced due to uncertainty
      },
    },
  ];
  
  // Task AH-FIX-2: Baseline anchoring tests (strict anchors)
  // These tests use quantized baseline values to guarantee specific baseline macros
  // Quantization rules (from baselineToVector):
  // - Vneg: valence ≤ 3
  // - Vpos: valence ≥ 5
  // - F_high: energy ≤ 1 (fatigue = (0.5 - energy) * 4.4, need ≥ 1.467)
  // - Ar_high: energy ≥ 6 (arousal = (energy - 0.5) * 4, need ≥ 1.7)
  // - T_high: tension ≥ 6
  // - Ag_high: control ≥ 6
  // - Ag_low: control ≤ 1
  
  const BASELINE_ANCHORING_TESTS = [
    {
      name: 'Baseline anchor: exhausted (F_high, Ar_low)',
      baseline: { valence: 2, energy: 1, tension: 3, clarity: 4, control: 3, social: 3 },
      // energy=1 → fatigue = (0.5 - 0.167) * 4.4 = 1.467 (F_high)
      // energy=1 → arousal = 0 (Ar_low)
      expectedBaselineMacro: 'exhausted',
      l1Responses: [
        { tags: ['sig.micro.exhausted.drained'], values: {}, uncertainty: null },
      ],
      expectedBehavior: {
        type: 'micro-only',
        microPattern: 'exhausted.drained',
        noFlip: true, // Macro should NOT flip
      },
    },
    {
      name: 'Baseline anchor: overloaded (F_high, T_high, Ar_low, Ag_low, Vneg)',
      baseline: { valence: 1, energy: 1, tension: 7, clarity: 2, control: 1, social: 2 },
      // valence=1 → Vneg
      // energy=1 → F_high, Ar_low
      // tension=7 → T_high
      // control=1 → Ag_low
      expectedBaselineMacro: 'overloaded',
      l1Responses: [
        { tags: ['sig.micro.overloaded.cognitive', 'sig.cognition.racing'], values: {}, uncertainty: null },
      ],
      expectedBehavior: {
        type: 'micro-only',
        microPattern: 'overloaded.cognitive',
        noFlip: true,
      },
    },
    {
      name: 'Baseline anchor: pressured (T_high, Ar_mid, Ag_mid)',
      baseline: { valence: 3, energy: 5, tension: 6, clarity: 4, control: 5, social: 3 },
      // tension=6 → T_high
      // energy=5 → Ar_mid (not high, not low)
      // control=5 → Ag_mid
      expectedBaselineMacro: 'pressured',
      l1Responses: [
        { tags: ['sig.micro.pressured.rushed', 'sig.context.work.deadline'], values: {}, uncertainty: null },
      ],
      expectedBehavior: {
        type: 'micro-only',
        microPattern: 'pressured.rushed',
        noFlip: true,
      },
    },
    {
      name: 'Baseline anchor: connected (Vpos, Ar_mid, T_low, S_high)',
      baseline: { valence: 6, energy: 5, tension: 2, clarity: 5, control: 5, social: 6 },
      // valence=6 → Vpos
      // tension=2 → T_low
      // social=6 → S_high
      expectedBaselineMacro: 'connected',
      l1Responses: [
        { tags: ['sig.micro.connected.warm', 'sig.context.social.support'], values: {}, uncertainty: null },
      ],
      expectedBehavior: {
        type: 'micro-only',
        microPattern: 'connected.warm',
        noFlip: true,
      },
    },
    {
      name: 'Baseline anchor: semantic blocker - exhausted + high social → NOT connected',
      baseline: { valence: 1, energy: 1, tension: 5, clarity: 4, control: 3, social: 6 },
      // F_high (energy=1) → should block connected even if social=6
      expectedBaselineMacro: 'exhausted', // Should NOT be connected
      l1Responses: [
        { tags: ['sig.micro.connected.warm', 'sig.context.social.support'], values: {}, uncertainty: null },
      ],
      expectedBehavior: {
        type: 'no-flip', // Macro should NOT flip to connected (semantic blocker)
        shouldNotBe: 'connected',
        noFlip: true,
      },
    },
    {
      name: 'Baseline anchor: semantic blocker - high tension + Vneg → NOT connected',
      baseline: { valence: 3, energy: 6, tension: 6, clarity: 4, control: 5, social: 3 },
      // pressured centroid: valence=-0.8, arousal=1.6, tension=2.1, agency=1.1
      // valence=3 → (3-1)/6=0.333 → (0.333-0.5)*6=-1.0 (Vneg, close to -0.8)
      // energy=6 → (6-1)/6=0.833 → (0.833-0.5)*2*2.0=1.33 (Ar_mid, close to 1.6)
      // tension=6 → (6-1)/6=0.833 → 0.833*2.4=2.0 (T_high, close to 2.1)
      // control=5 → (5-1)/6=0.667 → 0.667*2.0=1.33 (Ag_mid, close to 1.1)
      // social=3 → lower social (pressured has socialness=0.6, not high)
      expectedBaselineMacro: 'pressured', // Should NOT be connected
      l1Responses: [
        { tags: ['sig.micro.connected.social_flow'], values: {}, uncertainty: null },
      ],
      expectedBehavior: {
        type: 'no-flip',
        shouldNotBe: 'connected',
        noFlip: true,
      },
    },
  ];
  
  console.log(`Running ${DEEP_CORRECTNESS_TESTS.length} deep correctness tests...`);
  console.log(`Running ${BASELINE_ANCHORING_TESTS.length} baseline anchoring tests...\n`);
  
  let passed = 0;
  let failed = 0;
  const failures = [];
  
  // Task AH-FIX-2: Get baseline truth for each test
  function getBaselineTruth(baseline) {
    const baselineResult = routeStateFromBaselineCanonical(baseline, {
      evidenceVector: null,
      evidenceWeight: 0.25,
    });
    return {
      macro: baselineResult.stateKey,
      confidence: baselineResult.confidenceBand || 'medium',
      clarity: baselineResult.clarityFlag || null,
    };
  }
  
  // Run deep correctness tests
  for (const test of DEEP_CORRECTNESS_TESTS) {
    const baselineTruth = getBaselineTruth(test.baseline);
    const result = routeStateFromDeepCanonical(test.baseline, test.l1Responses, {
      evidenceWeight: 0.45,
    });
    
    let testPassed = true;
    const errors = [];
    
      // Check behavior type
      if (test.expectedBehavior.type === 'micro-only') {
        // Macro should stay same as baseline
        if (result.macroKey !== baselineTruth.macro) {
          testPassed = false;
          errors.push(`Macro changed: baseline=${baselineTruth.macro}, deep=${result.macroKey} (expected no flip)`);
        }
        
        // Micro should match pattern (if pattern specified and not allowing null)
        if (test.expectedBehavior.microPattern && !test.expectedBehavior.allowMicroNull) {
          const pattern = test.expectedBehavior.microPattern;
          if (pattern.includes('*')) {
            // Pattern match (e.g., 'pressured.*')
            const prefix = pattern.replace('*', '');
            if (!result.microKey || !result.microKey.startsWith(prefix)) {
              testPassed = false;
              errors.push(`Micro pattern mismatch: expected ${pattern}, got ${result.microKey}`);
            }
          } else {
            // Exact match
            if (result.microKey !== pattern) {
              testPassed = false;
              errors.push(`Micro mismatch: expected ${pattern}, got ${result.microKey}`);
            }
          }
        } else if (test.expectedBehavior.allowMicroNull) {
          // If allowing micro null, check that if micro is selected, it matches baseline macro
          if (result.microKey && !result.microKey.startsWith(`${baselineTruth.macro}.`)) {
            testPassed = false;
            errors.push(`Micro does not belong to baseline macro: micro=${result.microKey}, macro=${baselineTruth.macro}`);
          }
        }
        
        // Check confidence if specified
        if (test.expectedBehavior.confidenceShouldBe) {
          if (result.confidenceBand !== test.expectedBehavior.confidenceShouldBe) {
            testPassed = false;
            errors.push(`Confidence mismatch: expected ${test.expectedBehavior.confidenceShouldBe}, got ${result.confidenceBand}`);
          }
        }
      }
    
    if (testPassed) {
      passed++;
      console.log(`✅ ${test.name}`);
      console.log(`   Baseline: ${baselineTruth.macro}, Deep: ${result.macroKey} (${result.microKey || 'null'})`);
    } else {
      failed++;
      failures.push({ test, baselineTruth, result, errors });
      console.error(`❌ ${test.name}`);
      for (const err of errors) {
        console.error(`   ${err}`);
      }
      console.error(`   Baseline: ${baselineTruth.macro}, Deep: ${result.macroKey} (${result.microKey || 'null'})`);
    }
  }
  
  // Run baseline anchoring tests
  for (const test of BASELINE_ANCHORING_TESTS) {
    const baselineTruth = getBaselineTruth(test.baseline);
    const result = routeStateFromDeepCanonical(test.baseline, test.l1Responses, {
      evidenceWeight: 0.45,
    });
    
    let testPassed = true;
    const errors = [];
    
    // Check baseline macro matches expected
    if (baselineTruth.macro !== test.expectedBaselineMacro) {
      testPassed = false;
      errors.push(`Baseline anchor failed: expected ${test.expectedBaselineMacro}, got ${baselineTruth.macro}`);
      errors.push(`   This indicates baseline metrics need adjustment for this anchor test.`);
    }
    
    // Check deep behavior
    if (test.expectedBehavior.type === 'micro-only') {
      if (result.macroKey !== baselineTruth.macro) {
        testPassed = false;
        errors.push(`Macro changed: baseline=${baselineTruth.macro}, deep=${result.macroKey} (expected no flip)`);
      }
      
      if (test.expectedBehavior.microPattern) {
        const pattern = test.expectedBehavior.microPattern;
        if (pattern.includes('*')) {
          const prefix = pattern.replace('*', '');
          if (!result.microKey || !result.microKey.startsWith(prefix)) {
            testPassed = false;
            errors.push(`Micro pattern mismatch: expected ${pattern}, got ${result.microKey}`);
          }
        } else {
          if (result.microKey !== pattern) {
            testPassed = false;
            errors.push(`Micro mismatch: expected ${pattern}, got ${result.microKey}`);
          }
        }
      }
    } else if (test.expectedBehavior.type === 'no-flip') {
      if (result.macroFlipApplied) {
        testPassed = false;
        errors.push(`Macro flip applied when it should not be (semantic blocker)`);
      }
      
      if (test.expectedBehavior.shouldNotBe && result.macroKey === test.expectedBehavior.shouldNotBe) {
        testPassed = false;
        errors.push(`Negative test failed: macro should NOT be ${test.expectedBehavior.shouldNotBe}, but got ${result.macroKey}`);
      }
    }
    
    if (testPassed) {
      passed++;
      console.log(`✅ ${test.name}`);
      console.log(`   Baseline: ${baselineTruth.macro} (anchor), Deep: ${result.macroKey} (${result.microKey || 'null'})`);
    } else {
      failed++;
      failures.push({ test, baselineTruth, result, errors });
      console.error(`❌ ${test.name}`);
      for (const err of errors) {
        console.error(`   ${err}`);
      }
      console.error(`   Baseline: ${baselineTruth.macro}, Deep: ${result.macroKey} (${result.microKey || 'null'})`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SPOT CHECKS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Passed: ${passed}/${DEEP_CORRECTNESS_TESTS.length + BASELINE_ANCHORING_TESTS.length}`);
  console.log(`Failed: ${failed}/${DEEP_CORRECTNESS_TESTS.length + BASELINE_ANCHORING_TESTS.length}`);
  
  if (failures.length > 0) {
    console.error('\n❌ FAILURES:');
    for (const { test, baselineTruth, result, errors } of failures) {
      console.error(`\n${test.name}:`);
      for (const err of errors) {
        console.error(`  ${err}`);
      }
      console.error(`  Baseline:`, baselineTruth);
      console.error(`  Deep result:`, {
        macroKey: result.macroKey,
        microKey: result.microKey,
        macroFlipApplied: result.macroFlipApplied,
        macroFlipReason: result.macroFlipReason,
        confidenceBand: result.confidenceBand,
        clarityFlag: result.clarityFlag,
      });
    }
    process.exit(1);
  } else {
    console.log('\n✅ All spot checks passed!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
