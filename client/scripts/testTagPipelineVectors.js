// testTagPipelineVectors.js
// Task A2.4: Golden vectors test for Tag Pipeline
// Ensures tag pipeline behavior stays stable across refactors
// Comments in English only.

import assert from 'assert';
import { 
  canonicalizeTags, 
  deriveSigTagsFromArray,
  hasGateMatch,
  GATE_ALLOW_LISTS,
  buildScoringTags,
} from '../src/domain/tags/index.js';

/**
 * Test cases: Golden vectors for tag pipeline
 * Each case defines input tags and expected outputs
 */
const cases = [
  // P3.10.3.3: Safety tags canonicalize into tension
  {
    name: 'Safety tags canonicalize into tension',
    input: ['sig.safety.low', 'sig.safety.high'],
    expectedCanonicalized: ['sig.tension.high', 'sig.tension.low'],
    expectedDerived: [],
    expectedGateHits: {},
  },
  
  // Self-worth stays as-is (not canonicalized, may be derived)
  {
    name: 'Self-worth stays as-is',
    input: ['sig.self_worth.high'],
    expectedCanonicalized: ['sig.self_worth.high'],
    expectedDerived: [],
    expectedGateHits: {},
  },
  
  // L1_* tags derive to sig.*
  {
    name: 'L1 mood tags derive to sig.valence',
    input: ['l1_mood_neg', 'l1_mood_pos'],
    expectedCanonicalized: ['l1_mood_neg', 'l1_mood_pos'],
    expectedDerived: ['sig.valence.neg', 'sig.valence.pos'],
    expectedGateHits: { valence: true },
  },
  
  // L1 energy tags derive to sig.fatigue and sig.arousal
  {
    name: 'L1 energy tags derive to fatigue and arousal',
    input: ['l1_energy_low', 'l1_energy_high'],
    expectedCanonicalized: ['l1_energy_low', 'l1_energy_high'],
    expectedDerived: ['sig.fatigue.high', 'sig.arousal.low', 'sig.fatigue.low', 'sig.arousal.high'],
    expectedGateHits: { arousal: true },
  },
  
  // L1 control tags derive to sig.agency
  {
    name: 'L1 control tags derive to sig.agency',
    input: ['l1_control_low', 'l1_control_high'],
    expectedCanonicalized: ['l1_control_low', 'l1_control_high'],
    expectedDerived: ['sig.agency.low', 'sig.agency.high'],
    expectedGateHits: { agency: true },
  },
  
  // L1 clarity tags derive to sig.clarity
  {
    name: 'L1 clarity tags derive to sig.clarity',
    input: ['l1_clarity_low', 'l1_clarity_high'],
    expectedCanonicalized: ['l1_clarity_low', 'l1_clarity_high'],
    expectedDerived: ['sig.clarity.low', 'sig.clarity.high'],
    expectedGateHits: { clarity: true },
  },
  
  // L1 social tags derive to sig.social
  {
    name: 'L1 social tags derive to sig.social',
    input: ['l1_social_threat', 'l1_social_support'],
    expectedCanonicalized: ['l1_social_threat', 'l1_social_support'],
    expectedDerived: ['sig.social.threat', 'sig.social.high'],
    expectedGateHits: { social: true },
  },
  
  // L1 pressure tags derive to sig.context.work.pressure.high
  {
    name: 'L1 pressure tags derive to load signals',
    input: ['l1_pressure_high'],
    expectedCanonicalized: ['l1_pressure_high'],
    expectedDerived: ['sig.context.work.pressure.high'],
    expectedGateHits: { load: true },
  },
  
  // Direct sig.* tags pass through
  {
    name: 'Direct sig.* tags pass through',
    input: ['sig.valence.neg', 'sig.arousal.high', 'sig.agency.low'],
    expectedCanonicalized: ['sig.valence.neg', 'sig.arousal.high', 'sig.agency.low'],
    expectedDerived: [],
    expectedGateHits: { valence: true, arousal: true, agency: true },
  },
  
  // Context tags are filtered in scoring
  {
    name: 'Context tags are filtered in scoring',
    input: ['sig.context.work.deadline', 'sig.valence.neg', 'sig.context.health.stress'],
    expectedCanonicalized: ['sig.context.work.deadline', 'sig.valence.neg', 'sig.context.health.stress'],
    expectedDerived: [],
    expectedGateHits: { load: true, valence: true },
    expectedScoringTags: ['sig.valence.neg'], // Context filtered out
  },
  
  // Mixed input: canonical + derive + gates
  {
    name: 'Mixed input with multiple gates',
    input: ['l1_mood_neg', 'l1_control_high', 'sig.clarity.low', 'l1_pressure_high'],
    expectedCanonicalized: ['l1_mood_neg', 'l1_control_high', 'sig.clarity.low', 'l1_pressure_high'],
    expectedDerived: ['sig.valence.neg', 'sig.agency.high', 'sig.context.work.pressure.high'],
    expectedGateHits: { valence: true, agency: true, clarity: true, load: true },
  },
  
  // Empty input
  {
    name: 'Empty input returns empty',
    input: [],
    expectedCanonicalized: [],
    expectedDerived: [],
    expectedGateHits: {},
  },
  
  // Invalid/unknown tags are normalized but may not derive
  {
    name: 'Unknown tags are normalized',
    input: ['unknown_tag', 'another-unknown'],
    expectedCanonicalized: ['unknown_tag', 'another_unknown'], // Normalized format
    expectedDerived: [],
    expectedGateHits: {},
  },
  
  // L1 worth tags derive to sig.agency
  {
    name: 'L1 worth tags derive to sig.agency',
    input: ['l1_worth_low', 'l1_worth_high'],
    expectedCanonicalized: ['l1_worth_low', 'l1_worth_high'],
    expectedDerived: ['sig.agency.low', 'sig.agency.high', 'sig.self_worth.low', 'sig.self_worth.high'],
    expectedGateHits: { agency: true },
  },
  
  // L1 expect tags derive to sig.clarity
  {
    name: 'L1 expect tags derive to sig.clarity',
    input: ['l1_expect_low', 'l1_expect_ok'],
    expectedCanonicalized: ['l1_expect_low', 'l1_expect_ok'],
    expectedDerived: ['sig.clarity.low', 'sig.clarity.high'],
    expectedGateHits: { clarity: true },
  },
];

