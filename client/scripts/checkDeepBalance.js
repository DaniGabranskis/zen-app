// checkDeepBalance.js (AK3-POST-1 - Deep Realism Sanity)
// Simulates deep dive flow with noisy-mixed mode and comprehensive metrics
//
// Usage:
//   node scripts/checkDeepBalance.js --mode noisy-mixed --seed 42 --runs 100000 --outDir ./scripts/out --flow fixed
//   node scripts/checkDeepBalance.js --mode noisy-mixed --seed 42 --runs 100000 --outDir ./scripts/out --flow l1-full
//   node scripts/checkDeepBalance.js --mode noisy-mixed --seed 42 --runs 100000 --outDir ./scripts/out --flow deep-realistic --maxL1 6 --maxL2 6
//
// Task AI: Integration Hygiene
// - Uses canonical imports (no local copies of engine logic)
// - All paths use client/src/... structure

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { simulateDeepRealisticSession } from './simulateDeepRealistic.js';
import { sampleAnswer, getProfileMetadata } from './profiles.js';
import { validateReportOrThrow } from './utils/validateReport.js';
import { normalizeEndedReason } from '../src/domain/deepSession/index.js';
import { getDeepRealisticDefaults } from './config/deepRealisticDefaults.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Task P0: Utility function to read JSON files (more reliable than import)
function readJson(relPath) {
  const abs = path.resolve(process.cwd(), relPath);
  const raw = fs.readFileSync(abs, 'utf8');
  return JSON.parse(raw);
}

/**
 * Safe count getter for Set/Array/Object after JSON serialization
 * Task A3.2.1: Prevents undefined .size when Set becomes Array/Object after JSON round-trip
 * @param {any} x - Set, Array, Object, or null/undefined
 * @param {string} fieldName - Field name for warning messages
 * @returns {number | null} - Count if valid, null if invalid
 */
function getCount(x, fieldName = 'field') {
  if (x == null) {
    return null;
  }
  
  if (Array.isArray(x)) {
    return x.length;
  }
  
  if (typeof x.size === 'number') {
    return x.size; // Set or Map
  }
  
  if (typeof x.length === 'number') {
    return x.length; // Array-like
  }
  
  // If it's an object (e.g., Set serialized as object), try to count keys
  if (typeof x === 'object' && !Array.isArray(x)) {
    const keys = Object.keys(x);
    if (keys.length > 0) {
      console.warn(`[getCount] ${fieldName} appears to be an object (possibly serialized Set). Using Object.keys().length.`);
      return keys.length;
    }
    return 0;
  }
  
  console.warn(`[getCount] ${fieldName} has unexpected type: ${typeof x}. Cannot determine count.`);
  return null;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    mode: 'noisy-mixed',
    seed: 42,
    runs: null, // null = use all baseline combinations
    outDir: path.join(__dirname, 'out'),
    flow: 'fixed', // Task P2.0: 'fixed', 'l1-full' (was 'adaptive-l1'), or 'deep-realistic'
    forceNoEvidenceRate: 0, // Task D: Force no_evidence fallback in N% of runs (0 = disabled)
    // Task P2.1: deep-realistic parameters
    // Task A1.1: Defaults will be applied after flow is determined
    maxL1: 6,
    maxL2: 6,
    minL1: 3,
    minL2: 2,
    stopOnGates: true,
    notSureRate: 0.25,
    profile: 'mix',
    sampleFailures: 0, // TASK POST-02: number of micro-fallback samples to write
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) {
      config.mode = args[i + 1];
      i++;
    } else if (args[i] === '--seed' && args[i + 1]) {
      config.seed = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--runs' && args[i + 1]) {
      config.runs = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--outDir' && args[i + 1]) {
      config.outDir = args[i + 1];
      i++;
    } else if (args[i] === '--flow' && args[i + 1]) {
      config.flow = args[i + 1]; // Task P2.0: 'fixed', 'l1-full', 'deep-realistic'
      i++;
    } else if (args[i] === '--forceNoEvidenceRate' && args[i + 1]) {
      config.forceNoEvidenceRate = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--maxL1' && args[i + 1]) {
      config.maxL1 = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--maxL2' && args[i + 1]) {
      config.maxL2 = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--stopOnGates' && args[i + 1]) {
      config.stopOnGates = args[i + 1] === 'true';
      i++;
    } else if (args[i] === '--notSureRate' && args[i + 1]) {
      config.notSureRate = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--profile' && args[i + 1]) {
      config.profile = args[i + 1];
      i++;
    } else if (args[i] === '--smokeCalib' && args[i + 1]) {
      config.smokeCalibPath = args[i + 1];
      i++;
    } else if (args[i] === '--debugRuns' && args[i + 1]) {
      config.debugRuns = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--sampleFailures' && args[i + 1]) {
      config.sampleFailures = parseInt(args[i + 1], 10);
      i++;
    }
  }

  // TASK POST-01: fixed flow is a control run (not noisy/grid)
  if (config.flow === 'fixed') {
    config.mode = 'fixed-control';
    // Control run should not inherit noisy-mixed behavior
    config.notSureRate = 0.0;
    config.profile = 'decisive';
  }

  return config;
}

// Seeded random number generator
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  random() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// Dynamic import for ES modules
let routeStateFromBaselineCanonical;
let routeStateFromDeepCanonical;

