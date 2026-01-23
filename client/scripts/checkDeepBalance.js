// checkDeepBalance.js (AK3-POST-1 - Deep Realism Sanity)
// Simulates deep dive flow with noisy-mixed mode and comprehensive metrics
//
// Usage:
//   node scripts/checkDeepBalance.js --mode noisy-mixed --seed 42 --runs 100000 --outDir ./scripts/out --flow fixed
//   node scripts/checkDeepBalance.js --mode noisy-mixed --seed 42 --runs 100000 --outDir ./scripts/out --flow adaptive-l1
//
// Task AI: Integration Hygiene
// - Uses canonical imports (no local copies of engine logic)
// - All paths use client/src/... structure

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Task P0: Utility function to read JSON files (more reliable than import)
function readJson(relPath) {
  const abs = path.resolve(process.cwd(), relPath);
  const raw = fs.readFileSync(abs, 'utf8');
  return JSON.parse(raw);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    mode: 'noisy-mixed',
    seed: 42,
    runs: null, // null = use all baseline combinations
    outDir: path.join(__dirname, 'out'),
    flow: 'fixed', // Task AK3-DEEP-L1-2: 'fixed' or 'adaptive-l1'
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
      config.flow = args[i + 1]; // Task AK3-DEEP-L1-2
      i++;
    }
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
  
  // Limit runs if specified
  const baselineSubset = config.runs 
    ? BASELINE_COMBOS.slice(0, Math.min(config.runs, BASELINE_COMBOS.length))
    : BASELINE_COMBOS;
  
  console.log(`Running simulation on ${baselineSubset.length} baselines...`);
  console.log('');
  
  // Task AK3-DEEP-L1-2: Load L1 cards for adaptive selection
  let L1_CARDS = [];
  let L1_CARDS_BY_ID = {};
  
  if (config.flow === 'adaptive-l1') {
    try {
      // Task P0: Use readJson instead of import to avoid JSON import issues
      const l1Data = readJson('src/data/flow/L1.json');
      L1_CARDS = Array.isArray(l1Data) ? l1Data : [];
      // Normalize cards
      L1_CARDS = L1_CARDS.map(card => ({
        id: String(card?.id || ''),
        title: String(card?.title || ''),
        type: String(card?.type || 'swipe'),
        options: Array.isArray(card?.options) ? card.options : [],
        meta: card?.meta || {},
        cluster: card?.cluster || 'GENERAL', // Task AK3-DEEP-L1-1c
        macroAllow: Array.isArray(card?.macroAllow) ? card.macroAllow : null,
        signals: Array.isArray(card?.signals) ? card.signals : [],
      })).filter(c => c.id && c.id.startsWith('L1_'));
      
      for (const card of L1_CARDS) {
        L1_CARDS_BY_ID[card.id] = card;
      }
      
      // Task P0.1: Log L1 loading for verification
      console.log('[checkDeepBalance] L1 loaded:', Array.isArray(L1_CARDS) ? L1_CARDS.length : 'not-array');
      console.log('[checkDeepBalance] Example L1 ids:', (Array.isArray(L1_CARDS) ? L1_CARDS.slice(0, 3).map(x => x.id) : []));
    } catch (e) {
      console.error('[checkDeepBalance] Failed to load L1 cards:', e.message);
      console.error('[checkDeepBalance] Error stack:', e.stack);
      throw new Error(`Failed to load L1 cards: ${e.message}. Ensure src/data/flow/L1.json exists.`);
    }
  }

  // Task AK3-POST-1: Enhanced noisy-mixed mode with real noise
  // Task AK3-DEEP-L1-2: Updated to support adaptive-l1 flow
  async function generateSyntheticL1Responses(baselineMacro, mode, rng, flowMode, baselineMetrics) {
    const { getMicrosForMacro } = await import('../src/data/microTaxonomy.js');
    const { getMicroEvidenceTags } = await import('../src/data/microEvidenceTags.js');
    
    const micros = getMicrosForMacro(baselineMacro);
    const responses = [];
    
    // Task AK3-DEEP-L1-2: Adaptive vs fixed flow
    if (flowMode === 'adaptive-l1' && L1_CARDS.length > 0) {
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
          console.warn('[checkDeepBalance] Duplicate card detected in adaptive-l1 flow', {
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
    return { responses, stepsTaken: responseCount, cardSequence: null };
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
  };
  
  // Run simulation
  console.log(`Running deep simulation (${config.mode} mode)...`);
  let processed = 0;
  const reportInterval = Math.max(1, Math.floor(baselineSubset.length / 10));
  
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
    const l1ResponseResult = await generateSyntheticL1Responses(baselineMacro, config.mode, rng, config.flow, baselineMetrics);
    const l1Responses = l1ResponseResult.responses || [];
    const stepsTaken = l1ResponseResult.stepsTaken || l1Responses.length;
    
    // Task AK3-DEEP-L1-2: Track steps taken
    metrics.stepsTaken.push(stepsTaken);
    if (!metrics.stepsByFlow[config.flow]) {
      metrics.stepsByFlow[config.flow] = [];
    }
    metrics.stepsByFlow[config.flow].push(stepsTaken);
    
    // Count tags per run
    const totalTags = l1Responses.reduce((sum, r) => sum + (r.tags?.length || 0), 0);
    metrics.tagsPerRun.push(totalTags);
    if (totalTags === 0) metrics.tagsDistribution[0]++;
    else if (totalTags === 1) metrics.tagsDistribution[1]++;
    else if (totalTags === 2) metrics.tagsDistribution[2]++;
    else metrics.tagsDistribution['3+']++;
    
    // Check for must-have tags
    const allTags = l1Responses.flatMap(r => r.tags || []);
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
    
    // Run deep engine
    const deepResult = await routeStateFromDeepCanonical(baselineMetrics, l1Responses, {
      evidenceWeight: 0.45,
    });
    
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
  
  const microNoneRate = ((metrics.microNoneCount / metrics.totalPaths) * 100).toFixed(2);
  const microFallbackRate = ((metrics.microFallbackCount / metrics.totalPaths) * 100).toFixed(2);
  const microSelectedRate = ((metrics.microSelectedCount / metrics.totalPaths) * 100).toFixed(2);
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
  
  // Prepare JSON output
  const jsonOutput = {
    ...metrics,
    derived: {
      avgTagsPerRun: parseFloat(avgTagsPerRun),
      microNoneRate: parseFloat(microNoneRate),
      microFallbackRate: parseFloat(microFallbackRate),
      microSelectedRate: parseFloat(microSelectedRate),
      microSpecificRate: parseFloat(microSpecificRate),
      microAxisOnlyRate: parseFloat(microAxisOnlyRate),
      microSpecificRateOfTotal: parseFloat(microSpecificRateOfTotal),
      microAxisOnlyRateOfTotal: parseFloat(microAxisOnlyRateOfTotal),
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
    },
    // Convert Sets to Arrays for JSON
    microCoverage: Array.from(metrics.microCoverage),
  };
  
  // Generate markdown report
  const mdReport = `# Deep Balance Report - Noisy Mixed Mode

**Generated:** ${new Date().toISOString()}
**Mode:** ${config.mode}
**Flow:** ${config.flow}
**Seed:** ${config.seed}
**Runs:** ${baselineSubset.length} / ${BASELINE_COMBOS.length} total baselines
**Total paths:** ${metrics.totalPaths}

## Top-Level Metrics

- **Micro none rate (overall):** ${microNoneRate}% (${metrics.microNoneCount} cases) - ожидается ≈0% (кроме macro без micros)
- **Micro fallback rate (overall):** ${microFallbackRate}% (${metrics.microFallbackCount} cases) - **главный KPI** (цель: ≤5%)
- **Micro selected rate (overall):** ${microSelectedRate}% (${metrics.microSelectedCount} cases)
- **Micro specific rate (overall):** ${microSpecificRate}% (${metrics.microSpecificCount} cases) - **новый KPI** (selected с non-axis tags)
- **Micro axis-only rate (overall):** ${microAxisOnlyRate}% (${metrics.microAxisOnlyCount} cases) - selected только с axis tags
- **Weak evidence share (overall):** ${weakEvidenceShare}% (${metrics.weakEvidenceCount} cases)
- **Macro flip rate:** ${macroFlipRate}% (${metrics.macroFlipCount} cases)
- **Illegal flip rate:** ${illegalFlipRate}% (${metrics.illegalFlipCount} cases)
- **Avg tags per run:** ${avgTagsPerRun}
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

## Sanity Checks

${parseFloat(microNoneRate) > 0.1 ? '❌' : '✅'} Micro none rate: ${microNoneRate}% (threshold: ≈0%, кроме macro без micros)
${parseFloat(microFallbackRate) > 5 ? '❌' : parseFloat(microFallbackRate) > 8 ? '⚠️' : '✅'} Micro fallback rate: ${microFallbackRate}% (threshold: ≤5% overall, ≤8% worst macro)
${parseFloat(illegalFlipRate) > 0 ? '❌' : '✅'} Illegal flip rate: ${illegalFlipRate}% (threshold: 0%)
${metrics.semanticViolations.length > 0 ? '❌' : '✅'} Semantic violations: ${metrics.semanticViolations.length} (threshold: 0)
${metrics.microCoverage.size < 33 ? '⚠️' : '✅'} Micro coverage: ${metrics.microCoverage.size}/33 (all reachable)
${metrics.invariantViolationCount > 0 ? '❌' : '✅'} Invariant violations: ${metrics.invariantViolationCount} (threshold: 0) - Task AK3-DEEP-L1-2b

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
  const jsonPath = path.join(config.outDir, 'deep_balance_noisy_mixed.json');
  const mdPath = path.join(config.outDir, 'deep_balance_noisy_mixed.md');
  
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), 'utf8');
  fs.writeFileSync(mdPath, mdReport, 'utf8');
  
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
  console.log(`Avg tags per run: ${avgTagsPerRun}`);
  console.log(`Must-have hit rate: ${mustHaveHitRate}%`);
  console.log(`Avg steps to finish: ${avgSteps}`);
  console.log(`P95 steps: ${p95Steps}`);
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