/**
 * Run golden vectors test
 */
function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const tc of cases) {
    try {
      // Test canonicalization
      const canonicalized = canonicalizeTags(tc.input);
      
      // Check expected canonicalized tags
      if (tc.expectedCanonicalized) {
        for (const expectedTag of tc.expectedCanonicalized) {
          assert(
            canonicalized.includes(expectedTag),
            `[${tc.name}] Expected canonicalized tag missing: ${expectedTag}. Got: ${canonicalized.join(', ')}`
          );
        }
      }
      
      // Test derivation
      const derived = deriveSigTagsFromArray(canonicalized);
      const expanded = Array.from(new Set([...canonicalized, ...derived]));
      
      // Check expected derived tags
      if (tc.expectedDerived) {
        for (const expectedDerived of tc.expectedDerived) {
          assert(
            derived.includes(expectedDerived),
            `[${tc.name}] Expected derived tag missing: ${expectedDerived}. Got: ${derived.join(', ')}`
          );
        }
      }
      
      // Test gate hits
      if (tc.expectedGateHits) {
        for (const [gateName, expectedHit] of Object.entries(tc.expectedGateHits)) {
          const allowList = GATE_ALLOW_LISTS[gateName] || [];
          const actualHit = hasGateMatch(expanded, allowList);
          assert(
            actualHit === expectedHit,
            `[${tc.name}] Gate ${gateName} hit mismatch: expected ${expectedHit}, got ${actualHit}`
          );
        }
      }
      
      // Test scoring tags filtering (if specified)
      if (tc.expectedScoringTags !== undefined) {
        const scoringTags = buildScoringTags(expanded, { excludeContext: true });
        for (const expectedScoring of tc.expectedScoringTags) {
          assert(
            scoringTags.includes(expectedScoring),
            `[${tc.name}] Expected scoring tag missing: ${expectedScoring}. Got: ${scoringTags.join(', ')}`
          );
        }
        // Check that context tags are excluded
        const hasContext = scoringTags.some(tag => tag.startsWith('sig.context.'));
        assert(
          !hasContext,
          `[${tc.name}] Context tags should be filtered from scoring tags. Got: ${scoringTags.join(', ')}`
        );
      }
      
      passed++;
    } catch (error) {
      console.error(`❌ [${tc.name}] FAILED:`, error.message);
      failed++;
    }
  }
  
  console.log(`\n✅ Tag Pipeline Golden Vectors Test Results:`);
  console.log(`   Passed: ${passed}/${cases.length}`);
  if (failed > 0) {
    console.log(`   Failed: ${failed}/${cases.length}`);
    process.exit(1);
  } else {
    console.log(`   ✅ All tests passed!`);
  }
}

// Run tests
runTests();