async function main() {
  const config = parseArgs();
  // FIX-DR-05: args is used later to detect which CLI flags were provided
  const args = process.argv.slice(2);
  
  // Initialize seeded random
  const rng = new SeededRandom(config.seed);
  
  // Task AI: Use canonical imports (no local copies)
  const baselineEngine = await import('../src/utils/baselineEngine.js');
  routeStateFromBaselineCanonical = baselineEngine.routeStateFromBaseline;
  
  const deepEngine = await import('../src/utils/deepEngine.js');
  routeStateFromDeepCanonical = deepEngine.routeStateFromDeep;
  
  if (!routeStateFromBaselineCanonical || !routeStateFromDeepCanonical) {
    throw new Error('Deep engine imports failed. Ensure main() is async and imports are correct.');
  }
  
  console.log('='.repeat(80));
  console.log('DEEP BALANCE SIMULATION (AK3-POST-1)');
  console.log('='.repeat(80));
  console.log('');
  console.log('Configuration:');
  console.log(`  Mode: ${config.mode}`);
  console.log(`  Seed: ${config.seed}`);
  console.log(`  Runs: ${config.runs || 'all baseline combinations'}`);
  console.log(`  Flow: ${config.flow}`); // Task AK3-DEEP-L1-2
  console.log(`  Output dir: ${config.outDir}`);
  console.log('');
  
  // Generate baseline combinations
  const BASELINE_COMBOS = [];
  const values = [1, 2, 3, 4, 5, 6, 7];
  
  function generateBaselines(index, current) {
    if (index === 6) {
      BASELINE_COMBOS.push({ ...current });
      return;
    }
    const keys = ['valence', 'energy', 'tension', 'clarity', 'control', 'social'];
    for (const val of values) {
      generateBaselines(index + 1, { ...current, [keys[index]]: val });
    }
  }
  
  generateBaselines(0, {});
  console.log(`Total baseline combinations: ${BASELINE_COMBOS.length}`);
  
  // TASK POST-01: baseline sampler
  let baselineSampler = 'grid';

  // Limit runs if specified
  let baselineSubset = config.runs
    ? BASELINE_COMBOS.slice(0, Math.min(config.runs, BASELINE_COMBOS.length))
    : BASELINE_COMBOS;

  // Fixed-control: use a small, deterministic set of baselines (control run)
  if (config.flow === 'fixed') {
    baselineSampler = 'fixed-control';
    baselineSubset = [
      // Neutral baseline (center-ish)
      { valence: 4, energy: 4, tension: 4, clarity: 4, control: 4, social: 4 },
      // Low valence / low energy
      { valence: 2, energy: 2, tension: 5, clarity: 4, control: 3, social: 3 },
      // High arousal / high tension
      { valence: 4, energy: 6, tension: 6, clarity: 3, control: 3, social: 4 },
      // High clarity / high control
      { valence: 5, energy: 4, tension: 3, clarity: 6, control: 6, social: 4 },
      // Socially loaded
      { valence: 4, energy: 4, tension: 5, clarity: 3, control: 3, social: 6 },
    ];
  }
  
  console.log(`Running simulation on ${baselineSubset.length} baselines...`);
  console.log('');
  
  // Task AK3-DEEP-L1-2: Load L1 cards for adaptive selection
  // Task 0: Strict mode - fs.readFile + JSON.parse, no fallback to fixed
  let L1_CARDS = [];
  let L1_CARDS_BY_ID = {};
  let L2_CARDS = [];
  let L2_CARDS_BY_ID = {};
  
  // Task P2.0: Handle flow aliases and deprecation
  let effectiveFlow = config.flow;
  if (config.flow === 'adaptive-l1') {
    console.warn('[DEPRECATED] adaptive-l1 is deprecated; use l1-full or deep-realistic');
    effectiveFlow = 'l1-full';
  }
  config.effectiveFlow = effectiveFlow;
  
  // Task A1.1: Apply central defaults for deep-realistic (after flow is determined)
  if (effectiveFlow === 'deep-realistic') {
    const defaults = getDeepRealisticDefaults();
    // Only override if not explicitly set via CLI (check if values match hardcoded defaults)
    // This is a heuristic - if user didn't specify, use central defaults
    if (!args.includes('--maxL1')) config.maxL1 = defaults.maxL1;
    if (!args.includes('--maxL2')) config.maxL2 = defaults.maxL2;
    if (!args.includes('--minL1')) config.minL1 = defaults.minL1;
    if (!args.includes('--minL2')) config.minL2 = defaults.minL2;
    if (!args.includes('--stopOnGates')) config.stopOnGates = defaults.stopOnGates;
    if (!args.includes('--notSureRate')) config.notSureRate = defaults.notSureRate;
    if (!args.includes('--profile')) config.profile = defaults.profile;
  }
  
  if (effectiveFlow === 'l1-full' || effectiveFlow === 'deep-realistic' || effectiveFlow === 'fixed' || config.flow === 'adaptive-l1') {
    // Task P2.0/P2.1: Load L1/L2 for l1-full or deep-realistic
    // Task 0.1: Load L1.json via fs.readFile (strict mode)
    try {
      const l1Data = readJson('src/data/flow/L1.json');
      if (!Array.isArray(l1Data)) {
        throw new Error('L1.json is not an array');
      }
      L1_CARDS = l1Data.map(card => ({
        id: String(card?.id || ''),
        title: String(card?.title || ''),
        type: String(card?.type || 'swipe'),
        options: Array.isArray(card?.options) ? card.options : [],
        meta: card?.meta || {},
        cluster: card?.cluster || 'GENERAL',
        macroAllow: Array.isArray(card?.macroAllow) ? card.macroAllow : null,
        signals: Array.isArray(card?.signals) ? card.signals : [],
      })).filter(c => c.id && c.id.startsWith('L1_'));
      
      for (const card of L1_CARDS) {
        L1_CARDS_BY_ID[card.id] = card;
      }
    } catch (e) {
      console.error('[checkDeepBalance] Failed to load L1 cards:', e.message);
      console.error('[checkDeepBalance] Error stack:', e.stack);
      throw new Error(`[STRICT MODE] Failed to load L1 cards: ${e.message}. Ensure src/data/flow/L1.json exists and is valid JSON array.`);
    }
    
    // Task 0.1: Load L2.json via fs.readFile (strict mode)
    try {
      const l2Data = readJson('src/data/flow/L2.json');
      if (!Array.isArray(l2Data)) {
        throw new Error('L2.json is not an array');
      }
      L2_CARDS = l2Data.map(card => ({
        id: String(card?.id || ''),
        title: String(card?.title || ''),
        type: String(card?.type || 'swipe'),
        options: Array.isArray(card?.options) ? card.options : [],
        meta: card?.meta || {},
        cluster: card?.cluster || 'GENERAL',
        macroAllow: Array.isArray(card?.macroAllow) ? card.macroAllow : null,
        signals: Array.isArray(card?.signals) ? card.signals : [],
      })).filter(c => c.id && c.id.startsWith('L2_'));
      
      for (const card of L2_CARDS) {
        L2_CARDS_BY_ID[card.id] = card;
      }
    } catch (e) {
      console.error('[checkDeepBalance] Failed to load L2 cards:', e.message);
      console.error('[checkDeepBalance] Error stack:', e.stack);
      throw new Error(`[STRICT MODE] Failed to load L2 cards: ${e.message}. Ensure src/data/flow/L2.json exists and is valid JSON array.`);
    }
    
    // Task 0.2: Strict fail if L1/L2 empty or invalid
    if (L1_CARDS.length === 0) {
      throw new Error(`[STRICT MODE] L1 cards array is empty after loading. Cannot proceed with ${effectiveFlow} flow.`);
    }
    if (L2_CARDS.length === 0) {
      throw new Error(`[STRICT MODE] L2 cards array is empty after loading. Cannot proceed with ${effectiveFlow} flow.`);
    }
    
    // Task 0.3: Log card counts
    console.log(`Loaded cards: L1=${L1_CARDS.length}, L2=${L2_CARDS.length}`);
  } else if (config.flow === 'fixed') {
    // FIX: fixed flow now uses runner harness as well (needs cards loaded)
    // No special handling here; L1/L2 are loaded in the branch above when effectiveFlow === 'fixed'.
  }

  // Task AK3-POST-1: Enhanced noisy-mixed mode with real noise
    // Task P2.0: Updated to support l1-full and deep-realistic flows
  async function generateSyntheticL1Responses(baselineMacro, mode, rng, flowMode, baselineMetrics) {
    const { getMicrosForMacro } = await import('../src/data/microTaxonomy.js');
    const { getMicroEvidenceTags } = await import('../src/data/microEvidenceTags.js');
    
    const micros = getMicrosForMacro(baselineMacro);
    const responses = [];
    
    // Task P2.0/P2.1: Handle l1-full and deep-realistic flows
    const isL1Full = flowMode === 'l1-full' || flowMode === 'adaptive-l1';
    const isDeepRealistic = flowMode === 'deep-realistic' || flowMode === 'fixed';
    
    if (isDeepRealistic && L1_CARDS.length > 0) {
      // Task P2.2: Deep-realistic simulation - step-by-step session
      return await simulateDeepRealisticSession({
        baselineMacro,
        baselineMetrics,
        rng,
        config,
        L1_CARDS,
        L1_CARDS_BY_ID,
        L2_CARDS,
        L2_CARDS_BY_ID,
      });
    } else if (isL1Full && L1_CARDS.length > 0) {
      // Adaptive flow: use pickNextL1Card to select cards step-by-step
      const { pickNextL1Card } = await import('../src/utils/l1CardSelector.js');
      const { routeStateFromBaseline } = await import('../src/utils/baselineEngine.js');
      
      const askedIds = [];
      let evidenceTags = [];
      const MAX_STEPS = 10;
      let steps = 0;
      let quality = { needsRefine: true };
      
      while (steps < MAX_STEPS) {
        // Get baseline result for quality check
        const baselineResult = routeStateFromBaseline(baselineMetrics || {}, {
          evidenceVector: null,
          evidenceWeight: 0.25,
        });
        
        quality = {
          needsRefine: baselineResult?.mode === 'probe' || baselineResult?.isUncertain === true,
          confidenceBand: baselineResult?.confidenceBand || null,
          clarityFlag: baselineResult?.clarityFlag || null,
        };
        
        // Pick next card adaptively
        const pickResult = pickNextL1Card({
          macroBase: baselineMacro,
          askedIds,
          evidenceTags,
          quality,
          cardsById: L1_CARDS_BY_ID,
          askedCount: askedIds.length,
        });
        
        if (!pickResult || !pickResult.cardId) {
          // Early exit or no more cards
          // Task AK3-DEEP-L1-2b: Assert early exit conditions
          const { areMinimumGatesClosed } = await import('../src/utils/l1CardSelector.js');
          const gatesClosed = areMinimumGatesClosed({ macroBase: baselineMacro, evidenceTags });
          const MIN_STEPS = 4; // From l1CardSelector.js
          
          if (pickResult?.reason === 'early_exit_gates_closed') {
            // Check invariants for early exit
            const violations = [];
            if (steps < MIN_STEPS) {
              violations.push({ reason: 'early_exit_min_steps', steps, minSteps: MIN_STEPS });
            }
            if (!gatesClosed) {
              violations.push({ reason: 'early_exit_gates_open', gatesClosed });
            }
            if (quality.needsRefine) {
              violations.push({ reason: 'early_exit_needs_refine', needsRefine: quality.needsRefine });
            }
            
            // Log violations if any
            if (violations.length > 0) {
              console.warn('[checkDeepBalance] Early exit invariant violations:', violations);
              // Continue instead of exiting (but we'll break anyway since pickResult is null)
              // For metrics, we'll record the violation
              if (typeof metrics !== 'undefined') {
                metrics.invariantViolations.push({
                  baselineMacro,
                  violations,
                  askedIds: [...askedIds],
                  steps,
                  evidenceTags: [...evidenceTags],
                });
                metrics.invariantViolationCount++;
                for (const v of violations) {
                  metrics.invariantViolationsByReason[v.reason] = (metrics.invariantViolationsByReason[v.reason] || 0) + 1;
                }
              }
            }
          }
          break;
        }
        
        const cardId = pickResult.cardId;
        const card = L1_CARDS_BY_ID[cardId];
        if (!card) break;
        
        // Task AK3-DEEP-L1-2b: Assert no duplicates
        if (askedIds.includes(cardId)) {
          // This should never happen, but log it if it does
          console.warn('[checkDeepBalance] Duplicate card detected in l1-full/deep-realistic flow', {
            cardId,
            askedIds,
            step: steps + 1,
          });
          // Skip this card and continue
          break;
        }
        
        askedIds.push(cardId);
        steps++;
        
        // Simulate response for this card (noisy-mixed logic)
        const cardTags = await simulateCardResponse(card, baselineMacro, mode, rng);
        evidenceTags = [...evidenceTags, ...cardTags];
        
        responses.push({
          tags: [...new Set(cardTags)], // Remove duplicates
          values: {},
          uncertainty: rng.random() < 0.25 ? 'low_clarity' : null, // 25% uncertainty
        });
        
        // Check for early exit condition
        if (pickResult.reason === 'early_exit_gates_closed') {
          break;
        }
      }
      
      // Task AK3-DEEP-L1-2b: Check if MAX_STEPS was reached
      const endedByMaxSteps = steps >= MAX_STEPS;
      
      return { 
        responses, 
        stepsTaken: steps,
        endedByMaxSteps, // Track if we hit MAX_STEPS
        askedCardIds: [...askedIds], // Task 1.2, 4: Return asked card IDs for metrics
      };
    }
    
    // Fixed flow: generate 2-3 responses as before
    const responseCount = Math.floor(rng.random() * 2) + 2; // 2-3 responses
    
    if (mode === 'cluster-aligned') {
      // Optimistic: tags align with baseline macro micros
      for (let i = 0; i < responseCount; i++) {
        const tags = [];
        
        if (micros.length > 0) {
          const micro = micros[i % micros.length];
          const evidenceTags = getMicroEvidenceTags(micro.microKey);
          
          if (evidenceTags) {
            if (evidenceTags.mustHave.length > 0) {
              tags.push(evidenceTags.mustHave[0]);
            }
            if (evidenceTags.supporting.length > 0) {
              tags.push(evidenceTags.supporting[0]);
            }
          } else if (micro.evidenceTags && micro.evidenceTags.length > 0) {
            tags.push(micro.evidenceTags[0]);
          }
          
          tags.push('sig.context.work.deadline');
        }
        
        responses.push({
          tags,
          values: {},
          uncertainty: rng.random() < 0.1 ? 'low_clarity' : null, // 10% uncertainty
        });
      }
    } else if (mode === 'noisy-mixed') {
      // REALISTIC: Mixed/conflicting evidence with real noise
      // - 40% aligned tags, 40% conflicting tags, 20% random/noise tags
      // - 25% "Not sure" responses
      // - Variable tag counts (0-4 tags per response)
      
      for (let i = 0; i < responseCount; i++) {
        const tags = [];
        const tagCount = Math.floor(rng.random() * 5); // 0-4 tags
        
        for (let j = 0; j < tagCount; j++) {
          const tagType = rng.random();
          
          if (tagType < 0.4 && micros.length > 0) {
            // 40%: Aligned tag (from baseline macro)
            const micro = micros[Math.floor(rng.random() * micros.length)];
            const evidenceTags = getMicroEvidenceTags(micro.microKey);
            
            if (evidenceTags) {
              if (evidenceTags.mustHave.length > 0 && rng.random() < 0.7) {
                tags.push(evidenceTags.mustHave[Math.floor(rng.random() * evidenceTags.mustHave.length)]);
              } else if (evidenceTags.supporting.length > 0) {
                tags.push(evidenceTags.supporting[Math.floor(rng.random() * evidenceTags.supporting.length)]);
              }
            } else if (micro.evidenceTags && micro.evidenceTags.length > 0) {
              tags.push(micro.evidenceTags[Math.floor(rng.random() * micro.evidenceTags.length)]);
            }
          } else if (tagType < 0.8) {
            // 40%: Conflicting tag (from different macro)
            const allMacros = ['grounded', 'engaged', 'connected', 'capable', 'pressured', 'blocked', 'overloaded', 'exhausted', 'down', 'averse', 'detached'];
            const otherMacros = allMacros.filter(m => m !== baselineMacro);
            if (otherMacros.length > 0) {
              const conflictingMacro = otherMacros[Math.floor(rng.random() * otherMacros.length)];
              const conflictingMicros = getMicrosForMacro(conflictingMacro);
              if (conflictingMicros.length > 0) {
                const conflictingMicro = conflictingMicros[Math.floor(rng.random() * conflictingMicros.length)];
                const conflictingEvidenceTags = getMicroEvidenceTags(conflictingMicro.microKey);
                if (conflictingEvidenceTags) {
                  if (conflictingEvidenceTags.mustHave.length > 0) {
                    tags.push(conflictingEvidenceTags.mustHave[Math.floor(rng.random() * conflictingEvidenceTags.mustHave.length)]);
                  } else if (conflictingEvidenceTags.supporting.length > 0) {
                    tags.push(conflictingEvidenceTags.supporting[Math.floor(rng.random() * conflictingEvidenceTags.supporting.length)]);
                  }
                } else if (conflictingMicro.evidenceTags && conflictingMicro.evidenceTags.length > 0) {
                  tags.push(conflictingMicro.evidenceTags[Math.floor(rng.random() * conflictingMicro.evidenceTags.length)]);
                }
              }
            }
          } else {
            // 20%: Random/noise tags (generic context tags)
            const noiseTags = [
              'sig.context.work.deadline',
              'sig.context.social.isolation',
              'sig.context.health.stress',
              'sig.context.family.tension',
            ];
            tags.push(noiseTags[Math.floor(rng.random() * noiseTags.length)]);
          }
        }
        
        // Add context tag (may conflict)
        if (rng.random() < 0.6) {
          const contextTags = ['sig.context.work.deadline', 'sig.context.social.isolation', 'sig.context.health.stress'];
          tags.push(contextTags[Math.floor(rng.random() * contextTags.length)]);
        }
        
        responses.push({
          tags: [...new Set(tags)], // Remove duplicates
          values: {},
          uncertainty: rng.random() < 0.25 ? 'low_clarity' : null, // 25% uncertainty
        });
      }
    }
    
    // Fixed flow: return responses and step count
    // Task AK3-DEEP-L1-2c: For fixed flow, we don't track card sequence (it's random)
    return { responses, stepsTaken: responseCount, cardSequence: null, askedCardIds: [] };
  }
  
  // Task AK3-DEEP-L1-2: Helper function to simulate response for a card
  async function simulateCardResponse(card, baselineMacro, mode, rng) {
    const tags = [];
    const { getMicrosForMacro } = await import('../src/data/microTaxonomy.js');
    const { getMicroEvidenceTags } = await import('../src/data/microEvidenceTags.js');
    
    const micros = getMicrosForMacro(baselineMacro);
    const tagCount = Math.floor(rng.random() * 5); // 0-4 tags
    
    for (let j = 0; j < tagCount; j++) {
      const tagType = rng.random();
      
      if (tagType < 0.4 && micros.length > 0) {
        // 40%: Aligned tag
        const micro = micros[Math.floor(rng.random() * micros.length)];
        const evidenceTags = getMicroEvidenceTags(micro.microKey);
        if (evidenceTags) {
          if (evidenceTags.mustHave.length > 0 && rng.random() < 0.7) {
            tags.push(evidenceTags.mustHave[Math.floor(rng.random() * evidenceTags.mustHave.length)]);
          } else if (evidenceTags.supporting.length > 0) {
            tags.push(evidenceTags.supporting[Math.floor(rng.random() * evidenceTags.supporting.length)]);
          }
        }
      } else if (tagType < 0.8) {
        // 40%: Conflicting tag
        const allMacros = ['grounded', 'engaged', 'connected', 'capable', 'pressured', 'blocked', 'overloaded', 'exhausted', 'down', 'averse', 'detached'];
        const otherMacros = allMacros.filter(m => m !== baselineMacro);
        if (otherMacros.length > 0) {
          const conflictingMacro = otherMacros[Math.floor(rng.random() * otherMacros.length)];
          const conflictingMicros = getMicrosForMacro(conflictingMacro);
          if (conflictingMicros.length > 0) {
            const conflictingMicro = conflictingMicros[Math.floor(rng.random() * conflictingMicros.length)];
            const conflictingEvidenceTags = getMicroEvidenceTags(conflictingMicro.microKey);
            if (conflictingEvidenceTags && conflictingEvidenceTags.supporting.length > 0) {
              tags.push(conflictingEvidenceTags.supporting[Math.floor(rng.random() * conflictingEvidenceTags.supporting.length)]);
            }
          }
        }
      } else {
        // 20%: Random/noise tags
        const noiseTags = ['sig.context.work.deadline', 'sig.context.social.isolation', 'sig.context.health.stress', 'sig.context.family.tension'];
        tags.push(noiseTags[Math.floor(rng.random() * noiseTags.length)]);
      }
    }
    
    // Add context tag (may conflict)
    if (rng.random() < 0.6) {
      const contextTags = ['sig.context.work.deadline', 'sig.context.social.isolation', 'sig.context.health.stress'];
      tags.push(contextTags[Math.floor(rng.random() * contextTags.length)]);
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }
  
  // Task 2.2: Build known tags set for unknown tag detection
  const knownTagsSet = new Set();
  try {
    const { getMicrosForMacro } = await import('../src/data/microTaxonomy.js');
    const { getMicroEvidenceTags } = await import('../src/data/microEvidenceTags.js');
    const { canonicalizeTags } = await import('../src/utils/canonicalizeTags.js');
    
    // Collect all tags from microEvidenceTags
    const allMacros = ['grounded', 'engaged', 'connected', 'capable', 'pressured', 'blocked', 'overloaded', 'exhausted', 'down', 'averse', 'detached'];
    for (const macro of allMacros) {
      const micros = getMicrosForMacro(macro);
      for (const micro of micros) {
        const evidenceTags = getMicroEvidenceTags(micro.microKey);
        if (evidenceTags) {
          // Add all evidence tag types
          if (Array.isArray(evidenceTags.mustHave)) {
            evidenceTags.mustHave.forEach(tag => {
              const canonical = canonicalizeTags([tag]);
              canonical.forEach(t => knownTagsSet.add(t));
            });
          }
          if (Array.isArray(evidenceTags.supporting)) {
            evidenceTags.supporting.forEach(tag => {
              const canonical = canonicalizeTags([tag]);
              canonical.forEach(t => knownTagsSet.add(t));
            });
          }
          if (Array.isArray(evidenceTags.strong)) {
            evidenceTags.strong.forEach(tag => {
              const canonical = canonicalizeTags([tag]);
              canonical.forEach(t => knownTagsSet.add(t));
            });
          }
          if (Array.isArray(evidenceTags.weak)) {
            evidenceTags.weak.forEach(tag => {
              const canonical = canonicalizeTags([tag]);
              canonical.forEach(t => knownTagsSet.add(t));
            });
          }
        }
      }
    }
    
    // Add axis signal tags (sig.*)
    const axisTags = [
      'sig.tension.high', 'sig.tension.mid', 'sig.tension.low',
      'sig.fatigue.high', 'sig.fatigue.mid', 'sig.fatigue.low',
      'sig.valence.pos', 'sig.valence.neg', 'sig.valence.neutral',
      'sig.agency.high', 'sig.agency.mid', 'sig.agency.low',
      'sig.arousal.high', 'sig.arousal.mid', 'sig.arousal.low',
      'sig.cognition.blank', 'sig.cognition.clear',
      'sig.social.high', 'sig.social.low',
    ];
    axisTags.forEach(tag => knownTagsSet.add(tag));
  } catch (e) {
    console.warn('[checkDeepBalance] Failed to build known tags set:', e.message);
  }
  
  // Enhanced metrics collection
  const metrics = {
    config: {
      mode: config.mode,
      seed: config.seed,
      runs: baselineSubset.length,
      totalBaselines: BASELINE_COMBOS.length,
      flow: config.flow, // Task AK3-DEEP-L1-2
    },
    totalPaths: 0,
    microCoverage: new Set(),
    microDistribution: {},
    microDistributionOverall: {},
    microNoneCount: 0,
    microFallbackCount: 0,
    microZeroScorePickCount: 0, // TASK POST-03: selected micro with zero_score_pick (low confidence but not fallback)
    microSelectedCount: 0,
    microNoneByMacro: {},
    microFallbackByMacro: {},
    macroFlipCount: 0,
    macroFlipReasons: {},
    macroFlipPaths: {},
    illegalFlipCount: 0,
    illegalFlips: [],
    confidenceBefore: { high: 0, medium: 0, low: 0 },
    confidenceAfter: { high: 0, medium: 0, low: 0 },
    clarityBefore: { low: 0, medium: 0, null: 0 },
    clarityAfter: { low: 0, medium: 0, null: 0 },
    tagsPerRun: [],
    tagsDistribution: { 0: 0, 1: 0, 2: 0, '3+': 0 },
    scoringTagsEmptyCount: 0, // TASK POST-04
    scoringTagsLens: [], // TASK POST-04 (for p50/p95)
    weakEvidenceCount: 0,
    weakEvidenceByMacro: {},
    mustHaveHitCount: 0,
    mustHaveMissCount: 0,
    semanticViolations: [],
    suspiciousCases: [],
    // Task AK3-POST-1.2: Fallback diagnostics
    fallbackReasonBreakdown: {},
    fallbackReasonByMacro: {},
    fallbackTags: [], // All tags from fallback cases
    fallbackTagsByMacro: {},
    topCandidateScores: [], // Scores from topCandidate in fallback cases
    // Task AK3-POST-1.4: Specificity metrics
    microSpecificCount: 0, // Selected with non-axis tags
    microAxisOnlyCount: 0, // Selected with only axis tags
    microSpecificByMacro: {},
    microAxisOnlyByMacro: {},
    // Task AK3-DEEP-L1-2: Steps metrics
    stepsTaken: [], // Steps per run
    stepsByFlow: {}, // Steps breakdown by flow mode (for comparison)
    // Task AK3-DEEP-L1-2b: Invariant violations
    invariantViolations: [], // List of invariant violations
    invariantViolationCount: 0, // Total count of violations
    invariantViolationsByReason: {}, // Breakdown by reason
    // Task AK3-DEEP-L1-2c: Card sequence signatures
    cardSequences: [], // Array of { flow, sequence: "c12>c07>c19" }
    cardSequenceCounts: {}, // Map of sequence -> count per flow
    // Task 1.2: L1 card frequency (l1-full and deep-realistic only)
    l1CardFrequencies: {}, // cardId -> count
    // Task C: L1 asked count per run (l1-full and deep-realistic only)
    l1AskedCountPerRun: [], // Array of L1 card counts per run
    // Task 2.2: Unknown tags in fallback cases
    unknownTagsInFallback: {}, // tag -> count
    unknownTagsInFallbackByMacro: {}, // macro -> { tag -> count }
    unknownTagsInFallbackByReason: {}, // reason -> { tag -> count }
    // Task 2.3: Top tags breakdown by reason
    topTagsByReason: { no_evidence: {}, no_matches_zero_score: {} }, // reason -> { tag -> count }
    // Task 3: Per-macro detailed stats
    macroStats: {}, // macro -> { totalRuns, fallbackCount, fallbackRate, breakdown: { no_evidence, zero_score }, evidenceSizeDist: { 0: 0, 1: 0, ... } }
    // Task 4: Fallback case examples
    fallbackCaseExamples: [], // Array of { runId, macro, fallbackReason, microTopCandidate, microReason, evidenceTags, askedCardIds, baseline }
    // P0.6: Sanity checks
    microSourceBreakdown: {}, // microSource -> count (all values: evidence, selected, fallback, fallback_sanity, etc.)
    tagsDistinctPerRun: [], // Array of distinct tag counts per run
    // Task D: Forced fallback sanity
    forcedFallbackCount: 0, // Count of runs where evidence was forced to empty
    forcedFallbackDetected: 0, // Count of forced runs that resulted in fallback
    // Task E: Micro diversity metrics
    microTop1ShareByMacro: {}, // macro -> top1Count/totalCount
    microEntropyByMacro: {}, // macro -> entropy value
    microTopCandidatesByMacro: {}, // macro -> { top1: {micro, count, score}, top2: {...}, top3: {...} }
  };
  
  // Run simulation
  console.log(`Running deep simulation (${config.mode} mode)...`);
  let processed = 0;
  const reportInterval = Math.max(1, Math.floor(baselineSubset.length / 10));
  // STAB-RUNTIME-01: Progress log every 250/500 runs (smoke/full)
  const progressInterval = baselineSubset.length >= 10000 ? 500 : 250;
  const startTime = Date.now();

  // TASK POST-02: micro fallback sample sink
  const microFallbackSamples = [];
  
  for (const baselineMetrics of baselineSubset) {
    // Get baseline prior
    const baselineResult = routeStateFromBaselineCanonical(baselineMetrics, {
      evidenceVector: null,
      evidenceWeight: 0.25,
    });
    
    const baselineMacro = baselineResult.stateKey;
    const baselineConfidence = baselineResult.confidenceBand || 'medium';
    const baselineClarity = baselineResult.clarityFlag || null;
    
    // Count baseline metrics
    metrics.confidenceBefore[baselineConfidence]++;
    if (baselineClarity) metrics.clarityBefore[baselineClarity]++;
    else metrics.clarityBefore.null++;
    
    // Generate synthetic L1 responses (mode-specific, flow-aware)
    const l1ResponseResult = await generateSyntheticL1Responses(baselineMacro, config.mode, rng, config.effectiveFlow || config.flow, baselineMetrics);
    const l1Responses = l1ResponseResult.responses || [];
    const stepsTaken = l1ResponseResult.stepsTaken || l1Responses.length;
    const askedCardIds = l1ResponseResult.askedCardIds || [];
    const session = l1ResponseResult.session || null; // Task P2.2: Session data for deep-realistic
    
    // Task 1.2: Track L1 card frequencies (l1-full and deep-realistic only)
    // Task C: Track L1 asked count per run
    // Task P2.4: Track L2 asked count and session metrics for deep-realistic
    if (config.effectiveFlow === 'l1-full' || config.effectiveFlow === 'deep-realistic' || config.flow === 'adaptive-l1') {
      const l1AskedCount = askedCardIds.filter(id => id.startsWith('L1_')).length;
      metrics.l1AskedCountPerRun.push(l1AskedCount);
      for (const cardId of askedCardIds) {
        metrics.l1CardFrequencies[cardId] = (metrics.l1CardFrequencies[cardId] || 0) + 1;
      }
    }
    
      // Task P2.4.3: Collect per-run metrics for deep-realistic (after l1ResponseResult is available)
    if (config.effectiveFlow === 'deep-realistic' || config.effectiveFlow === 'fixed') {
      if (!metrics.deepRealisticRuns) {
        metrics.deepRealisticRuns = {
          askedL1Counts: [],
          askedL2Counts: [],
          notSureCounts: [],
          endedReasonCounts: {},
          endedByCounts: {}, // Task P2.13: Track endedBy breakdown
          l1OnlyRunsCount: 0, // Task P2.13: Track L1-only runs
          l1IncompleteRunsCount: 0, // Task P2.15: Track runs with askedL1Count < maxL1
          noL2CandidatesCount: 0, // Task P2.11: Track empty L2 plans
          baselineTagsCounts: [], // Task P2.16.1: Track baseline tags count per run
          gateHitCounts: { valence: 0, arousal: 0, agency: 0, clarity: 0, social: 0, load: 0 },
          gateHitCardsOnlyCounts: { valence: 0, arousal: 0, agency: 0, clarity: 0, social: 0, load: 0 }, // Task P3.7
          // Task P2.21: Tag provenance tracking
          unknownTagsBySource: { baseline: {}, l1: {}, l2: {}, not_sure: {} },
          baselineTagCounts: [],
          distinctTagCounts: [],
          rawTagCounts: [],
          // Task P2.24: Macro transition tracking
          macroBeforeCards: {},
          macroAfterL1: {},
          macroAfterL2: {},
          macroTransitions: {},
          // Task P3.8: Coverage-first effectiveness tracking
          gateFirstHitSteps: { valence: [], arousal: [], agency: [], clarity: [], social: [], load: [] },
          gateHitCardIds: { valence: {}, arousal: {}, agency: {}, clarity: [], social: [], load: [] },
          coverageFirstPicks: [],
          // P3.10.1: Zero-score fallback analysis
          zeroScoreFallbackCases: [], // Array to store detailed info for no_matches_zero_score cases
          macroKnownTagSets: {}, // Cache for macroKnownTagSet
        };
      }
      
      // Task A3.2.1: Read per-run fields from run.state (or compute from run.events)
      const runState = l1ResponseResult.state || {};
      const runEvents = l1ResponseResult.events || [];
      const runSession = l1ResponseResult.session || {};
      
      // Task A3.2.1: Get asked counts from state (safe for JSON serialization)
      const askedL1CountRaw = getCount(runState.askedL1Ids, 'askedL1Ids');
      const askedL1Count = askedL1CountRaw !== null 
        ? askedL1CountRaw
        : (l1ResponseResult.askedL1Count !== undefined 
          ? l1ResponseResult.askedL1Count 
          : askedCardIds.filter(id => id.startsWith('L1_')).length);
      const askedL2CountRaw = getCount(runState.askedL2Ids, 'askedL2Ids');
      const askedL2Count = askedL2CountRaw !== null 
        ? askedL2CountRaw
        : (l1ResponseResult.askedL2Count !== undefined 
          ? l1ResponseResult.askedL2Count 
          : askedCardIds.filter(id => id.startsWith('L2_')).length);
      
      // Validate counts
      if (askedL1Count === null || askedL1Count === undefined || isNaN(askedL1Count)) {
        console.warn(`[checkDeepBalance] askedL1Count is invalid: ${askedL1Count}. Run index: ${processed}`);
      }
      if (askedL2Count === null || askedL2Count === undefined || isNaN(askedL2Count)) {
        console.warn(`[checkDeepBalance] askedL2Count is invalid: ${askedL2Count}. Run index: ${processed}`);
      }
      const notSureCount = runEvents.filter(e => e.type === 'answer_committed' && e.payload.choice === 'NS').length ||
        (l1ResponseResult.notSureCount !== undefined 
          ? l1ResponseResult.notSureCount 
          : l1Responses.filter(r => r.isNotSure === true || r.answer === 'NS').length);
      
      // Task A3.2.1: Normalize endedReason
      const rawEndedReason = runState.endedReason || l1ResponseResult.endedReason || l1ResponseResult.endedBy || 'unknown';
      const endedReason = normalizeEndedReason(rawEndedReason);
      const endedBy = runState.endedBy || l1ResponseResult.endedBy || 'unknown';
      
      // Task A3.2.1: Get gates from state
      const gatesHit = runState.gatesHitAny || l1ResponseResult.gatesHit || {};
      const gatesHitCardsOnly = runState.gatesHitCardsOnly || l1ResponseResult.gatesHitCardsOnly || {};
      const noL2Candidates = (endedReason === 'no_l2_candidates' ? 1 : 0) || runSession.noL2CandidatesCount || 0;
      const baselineTagsCountRaw = getCount(runState.baselineEvidenceTags, 'baselineEvidenceTags');
      const baselineTagsCount = baselineTagsCountRaw !== null 
        ? baselineTagsCountRaw
        : (l1ResponseResult.baselineTagsCount !== undefined 
          ? l1ResponseResult.baselineTagsCount 
          : 0);
      
      metrics.deepRealisticRuns.askedL1Counts.push(askedL1Count);
      metrics.deepRealisticRuns.askedL2Counts.push(askedL2Count);
      metrics.deepRealisticRuns.notSureCounts.push(notSureCount);
      metrics.deepRealisticRuns.endedReasonCounts[endedReason] = (metrics.deepRealisticRuns.endedReasonCounts[endedReason] || 0) + 1;
      metrics.deepRealisticRuns.endedByCounts[endedBy] = (metrics.deepRealisticRuns.endedByCounts[endedBy] || 0) + 1;
      
      // Task P2.15: Track L1-only runs and incomplete L1 runs
      if (askedL2Count === 0) {
        metrics.deepRealisticRuns.l1OnlyRunsCount++;
      }
      if (askedL1Count < (config.maxL1 || 6)) {
        metrics.deepRealisticRuns.l1IncompleteRunsCount++;
      }
      
      // Task P2.11: Track empty L2 plans
      if (noL2Candidates > 0) {
        metrics.deepRealisticRuns.noL2CandidatesCount += noL2Candidates;
      }
      
      // Task P2.16.1: Track baseline tags count
      metrics.deepRealisticRuns.baselineTagsCounts.push(baselineTagsCount);
      
      // Task A3.2.1: Process tag provenance from events (or fallback to session)
      const session = runSession;
      const evidenceTagEventsFromEvents = runEvents.filter(e => e.type === 'evidence_added').map(e => ({
        tag: e.payload.tags?.[0] || '',
        source: e.payload.source || 'unknown',
        cardId: e.cardId || null,
      }));
      const evidenceTagEvents = evidenceTagEventsFromEvents.length > 0 
        ? evidenceTagEventsFromEvents 
        : (session.evidenceTagEvents || []);
      
      // Count tags by source
      let baselineTagCount = 0;
      let distinctTags = new Set();
      let rawTagCount = 0;
      
      for (const event of evidenceTagEvents) {
        const source = event.source || 'unknown';
        const tag = event.tag;
        
        if (tag) {
          rawTagCount++;
          distinctTags.add(tag);
          
          if (source === 'baseline') {
            baselineTagCount++;
          }
          
          // Check if tag is unknown
          if (!knownTagsSet.has(tag)) {
            if (!metrics.deepRealisticRuns.unknownTagsBySource[source]) {
              metrics.deepRealisticRuns.unknownTagsBySource[source] = {};
            }
            metrics.deepRealisticRuns.unknownTagsBySource[source][tag] = 
              (metrics.deepRealisticRuns.unknownTagsBySource[source][tag] || 0) + 1;
          }
        }
      }
      
      metrics.deepRealisticRuns.baselineTagCounts.push(baselineTagCount);
      metrics.deepRealisticRuns.distinctTagCounts.push(distinctTags.size);
      metrics.deepRealisticRuns.rawTagCounts.push(rawTagCount);
      
      // Task A3.2.1: Track macro transitions from state
      const macroBefore = runState.macroBeforeCards || l1ResponseResult.macroBeforeCards || baselineMacro;
      const macroAfterL1 = runState.macroAfterL1 || l1ResponseResult.macroAfterL1 || macroBefore;
      const macroAfterL2 = runState.macroAfterL2 || l1ResponseResult.macroAfterL2 || macroAfterL1;
      
      if (macroBefore !== undefined) {
        
        if (!metrics.deepRealisticRuns.macroBeforeCards) {
          metrics.deepRealisticRuns.macroBeforeCards = {};
          metrics.deepRealisticRuns.macroAfterL1 = {};
          metrics.deepRealisticRuns.macroAfterL2 = {};
          metrics.deepRealisticRuns.macroTransitions = {};
        }
        
        metrics.deepRealisticRuns.macroBeforeCards[macroBefore] = 
          (metrics.deepRealisticRuns.macroBeforeCards[macroBefore] || 0) + 1;
        metrics.deepRealisticRuns.macroAfterL1[macroAfterL1] = 
          (metrics.deepRealisticRuns.macroAfterL1[macroAfterL1] || 0) + 1;
        metrics.deepRealisticRuns.macroAfterL2[macroAfterL2] = 
          (metrics.deepRealisticRuns.macroAfterL2[macroAfterL2] || 0) + 1;
        
        const transitionKey = `${macroBefore}->${macroAfterL2}`;
        metrics.deepRealisticRuns.macroTransitions[transitionKey] = 
          (metrics.deepRealisticRuns.macroTransitions[transitionKey] || 0) + 1;
      }
      
      // Task A3.2.1: Gates already extracted from state above
      
      for (const [gateName, hit] of Object.entries(gatesHit)) {
        if (hit && metrics.deepRealisticRuns.gateHitCounts.hasOwnProperty(gateName)) {
          metrics.deepRealisticRuns.gateHitCounts[gateName]++;
        }
      }
      
      for (const [gateName, hit] of Object.entries(gatesHitCardsOnly)) {
        if (hit && metrics.deepRealisticRuns.gateHitCardsOnlyCounts.hasOwnProperty(gateName)) {
          metrics.deepRealisticRuns.gateHitCardsOnlyCounts[gateName]++;
        }
      }
      
      // Task A3.2.1: Get gate tracking from state
      const gateFirstHitStep = runState.gateFirstHitStep || l1ResponseResult.gateFirstHitStep || {};
      const gateHitCardIds = runState.gateHitCardIds || l1ResponseResult.gateHitCardIds || {};
      const coverageFirstPicks = runState.coverageFirstPicks || l1ResponseResult.coverageFirstPicks || [];
      
      for (const [gateName, step] of Object.entries(gateFirstHitStep)) {
        if (metrics.deepRealisticRuns.gateFirstHitSteps[gateName]) {
          metrics.deepRealisticRuns.gateFirstHitSteps[gateName].push(step);
        }
      }
      
      for (const [gateName, cardIds] of Object.entries(gateHitCardIds)) {
        if (!metrics.deepRealisticRuns.gateHitCardIds[gateName]) {
          metrics.deepRealisticRuns.gateHitCardIds[gateName] = {};
        }
        for (const [cardId, count] of Object.entries(cardIds)) {
          metrics.deepRealisticRuns.gateHitCardIds[gateName][cardId] = 
            (metrics.deepRealisticRuns.gateHitCardIds[gateName][cardId] || 0) + count;
        }
      }
      
      if (coverageFirstPicks.length > 0) {
        metrics.deepRealisticRuns.coverageFirstPicks.push(...coverageFirstPicks);
      }
      
      // Task P3.6A: Collect debug info for first N runs
      if (config.debugRuns > 0 && processed < config.debugRuns) {
        const debugInfo = l1ResponseResult.debugInfo;
        if (!metrics.deepRealisticRuns.debugRuns) {
          metrics.deepRealisticRuns.debugRuns = [];
        }
        if (debugInfo) {
          metrics.deepRealisticRuns.debugRuns.push({
            runIndex: processed,
            cardEvidenceTagsDistinctCount: debugInfo.cardEvidenceTagsDistinctCount,
            cardEvidenceTagsSample: debugInfo.cardEvidenceTagsSample,
            baselineEvidenceTagsDistinctCount: debugInfo.baselineEvidenceTagsDistinctCount,
          });
        }
      }
    }
    
    // Task AK3-DEEP-L1-2: Track steps taken
    metrics.stepsTaken.push(stepsTaken);
    if (!metrics.stepsByFlow[config.flow]) {
      metrics.stepsByFlow[config.flow] = [];
    }
    metrics.stepsByFlow[config.flow].push(stepsTaken);
    
    // Count tags per run (handle both tags and selectedTags for deep-realistic)
    const totalTags = l1Responses.reduce((sum, r) => {
      const tags = r.tags || r.selectedTags || [];
      return sum + (Array.isArray(tags) ? tags.length : 0);
    }, 0);
    metrics.tagsPerRun.push(totalTags);
    if (totalTags === 0) metrics.tagsDistribution[0]++;
    else if (totalTags === 1) metrics.tagsDistribution[1]++;
    else if (totalTags === 2) metrics.tagsDistribution[2]++;
    else metrics.tagsDistribution['3+']++;
    
    // P0.6B: Count distinct tags per run (handle both tags and selectedTags for deep-realistic)
    const allTagsFlat = l1Responses.flatMap(r => {
      const tags = r.tags || r.selectedTags || [];
      return Array.isArray(tags) ? tags : [];
    });
    const distinctTagsCount = new Set(allTagsFlat).size;
    metrics.tagsDistinctPerRun.push(distinctTagsCount);
    
    // STAB-RUNTIME-01: Progress log with ETA
    processed++;
    if (processed % progressInterval === 0 || processed === baselineSubset.length) {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const rate = processed / elapsed; // runs per second
      const remaining = baselineSubset.length - processed;
      const eta = remaining / rate; // seconds
      const etaMin = Math.floor(eta / 60);
      const etaSec = Math.floor(eta % 60);
      const pct = ((processed / baselineSubset.length) * 100).toFixed(1);
      console.log(`[Progress] ${processed}/${baselineSubset.length} (${pct}%) | Rate: ${rate.toFixed(1)} runs/s | ETA: ${etaMin}m ${etaSec}s`);
    }
    
    // Check for must-have tags (handle both tags and selectedTags)
    const allTags = l1Responses.flatMap(r => {
      const tags = r.tags || r.selectedTags || [];
      return Array.isArray(tags) ? tags : [];
    });
    const { getMicrosForMacro } = await import('../src/data/microTaxonomy.js');
    const { getMicroEvidenceTags } = await import('../src/data/microEvidenceTags.js');
    const baselineMicros = getMicrosForMacro(baselineMacro);
    let hasMustHave = false;
    for (const micro of baselineMicros) {
      const evidenceTags = getMicroEvidenceTags(micro.microKey);
      if (evidenceTags && evidenceTags.mustHave.length > 0) {
        for (const mustHaveTag of evidenceTags.mustHave) {
          if (allTags.includes(mustHaveTag)) {
            hasMustHave = true;
            break;
          }
        }
        if (hasMustHave) break;
      }
    }
    if (hasMustHave) metrics.mustHaveHitCount++;
    else metrics.mustHaveMissCount++;
    
    // Task D: Force no_evidence fallback for sanity check
    let forcedNoEvidence = false;
    if (config.forceNoEvidenceRate > 0 && rng.random() < config.forceNoEvidenceRate) {
      l1Responses = []; // Clear all evidence
      forcedNoEvidence = true;
      metrics.forcedFallbackCount++;
    }
    
    // Run deep engine
    const deepResult = await routeStateFromDeepCanonical(baselineMetrics, l1Responses, {
      evidenceWeight: 0.45,
    });
    
    // Task D: Check if forced fallback was detected
    if (forcedNoEvidence) {
      const microSource = deepResult.microSource || 'none';
      if (microSource && String(microSource).startsWith('fallback')) {
        metrics.forcedFallbackDetected++;
      }
    }
    
    metrics.totalPaths++;
    processed++;
    
    // Progress reporting
    if (processed % reportInterval === 0) {
      const progress = ((processed / baselineSubset.length) * 100).toFixed(1);
      console.log(`Progress: ${progress}% (${processed}/${baselineSubset.length})`);
    }
    
    // Micro coverage and source tracking
    const macro = deepResult.macroKey || baselineMacro;
    const microSource = deepResult.microSource || 'none';
    const microReason = deepResult.microReason || 'unknown';
    const microTopCandidate = deepResult.microTopCandidate || null;

    // TASK POST-04: scoringTags stats (use micro scoring diagnostics when available)
    const scoringTags = Array.isArray(deepResult?.diagnostics?.microScoringDiagnostics?.scoringTags)
      ? deepResult.diagnostics.microScoringDiagnostics.scoringTags
      : (Array.isArray(deepResult.evidenceTags) ? deepResult.evidenceTags : []);
    metrics.scoringTagsLens.push(scoringTags.length);
    if (scoringTags.length === 0) metrics.scoringTagsEmptyCount++;

    // TASK POST-03: track zero_score_pick as separate KPI (selected but low confidence)
    if (microSource === 'selected' && microReason === 'zero_score_pick') {
      metrics.microZeroScorePickCount++;
    }
    
    // P0.6A: Track microSource breakdown (all values, not just fallback)
    const sourceKey = String(microSource || 'none');
    metrics.microSourceBreakdown[sourceKey] = (metrics.microSourceBreakdown[sourceKey] || 0) + 1;
    
    // TASK POST-02: sample micro failures (fallback + zero_score_pick), with topCandidates if available.
    const isSampledReason =
      microReason === 'no_evidence' ||
      microReason === 'no_matches_zero_score' ||
      microReason === 'zero_score_pick';

    if (config.sampleFailures > 0 && isSampledReason && microFallbackSamples.length < config.sampleFailures) {
      const diag = deepResult?.diagnostics?.microScoringDiagnostics || null;
      const sampleScoringTags = Array.isArray(diag?.scoringTags) ? diag.scoringTags : scoringTags;
      microFallbackSamples.push({
        flow: config.effectiveFlow,
        seed: config.seed,
        kind: microReason === 'zero_score_pick' ? 'zero_score_pick' : (microSource && String(microSource).startsWith('fallback') ? 'fallback' : 'not_selected'),
        baselineMetrics,
        scoringTags: sampleScoringTags,
        axisTags: sampleScoringTags.filter(t =>
          t.startsWith('sig.valence.') ||
          t.startsWith('sig.arousal.') ||
          t.startsWith('sig.agency.') ||
          t.startsWith('sig.clarity.')
        ),
        macroAfter: macro,
        microTopCandidate,
        reason: microReason,
        topCandidates: Array.isArray(diag?.topCandidates) ? diag.topCandidates.slice(0, 5) : null,
      });
    }

    // Task AK3-POST-1.2: Track fallback reasons
    if (microSource && String(microSource).startsWith('fallback')) {
      metrics.microFallbackCount++;
      metrics.microFallbackByMacro[macro] = (metrics.microFallbackByMacro[macro] || 0) + 1;
      
      // Track fallback reason
      metrics.fallbackReasonBreakdown[microReason] = (metrics.fallbackReasonBreakdown[microReason] || 0) + 1;
      if (!metrics.fallbackReasonByMacro[macro]) {
        metrics.fallbackReasonByMacro[macro] = {};
      }
      metrics.fallbackReasonByMacro[macro][microReason] = (metrics.fallbackReasonByMacro[macro][microReason] || 0) + 1;
      
      // Track tags in fallback cases
      const fallbackTags = deepResult.evidenceTags || [];
      metrics.fallbackTags.push(...fallbackTags);
      if (!metrics.fallbackTagsByMacro[macro]) {
        metrics.fallbackTagsByMacro[macro] = [];
      }
      metrics.fallbackTagsByMacro[macro].push(...fallbackTags);
      
      // Track topCandidate score
      if (microTopCandidate && typeof microTopCandidate.score === 'number') {
        metrics.topCandidateScores.push(microTopCandidate.score);
      }
      
      // Task 2.2: Track unknown tags in fallback cases
      const { canonicalizeTags } = await import('../src/utils/canonicalizeTags.js');
      const canonicalTags = canonicalizeTags(fallbackTags);
      for (const tag of canonicalTags) {
        if (!knownTagsSet.has(tag)) {
          metrics.unknownTagsInFallback[tag] = (metrics.unknownTagsInFallback[tag] || 0) + 1;
          if (!metrics.unknownTagsInFallbackByMacro[macro]) {
            metrics.unknownTagsInFallbackByMacro[macro] = {};
          }
          metrics.unknownTagsInFallbackByMacro[macro][tag] = (metrics.unknownTagsInFallbackByMacro[macro][tag] || 0) + 1;
          if (!metrics.unknownTagsInFallbackByReason[microReason]) {
            metrics.unknownTagsInFallbackByReason[microReason] = {};
          }
          metrics.unknownTagsInFallbackByReason[microReason][tag] = (metrics.unknownTagsInFallbackByReason[microReason][tag] || 0) + 1;
        }
      }
      
      // Task 2.3: Track top tags by reason
      if (!metrics.topTagsByReason[microReason]) {
        metrics.topTagsByReason[microReason] = {};
      }
      for (const tag of canonicalTags) {
        metrics.topTagsByReason[microReason][tag] = (metrics.topTagsByReason[microReason][tag] || 0) + 1;
      }

      // P3.10.1: Collect scoring input tags for no_matches_zero_score cases
      if (microReason === 'no_matches_zero_score' && config.effectiveFlow === 'deep-realistic' && metrics.deepRealisticRuns) {
        // Task A3.2.1: Get evidenceTagEvents from events or state
        const session = l1ResponseResult.session || {};
        const evidenceTagEventsFromEvents = (l1ResponseResult.events || []).filter(e => e.type === 'evidence_added').map(e => ({
          tag: e.payload.tags?.[0] || '',
          source: e.payload.source || 'unknown',
          cardId: e.cardId || null,
        }));
        const evidenceTagEvents = evidenceTagEventsFromEvents.length > 0 
          ? evidenceTagEventsFromEvents 
          : (session.evidenceTagEvents || []);
        
        // P3.10.3B: Explicit derivation pipeline
        // Step 1: Canonicalize (normalization/aliasing only)
        const canonicalAny = Array.from(new Set(canonicalTags));
        
        // Step 2: Derive sig.* from l1_* tags
        const { deriveSigTagsFromArray, canonicalizeTags } = await import('../src/domain/tags/index.js');
        const derivedSigTags = deriveSigTagsFromArray(canonicalAny);
        
        // Step 3: Combine canonical + derived (unique)
        const expandedAny = Array.from(new Set([...canonicalAny, ...derivedSigTags]));
        
        // P3.10.3.1: Separate l1_* tags from sig.* tags for scoring
        const l1Tags = expandedAny.filter(tag => tag.startsWith('l1_'));
        const sigTags = expandedAny.filter(tag => tag.startsWith('sig.'));
        const otherTags = expandedAny.filter(tag => !tag.startsWith('l1_') && !tag.startsWith('sig.'));
        
        // Task A3.2.1: Get cardEvidenceTags from state (safe for JSON serialization)
        const cardEvidenceTagsRaw = (l1ResponseResult.state || {}).cardEvidenceTags || session.cardEvidenceTags || [];
        // Ensure cardEvidenceTagsRaw is an array (may be Set/Object after JSON round-trip)
        const cardEvidenceTagsArray = Array.isArray(cardEvidenceTagsRaw) 
          ? cardEvidenceTagsRaw 
          : (cardEvidenceTagsRaw instanceof Set 
            ? Array.from(cardEvidenceTagsRaw) 
            : (typeof cardEvidenceTagsRaw === 'object' && cardEvidenceTagsRaw !== null
              ? Object.values(cardEvidenceTagsRaw).filter(v => typeof v === 'string')
              : []));
        const cardEvidenceTagsCanonical = canonicalizeTags(cardEvidenceTagsArray);
        const cardDerivedSigTags = deriveSigTagsFromArray(cardEvidenceTagsCanonical);
        const cardExpanded = Array.from(new Set([...cardEvidenceTagsCanonical, ...cardDerivedSigTags]));
        const evidenceDistinctCardsOnly = Array.from(new Set(cardExpanded));
        
        // Define axis tags (from microEvidenceTags.js or common knowledge)
        const axisPrefixes = ['sig.valence.', 'sig.arousal.', 'sig.tension.', 'sig.agency.', 'sig.clarity.', 'sig.fatigue.', 'sig.social.'];
        const contextPrefixes = ['sig.context.', 'sig.trigger.']; // Tags to potentially ignore in scoring
        
        // P3.10.3.1: Scoring distinct should contain only sig.* tags (after derive from l1_*)
        // This ensures scoringDistinct can be compared with macroKnownTagSet (which contains only sig.*)
        const axisTags = sigTags.filter(tag => axisPrefixes.some(prefix => tag.startsWith(prefix)));
        const contextTags = sigTags.filter(tag => contextPrefixes.some(prefix => tag.startsWith(prefix)));
        const otherSigTags = sigTags.filter(tag => !axisTags.includes(tag) && !contextTags.includes(tag));
        
        // P3.10.3.2: Track excluded context tags for IGNORE analysis
        const excludedContextDistinct = contextTags;
        
        // Scoring distinct tags (what actually participates in scoring after filters)
        // Only sig.* tags participate (l1_* are already derived to sig.*)
        const scoringDistinct = [...axisTags, ...otherSigTags];
        
        // Calculate macroKnownTagSet
        let macroKnownTagSet = metrics.deepRealisticRuns.macroKnownTagSets[macro];
        if (!macroKnownTagSet) {
          const { getMicrosForMacro } = await import('../src/data/microTaxonomy.js');
          const { getMicroEvidenceTags } = await import('../src/data/microEvidenceTags.js');
          const microsInMacro = getMicrosForMacro(macro);
          const allTagsInMacro = new Set();
          for (const micro of microsInMacro) {
            const microTags = getMicroEvidenceTags(micro.microKey);
            if (microTags) {
              microTags.mustHave.forEach(tag => allTagsInMacro.add(tag));
              microTags.supporting.forEach(tag => allTagsInMacro.add(tag));
            }
          }
          macroKnownTagSet = Array.from(allTagsInMacro);
          metrics.deepRealisticRuns.macroKnownTagSets[macro] = macroKnownTagSet;
        }
        
        // Calculate unmappedDistinct
        const unmappedDistinct = scoringDistinct.filter(tag =>
          !axisTags.includes(tag) && !macroKnownTagSet.includes(tag)
        );
        
        // Sources breakdown
        const sourcesBreakdown = { baseline: 0, l1: 0, l2: 0, not_sure: 0 };
        for (const event of evidenceTagEvents) {
          if (sourcesBreakdown.hasOwnProperty(event.source)) {
            sourcesBreakdown[event.source]++;
          }
        }
        
        metrics.deepRealisticRuns.zeroScoreFallbackCases.push({
          macro,
          microTopCandidate: microTopCandidate ? {
            microKey: microTopCandidate.microKey,
            score: microTopCandidate.score,
            matchedTags: microTopCandidate.matchedTags || [],
          } : null,
          scoringDistinct,
          unmappedDistinct,
          excludedContextDistinct, // P3.10.3.2: Track excluded context tags
          sourcesBreakdown,
          runId: processed,
        });
      }
      
      // Task 4: Collect fallback case examples (stratified sampling)
      const runId = processed;
      const shouldCollect = 
        (microReason === 'no_evidence' && metrics.fallbackCaseExamples.filter(e => e.fallbackReason === 'no_evidence').length < 5) ||
        (microReason === 'no_matches_zero_score' && metrics.fallbackCaseExamples.filter(e => e.fallbackReason === 'no_matches_zero_score').length < 5) ||
        (['exhausted', 'down', 'detached'].includes(macro) && metrics.fallbackCaseExamples.filter(e => ['exhausted', 'down', 'detached'].includes(e.macro)).length < 5);
      
      if (shouldCollect && metrics.fallbackCaseExamples.length < 20) {
        metrics.fallbackCaseExamples.push({
          runId,
          macro,
          fallbackReason: microReason,
          microTopCandidate: microTopCandidate ? {
            microKey: microTopCandidate.microKey,
            score: microTopCandidate.score,
            matchedTags: microTopCandidate.matchedTags || [],
          } : null,
          microReason,
          evidenceTags: [...canonicalTags],
          evidenceSize: canonicalTags.length,
          askedCardIds: [...askedCardIds],
          baseline: { ...baselineMetrics },
        });
      }
    }
    
    if (!deepResult.microKey) {
      metrics.microNoneCount++;
      metrics.microNoneByMacro[macro] = (metrics.microNoneByMacro[macro] || 0) + 1;
    } else {
      metrics.microCoverage.add(deepResult.microKey);
      
      if (microSource === 'selected') {
        metrics.microSelectedCount++;
        
        // Task AK3-POST-1.4: Check if selected micro is specific (non-axis tags)
        const evidenceTags = deepResult.evidenceTags || [];
        const matchedTags = microTopCandidate?.matchedTags || [];
        
        // Check if matchedTags contain non-axis tags
        // Axis tags: sig.tension.*, sig.fatigue.*, sig.valence.*, sig.agency.*, sig.arousal.*
        const axisPrefixes = ['sig.tension.', 'sig.fatigue.', 'sig.valence.', 'sig.agency.', 'sig.arousal.'];
        const hasNonAxisTags = matchedTags.some(tag => 
          !axisPrefixes.some(prefix => tag.startsWith(prefix))
        );
        
        if (hasNonAxisTags) {
          metrics.microSpecificCount++;
          metrics.microSpecificByMacro[macro] = (metrics.microSpecificByMacro[macro] || 0) + 1;
        } else if (matchedTags.length > 0) {
          metrics.microAxisOnlyCount++;
          metrics.microAxisOnlyByMacro[macro] = (metrics.microAxisOnlyByMacro[macro] || 0) + 1;
        }
      }
      
      if (!metrics.microDistribution[macro]) {
        metrics.microDistribution[macro] = {};
      }
      metrics.microDistribution[macro][deepResult.microKey] = 
        (metrics.microDistribution[macro][deepResult.microKey] || 0) + 1;
      metrics.microDistributionOverall[deepResult.microKey] = 
        (metrics.microDistributionOverall[deepResult.microKey] || 0) + 1;
    }
    
    // Weak evidence detection
    const evidenceTags = deepResult.evidenceTags || [];
    const isWeakEvidence = totalTags < 2 || (evidenceTags.length < 2 && baselineConfidence === 'low');
    if (isWeakEvidence) {
      metrics.weakEvidenceCount++;
      const macro = deepResult.macroKey || baselineMacro;
      metrics.weakEvidenceByMacro[macro] = (metrics.weakEvidenceByMacro[macro] || 0) + 1;
    }
    
    // Task 3: Per-macro detailed stats
    const finalMacro = deepResult.macroKey || baselineMacro;
    if (!metrics.macroStats[finalMacro]) {
      metrics.macroStats[finalMacro] = {
        totalRuns: 0,
        fallbackCount: 0,
        breakdown: { no_evidence: 0, no_matches_zero_score: 0 },
        evidenceSizeDist: { 0: 0, 1: 0, 2: 0, '3+': 0 },
      };
    }
    metrics.macroStats[finalMacro].totalRuns++;
    if (microSource && String(microSource).startsWith('fallback')) {
      metrics.macroStats[finalMacro].fallbackCount++;
      if (microReason === 'no_evidence' || microReason === 'no_matches_zero_score') {
        metrics.macroStats[finalMacro].breakdown[microReason] = (metrics.macroStats[finalMacro].breakdown[microReason] || 0) + 1;
      }
    }
    const evidenceSize = evidenceTags.length;
    if (evidenceSize === 0) {
      metrics.macroStats[finalMacro].evidenceSizeDist[0]++;
    } else if (evidenceSize === 1) {
      metrics.macroStats[finalMacro].evidenceSizeDist[1]++;
    } else if (evidenceSize === 2) {
      metrics.macroStats[finalMacro].evidenceSizeDist[2]++;
    } else {
      metrics.macroStats[finalMacro].evidenceSizeDist['3+']++;
    }
    
    // Macro flip
    if (deepResult.macroFlipApplied) {
      metrics.macroFlipCount++;
      const reason = deepResult.macroFlipReason || 'unknown';
      metrics.macroFlipReasons[reason] = (metrics.macroFlipReasons[reason] || 0) + 1;
      
      const path = `${baselineMacro} → ${deepResult.macroKey}`;
      metrics.macroFlipPaths[path] = (metrics.macroFlipPaths[path] || 0) + 1;
      
      // Check for illegal flips (semantic violations)
      const { levelizeStateVec } = await import('../src/utils/stateEligibility.js');
      const levels = levelizeStateVec(deepResult.vector || {});
      if (deepResult.macroKey === 'connected' && (levels.F_high || levels.T_high || levels.Vneg)) {
        metrics.illegalFlipCount++;
        metrics.illegalFlips.push({
          baseline: baselineMetrics,
          from: baselineMacro,
          to: deepResult.macroKey,
          micro: deepResult.microKey,
          levels,
        });
      }
    }
    
    // Confidence/clarity after
    const deepConfidence = deepResult.confidenceBand;
    const deepClarity = deepResult.clarityFlag || null;
    metrics.confidenceAfter[deepConfidence]++;
    if (deepClarity) metrics.clarityAfter[deepClarity]++;
    else metrics.clarityAfter.null++;
    
    // Semantic violations
    if (deepResult.macroKey === 'connected') {
      const { levelizeStateVec } = await import('../src/utils/stateEligibility.js');
      const levels = levelizeStateVec(deepResult.vector || {});
      if (levels.F_high || levels.T_high || levels.Vneg) {
        metrics.semanticViolations.push({
          baseline: baselineMetrics,
          macro: deepResult.macroKey,
          micro: deepResult.microKey,
          levels,
        });
      }
    }
    
    // Collect suspicious cases (micro fallback/none with weak evidence)
    if ((microSource === 'fallback' || !deepResult.microKey) && isWeakEvidence && metrics.suspiciousCases.length < 20) {
      metrics.suspiciousCases.push({
        baseline: baselineMetrics,
        baselineMacro,
        baselineConfidence,
        evidenceTags: allTags,
        totalTags,
        deepResult: {
          macroKey: deepResult.macroKey,
          microKey: deepResult.microKey,
          microSource: microSource,
          confidenceBand: deepResult.confidenceBand,
          clarityFlag: deepResult.clarityFlag,
        },
      });
    }
  }
  
  // Calculate derived metrics
  const avgTagsPerRun = metrics.tagsPerRun.length > 0
    ? (metrics.tagsPerRun.reduce((a, b) => a + b, 0) / metrics.tagsPerRun.length).toFixed(2)
    : '0.00';
  
  // P0.6B: Calculate avg distinct tags
  const avgTagsDistinct = metrics.tagsDistinctPerRun.length > 0
    ? (metrics.tagsDistinctPerRun.reduce((a, b) => a + b, 0) / metrics.tagsDistinctPerRun.length).toFixed(2)
    : '0.00';
  
  const microNoneRate = ((metrics.microNoneCount / metrics.totalPaths) * 100).toFixed(2);
  const microFallbackRate = ((metrics.microFallbackCount / metrics.totalPaths) * 100).toFixed(2);
  const microZeroScorePickRate = ((metrics.microZeroScorePickCount / metrics.totalPaths) * 100).toFixed(2); // TASK POST-03
  const microSelectedRate = ((metrics.microSelectedCount / metrics.totalPaths) * 100).toFixed(2);
  const scoringTagsEmptyRate = ((metrics.scoringTagsEmptyCount / metrics.totalPaths) * 100).toFixed(2); // TASK POST-04
  const weakEvidenceShare = ((metrics.weakEvidenceCount / metrics.totalPaths) * 100).toFixed(2);
  const macroFlipRate = ((metrics.macroFlipCount / metrics.totalPaths) * 100).toFixed(2);
  const illegalFlipRate = ((metrics.illegalFlipCount / metrics.totalPaths) * 100).toFixed(2);
  const mustHaveHitRate = metrics.mustHaveHitCount + metrics.mustHaveMissCount > 0
    ? ((metrics.mustHaveHitCount / (metrics.mustHaveHitCount + metrics.mustHaveMissCount)) * 100).toFixed(2)
    : '0.00';
  
  // Calculate per-macro micro none rates
  const microNoneByMacroRates = {};
  for (const [macro, count] of Object.entries(metrics.microNoneByMacro)) {
    const macroTotal = Object.values(metrics.microDistribution[macro] || {}).reduce((a, b) => a + b, 0) + count + (metrics.microFallbackByMacro[macro] || 0);
    microNoneByMacroRates[macro] = macroTotal > 0 ? ((count / macroTotal) * 100).toFixed(2) : '0.00';
  }
  
  // Calculate per-macro micro fallback rates
  const microFallbackByMacroRates = {};
  for (const [macro, count] of Object.entries(metrics.microFallbackByMacro)) {
    const macroTotal = Object.values(metrics.microDistribution[macro] || {}).reduce((a, b) => a + b, 0) + count + (metrics.microNoneByMacro[macro] || 0);
    microFallbackByMacroRates[macro] = macroTotal > 0 ? ((count / macroTotal) * 100).toFixed(2) : '0.00';
  }
  
  // Calculate per-macro weak evidence shares
  const weakEvidenceByMacroRates = {};
  for (const [macro, count] of Object.entries(metrics.weakEvidenceByMacro)) {
    const macroTotal = Object.values(metrics.microDistribution[macro] || {}).reduce((a, b) => a + b, 0) + (metrics.microNoneByMacro[macro] || 0) + (metrics.microFallbackByMacro[macro] || 0);
    weakEvidenceByMacroRates[macro] = macroTotal > 0 ? ((count / macroTotal) * 100).toFixed(2) : '0.00';
  }
  
  // Find worst macro by micro fallback and weak evidence
  const worstMacroByFallback = Object.entries(microFallbackByMacroRates)
    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))[0];
  const worstMacroByWeak = Object.entries(weakEvidenceByMacroRates)
    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))[0];
  
  // Task AK3-POST-1.2: Calculate fallback reason breakdown
  const fallbackReasonBreakdown = {};
  const totalFallbacks = metrics.microFallbackCount;
  for (const [reason, count] of Object.entries(metrics.fallbackReasonBreakdown)) {
    fallbackReasonBreakdown[reason] = totalFallbacks > 0 ? ((count / totalFallbacks) * 100).toFixed(2) : '0.00';
  }
  
  const fallbackReasonByMacroRates = {};
  for (const [macro, reasons] of Object.entries(metrics.fallbackReasonByMacro)) {
    const macroFallbacks = metrics.microFallbackByMacro[macro] || 0;
    fallbackReasonByMacroRates[macro] = {};
    for (const [reason, count] of Object.entries(reasons)) {
      fallbackReasonByMacroRates[macro][reason] = macroFallbacks > 0 ? ((count / macroFallbacks) * 100).toFixed(2) : '0.00';
    }
  }
  
  // Task AK3-POST-1.2: Calculate top tags in fallback cases
  const tagCounts = {};
  for (const tag of metrics.fallbackTags) {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  const topTagsInFallback = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count, percentage: ((count / totalFallbacks) * 100).toFixed(2) }));
  
  const topTagsInFallbackByMacro = {};
  for (const [macro, tags] of Object.entries(metrics.fallbackTagsByMacro)) {
    const macroTagCounts = {};
    for (const tag of tags) {
      macroTagCounts[tag] = (macroTagCounts[tag] || 0) + 1;
    }
    const macroFallbacks = metrics.microFallbackByMacro[macro] || 0;
    topTagsInFallbackByMacro[macro] = Object.entries(macroTagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count, percentage: macroFallbacks > 0 ? ((count / macroFallbacks) * 100).toFixed(2) : '0.00' }));
  }
  
  // Task AK3-POST-1.2: Calculate topCandidate score histogram
  const scoreHistogram = {
    zero: 0,
    '0_to_0.1': 0,
    '0.1_to_0.2': 0,
    '0.2_to_0.3': 0,
    '0.3_plus': 0,
  };
  for (const score of metrics.topCandidateScores) {
    if (score === 0) {
      scoreHistogram.zero++;
    } else if (score > 0 && score <= 0.1) {
      scoreHistogram['0_to_0.1']++;
    } else if (score > 0.1 && score <= 0.2) {
      scoreHistogram['0.1_to_0.2']++;
    } else if (score > 0.2 && score <= 0.3) {
      scoreHistogram['0.2_to_0.3']++;
    } else {
      scoreHistogram['0.3_plus']++;
    }
  }
  const scoreHistogramPercentages = {};
  const totalScores = metrics.topCandidateScores.length;
  for (const [bucket, count] of Object.entries(scoreHistogram)) {
    scoreHistogramPercentages[bucket] = totalScores > 0 ? ((count / totalScores) * 100).toFixed(2) : '0.00';
  }
  
  // Task AK3-POST-1.4: Calculate specificity rates (as percentage of selected, not total)
  const microSpecificRate = metrics.microSelectedCount > 0
    ? ((metrics.microSpecificCount / metrics.microSelectedCount) * 100).toFixed(2)
    : '0.00';
  const microAxisOnlyRate = metrics.microSelectedCount > 0
    ? ((metrics.microAxisOnlyCount / metrics.microSelectedCount) * 100).toFixed(2)
    : '0.00';
  
  // Also calculate as percentage of total for reporting
  const microSpecificRateOfTotal = ((metrics.microSpecificCount / metrics.totalPaths) * 100).toFixed(2);
  const microAxisOnlyRateOfTotal = ((metrics.microAxisOnlyCount / metrics.totalPaths) * 100).toFixed(2);
  
  const microSpecificByMacroRates = {};
  for (const [macro, count] of Object.entries(metrics.microSpecificByMacro)) {
    const macroTotal = Object.values(metrics.microDistribution[macro] || {}).reduce((a, b) => a + b, 0);
    microSpecificByMacroRates[macro] = macroTotal > 0 ? ((count / macroTotal) * 100).toFixed(2) : '0.00';
  }
  
  const microAxisOnlyByMacroRates = {};
  for (const [macro, count] of Object.entries(metrics.microAxisOnlyByMacro)) {
    const macroTotal = Object.values(metrics.microDistribution[macro] || {}).reduce((a, b) => a + b, 0);
    microAxisOnlyByMacroRates[macro] = macroTotal > 0 ? ((count / macroTotal) * 100).toFixed(2) : '0.00';
  }
  
  // Task AK3-DEEP-L1-2: Calculate steps metrics
  const avgSteps = metrics.stepsTaken.length > 0
    ? (metrics.stepsTaken.reduce((a, b) => a + b, 0) / metrics.stepsTaken.length).toFixed(2)
    : '0.00';
  
  // Calculate p95 steps
  const sortedSteps = [...metrics.stepsTaken].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedSteps.length * 0.95);
  const p95Steps = sortedSteps.length > 0 ? sortedSteps[p95Index] || sortedSteps[sortedSteps.length - 1] : 0;
  
  // Steps by flow mode (for comparison if running both modes)
  const stepsByFlowStats = {};
  for (const [flow, steps] of Object.entries(metrics.stepsByFlow)) {
    if (Array.isArray(steps) && steps.length > 0) {
      const avg = (steps.reduce((a, b) => a + b, 0) / steps.length).toFixed(2);
      const sorted = [...steps].sort((a, b) => a - b);
      const p95Idx = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Idx] || sorted[sorted.length - 1];
      stepsByFlowStats[flow] = {
        avg: parseFloat(avg),
        p95: p95,
        min: Math.min(...steps),
        max: Math.max(...steps),
        count: steps.length,
      };
    }
  }
  
  // Task 1.1: Prepare run metadata
  // Use effectiveFlow for metadata, but ensure it matches schema enum
  const flowForMetadata = config.effectiveFlow || config.flow;
  // Map fixed-control to fixed for schema compliance
  const normalizedFlow = flowForMetadata === 'fixed-control' ? 'fixed' : flowForMetadata;
  
  const runMetadata = {
    flow: normalizedFlow, // Must be one of: fixed, l1-full, deep-realistic
    mode: config.mode,
    runs: baselineSubset.length,
    seed: config.seed,
    l1Count: L1_CARDS.length,
    l2Count: L2_CARDS.length,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    scriptVersion: 'manual', // Could be git commit hash if available
  };
  
  // Task 1.2: Top L1 card frequencies (l1-full and deep-realistic only)
  const topL1CardFrequencies = Object.entries(metrics.l1CardFrequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([cardId, count]) => ({ cardId, count, percentage: ((count / metrics.totalPaths) * 100).toFixed(2) }));
  
  // Task 2.2: Top unknown tags
  const topUnknownTags = Object.entries(metrics.unknownTagsInFallback)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([tag, count]) => ({ tag, count, percentage: totalFallbacks > 0 ? ((count / totalFallbacks) * 100).toFixed(2) : '0.00' }));
  
  // Task 2.3: Top tags by reason (top 30 for each reason)
  const topTagsByReasonProcessed = {};
  for (const [reason, tagCounts] of Object.entries(metrics.topTagsByReason)) {
    topTagsByReasonProcessed[reason] = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag, count]) => ({ tag, count }));
  }
  
  // Task 3: Calculate macro stats rates
  const macroStatsProcessed = {};
  for (const [macro, stats] of Object.entries(metrics.macroStats)) {
    const fallbackRate = stats.totalRuns > 0 ? ((stats.fallbackCount / stats.totalRuns) * 100).toFixed(2) : '0.00';
    const breakdownPct = {};
    for (const [reason, count] of Object.entries(stats.breakdown)) {
      breakdownPct[reason] = stats.fallbackCount > 0 ? ((count / stats.fallbackCount) * 100).toFixed(2) : '0.00';
    }
    macroStatsProcessed[macro] = {
      ...stats,
      fallbackRate: parseFloat(fallbackRate),
      breakdownPct,
    };
  }
  
  // P1.3: Calculate micro coverage within encountered macros
  const encounteredMacros = Object.keys(metrics.microDistribution || {});
  let totalMicrosInFlow = 0;
  const { getMicrosForMacro } = await import('../src/data/microTaxonomy.js');
  for (const macro of encounteredMacros) {
    const micros = getMicrosForMacro(macro);
    totalMicrosInFlow += micros.length;
  }
  const coverageWithinFlow = totalMicrosInFlow > 0 
    ? ((metrics.microCoverage.size / totalMicrosInFlow) * 100).toFixed(2)
    : '0.00';
  const isGoodCoverage = metrics.microCoverage.size >= totalMicrosInFlow * 0.8; // 80% threshold
  
  // Task C: Calculate L1 asked statistics (l1-full and deep-realistic only)
  let l1AskedStats = null;
  if ((config.effectiveFlow === 'l1-full' || config.effectiveFlow === 'deep-realistic' || config.flow === 'adaptive-l1') && metrics.l1AskedCountPerRun.length > 0) {
    const sorted = [...metrics.l1AskedCountPerRun].sort((a, b) => a - b);
    const avg = (metrics.l1AskedCountPerRun.reduce((a, b) => a + b, 0) / metrics.l1AskedCountPerRun.length).toFixed(2);
    const min = Math.min(...metrics.l1AskedCountPerRun);
    const max = Math.max(...metrics.l1AskedCountPerRun);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1] || 0;
    
    // Histogram
    const histogram = {};
    for (const count of metrics.l1AskedCountPerRun) {
      histogram[count] = (histogram[count] || 0) + 1;
    }
    
    l1AskedStats = {
      avg: parseFloat(avg),
      min,
      max,
      p50,
      p95,
      histogram,
      totalRuns: metrics.l1AskedCountPerRun.length,
      alwaysMax: min === max && min === L1_CARDS.length, // Task C: Check if always asking all cards
    };
  }
  
  // Task P2.4.2: Utility function for computing statistics
  function computeStats(values, { maxBucket = 20 } = {}) {
    if (!Array.isArray(values) || values.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        histogram: {},
      };
    }
    
    const arr = values.slice().sort((a, b) => a - b);
    const n = arr.length;
    const sum = arr.reduce((s, v) => s + v, 0);
    const avg = n ? sum / n : 0;

    const pct = (p) => {
      if (!n) return 0;
      const idx = Math.min(n - 1, Math.floor((p / 100) * (n - 1)));
      return arr[idx];
    };

    const histogram = {};
    for (const v of values) {
      const key = v >= maxBucket ? `${maxBucket}+` : String(v);
      histogram[key] = (histogram[key] || 0) + 1;
    }

    return {
      count: n,
      avg: parseFloat(avg.toFixed(2)),
      min: n ? arr[0] : 0,
      max: n ? arr[n - 1] : 0,
      p50: pct(50),
      p95: pct(95),
      histogram,
    };
  }
  
  // Task P2.26 + P3.7: Calculate gate coverage metrics for deep-realistic (Any and CardsOnly)
  let gateCoverageMetrics = null;
  if (config.effectiveFlow === 'deep-realistic' && metrics.deepRealisticRuns) {
    const dr = metrics.deepRealisticRuns;
    const runs = dr.askedL1Counts.length || 1;
    
    // Core gates: valence, arousal, agency, clarity
    const coreGates = ['valence', 'arousal', 'agency', 'clarity'];
    const allGates = ['valence', 'arousal', 'agency', 'clarity', 'social', 'load'];
    
    // Task P3.7: Calculate for Any (baseline + cards) and CardsOnly
    const gateHitRatesAny = {};
    const gateHitRatesCardsOnly = {};
    
    for (const gateName of allGates) {
      const hitCountAny = dr.gateHitCounts[gateName] || 0;
      gateHitRatesAny[gateName] = hitCountAny / runs;
      
      const hitCountCardsOnly = dr.gateHitCardsOnlyCounts?.[gateName] || 0;
      gateHitRatesCardsOnly[gateName] = hitCountCardsOnly / runs;
    }
    
    // Calculate gateCoverageScore for Any
    const avgGatesHitCountAny = allGates.reduce((sum, gateName) => {
      return sum + (gateHitRatesAny[gateName] || 0);
    }, 0);
    const gateCoverageScoreAny = parseFloat((avgGatesHitCountAny / allGates.length).toFixed(4));
    
    // Calculate gateCoverageScore for CardsOnly
    const avgGatesHitCountCardsOnly = allGates.reduce((sum, gateName) => {
      return sum + (gateHitRatesCardsOnly[gateName] || 0);
    }, 0);
    const gateCoverageScoreCardsOnly = parseFloat((avgGatesHitCountCardsOnly / allGates.length).toFixed(4));
    
    // Estimate core gates all-hit rate for Any (assuming independence)
    let coreGatesAllHitRateAny = 1.0;
    for (const gateName of coreGates) {
      coreGatesAllHitRateAny *= (gateHitRatesAny[gateName] || 0);
    }
    coreGatesAllHitRateAny = parseFloat((coreGatesAllHitRateAny * 100).toFixed(2));
    
    // Estimate core gates all-hit rate for CardsOnly
    let coreGatesAllHitRateCardsOnly = 1.0;
    for (const gateName of coreGates) {
      coreGatesAllHitRateCardsOnly *= (gateHitRatesCardsOnly[gateName] || 0);
    }
    coreGatesAllHitRateCardsOnly = parseFloat((coreGatesAllHitRateCardsOnly * 100).toFixed(2));
    
    gateCoverageMetrics = {
      gateCoverageScoreAny,
      gateCoverageScoreCardsOnly,
      coreGatesAllHitRateAny,
      coreGatesAllHitRateCardsOnly,
      gateHitRatesAny,
      gateHitRatesCardsOnly,
      avgGatesHitCountAny: parseFloat(avgGatesHitCountAny.toFixed(2)),
      avgGatesHitCountCardsOnly: parseFloat(avgGatesHitCountCardsOnly.toFixed(2)),
      // Backward compatibility
      gateCoverageScore: gateCoverageScoreAny,
      coreGatesAllHitRate: coreGatesAllHitRateAny,
      gateHitRates: gateHitRatesAny,
    };
  }
  
  // Task P2.21: Process tag provenance aggregation
  let tagProvenance = null;
  if (config.effectiveFlow === 'deep-realistic' && metrics.deepRealisticRuns) {
    const dr = metrics.deepRealisticRuns;
    const totalBaselineTags = dr.baselineTagCounts.reduce((a, b) => a + b, 0);
    const totalDistinctTags = dr.distinctTagCounts.reduce((a, b) => a + b, 0);
    const totalRawTags = dr.rawTagCounts.reduce((a, b) => a + b, 0);
    
    // Build top-20 unknown tags by source
    const unknownTagsBySourceTop = {};
    for (const [source, tagCounts] of Object.entries(dr.unknownTagsBySource)) {
      const sorted = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }));
      unknownTagsBySourceTop[source] = sorted;
    }
    
    tagProvenance = {
      baselineTagShare: totalDistinctTags > 0 
        ? (totalBaselineTags / totalDistinctTags * 100).toFixed(2)
        : '0.00',
      avgDistinctTags: computeStats(dr.distinctTagCounts).avg,
      avgRawTags: computeStats(dr.rawTagCounts).avg,
      unknownTagShare: totalRawTags > 0
        ? (Object.values(dr.unknownTagsBySource).flatMap(Object.values).reduce((a, b) => a + b, 0) / totalRawTags * 100).toFixed(2)
        : '0.00',
      unknownTagsBySource: unknownTagsBySourceTop,
    };
  }
  
  // Task E: Calculate micro diversity metrics (top1 share and entropy)
  const microDiversityByMacro = {};
  for (const [macro, microCounts] of Object.entries(metrics.microDistribution)) {
    const total = Object.values(microCounts).reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    
    const sorted = Object.entries(microCounts).sort((a, b) => b[1] - a[1]);
    const top1Count = sorted[0]?.[1] || 0;
    const top1Share = (top1Count / total).toFixed(4);
    
    // Calculate entropy: -sum(p * log2(p))
    let entropy = 0;
    for (const [, count] of sorted) {
      const p = count / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    
    // Get top 3 candidates with scores
    const topCandidates = [];
    const candidates = metrics.microTopCandidatesByMacro[macro] || {};
    for (const [microKey, data] of Object.entries(candidates)) {
      const avgScore = data.count > 0 ? (data.totalScore / data.count).toFixed(4) : '0.0000';
      topCandidates.push({
        microKey,
        count: data.count,
        share: ((data.count / total) * 100).toFixed(2),
        avgScore: parseFloat(avgScore),
        matchedTags: data.matchedTags.slice(0, 5), // Top 5 tags
      });
    }
    topCandidates.sort((a, b) => b.count - a.count);
    
    microDiversityByMacro[macro] = {
      total,
      top1Share: parseFloat(top1Share),
      top1Micro: sorted[0]?.[0] || 'none',
      top1Count,
      entropy: entropy.toFixed(4),
      maxEntropy: Math.log2(sorted.length).toFixed(4), // Max entropy for this number of micros
      normalizedEntropy: sorted.length > 1 ? (entropy / Math.log2(sorted.length)).toFixed(4) : '1.0000',
      topCandidates: topCandidates.slice(0, 3), // Top 3
      warning: parseFloat(top1Share) > 0.90, // Task E: Warning if top1 > 90%
    };
  }
  
  // TASK 14.1: Determine engine type (runner vs legacy)
  const engineType = (config.effectiveFlow === 'deep-realistic' || config.effectiveFlow === 'fixed') ? 'runner' : 'legacy';
  const engineDetails = {
    runner: engineType === 'runner',
    adapter: engineType === 'runner', // Adapter is used when runner is true
  };
  
  // TASK 14.1: Fail-fast if deep-realistic/fixed uses legacy engine
  if ((config.effectiveFlow === 'deep-realistic' || config.effectiveFlow === 'fixed') && engineType !== 'runner') {
    throw new Error(`[TASK 14.1] Flow "${config.effectiveFlow}" must use runner engine, but got "${engineType}". Check simulateDeepRealisticSession implementation.`);
  }

  // Prepare JSON output
  // Task A1.0: Add reportVersion for schema validation
  const jsonOutput = {
    reportVersion: '1.0.0', // Task A1.0: Versioned report format
    metadata: {
      ...runMetadata,
      // TASK 14.1: Add engine metadata
      engine: engineType,
      engineDetails,
      // TASK POST-01: baseline sampler annotation
      baselineSampler,
    },
    ...metrics,
    derived: {
      avgTagsPerRun: parseFloat(avgTagsPerRun),
      microNoneRate: parseFloat(microNoneRate),
      microFallbackRate: parseFloat(microFallbackRate),
      microZeroScorePickRate: parseFloat(microZeroScorePickRate), // TASK POST-03
      microSelectedRate: parseFloat(microSelectedRate),
      microSpecificRate: parseFloat(microSpecificRate),
      microAxisOnlyRate: parseFloat(microAxisOnlyRate),
      microSpecificRateOfTotal: parseFloat(microSpecificRateOfTotal),
      microAxisOnlyRateOfTotal: parseFloat(microAxisOnlyRateOfTotal),
      scoringTagsEmptyRate: parseFloat(scoringTagsEmptyRate), // TASK POST-04
      scoringTagsLenP50: metrics.scoringTagsLens.length > 0 ? metrics.scoringTagsLens.slice().sort((a, b) => a - b)[Math.floor(metrics.scoringTagsLens.length * 0.50)] : 0,
      scoringTagsLenP95: metrics.scoringTagsLens.length > 0 ? metrics.scoringTagsLens.slice().sort((a, b) => a - b)[Math.floor(metrics.scoringTagsLens.length * 0.95)] : 0,
      weakEvidenceShare: parseFloat(weakEvidenceShare),
      macroFlipRate: parseFloat(macroFlipRate),
      illegalFlipRate: parseFloat(illegalFlipRate),
      mustHaveHitRate: parseFloat(mustHaveHitRate),
      microNoneByMacroRates,
      microFallbackByMacroRates,
      microSpecificByMacroRates,
      microAxisOnlyByMacroRates,
      weakEvidenceByMacroRates,
      worstMacroByFallback: worstMacroByFallback ? { macro: worstMacroByFallback[0], rate: parseFloat(worstMacroByFallback[1]) } : null,
      worstMacroByWeak: worstMacroByWeak ? { macro: worstMacroByWeak[0], rate: parseFloat(worstMacroByWeak[1]) } : null,
      // Task AK3-POST-1.2: Fallback diagnostics
      fallbackReasonBreakdown,
      fallbackReasonByMacroRates,
      topTagsInFallback,
      topTagsInFallbackByMacro,
      topCandidateScoreHistogram: scoreHistogram,
      topCandidateScoreHistogramPercentages: scoreHistogramPercentages,
      // Task AK3-DEEP-L1-2: Steps metrics
      avgSteps: parseFloat(avgSteps),
      p95Steps,
      stepsByFlow: stepsByFlowStats,
      // P0.6: Sanity checks
      avgTagsRaw: parseFloat(avgTagsPerRun),
      avgTagsDistinct: parseFloat(avgTagsDistinct),
      microSourceBreakdown: metrics.microSourceBreakdown,
      // Task 1.2: L1 card frequencies
      topL1CardFrequencies,
      // Task C: L1 asked statistics
      l1AskedStats,
      // Task D: Forced fallback sanity
      forcedFallbackStats: config.forceNoEvidenceRate > 0 ? {
        forcedCount: metrics.forcedFallbackCount,
        detectedCount: metrics.forcedFallbackDetected,
        expectedRate: config.forceNoEvidenceRate,
        detectedRate: metrics.forcedFallbackCount > 0 
          ? (metrics.forcedFallbackDetected / metrics.forcedFallbackCount).toFixed(4)
          : '0.0000',
        matchRatio: metrics.forcedFallbackCount > 0
          ? (metrics.forcedFallbackDetected / metrics.forcedFallbackCount * 100).toFixed(2)
          : '0.00',
      } : null,
      // Task E: Micro diversity metrics
      microDiversityByMacro,
      // Task P2.4.4: Deep-realistic statistics
      // FIX: schema expects derived.deepRealistic to be an object (even for non deep-realistic flows)
      deepRealistic: ((config.effectiveFlow === 'deep-realistic' || config.effectiveFlow === 'fixed') && metrics.deepRealisticRuns) ? {
        askedL1: computeStats(metrics.deepRealisticRuns.askedL1Counts, { maxBucket: config.maxL1 || 6 }),
        askedL2: computeStats(metrics.deepRealisticRuns.askedL2Counts, { maxBucket: config.maxL2 || 6 }),
        notSure: computeStats(metrics.deepRealisticRuns.notSureCounts, { maxBucket: 20 }),
        endedReasons: metrics.deepRealisticRuns.endedReasonCounts,
        endedBy: metrics.deepRealisticRuns.endedByCounts || {}, // P2.13
        l1OnlyRunsRate: metrics.deepRealisticRuns.askedL1Counts.length > 0
          ? parseFloat((metrics.deepRealisticRuns.l1OnlyRunsCount / metrics.deepRealisticRuns.askedL1Counts.length * 100).toFixed(2))
          : 0, // P2.13
        l1IncompleteRunsRate: metrics.deepRealisticRuns.askedL1Counts.length > 0
          ? parseFloat((metrics.deepRealisticRuns.l1IncompleteRunsCount / metrics.deepRealisticRuns.askedL1Counts.length * 100).toFixed(2))
          : 0, // P2.15
        noL2CandidatesCount: metrics.deepRealisticRuns.noL2CandidatesCount || 0, // P2.13
        avgBaselineTagsCount: metrics.deepRealisticRuns.baselineTagsCounts.length > 0
          ? computeStats(metrics.deepRealisticRuns.baselineTagsCounts).avg
          : 0, // P2.16.1
        gateHitRates: Object.fromEntries(
          Object.entries(metrics.deepRealisticRuns.gateHitCounts).map(([k, v]) => [
            k,
            metrics.deepRealisticRuns.askedL1Counts.length > 0 
              ? parseFloat((v / metrics.deepRealisticRuns.askedL1Counts.length).toFixed(4))
              : 0
          ])
        ),
        // Task P3.7: Gate hit rates for CardsOnly (both names for compatibility)
        gateHitCardsOnlyRates: metrics.deepRealisticRuns.gateHitCardsOnlyCounts ? Object.fromEntries(
          Object.entries(metrics.deepRealisticRuns.gateHitCardsOnlyCounts).map(([k, v]) => [
            k,
            metrics.deepRealisticRuns.askedL1Counts.length > 0 
              ? parseFloat((v / metrics.deepRealisticRuns.askedL1Counts.length).toFixed(4))
              : 0
          ])
        ) : null,
        // P0: Also save as gateHitRatesCardsOnly for analyzer compatibility
        gateHitRatesCardsOnly: metrics.deepRealisticRuns.gateHitCardsOnlyCounts ? Object.fromEntries(
          Object.entries(metrics.deepRealisticRuns.gateHitCardsOnlyCounts).map(([k, v]) => [
            k,
            metrics.deepRealisticRuns.askedL1Counts.length > 0 
              ? parseFloat((v / metrics.deepRealisticRuns.askedL1Counts.length).toFixed(4))
              : 0
          ])
        ) : null,
        // P2.21: Tag provenance
        tagProvenance: tagProvenance ? {
          baselineTagShare: parseFloat(tagProvenance.baselineTagShare),
          avgDistinctTags: tagProvenance.avgDistinctTags,
          avgRawTags: tagProvenance.avgRawTags,
          unknownTagShare: parseFloat(tagProvenance.unknownTagShare),
          unknownTagsBySource: tagProvenance.unknownTagsBySource,
        } : null,
        // P2.26: Gate coverage metrics
        gateCoverage: gateCoverageMetrics,
        // P2.24: Macro distribution
        macroDistribution: metrics.deepRealisticRuns.macroBeforeCards ? {
          beforeCards: metrics.deepRealisticRuns.macroBeforeCards || {},
          afterL1: metrics.deepRealisticRuns.macroAfterL1 || {},
          afterL2: metrics.deepRealisticRuns.macroAfterL2 || {},
          uniqueMacrosBefore: Object.keys(metrics.deepRealisticRuns.macroBeforeCards || {}).length,
          uniqueMacrosAfterL2: Object.keys(metrics.deepRealisticRuns.macroAfterL2 || {}).length,
        } : null,
        // P0: Compute macroDistribution from microDistribution (flat structure for analyzer)
        macroDistributionFlat: (() => {
          const macroDist = {};
          for (const [microKey, count] of Object.entries(metrics.microDistributionOverall || {})) {
            if (!microKey || microKey === 'none' || microKey === 'fallback' || microKey === 'mixed') continue;
            const macro = microKey.split('.')[0];
            if (!macro) continue;
            macroDist[macro] = (macroDist[macro] || 0) + count;
          }
          return Object.keys(macroDist).length > 0 ? macroDist : null;
        })(),
        macroTransitionMatrix: metrics.deepRealisticRuns.macroTransitions || {}, // P2.24
        // Task P3.8: Coverage-first effectiveness audit
        gateFirstHitStepStats: metrics.deepRealisticRuns.gateFirstHitSteps ? Object.fromEntries(
          Object.entries(metrics.deepRealisticRuns.gateFirstHitSteps).map(([gateName, steps]) => {
            if (!Array.isArray(steps) || steps.length === 0) {
              return [gateName, { count: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0 }];
            }
            const stats = computeStats(steps);
            return [gateName, stats];
          })
        ) : null,
        gateHitCardIdsTop5: metrics.deepRealisticRuns.gateHitCardIds ? Object.fromEntries(
          Object.entries(metrics.deepRealisticRuns.gateHitCardIds).map(([gateName, cardIds]) => [
            gateName,
            Object.entries(cardIds).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cardId, count]) => ({ cardId, count }))
          ])
        ) : null,
        coverageFirstPickDistribution: metrics.deepRealisticRuns.coverageFirstPicks && metrics.deepRealisticRuns.coverageFirstPicks.length > 0
          ? Object.entries(
              metrics.deepRealisticRuns.coverageFirstPicks.reduce((acc, pick) => {
                const key = pick.cardId || 'unknown';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {})
            )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([cardId, count]) => ({ cardId, count }))
          : [],
        // Task P3.6A: Debug info (only if debugRuns > 0)
        debugRuns: metrics.deepRealisticRuns.debugRuns || null,
        // P3.10.1: Zero-score fallback analysis
        zeroScoreFallbackAnalysis: (() => {
          const zeroScoreCases = metrics.deepRealisticRuns.zeroScoreFallbackCases || [];
          if (zeroScoreCases.length === 0) return null;
          
          // Aggregate unmapped tags overall
          const unmappedOverallCounts = {};
          const unmappedByMacroCounts = {};
          const unmappedBySourceCounts = { baseline: {}, l1: {}, l2: {}, not_sure: {} };
          const scoringDistinctCounts = [];
          // P3.10.3.2: Track excluded context tags
          const excludedContextOverallCounts = {};
          
          for (const c of zeroScoreCases) {
            scoringDistinctCounts.push(c.scoringDistinct.length);
            if (!unmappedByMacroCounts[c.macro]) {
              unmappedByMacroCounts[c.macro] = {};
            }
            for (const tag of c.unmappedDistinct || []) {
              unmappedOverallCounts[tag] = (unmappedOverallCounts[tag] || 0) + 1;
              unmappedByMacroCounts[c.macro][tag] = (unmappedByMacroCounts[c.macro][tag] || 0) + 1;
            }
            // P3.10.3.2: Count excluded context tags
            for (const tag of c.excludedContextDistinct || []) {
              excludedContextOverallCounts[tag] = (excludedContextOverallCounts[tag] || 0) + 1;
            }
            // For source breakdown, count tags from scoringDistinct that appear in unmappedDistinct
            for (const tag of c.unmappedDistinct) {
              // Determine source by checking which source contributed this tag
              // We'll use a simple heuristic: if tag appears in scoringDistinct, check sourcesBreakdown
              // For now, distribute unmapped tags proportionally to sourcesBreakdown
              const totalSourceCount = Object.values(c.sourcesBreakdown).reduce((a, b) => a + b, 0);
              if (totalSourceCount > 0) {
                for (const source in c.sourcesBreakdown) {
                  const sourceWeight = c.sourcesBreakdown[source] / totalSourceCount;
                  unmappedBySourceCounts[source][tag] = (unmappedBySourceCounts[source][tag] || 0) + sourceWeight;
                }
              }
            }
          }
          
          const top30UnmappedOverall = Object.entries(unmappedOverallCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([tag, count]) => ({ tag, count }));
          
          const top30UnmappedByMacro = {};
          for (const macro in unmappedByMacroCounts) {
            top30UnmappedByMacro[macro] = Object.entries(unmappedByMacroCounts[macro])
              .sort((a, b) => b[1] - a[1])
              .slice(0, 30)
              .map(([tag, count]) => ({ tag, count }));
          }
          
          const top30UnmappedBySource = {};
          for (const source in unmappedBySourceCounts) {
            top30UnmappedBySource[source] = Object.entries(unmappedBySourceCounts[source])
              .sort((a, b) => b[1] - a[1])
              .slice(0, 30)
              .map(([tag, count]) => ({ tag, count: Math.round(count) }));
          }
          
          // P3.10.3.2: Top 30 excluded context tags
          const top30ExcludedContextDistinct = Object.entries(excludedContextOverallCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([tag, count]) => ({ tag, count }));
          
          return {
            totalZeroScoreCases: zeroScoreCases.length,
            scoringDistinctCountStats: computeStats(scoringDistinctCounts),
            top30UnmappedOverall,
            top30UnmappedByMacro,
            top30UnmappedBySource,
            top30ExcludedContextDistinct, // P3.10.3.2: Excluded context tags for IGNORE analysis
            // Optionally, include a sample of raw cases for debugging
            sampleZeroScoreCases: zeroScoreCases.slice(0, 10),
          };
        })(),
      } : {
        // FIX-DR-06: Fixed flow still must produce minimal deepRealistic shape for validators
        gateHitRatesCardsOnly: { valence: 0, arousal: 0, agency: 0, clarity: 0, social: 0, load: 0 },
        gateHitCardsOnlyRates: { valence: 0, arousal: 0, agency: 0, clarity: 0, social: 0, load: 0 },
        macroDistributionFlat: (() => {
          const macroDist = {};
          for (const [microKey, count] of Object.entries(metrics.microDistributionOverall || {})) {
            if (!microKey || microKey === 'none' || microKey === 'fallback' || microKey === 'mixed') continue;
            const macro = microKey.split('.')[0];
            if (!macro) continue;
            macroDist[macro] = (macroDist[macro] || 0) + count;
          }
          return Object.keys(macroDist).length > 0 ? macroDist : { unknown: metrics.totalRuns || 1 };
        })(),
      },
      // Task C: L1 asked statistics
      l1AskedStats,
      // Task 2.2: Unknown tags
      topUnknownTags,
      unknownTagsInFallbackByMacro: metrics.unknownTagsInFallbackByMacro,
      unknownTagsInFallbackByReason: metrics.unknownTagsInFallbackByReason,
      // Task 2.3: Top tags by reason
      topTagsByReason: topTagsByReasonProcessed,
      // Task 3: Macro stats
      macroStats: macroStatsProcessed,
      // Task 4: Fallback case examples
      fallbackCaseExamples: metrics.fallbackCaseExamples,
    },
    // Convert Sets to Arrays for JSON
    microCoverage: Array.from(metrics.microCoverage),
  };
  
  // Generate markdown report
  const mdReport = `# Deep Balance Report - Noisy Mixed Mode

## Run Metadata (Task 1.1)

- **Flow:** ${runMetadata.flow}
- **Mode:** ${runMetadata.mode}
- **Runs:** ${runMetadata.runs} / ${BASELINE_COMBOS.length} total baselines
- **Seed:** ${runMetadata.seed}
- **L1 Cards Loaded:** ${runMetadata.l1Count}
- **L2 Cards Loaded:** ${runMetadata.l2Count}
- **Node Version:** ${runMetadata.nodeVersion}
- **Timestamp:** ${runMetadata.timestamp}
- **Script Version:** ${runMetadata.scriptVersion}
- **Total paths:** ${metrics.totalPaths}

## Top-Level Metrics

- **Micro none rate (overall):** ${microNoneRate}% (${metrics.microNoneCount} cases) - ожидается ≈0% (кроме macro без micros)
- **Micro fallback rate (overall):** ${microFallbackRate}% (${metrics.microFallbackCount} cases) - **главный KPI** (цель: ≤5%)
- **Micro selected rate (overall):** ${microSelectedRate}% (${metrics.microSelectedCount} cases)
- **Micro specific rate (overall):** ${microSpecificRate}% (${metrics.microSpecificCount} cases) - **новый KPI** (selected с non-axis tags)
- **Micro axis-only rate (overall):** ${microAxisOnlyRate}% (${metrics.microAxisOnlyCount} cases) - selected только с axis tags
- **Weak evidence share (overall):** ${weakEvidenceShare}% (${metrics.weakEvidenceCount} cases)
- **Macro flip rate:** ${macroFlipRate}% (${metrics.macroFlipCount} cases)
- **Illegal flip rate:** ${illegalFlipRate}% (${metrics.illegalFlipCount} cases)
- **Avg tags per run (raw):** ${avgTagsPerRun}
- **Avg tags per run (distinct):** ${avgTagsDistinct} - P0.6B sanity check
- **Must-have hit rate:** ${mustHaveHitRate}%
- **Avg steps to finish:** ${avgSteps}
- **P95 steps:** ${p95Steps}

## Micro Fallback Rate (Per Macro)

${Object.entries(microFallbackByMacroRates).length > 0
  ? Object.entries(microFallbackByMacroRates)
      .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
      .map(([macro, rate]) => `- **${macro}:** ${rate}%`)
      .join('\n')
  : '- (none)'}

**Worst macro by micro fallback:** ${worstMacroByFallback ? `${worstMacroByFallback[0]} (${worstMacroByFallback[1]}%)` : 'N/A'}

## Micro None Rate (Per Macro) - должно быть ≈0%

${Object.entries(microNoneByMacroRates).length > 0
  ? Object.entries(microNoneByMacroRates)
      .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
      .map(([macro, rate]) => `- **${macro}:** ${rate}%`)
      .join('\n')
  : '- (none - все макросы имеют fallback)'}

## Why Fallback Happens

### Fallback Reason Breakdown (Overall)

${Object.entries(fallbackReasonBreakdown).length > 0
  ? Object.entries(fallbackReasonBreakdown)
      .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
      .map(([reason, percentage]) => `- **${reason}:** ${percentage}%`)
      .join('\n')
  : '- (none)'}

### Fallback Reason Breakdown (Per Macro)

${Object.entries(fallbackReasonByMacroRates).length > 0
  ? Object.entries(fallbackReasonByMacroRates)
      .map(([macro, reasons]) => {
        return `### ${macro}
