// checkMicroCoverage.js (AK2 - Targeted Micro Generator)
// Generates L1 responses targeted at specific micro states to test reachability

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Dynamic import for ES modules
let routeStateFromDeepCanonical;
let getMicroEvidenceTags;

async function main() {
  const deepEngine = await import('../src/utils/deepEngine.js');
  routeStateFromDeepCanonical = deepEngine.routeStateFromDeep;
  
  const microEvidenceTags = await import('../src/data/microEvidenceTags.js');
  getMicroEvidenceTags = microEvidenceTags.getMicroEvidenceTags;
  
  if (!routeStateFromDeepCanonical || !getMicroEvidenceTags) {
    throw new Error('Imports failed.');
  }
  
  console.log('='.repeat(80));
  console.log('MICRO COVERAGE HARNESS (Task AK2)');
  console.log('='.repeat(80));
  console.log('');
  
  // Task AK1: Get all micro states from taxonomy
  const { getAllMicroKeys } = await import('../src/data/microTaxonomy.js');
  const allMicroKeys = getAllMicroKeys();
  console.log(`Total micro states: ${allMicroKeys.length}`);
  console.log('');
  
  // Task AK3.1: Use same pipeline as runtime (evidenceAccumulator)
  const evidenceAccumulator = await import('../src/utils/evidenceAccumulator.js');
  const { accumulateEvidence } = evidenceAccumulator;
  
  // Task AK2: Generate targeted L1 responses for each micro
  function generateTargetedL1Responses(microKey) {
    const evidenceTags = getMicroEvidenceTags(microKey);
    if (!evidenceTags) {
      return null; // Micro not in evidence tags map
    }
    
    // Generate 2-3 L1 responses with must-have and supporting tags
    const responses = [];
    const mustHaveCount = Math.min(evidenceTags.mustHave.length, 2);
    const supportingCount = Math.min(evidenceTags.supporting.length, 1);
    
    // First response: must-have tags
    if (evidenceTags.mustHave.length > 0) {
      responses.push({
        tags: evidenceTags.mustHave.slice(0, mustHaveCount),
        values: {},
        uncertainty: null,
      });
    }
    
    // Second response: remaining must-have + supporting
    if (evidenceTags.mustHave.length > mustHaveCount || evidenceTags.supporting.length > 0) {
      const remainingMustHave = evidenceTags.mustHave.slice(mustHaveCount);
      const supporting = evidenceTags.supporting.slice(0, supportingCount);
      responses.push({
        tags: [...remainingMustHave, ...supporting],
        values: {},
        uncertainty: null,
      });
    }
    
    // Third response: additional supporting tags (if any)
    if (evidenceTags.supporting.length > supportingCount) {
      responses.push({
        tags: evidenceTags.supporting.slice(supportingCount),
        values: {},
        uncertainty: null,
      });
    }
    
    return responses.length > 0 ? responses : null;
  }
  
  // Task AK3.1: Normalize L1 responses through same pipeline as runtime
  function normalizeL1Responses(l1Responses) {
    // Use accumulateEvidence to normalize tags (same as runtime)
    // accumulateEvidence expects array of { tags, values, uncertainty }
    const normalized = accumulateEvidence(l1Responses);
    return normalized.evidenceTags || [];
  }
  
  // Task AK2: Test each micro with targeted evidence
  // Use a representative baseline for each macro
  // Task AK3.6-AK3.8: Adjusted baselines to ensure correct macro selection
  // Based on state centroids: grounded (valence: 2.1, arousal: 0.6, tension: 0.2, agency: 1.9, certainty: 1.9)
  // capable (valence: 1.0, arousal: 1.3, tension: 0.5, agency: 2.0, certainty: 1.7)
  // blocked (valence: -1.2, arousal: 0.8, tension: 1.8, agency: 0.4, certainty: 0.8)
  // detached (valence: -0.9, arousal: 0.4, tension: 0.6, agency: 0.4, certainty: 0.8)
  const macroBaselines = {
    grounded: { valence: 6, energy: 3, tension: 1, clarity: 7, control: 7, social: 4 }, // Low energy (low arousal), high clarity/control
    engaged: { valence: 6, energy: 6, tension: 3, clarity: 5, control: 5, social: 3 },
    connected: { valence: 6, energy: 5, tension: 2, clarity: 5, control: 5, social: 7 },
    capable: { valence: 5, energy: 5, tension: 2, clarity: 6, control: 7, social: 4 }, // High agency (control), high clarity
    pressured: { valence: 3, energy: 6, tension: 7, clarity: 4, control: 5, social: 3 },
    blocked: { valence: 2, energy: 6, tension: 7, clarity: 4, control: 1, social: 3 }, // Low agency (control), high tension, high arousal (energy), mid clarity
    overloaded: { valence: 1, energy: 1, tension: 7, clarity: 2, control: 1, social: 2 },
    exhausted: { valence: 2, energy: 1, tension: 3, clarity: 4, control: 3, social: 3 },
    down: { valence: 1, energy: 2, tension: 3, clarity: 4, control: 2, social: 2 },
    averse: { valence: 1, energy: 5, tension: 6, clarity: 4, control: 4, social: 3 },
    detached: { valence: 3, energy: 2, tension: 2, clarity: 2, control: 1, social: 1 }, // Low arousal, low agency, low certainty, low social, slightly positive valence
  };
  
  const results = {
    reachable: [],
    unreachable: [],
    unreachableReasons: {},
    unreachableDiagnostics: {}, // Task AK3.2: Detailed diagnostics
  };
  
  console.log('Testing micro reachability with targeted evidence...\n');
  
  for (const microKey of allMicroKeys) {
    const [macro] = microKey.split('.');
    const baseline = macroBaselines[macro];
    
    if (!baseline) {
      results.unreachable.push(microKey);
      results.unreachableReasons[microKey] = 'No baseline defined for macro';
      continue;
    }
    
    // Generate targeted L1 responses
    const l1Responses = generateTargetedL1Responses(microKey);
    
    if (!l1Responses || l1Responses.length === 0) {
      results.unreachable.push(microKey);
      results.unreachableReasons[microKey] = 'No evidence tags defined in microEvidenceTags.js';
      continue;
    }
    
    // Run deep engine
    const deepResult = await routeStateFromDeepCanonical(baseline, l1Responses, {
      evidenceWeight: 0.45,
    });
    
    // Check if micro was selected
    if (deepResult.microKey === microKey) {
      results.reachable.push(microKey);
      console.log(`✅ ${microKey}`);
    } else {
      results.unreachable.push(microKey);
      const reason = deepResult.microKey
        ? `Selected ${deepResult.microKey} instead`
        : 'microKey is null';
      results.unreachableReasons[microKey] = reason;
      
      // Task AK3.2: Detailed diagnostics for null microKey
      if (!deepResult.microKey) {
        results.unreachableDiagnostics[microKey] = {
          baseline,
          l1Responses,
          evidenceTags: deepResult.evidenceTags || [],
          microScores: deepResult.diagnostics?.microScores || {},
          selectedMicro: deepResult.diagnostics?.selectedMicro || null,
          baselineMacro: deepResult.baselineMacro,
          baselineConfidence: deepResult.baselineConfidence,
          confidenceBand: deepResult.confidenceBand,
        };
      }
      
      console.log(`❌ ${microKey} - ${reason}`);
    }
  }
  
  // Generate report
  console.log('\n' + '='.repeat(80));
  console.log('MICRO COVERAGE REPORT');
  console.log('='.repeat(80));
  console.log('');
  
  console.log(`Reachable: ${results.reachable.length}/${allMicroKeys.length}`);
  console.log(`Unreachable: ${results.unreachable.length}/${allMicroKeys.length}`);
  console.log('');
  
  if (results.unreachable.length > 0) {
    console.log('❌ UNREACHABLE MICROS:');
    for (const microKey of results.unreachable) {
      console.log(`  ${microKey}: ${results.unreachableReasons[microKey]}`);
      
      // Task AK3.2: Print detailed diagnostics for null microKey
      if (results.unreachableDiagnostics[microKey]) {
        const diag = results.unreachableDiagnostics[microKey];
        console.log(`    Diagnostics:`);
        console.log(`      Baseline macro: ${diag.baselineMacro}`);
        console.log(`      Baseline confidence: ${diag.baselineConfidence}`);
        console.log(`      Evidence tags count: ${diag.evidenceTags.length}`);
        console.log(`      Evidence tags: ${diag.evidenceTags.slice(0, 5).join(', ')}${diag.evidenceTags.length > 5 ? '...' : ''}`);
        console.log(`      Micro scores: ${JSON.stringify(diag.microScores)}`);
        if (diag.selectedMicro) {
          console.log(`      Selected micro: ${diag.selectedMicro.key} (score: ${diag.selectedMicro.score.toFixed(2)})`);
        } else {
          console.log(`      Selected micro: null (no micro selected)`);
        }
      }
    }
    console.log('');
  }
  
  // Task AK3: Categorize unreachable reasons
  const reasonCategories = {
    noEvidenceTags: [],
    wrongMicroSelected: [],
    microNull: [],
    noBaseline: [],
  };
  
  for (const [micro, reason] of Object.entries(results.unreachableReasons)) {
    if (reason.includes('No evidence tags')) {
      reasonCategories.noEvidenceTags.push(micro);
    } else if (reason.includes('No baseline')) {
      reasonCategories.noBaseline.push(micro);
    } else if (reason.includes('null')) {
      reasonCategories.microNull.push(micro);
    } else if (reason.includes('Selected')) {
      reasonCategories.wrongMicroSelected.push(micro);
    }
  }
  
  console.log('UNREACHABLE REASON BREAKDOWN:');
  console.log(`  No evidence tags defined: ${reasonCategories.noEvidenceTags.length}`);
  console.log(`  Wrong micro selected: ${reasonCategories.wrongMicroSelected.length}`);
  console.log(`  Micro null: ${reasonCategories.microNull.length}`);
  console.log(`  No baseline: ${reasonCategories.noBaseline.length}`);
  console.log('');
  
  // Sanity check
  if (results.unreachable.length > 0) {
    console.log('⚠️  WARNING: Some micro states are unreachable even with targeted evidence');
    console.log('   This indicates:');
    if (reasonCategories.noEvidenceTags.length > 0) {
      console.log('   - Missing evidence tags in microEvidenceTags.js');
    }
    if (reasonCategories.wrongMicroSelected.length > 0) {
      console.log('   - Micro selector scoring/threshold issues');
    }
    if (reasonCategories.microNull.length > 0) {
      console.log('   - Evidence tags not matching micro selector logic');
    }
  } else {
    console.log('✅ All micro states are reachable with targeted evidence!');
  }
  
  console.log('\n' + '='.repeat(80));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
