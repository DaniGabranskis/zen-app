// macroFlipSpotChecks.js (AL2 - Macro Flip Spot Checks)
// Tests macro flip behavior on specific scenarios

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
  console.log('MACRO FLIP SPOT CHECKS (Task AL2)');
  console.log('='.repeat(80));
  console.log('');
  
  // Task AL2: Flip spot checks (where flip should/shouldn't happen)
  const FLIP_TESTS = [
    // Flip SHOULD happen
    {
      name: 'Flip: pressured → blocked (strong evidence)',
      baseline: { valence: 3, energy: 6, tension: 6, clarity: 4, control: 5, social: 3 },
      expectedBaselineMacro: 'pressured',
      l1Responses: [
        { tags: ['sig.micro.blocked.frozen', 'sig.cognition.blank'], values: {}, uncertainty: null },
        { tags: ['sig.micro.blocked.stuck', 'sig.cognition.rumination'], values: {}, uncertainty: null },
        { tags: ['sig.agency.low', 'sig.trigger.uncertainty'], values: {}, uncertainty: null },
      ],
      shouldFlip: true,
      expectedMacro: 'blocked',
      expectedMicro: 'blocked.frozen',
    },
    {
      name: 'Flip: pressured → overloaded (strong evidence)',
      baseline: { valence: 3, energy: 6, tension: 6, clarity: 4, control: 5, social: 3 },
      expectedBaselineMacro: 'pressured',
      l1Responses: [
        { tags: ['sig.micro.overloaded.cognitive', 'sig.cognition.racing'], values: {}, uncertainty: null },
        { tags: ['sig.micro.overloaded.too_many_tasks', 'sig.context.work.overcommit'], values: {}, uncertainty: null },
        { tags: ['sig.fatigue.high', 'sig.tension.high'], values: {}, uncertainty: null },
      ],
      shouldFlip: true,
      expectedMacro: 'overloaded',
      expectedMicro: 'overloaded.cognitive',
    },
    
    // Flip SHOULD NOT happen
    {
      name: 'No flip: grounded (high confidence baseline)',
      baseline: { valence: 6, energy: 5, tension: 2, clarity: 6, control: 6, social: 4 },
      expectedBaselineMacro: 'grounded',
      l1Responses: [
        { tags: ['sig.micro.pressured.rushed', 'sig.context.work.deadline'], values: {}, uncertainty: null },
      ],
      shouldFlip: false,
      expectedMacro: 'grounded', // Should stay grounded (high confidence)
      expectedMicro: null, // No micro match for pressured tags in grounded
    },
    {
      name: 'No flip: connected (semantic blocker)',
      baseline: { valence: 6, energy: 5, tension: 2, clarity: 5, control: 5, social: 6 },
      expectedBaselineMacro: 'connected',
      l1Responses: [
        { tags: ['sig.micro.exhausted.drained', 'sig.fatigue.high'], values: {}, uncertainty: null },
      ],
      shouldFlip: false,
      expectedMacro: 'connected', // Should NOT flip to exhausted (F_high blocks connected)
      expectedMicro: null,
    },
    {
      name: 'No flip: exhausted → connected (semantic blocker)',
      baseline: { valence: 2, energy: 1, tension: 3, clarity: 4, control: 3, social: 6 },
      expectedBaselineMacro: 'exhausted',
      l1Responses: [
        { tags: ['sig.micro.connected.warm', 'sig.context.social.support'], values: {}, uncertainty: null },
      ],
      shouldFlip: false,
      expectedMacro: 'exhausted', // Should NOT flip to connected (F_high blocks connected)
      expectedMicro: null,
    },
    {
      name: 'No flip: weak evidence (low weight)',
      baseline: { valence: 3, energy: 6, tension: 6, clarity: 4, control: 5, social: 3 },
      expectedBaselineMacro: 'pressured',
      l1Responses: [
        { tags: ['sig.micro.blocked.stuck'], values: {}, uncertainty: null }, // Single tag, weak evidence
      ],
      shouldFlip: false,
      expectedMacro: 'pressured', // Should stay pressured (weak evidence)
      expectedMicro: null,
    },
    {
      name: 'No flip: cross-cluster (not neighbor)',
      baseline: { valence: 6, energy: 5, tension: 2, clarity: 5, control: 5, social: 6 },
      expectedBaselineMacro: 'connected',
      l1Responses: [
        { tags: ['sig.micro.exhausted.drained', 'sig.fatigue.high'], values: {}, uncertainty: null },
      ],
      shouldFlip: false,
      expectedMacro: 'connected', // Should NOT flip (positive → low_energy is not neighbor)
      expectedMicro: null,
    },
  ];
  
  console.log(`Running ${FLIP_TESTS.length} flip spot checks...\n`);
  
  let passed = 0;
  let failed = 0;
  const failures = [];
  
  for (const test of FLIP_TESTS) {
    // Get baseline truth
    const baselineResult = routeStateFromBaselineCanonical(test.baseline, {
      evidenceVector: null,
      evidenceWeight: 0.25,
    });
    
    const baselineMacro = baselineResult.stateKey;
    
    // Check baseline macro matches expected
    if (baselineMacro !== test.expectedBaselineMacro) {
      failed++;
      failures.push({
        test,
        error: `Baseline macro mismatch: expected ${test.expectedBaselineMacro}, got ${baselineMacro}`,
      });
      console.error(`❌ ${test.name}`);
      console.error(`   Baseline macro mismatch: expected ${test.expectedBaselineMacro}, got ${baselineMacro}`);
      continue;
    }
    
    // Run deep engine
    const deepResult = routeStateFromDeepCanonical(test.baseline, test.l1Responses, {
      evidenceWeight: 0.45,
    });
    
    let testPassed = true;
    const errors = [];
    
    // Check flip behavior
    if (test.shouldFlip) {
      if (!deepResult.macroFlipApplied) {
        testPassed = false;
        errors.push(`Flip should happen but didn't (macroFlipApplied=false)`);
      }
      if (deepResult.macroKey !== test.expectedMacro) {
        testPassed = false;
        errors.push(`Expected macro ${test.expectedMacro}, got ${deepResult.macroKey}`);
      }
      if (test.expectedMicro && deepResult.microKey !== test.expectedMicro) {
        testPassed = false;
        errors.push(`Expected micro ${test.expectedMicro}, got ${deepResult.microKey}`);
      }
    } else {
      if (deepResult.macroFlipApplied) {
        testPassed = false;
        errors.push(`Flip should NOT happen but did (macroFlipApplied=true, reason=${deepResult.macroFlipReason})`);
      }
      if (deepResult.macroKey !== test.expectedMacro) {
        testPassed = false;
        errors.push(`Expected macro ${test.expectedMacro}, got ${deepResult.macroKey}`);
      }
    }
    
    if (testPassed) {
      passed++;
      console.log(`✅ ${test.name}`);
      console.log(`   Baseline: ${baselineMacro}, Deep: ${deepResult.macroKey} (${deepResult.microKey || 'null'}), Flip: ${deepResult.macroFlipApplied}`);
    } else {
      failed++;
      failures.push({ test, deepResult, errors });
      console.error(`❌ ${test.name}`);
      for (const err of errors) {
        console.error(`   ${err}`);
      }
      console.error(`   Baseline: ${baselineMacro}, Deep: ${deepResult.macroKey} (${deepResult.microKey || 'null'}), Flip: ${deepResult.macroFlipApplied}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('FLIP SPOT CHECKS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Passed: ${passed}/${FLIP_TESTS.length}`);
  console.log(`Failed: ${failed}/${FLIP_TESTS.length}`);
  
  if (failures.length > 0) {
    console.error('\n❌ FAILURES:');
    for (const { test, deepResult, errors, error } of failures) {
      console.error(`\n${test.name}:`);
      if (error) {
        console.error(`  ${error}`);
      } else {
        for (const err of errors) {
          console.error(`  ${err}`);
        }
        console.error(`  Deep result:`, {
          macroKey: deepResult.macroKey,
          microKey: deepResult.microKey,
          macroFlipApplied: deepResult.macroFlipApplied,
          macroFlipReason: deepResult.macroFlipReason,
          confidenceBand: deepResult.confidenceBand,
        });
      }
    }
    process.exit(1);
  } else {
    console.log('\n✅ All flip spot checks passed!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