${Object.entries(reasons)
  .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
  .map(([reason, percentage]) => `- **${reason}:** ${percentage}%`)
  .join('\n')}`;
      })
      .join('\n\n')
  : '- (none)'}

### Top Tags in Fallback Cases (Overall - Top 10)

${topTagsInFallback.length > 0
  ? topTagsInFallback.map(({ tag, count, percentage }) => `- **${tag}:** ${count} (${percentage}%)`).join('\n')
  : '- (none)'}

### Top Tags in Fallback Cases (Per Macro - Top 10)

${Object.entries(topTagsInFallbackByMacro).length > 0
  ? Object.entries(topTagsInFallbackByMacro)
      .map(([macro, tags]) => {
        return `### ${macro}
${tags.map(({ tag, count, percentage }) => `- **${tag}:** ${count} (${percentage}%)`).join('\n')}`;
      })
      .join('\n\n')
  : '- (none)'}

### TopCandidate Score Histogram

| Score Range | Count | Percentage |
|------------|-------|------------|
| 0 (exact) | ${scoreHistogram.zero} | ${scoreHistogramPercentages.zero}% |
| (0, 0.1] | ${scoreHistogram['0_to_0.1']} | ${scoreHistogramPercentages['0_to_0.1']}% |
| (0.1, 0.2] | ${scoreHistogram['0.1_to_0.2']} | ${scoreHistogramPercentages['0.1_to_0.2']}% |
| (0.2, 0.3] | ${scoreHistogram['0.2_to_0.3']} | ${scoreHistogramPercentages['0.2_to_0.3']}% |
| 0.3+ | ${scoreHistogram['0.3_plus']} | ${scoreHistogramPercentages['0.3_plus']}% |

## Micro Specificity (Task AK3-POST-1.4)

- **Micro specific rate (overall):** ${microSpecificRate}% of selected (${microSpecificRateOfTotal}% of total) - **новый KPI**
- **Micro axis-only rate (overall):** ${microAxisOnlyRate}% of selected (${microAxisOnlyRateOfTotal}% of total)

### Micro Specificity (Per Macro)

${Object.entries(microSpecificByMacroRates).length > 0 || Object.entries(microAxisOnlyByMacroRates).length > 0
  ? Object.entries(metrics.microDistribution)
      .map(([macro, micros]) => {
        const total = Object.values(micros).reduce((a, b) => a + b, 0);
        const specific = metrics.microSpecificByMacro[macro] || 0;
        const axisOnly = metrics.microAxisOnlyByMacro[macro] || 0;
        const specificRate = total > 0 ? ((specific / total) * 100).toFixed(2) : '0.00';
        const axisOnlyRate = total > 0 ? ((axisOnly / total) * 100).toFixed(2) : '0.00';
        return `### ${macro}
- **Specific:** ${specificRate}% (${specific}/${total})
- **Axis-only:** ${axisOnlyRate}% (${axisOnly}/${total})`;
      })
      .join('\n\n')
  : '- (none)'}

## Steps Metrics (Task AK3-DEEP-L1-2)

- **Avg steps to finish:** ${avgSteps}
- **P95 steps:** ${p95Steps}
${Object.keys(stepsByFlowStats).length > 0
  ? Object.entries(stepsByFlowStats).map(([flow, stats]) => `
### ${flow} flow
- **Avg steps:** ${stats.avg}
- **P95 steps:** ${stats.p95}
- **Min steps:** ${stats.min}
- **Max steps:** ${stats.max}
- **Runs:** ${stats.count}`).join('\n')
  : ''}

## Weak Evidence Share (Per Macro)

${Object.entries(weakEvidenceByMacroRates).length > 0
  ? Object.entries(weakEvidenceByMacroRates)
      .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
      .map(([macro, rate]) => `- **${macro}:** ${rate}%`)
      .join('\n')
  : '- (none)'}

**Worst macro by weak evidence:** ${worstMacroByWeak ? `${worstMacroByWeak[0]} (${worstMacroByWeak[1]}%)` : 'N/A'}

## Micro Distribution (Top 20 Overall)

${Object.entries(metrics.microDistributionOverall)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([micro, count]) => {
    const rate = ((count / metrics.totalPaths) * 100).toFixed(2);
    return `- **${micro}:** ${count} (${rate}%)`;
  })
  .join('\n')}

## Micro Distribution (Per Macro - Top 5)

${Object.entries(metrics.microDistribution)
  .map(([macro, micros]) => {
    const sorted = Object.entries(micros).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = sorted.reduce((sum, [, count]) => sum + count, 0);
    return `### ${macro} (total: ${total})
${sorted.map(([micro, count]) => {
  const rate = ((count / total) * 100).toFixed(2);
  return `- ${micro}: ${count} (${rate}%)`;
}).join('\n')}`;
  })
  .join('\n\n')}

## Macro Flip Breakdown

- **Total flips:** ${metrics.macroFlipCount}
- **Flip reasons:**
${Object.entries(metrics.macroFlipReasons)
  .sort((a, b) => b[1] - a[1])
  .map(([reason, count]) => {
    const rate = metrics.macroFlipCount > 0 ? ((count / metrics.macroFlipCount) * 100).toFixed(2) : '0.00';
    return `  - **${reason}:** ${count} (${rate}%)`;
  })
  .join('\n')}

- **Top flip paths:**
${Object.entries(metrics.macroFlipPaths)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([path, count]) => `  - ${path}: ${count}`)
  .join('\n')}

## Tags Distribution

- **0 tags:** ${metrics.tagsDistribution[0]} (${((metrics.tagsDistribution[0] / metrics.totalPaths) * 100).toFixed(2)}%)
- **1 tag:** ${metrics.tagsDistribution[1]} (${((metrics.tagsDistribution[1] / metrics.totalPaths) * 100).toFixed(2)}%)
- **2 tags:** ${metrics.tagsDistribution[2]} (${((metrics.tagsDistribution[2] / metrics.totalPaths) * 100).toFixed(2)}%)
- **3+ tags:** ${metrics.tagsDistribution['3+']} (${((metrics.tagsDistribution['3+'] / metrics.totalPaths) * 100).toFixed(2)}%)

## Suspicious Cases (Sample)

${metrics.suspiciousCases.length > 0
  ? metrics.suspiciousCases.slice(0, 10).map((c, i) => {
      // Task P1.9: Show actual microKey and microSource if they exist, not micro=null
      const microDisplay = c.deepResult.microKey 
        ? `micro=${c.deepResult.microKey}, source=${c.deepResult.microSource || 'unknown'}`
        : 'micro=null';
      return `### Case ${i + 1}
- **Baseline:** ${JSON.stringify(c.baseline)}
- **Baseline macro:** ${c.baselineMacro}
- **Evidence tags:** ${c.evidenceTags.join(', ') || '(none)'}
- **Total tags:** ${c.totalTags}
- **Result:** macro=${c.deepResult.macroKey}, ${microDisplay}, confidence=${c.deepResult.confidenceBand}`;
    }).join('\n\n')
  : '- (none)'}

## P0.6: Sanity Checks

### P0.6A: MicroSource Breakdown

| MicroSource | Count | Percentage |
|------------|-------|------------|
${Object.entries(metrics.microSourceBreakdown)
  .sort((a, b) => b[1] - a[1])
  .map(([source, count]) => {
    const pct = ((count / metrics.totalPaths) * 100).toFixed(2);
    return `| ${source} | ${count} | ${pct}% |`;
  })
  .join('\n')}

**Interpretation:** Если fallback rate = 0%, но в breakdown нет значений с "fallback" в названии — возможно, fallback не маркируется правильно.

### P0.6B: Distinct Tags vs Raw Tags

- **Avg tags per run (raw):** ${avgTagsPerRun}
- **Avg tags per run (distinct):** ${avgTagsDistinct}
- **Ratio (distinct/raw):** ${parseFloat(avgTagsPerRun) > 0 ? (parseFloat(avgTagsDistinct) / parseFloat(avgTagsPerRun) * 100).toFixed(2) : '0.00'}%

**Interpretation:** Если ratio < 50%, значит много дублей. Must-have hit rate может быть завышен.

## Sanity Checks

${parseFloat(microNoneRate) > 0.1 ? '❌' : '✅'} Micro none rate: ${microNoneRate}% (threshold: ≈0%, кроме macro без micros)
${parseFloat(microFallbackRate) > 5 ? '❌' : parseFloat(microFallbackRate) > 8 ? '⚠️' : '✅'} Micro fallback rate: ${microFallbackRate}% (threshold: ≤5% overall, ≤8% worst macro)
${parseFloat(illegalFlipRate) > 0 ? '❌' : '✅'} Illegal flip rate: ${illegalFlipRate}% (threshold: 0%)
${metrics.semanticViolations.length > 0 ? '❌' : '✅'} Semantic violations: ${metrics.semanticViolations.length} (threshold: 0)
${isGoodCoverage ? '✅' : '⚠️'} Micro coverage: ${metrics.microCoverage.size}/${totalMicrosInFlow} within flow (${coverageWithinFlow}%), ${metrics.microCoverage.size}/33 global - P1.3
${metrics.invariantViolationCount > 0 ? '❌' : '✅'} Invariant violations: ${metrics.invariantViolationCount} (threshold: 0) - Task AK3-DEEP-L1-2b

## Task 1.2: L1 Card Frequencies (L1-Full and Deep-Realistic Only)

${(config.effectiveFlow === 'l1-full' || config.effectiveFlow === 'deep-realistic' || config.flow === 'adaptive-l1') && topL1CardFrequencies.length > 0
  ? `Top ${Math.min(20, topL1CardFrequencies.length)} most frequently asked L1 cards:

${topL1CardFrequencies.map(({ cardId, count, percentage }) => `- **${cardId}:** ${count} times (${percentage}%)`).join('\n')}`
  : '- (N/A for fixed flow)'}

## Task C: L1 Asked Statistics (L1-Full and Deep-Realistic Adaptiveness Check)

${(config.effectiveFlow === 'l1-full' || config.effectiveFlow === 'deep-realistic' || config.flow === 'adaptive-l1') && l1AskedStats
  ? `**L1 Cards Asked Per Run:**

- **Avg:** ${l1AskedStats.avg}
- **Min:** ${l1AskedStats.min}
- **Max:** ${l1AskedStats.max}
- **P50 (median):** ${l1AskedStats.p50}
- **P95:** ${l1AskedStats.p95}
- **Total runs:** ${l1AskedStats.totalRuns}

**Histogram (L1 cards asked per run):**

${Object.entries(l1AskedStats.histogram)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .map(([count, runs]) => {
    const pct = ((runs / l1AskedStats.totalRuns) * 100).toFixed(2);
    return `- **${count} cards:** ${runs} runs (${pct}%)`;
  })
  .join('\n')}

${l1AskedStats.alwaysMax 
  ? `⚠️ **WARNING: L1-full behaves as "ask-all"** - All runs asked exactly ${l1AskedStats.max} L1 cards (100% of available). This suggests adaptive selection may not be working, or it's intentionally designed to ask all cards in deep flow. The 0% fallback rate may be inflated by full coverage rather than true adaptiveness.`
  : `✅ **Adaptive behavior confirmed** - L1 cards asked varies (${l1AskedStats.min}-${l1AskedStats.max}), indicating real adaptive selection.`}`
  : '- (N/A for fixed flow)'}

## Task D: Forced Fallback Sanity Check

${config.forceNoEvidenceRate > 0 && jsonOutput.derived.forcedFallbackStats
  ? `**Forced No-Evidence Test:**

- **Forced runs:** ${jsonOutput.derived.forcedFallbackStats.forcedCount} (${(jsonOutput.derived.forcedFallbackStats.expectedRate * 100).toFixed(2)}% of total)
- **Fallback detected:** ${jsonOutput.derived.forcedFallbackStats.detectedCount}
- **Match ratio:** ${jsonOutput.derived.forcedFallbackStats.matchRatio}%

**Interpretation:** If match ratio is close to 100%, microSource marking is working correctly. If it's significantly lower, there may be a bug in fallback detection.

${parseFloat(jsonOutput.derived.forcedFallbackStats.matchRatio) > 90 
  ? '✅ **Fallback marking is correct** - Forced no-evidence cases are properly detected as fallback.'
  : parseFloat(jsonOutput.derived.forcedFallbackStats.matchRatio) > 50
  ? '⚠️ **Partial detection** - Some forced cases are not marked as fallback. This may indicate a bug.'
  : '❌ **Fallback marking may be broken** - Most forced cases are not detected as fallback.'}`
  : '- (Not enabled - use --forceNoEvidenceRate 0.05 to enable)'}

## Task P2.4: Deep-Realistic Diagnostics

${config.effectiveFlow === 'deep-realistic' && jsonOutput.derived.deepRealistic
  ? `### Asked L1 Statistics

- **Avg:** ${jsonOutput.derived.deepRealistic.askedL1.avg}
- **Min:** ${jsonOutput.derived.deepRealistic.askedL1.min}
- **Max:** ${jsonOutput.derived.deepRealistic.askedL1.max}
- **P50 (median):** ${jsonOutput.derived.deepRealistic.askedL1.p50}
- **P95:** ${jsonOutput.derived.deepRealistic.askedL1.p95}
- **Total runs:** ${jsonOutput.derived.deepRealistic.askedL1.count}

**Histogram (L1 cards asked per run):**

${Object.entries(jsonOutput.derived.deepRealistic.askedL1.histogram)
  .sort((a, b) => {
    const aNum = parseInt(a[0]) || 999;
    const bNum = parseInt(b[0]) || 999;
    return aNum - bNum;
  })
  .map(([count, runs]) => {
    const pct = ((runs / jsonOutput.derived.deepRealistic.askedL1.count) * 100).toFixed(2);
    return `- **${count} cards:** ${runs} runs (${pct}%)`;
  })
  .join('\n')}

### Asked L2 Statistics

- **Avg:** ${jsonOutput.derived.deepRealistic.askedL2.avg}
- **Min:** ${jsonOutput.derived.deepRealistic.askedL2.min}
- **Max:** ${jsonOutput.derived.deepRealistic.askedL2.max}
- **P50 (median):** ${jsonOutput.derived.deepRealistic.askedL2.p50}
- **P95:** ${jsonOutput.derived.deepRealistic.askedL2.p95}
- **Total runs:** ${jsonOutput.derived.deepRealistic.askedL2.count}

**Histogram (L2 cards asked per run):**

${Object.entries(jsonOutput.derived.deepRealistic.askedL2.histogram)
  .sort((a, b) => {
    const aNum = parseInt(a[0]) || 999;
    const bNum = parseInt(b[0]) || 999;
    return aNum - bNum;
  })
  .map(([count, runs]) => {
    const pct = ((runs / jsonOutput.derived.deepRealistic.askedL2.count) * 100).toFixed(2);
    return `- **${count} cards:** ${runs} runs (${pct}%)`;
  })
  .join('\n')}

### Early Stop Breakdown (P2.15.1)

**By endedReason (Top-5 + other, %):**
${Object.entries(jsonOutput.derived.deepRealistic.endedReasonBreakdown || {})
  .sort((a, b) => b[1] - a[1])
  .map(([reason, pct]) => {
    return `- **${reason}:** ${pct}%`;
  })
  .join('\n')}

**By endedBy (L1 vs L2):**
${Object.entries(jsonOutput.derived.deepRealistic.endedBy || {})
  .sort((a, b) => b[1] - a[1])
  .map(([by, count]) => {
    const pct = ((count / jsonOutput.derived.deepRealistic.askedL1.count) * 100).toFixed(2);
    return `- **${by}:** ${count} runs (${pct}%)`;
  })
  .join('\n')}

**L1-Only Runs (L2 never asked):**
- **Count:** ${(jsonOutput.derived.deepRealistic.l1OnlyRunsRate || 0).toFixed(2)}% of total runs
${(jsonOutput.derived.deepRealistic.l1OnlyRunsRate || 0) > 50 
  ? '⚠️ **WARNING: More than 50% of runs are L1-only - L2 is not being used!**'
  : (jsonOutput.derived.deepRealistic.l1OnlyRunsRate || 0) > 0
  ? '⚠️ **Some runs are L1-only - investigate why L2 is not being asked**'
  : '✅ **All runs use L2**'}

**L1 Incomplete Runs (askedL1Count < maxL1):**
- **Count:** ${(jsonOutput.derived.deepRealistic.l1IncompleteRunsRate || 0).toFixed(2)}% of total runs
${(jsonOutput.derived.deepRealistic.l1IncompleteRunsRate || 0) > 50
  ? '⚠️ **WARNING: More than 50% of runs stopped before maxL1 - early stop may be too aggressive**'
  : (jsonOutput.derived.deepRealistic.l1IncompleteRunsRate || 0) > 0
  ? 'ℹ️ **Some runs stopped early - this is expected with stopOnGates=true**'
  : '✅ **All runs reached maxL1**'}

**Empty L2 Plans (no_l2_candidates):**
- **Count:** ${jsonOutput.derived.deepRealistic.noL2CandidatesCount || 0} runs
${(jsonOutput.derived.deepRealistic.noL2CandidatesCount || 0) > 0
  ? '⚠️ **Some runs had empty L2 plans - investigate probe plan building**'
  : '✅ **All runs had valid L2 plans**'}

**Baseline Tags Count (P2.16.1):**
- **Avg:** ${jsonOutput.derived.deepRealistic.avgBaselineTagsCount || 0} tags per run
${(jsonOutput.derived.deepRealistic.avgBaselineTagsCount || 0) < 3
  ? '⚠️ **WARNING: Baseline tags count is very low (< 3) - baseline may not be injected into evidence!**'
  : (jsonOutput.derived.deepRealistic.avgBaselineTagsCount || 0) < 5
  ? '⚠️ **Baseline tags count is lower than expected (< 5) - check baseline injection**'
  : '✅ **Baseline tags are being injected into evidence**'}

### Tag Provenance & Unknown by Source (P2.21)

**Tag Statistics:**
- **Baseline tag share:** ${(jsonOutput.derived.deepRealistic.tagProvenance?.baselineTagShare || 0).toFixed(2)}% of distinct tags
- **Avg distinct tags per run:** ${(jsonOutput.derived.deepRealistic.tagProvenance?.avgDistinctTags || 0).toFixed(2)}
- **Avg raw tags per run:** ${(jsonOutput.derived.deepRealistic.tagProvenance?.avgRawTags || 0).toFixed(2)}
- **Unknown tag share:** ${(jsonOutput.derived.deepRealistic.tagProvenance?.unknownTagShare || 0).toFixed(2)}% of raw tags

**Top-20 Unknown Tags by Source:**

${Object.entries(jsonOutput.derived.deepRealistic.tagProvenance?.unknownTagsBySource || {})
  .filter(([source, tags]) => tags && tags.length > 0)
  .map(([source, tags]) => {
    return `**${source.toUpperCase()}:**
${tags.slice(0, 20).map(({ tag, count }) => `- **${tag}:** ${count} occurrences`).join('\n')}`;
  })
  .join('\n\n')}

${Object.entries(jsonOutput.derived.deepRealistic.tagProvenance?.unknownTagsBySource || {}).every(([source, tags]) => !tags || tags.length === 0)
  ? '✅ **No unknown tags detected**'
  : '⚠️ **Unknown tags detected - investigate tag mapping**'}

### Gate Hit Rates

${Object.entries(jsonOutput.derived.deepRealistic.gateHitRates)
  .map(([gate, rate]) => {
    const pct = (rate * 100).toFixed(2);
    return `- **${gate}:** ${pct}%`;
  })
  .join('\n')}

### Gate Coverage Metrics (P2.26)

${jsonOutput.derived.deepRealistic.gateCoverage
  ? `- **Gate Coverage Score (avg):** ${jsonOutput.derived.deepRealistic.gateCoverage.gateCoverageScore.toFixed(4)} (average fraction of 6 gates hit per run)
- **Core Gates All-Hit Rate:** ${jsonOutput.derived.deepRealistic.gateCoverage.coreGatesAllHitRate}% (runs where all 4 core gates: valence, arousal, agency, clarity are hit)
- **Avg Gates Hit Count:** ${jsonOutput.derived.deepRealistic.gateCoverage.avgGatesHitCount} out of 6 gates

**Per-Gate Hit Rates:**
${Object.entries(jsonOutput.derived.deepRealistic.gateCoverage.gateHitRates || {})
  .map(([gate, rate]) => {
    const pct = (rate * 100).toFixed(2);
    return `- **${gate}:** ${pct}%`;
  })
  .join('\n')}

**Note:** Gate coverage metrics replace the traditional "must-have hit rate" for deep-realistic flow, as gates are more realistic constraints than fixed tag sets.
`
  : '- (Not available)'}

### Macro Distribution & Transitions (P2.24)

**Unique macros:**
- **Before cards:** ${jsonOutput.derived.deepRealistic.macroDistribution?.uniqueMacrosBefore || 0} unique macros
- **After L2:** ${jsonOutput.derived.deepRealistic.macroDistribution?.uniqueMacrosAfter || 0} unique macros
${(jsonOutput.derived.deepRealistic.macroDistribution?.uniqueMacrosAfter || 0) < 6
  ? '⚠️ **WARNING: Less than 6 unique macros after L2 - macro distribution may not be representative**'
  : '✅ **Macro distribution is diverse**'}

**Top-5 macro transitions (before -> after):**
${Object.entries(jsonOutput.derived.deepRealistic.macroDistribution?.transitions || {})
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([transition, count]) => {
    const pct = ((count / (metrics.deepRealisticRuns?.askedL1Counts?.length || 1)) * 100).toFixed(2);
    return `- **${transition}:** ${count} runs (${pct}%)`;
  })
  .join('\n')}

### Not Sure Statistics

- **Avg:** ${jsonOutput.derived.deepRealistic.notSure.avg}
- **Min:** ${jsonOutput.derived.deepRealistic.notSure.min}
- **Max:** ${jsonOutput.derived.deepRealistic.notSure.max}
- **P50 (median):** ${jsonOutput.derived.deepRealistic.notSure.p50}
- **P95:** ${jsonOutput.derived.deepRealistic.notSure.p95}

**Interpretation:** 
- If askedL1/askedL2 are constants → simulation may not be working correctly
- If endedReason has only one value → early stop logic may be broken
- Gate hit rates should correlate with early stops (gates_met reason)

${jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis
  ? `
## P3.10.1: Zero-Score Fallback Analysis (no_matches_zero_score)

This section analyzes cases where a micro state could not be selected because no evidence tags matched any micro's criteria (score was zero).

- **Total \`no_matches_zero_score\` cases:** ${jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.totalZeroScoreCases}
- **Scoring Distinct Tags per run (stats):** Avg=${jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.scoringDistinctCountStats.avg.toFixed(2)}, P50=${jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.scoringDistinctCountStats.p50}, P95=${jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.scoringDistinctCountStats.p95}

### Top 30 Unmapped Tags (Overall)

These tags appeared most frequently in \`scoringDistinct\` but were not mapped to any micro in the relevant macro, nor were they axis tags.

${jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.top30UnmappedOverall.length > 0
  ? jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.top30UnmappedOverall.map(({ tag, count }) => `- \`${tag}\`: ${count}`).join('\n')
  : '- (None)'}

### Top 30 Unmapped Tags (Per Macro - Worst 3)

Analysis of unmapped tags for the macros with the most \`no_matches_zero_score\` cases.

${Object.entries(jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.top30UnmappedByMacro).length > 0
  ? Object.entries(jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.top30UnmappedByMacro)
      .sort(([, tagsA], [, tagsB]) => tagsB.length - tagsA.length) // Sort by number of unmapped tags
      .slice(0, 3)
      .map(([macro, tags]) => `#### Macro: \`${macro}\`\n${tags.map(({ tag, count }) => `- \`${tag}\`: ${count}`).join('\n')}`)
      .join('\n\n')
  : '- (None)'}

### Top 30 Unmapped Tags (Per Source)

Breakdown of unmapped tags by their source (baseline, L1, L2, Not Sure).

${Object.entries(jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.top30UnmappedBySource).length > 0
  ? Object.entries(jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.top30UnmappedBySource)
      .map(([source, tags]) => `#### Source: \`${source}\`\n${tags.map(({ tag, count }) => `- \`${tag}\`: ${count}`).join('\n')}`)
      .join('\n\n')
  : '- (None)'}

### Top 30 Excluded Context Tags (P3.10.3.2)

These context/metadata tags were excluded from scoring (for IGNORE analysis).

${jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.top30ExcludedContextDistinct?.length > 0
  ? jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.top30ExcludedContextDistinct.map(({ tag, count }) => `- \`${tag}\`: ${count}`).join('\n')
  : '- (None - no context tags excluded)'}

### Sample Zero-Score Fallback Cases (First 10)

\`\`\`json
${JSON.stringify(jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis.sampleZeroScoreCases, null, 2)}
\`\`\`
`
  : ''}
`
  : '- (N/A - only for deep-realistic flow)'}

## Task E: Micro Diversity Analysis (Top1 Share & Entropy)

${Object.entries(microDiversityByMacro).length > 0
  ? Object.entries(microDiversityByMacro)
      .sort((a, b) => parseFloat(b[1].top1Share) - parseFloat(a[1].top1Share))
      .map(([macro, stats]) => {
        return `### ${macro} ${stats.warning ? '⚠️ (Low Diversity Warning)' : '✅'}

- **Total runs:** ${stats.total}
- **Top1 micro:** ${stats.top1Micro} (${stats.top1Count} runs, ${(stats.top1Share * 100).toFixed(2)}%)
- **Entropy:** ${stats.entropy} / ${stats.maxEntropy} (normalized: ${stats.normalizedEntropy})
- **Top 3 candidates:**

${stats.topCandidates.map((c, i) => {
  return `${i + 1}. **${c.microKey}:** ${c.count} runs (${c.share}%), avg score: ${c.avgScore}
   - Top matched tags: ${c.matchedTags.join(', ') || 'none'}`;
}).join('\n\n')}

${stats.warning 
  ? `⚠️ **Warning:** Top1 share > 90% suggests low micro diversity. This may indicate:
  - Missing evidence tags for other micros in this macro
  - Overly specific mapping for top1 micro
  - Need to review microEvidenceTags.js for this macro`
  : ''}`;
      })
      .join('\n\n')
  : '- (none)'}

## Task C: L1 Asked Statistics (L1-Full and Deep-Realistic Adaptiveness Check)

${(config.effectiveFlow === 'l1-full' || config.effectiveFlow === 'deep-realistic' || config.flow === 'adaptive-l1') && l1AskedStats
  ? `**L1 Cards Asked Per Run:**

- **Avg:** ${l1AskedStats.avg}
- **Min:** ${l1AskedStats.min}
- **Max:** ${l1AskedStats.max}
- **P50 (median):** ${l1AskedStats.p50}
- **P95:** ${l1AskedStats.p95}
- **Total runs:** ${l1AskedStats.totalRuns}

**Histogram (L1 cards asked per run):**

${Object.entries(l1AskedStats.histogram)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .map(([count, runs]) => {
    const pct = ((runs / l1AskedStats.totalRuns) * 100).toFixed(2);
    return `- **${count} cards:** ${runs} runs (${pct}%)`;
  })
  .join('\n')}

${l1AskedStats.alwaysMax 
  ? `⚠️ **WARNING: L1-full behaves as "ask-all"** - All runs asked exactly ${l1AskedStats.max} L1 cards (100% of available). This suggests adaptive selection may not be working, or it's intentionally designed to ask all cards in deep flow. The 0% fallback rate may be inflated by full coverage rather than true adaptiveness.`
  : `✅ **Adaptive behavior confirmed** - L1 cards asked varies (${l1AskedStats.min}-${l1AskedStats.max}), indicating real adaptive selection.`}`
  : '- (N/A for fixed flow)'}

## Task D: Forced Fallback Sanity Check

${config.forceNoEvidenceRate > 0 && jsonOutput.derived.forcedFallbackStats
  ? `**Forced No-Evidence Test:**

- **Forced runs:** ${jsonOutput.derived.forcedFallbackStats.forcedCount} (${(jsonOutput.derived.forcedFallbackStats.expectedRate * 100).toFixed(2)}% of total)
- **Fallback detected:** ${jsonOutput.derived.forcedFallbackStats.detectedCount}
- **Match ratio:** ${jsonOutput.derived.forcedFallbackStats.matchRatio}%

**Interpretation:** If match ratio is close to 100%, microSource marking is working correctly. If it's significantly lower, there may be a bug in fallback detection.

${parseFloat(jsonOutput.derived.forcedFallbackStats.matchRatio) > 90 
  ? '✅ **Fallback marking is correct** - Forced no-evidence cases are properly detected as fallback.'
  : parseFloat(jsonOutput.derived.forcedFallbackStats.matchRatio) > 50
  ? '⚠️ **Partial detection** - Some forced cases are not marked as fallback. This may indicate a bug.'
  : '❌ **Fallback marking may be broken** - Most forced cases are not detected as fallback.'}`
  : '- (Not enabled - use --forceNoEvidenceRate 0.05 to enable)'}

## Task 2.2: Unknown Tags in Fallback Cases

### Top 30 Unknown Tags (Overall)

${topUnknownTags.length > 0
  ? topUnknownTags.map(({ tag, count, percentage }) => `- **${tag}:** ${count} occurrences (${percentage}% of fallbacks)`).join('\n')
  : '- (none - all tags are known)'}

### Unknown Tags by Macro

${Object.entries(metrics.unknownTagsInFallbackByMacro).length > 0
  ? Object.entries(metrics.unknownTagsInFallbackByMacro)
      .map(([macro, tagCounts]) => {
        const sorted = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30);
        return `### ${macro}
${sorted.length > 0
  ? sorted.map(([tag, count]) => `- **${tag}:** ${count}`).join('\n')
  : '- (none)'}`;
      })
      .join('\n\n')
  : '- (none)'}

## Task 2.3: Top Tags in Fallback Cases (By Reason)

${Object.entries(topTagsByReasonProcessed).length > 0
  ? Object.entries(topTagsByReasonProcessed)
      .map(([reason, tags]) => {
        return `### ${reason} (Top 30)
${tags.length > 0
  ? tags.map(({ tag, count }) => `- **${tag}:** ${count}`).join('\n')
  : '- (none)'}`;
      })
      .join('\n\n')
  : '- (none)'}

## Task 3: Per-Macro Detailed Statistics

${Object.entries(macroStatsProcessed).length > 0
  ? Object.entries(macroStatsProcessed)
      .sort((a, b) => parseFloat(b[1].fallbackRate) - parseFloat(a[1].fallbackRate))
      .map(([macro, stats]) => {
        return `### ${macro}

- **Total runs:** ${stats.totalRuns}
- **Fallback count:** ${stats.fallbackCount}
- **Fallback rate:** ${stats.fallbackRate}%
- **Breakdown:**
  - no_evidence: ${stats.breakdownPct.no_evidence || '0.00'}% (${stats.breakdown.no_evidence || 0} cases)
  - no_matches_zero_score: ${stats.breakdownPct.no_matches_zero_score || '0.00'}% (${stats.breakdown.no_matches_zero_score || 0} cases)
- **Evidence size distribution:**
  - 0 tags: ${stats.evidenceSizeDist[0]} (${((stats.evidenceSizeDist[0] / stats.totalRuns) * 100).toFixed(2)}%)
  - 1 tag: ${stats.evidenceSizeDist[1]} (${((stats.evidenceSizeDist[1] / stats.totalRuns) * 100).toFixed(2)}%)
  - 2 tags: ${stats.evidenceSizeDist[2]} (${((stats.evidenceSizeDist[2] / stats.totalRuns) * 100).toFixed(2)}%)
  - 3+ tags: ${stats.evidenceSizeDist['3+']} (${((stats.evidenceSizeDist['3+'] / stats.totalRuns) * 100).toFixed(2)}%)`;
      })
      .join('\n\n')
  : '- (none)'}

### Task 3.2: Exhausted/Down/Detached Detailed Breakdown

${['exhausted', 'down', 'detached'].map(macro => {
  const stats = macroStatsProcessed[macro];
  if (!stats) return null;
  
  const topTags = topTagsInFallbackByMacro[macro] || [];
  const unknownTags = Object.entries(metrics.unknownTagsInFallbackByMacro[macro] || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
  
  return `#### ${macro}

**Top Tags in Fallback Cases (Top 30):**
${topTags.length > 0
  ? topTags.map(({ tag, count, percentage }) => `- **${tag}:** ${count} (${percentage}%)`).join('\n')
  : '- (none)'}

**Unknown Tags in Fallback Cases (Top 30):**
${unknownTags.length > 0
  ? unknownTags.map(([tag, count]) => `- **${tag}:** ${count}`).join('\n')
  : '- (none)'}

**Evidence Size Distribution in Fallback:**
- 0 tags: ${stats.evidenceSizeDist[0]}
- 1 tag: ${stats.evidenceSizeDist[1]}
- 2 tags: ${stats.evidenceSizeDist[2]}
- 3+ tags: ${stats.evidenceSizeDist['3+']}`;
}).filter(x => x).join('\n\n')}

## Task E: Micro Diversity Analysis (Top1 Share & Entropy)

${Object.entries(microDiversityByMacro).length > 0
  ? Object.entries(microDiversityByMacro)
      .sort((a, b) => parseFloat(b[1].top1Share) - parseFloat(a[1].top1Share))
      .map(([macro, stats]) => {
        return `### ${macro} ${stats.warning ? '⚠️ (Low Diversity Warning)' : '✅'}

- **Total runs:** ${stats.total}
- **Top1 micro:** ${stats.top1Micro} (${stats.top1Count} runs, ${(stats.top1Share * 100).toFixed(2)}%)
- **Entropy:** ${stats.entropy} / ${stats.maxEntropy} (normalized: ${stats.normalizedEntropy})
- **Top 3 candidates:**

${stats.topCandidates.map((c, i) => {
  return `${i + 1}. **${c.microKey}:** ${c.count} runs (${c.share}%), avg score: ${c.avgScore}
   - Top matched tags: ${c.matchedTags.join(', ') || 'none'}`;
}).join('\n\n')}

${stats.warning 
  ? `⚠️ **Warning:** Top1 share > 90% suggests low micro diversity. This may indicate:
  - Missing evidence tags for other micros in this macro
  - Overly specific mapping for top1 micro
  - Need to review microEvidenceTags.js for this macro`
  : ''}`;
      })
      .join('\n\n')
  : '- (none)'}

## Task 4: Fallback Case Examples

${metrics.fallbackCaseExamples.length > 0
  ? metrics.fallbackCaseExamples.map((example, i) => {
      return `### Example ${i + 1} (Run ${example.runId})

- **Macro:** ${example.macro}
- **Fallback reason:** ${example.fallbackReason}
- **Micro top candidate:** ${example.microTopCandidate ? `${example.microTopCandidate.microKey} (score: ${example.microTopCandidate.score.toFixed(4)}, matched tags: ${example.microTopCandidate.matchedTags.join(', ') || 'none'})` : 'N/A'}
- **Micro reason:** ${example.microReason}
- **Evidence tags:** ${example.evidenceTags.length > 0 ? example.evidenceTags.join(', ') : '(none)'}
- **Evidence size:** ${example.evidenceSize} tags
- **Asked card IDs:** ${example.askedCardIds.length > 0 ? example.askedCardIds.join(', ') : '(none - fixed flow)'}
- **Baseline:** ${JSON.stringify(example.baseline)}`;
    }).join('\n\n')
  : '- (none)'}

## Notes

- Noisy-mixed mode: 40% aligned tags, 40% conflicting tags, 20% random/noise tags
- 25% "Not sure" responses (low_clarity uncertainty)
- Variable tag counts (0-4 tags per response)
- Fixed seed: ${config.seed} for reproducibility
- Flow mode: ${config.flow}${config.flow === 'fixed' ? ' (legacy behavior)' : ' (adaptive L1 selection)'}
${config.flow === 'adaptive-l1' ? '- To compare fixed vs adaptive-l1, run two separate commands with --flow fixed and --flow adaptive-l1' : ''}
`;

  // Ensure output directory exists
  if (!fs.existsSync(config.outDir)) {
    fs.mkdirSync(config.outDir, { recursive: true });
  }
  
  // Save outputs
  // P3.10.4: Include seed and flow in filename for regression analysis
  const seedSuffix = config.seed ? `_seed${config.seed}` : '';
  const flowSuffix = config.effectiveFlow ? `_${config.effectiveFlow}` : '';
  const jsonPath = path.join(config.outDir, `deep_balance_noisy_mixed${flowSuffix}${seedSuffix}.json`);
  const mdPath = path.join(config.outDir, `deep_balance_noisy_mixed${flowSuffix}${seedSuffix}.md`);
  
  // Task 3: Invariant check - if maxL2 > 0, L2 should not be zero
  if (config.effectiveFlow === 'deep-realistic' && config.maxL2 > 0) {
    const askedL2Avg = jsonOutput?.derived?.deepRealistic?.askedL2?.avg ?? 0;
    if (askedL2Avg === 0) {
      throw new Error(`Deep-realistic produced askedL2.avg=0 with maxL2=${config.maxL2}. Run is not realistic. Check simulation parameters.`);
    }
  }
  
  // TAGS-01: Add invalid tags stats to report if available
  try {
    const { getInvalidTagsStats } = await import('../src/data/tagAliasMap.js');
    const invalidTagsStats = getInvalidTagsStats();
    if (invalidTagsStats.total > 0) {
      jsonOutput.invalidTagsStats = invalidTagsStats;
      console.log(`\n⚠️  Invalid tags detected: ${invalidTagsStats.total} total`);
      console.log(`   Top invalid tags: ${invalidTagsStats.top20.slice(0, 5).map(x => `${x.tag} (${x.count})`).join(', ')}`);
    }
  } catch (e) {
    // Stats not available (e.g., in production mode)
  }
  
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), 'utf8');
  fs.writeFileSync(mdPath, mdReport, 'utf8');

  // TASK POST-02: Write micro fallback samples (create file even if empty to signal completion)
  if (config.sampleFailures > 0) {
    const samplesPath = path.join(
      config.outDir,
      `micro_fallback_samples_${config.effectiveFlow || config.flow}_seed${config.seed}.jsonl`
    );
    const lines = microFallbackSamples.map(x => JSON.stringify(x)).join('\n') + '\n';
    fs.writeFileSync(samplesPath, lines, 'utf8');
    console.log(`✅ Micro fallback samples saved: ${samplesPath}`);
  }
  
  // P3.10.1: Save zero-score fallback analysis to separate files
  if (config.effectiveFlow === 'deep-realistic' && jsonOutput.derived.deepRealistic?.zeroScoreFallbackAnalysis) {
    const zeroScoreJsonPath = path.join(config.outDir, 'p3_10_zero_score_tags.json');
    const zeroScoreMdPath = path.join(config.outDir, 'p3_10_zero_score_tags.md');
    
    fs.writeFileSync(zeroScoreJsonPath, JSON.stringify(jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis, null, 2), 'utf8');
    
    // Generate Markdown report for zero-score tags
    const analysis = jsonOutput.derived.deepRealistic.zeroScoreFallbackAnalysis;
    const zeroScoreMd = `# P3.10.1: Zero-Score Fallback Analysis

This report analyzes cases where a micro state could not be selected because no evidence tags matched any micro's criteria (score was zero).

## Summary

- **Total \`no_matches_zero_score\` cases:** ${analysis.totalZeroScoreCases}
- **Scoring Distinct Tags per run (stats):** 
  - Avg: ${analysis.scoringDistinctCountStats.avg.toFixed(2)}
  - P50: ${analysis.scoringDistinctCountStats.p50}
  - P95: ${analysis.scoringDistinctCountStats.p95}
  - Min: ${analysis.scoringDistinctCountStats.min}
  - Max: ${analysis.scoringDistinctCountStats.max}

## Top 30 Unmapped Tags (Overall)

These tags appeared most frequently in \`scoringDistinct\` but were not mapped to any micro in the relevant macro, nor were they axis tags.

${analysis.top30UnmappedOverall.length > 0
  ? analysis.top30UnmappedOverall.map(({ tag, count }, idx) => `${idx + 1}. \`${tag}\`: ${count} occurrences`).join('\n')
  : '- (None)'}

## Top 30 Unmapped Tags (Per Macro - Worst 3)

Analysis of unmapped tags for the macros with the most \`no_matches_zero_score\` cases.

${Object.entries(analysis.top30UnmappedByMacro).length > 0
  ? Object.entries(analysis.top30UnmappedByMacro)
      .sort(([, tagsA], [, tagsB]) => tagsB.length - tagsA.length)
      .slice(0, 3)
      .map(([macro, tags]) => `### Macro: \`${macro}\`\n\n${tags.map(({ tag, count }, idx) => `${idx + 1}. \`${tag}\`: ${count} occurrences`).join('\n')}`)
      .join('\n\n')
  : '- (None)'}

## Top 30 Unmapped Tags (Per Source)

Breakdown of unmapped tags by their source (baseline, L1, L2, Not Sure).

${Object.entries(analysis.top30UnmappedBySource).length > 0
  ? Object.entries(analysis.top30UnmappedBySource)
      .map(([source, tags]) => `### Source: \`${source}\`\n\n${tags.map(({ tag, count }, idx) => `${idx + 1}. \`${tag}\`: ${count} occurrences`).join('\n')}`)
      .join('\n\n')
  : '- (None)'}

## Top 30 Excluded Context Tags (P3.10.3.2)

These context/metadata tags were excluded from scoring (for IGNORE analysis).

${analysis.top30ExcludedContextDistinct?.length > 0
  ? analysis.top30ExcludedContextDistinct.map(({ tag, count }, idx) => `${idx + 1}. \`${tag}\`: ${count} occurrences`).join('\n')
  : '- (None - no context tags excluded)'}

## Sample Zero-Score Fallback Cases (First 10)

\`\`\`json
${JSON.stringify(analysis.sampleZeroScoreCases, null, 2)}
\`\`\`
`;
    
    fs.writeFileSync(zeroScoreMdPath, zeroScoreMd, 'utf8');
    
    console.log(`  Zero-Score Analysis JSON: ${zeroScoreJsonPath}`);
    console.log(`  Zero-Score Analysis MD: ${zeroScoreMdPath}`);
  }
  
  // Print summary to console
  console.log('\n' + '='.repeat(80));
  console.log('DEEP BALANCE REPORT');
  console.log('='.repeat(80));
  console.log('');
  console.log('📊 TOP-LEVEL METRICS');
  console.log('-'.repeat(80));
  console.log(`Micro none rate (overall): ${microNoneRate}% (ожидается ≈0%)`);
  console.log(`Micro fallback rate (overall): ${microFallbackRate}% (главный KPI, цель: ≤5%)`);
  console.log(`Micro selected rate (overall): ${microSelectedRate}%`);
  console.log(`Micro specific rate (overall): ${microSpecificRate}% of selected (${microSpecificRateOfTotal}% of total) - новый KPI`);
  console.log(`Micro axis-only rate (overall): ${microAxisOnlyRate}% of selected (${microAxisOnlyRateOfTotal}% of total)`);
  console.log(`Weak evidence share (overall): ${weakEvidenceShare}%`);
  console.log(`Macro flip rate: ${macroFlipRate}%`);
  console.log(`Illegal flip rate: ${illegalFlipRate}%`);
  console.log(`Avg tags per run (raw): ${avgTagsPerRun}`);
  console.log(`Avg tags per run (distinct): ${avgTagsDistinct} - P0.6B`);
  console.log(`Must-have hit rate: ${mustHaveHitRate}%`);
  console.log(`Avg steps to finish: ${avgSteps}`);
  console.log(`P95 steps: ${p95Steps}`);
  console.log('');
  console.log('P0.6A: MicroSource Breakdown:');
  for (const [source, count] of Object.entries(metrics.microSourceBreakdown).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / metrics.totalPaths) * 100).toFixed(2);
    console.log(`  ${source}: ${count} (${pct}%)`);
  }
  console.log('');
  console.log(`Worst macro by micro fallback: ${worstMacroByFallback ? `${worstMacroByFallback[0]} (${worstMacroByFallback[1]}%)` : 'N/A'}`);
  console.log(`Worst macro by weak evidence: ${worstMacroByWeak ? `${worstMacroByWeak[0]} (${worstMacroByWeak[1]}%)` : 'N/A'}`);
  console.log('');
  console.log('✅ Reports saved:');
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  MD: ${mdPath}`);
  console.log('='.repeat(80));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
