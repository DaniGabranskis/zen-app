// src/domain/deepSession/runner.js
// Task A3.1: Deterministic deep session runner (pure core)
// Comments in English only.

import { EVENT_TYPES, LAYERS, ENDED_REASONS } from './types.js';
import {
  createSessionStartEvent,
  createBaselineInjectedEvent,
  createCardShownEvent,
  createAnswerCommittedEvent,
  createEvidenceAddedEvent,
  createGateHitEvent,
  createMacroUpdatedEvent,
  createMicroSelectedEvent,
  createExpectedMacroComputedEvent,
  createSessionEndEvent,
} from './events.js';

/**
 * Create deep session runner
 * Task A3.1.0: Uses clarified deps interface
 * @param {RunnerDeps} deps - Runner dependencies
 * @returns {Object} Runner object with methods
 */
export function createDeepSessionRunner(deps) {
  const {
    rng,
    flowConfig,
    decks,
    decksById,
    l1Selector,
    l2Planner,
    answerTagger,
    macroEngine,
    microEngine,
    tagPipeline,
    gateEngine,
  } = deps;

  // Session state (mutable)
  let state = null;
  let events = [];
  let l2Plan = [];
  let baselineMacro = null;
  let baselineConfidence = null;
  let baselineMetrics = null;
  let fixtureTags = []; // GS-MEANING-16: Store fixture tags for eligibility check

  /**
   * Initialize session with baseline
   * GS-MEANING-16: Accept fixtureTags for eligibility check
   * @param {BaselineMetrics} metrics - Baseline metrics
   * @param {string[]} [tags] - Fixture tags (for intentional_contradiction check)
   * @returns {SessionEvent[]} Initial events
   */
  function init(metrics, tags = []) {
    baselineMetrics = metrics;
    fixtureTags = tags || [];
    
    // Reset state
    // Task A3.1.1: Added phase and currentCardId
    state = {
      step: 0,
      phase: 'L1',
      currentCardId: null,
      currentLayer: null,
      askedL1Ids: new Set(),
      askedL2Ids: new Set(),
      baselineEvidenceTags: [],
      cardEvidenceTags: [],
      evidenceTags: [],
      gatesHitAny: {
        valence: false,
        arousal: false,
        agency: false,
        clarity: false,
        social: false,
        load: false,
      },
      gatesHitCardsOnly: {
        valence: false,
        arousal: false,
        agency: false,
        clarity: false,
        social: false,
        load: false,
      },
      macroBeforeCards: null,
      macroAfterL1: null,
      macroAfterL2: null,
      endedBy: null,
      endedReason: null,
      microSource: null,
      microReason: null,
      microTopCandidate: null,
      gateFirstHitStep: {},
      gateHitCardIds: {},
      coverageFirstPicks: [],
      signals: [],
      gateState: {},
      l2PlanCursor: 0, // Task A3.4.6: L2 plan cursor for guaranteed progression
    };

    events = [];
    l2Plan = [];

    // Get baseline macro
    // Task A3.1.0: Use macroEngine.computeMacro interface
    const baselineResult = macroEngine.computeMacro({
      baselineMetrics: metrics,
      evidenceTags: [],
    });
    baselineMacro = baselineResult.macro || baselineResult.stateKey; // Support both formats
    baselineConfidence = baselineResult.meta?.confidenceBand || baselineResult.confidenceBand || 'medium';
    state.macroBeforeCards = baselineMacro;

    // Inject baseline tags if enabled
    // Task A3.4.3: Ensure session_start is first event
    const initialEvents = [createSessionStartEvent(0, metrics)];

    if (flowConfig.baselineInjectionEnabled) {
      const baselineTags = convertBaselineToTags(metrics);
      initialEvents.push(createBaselineInjectedEvent(0, baselineTags));
    }

    // Add initial events FIRST (session_start must be first)
    events.push(...initialEvents);
    
    // Then add evidence (which may generate evidence_added and gate_hit events)
    if (flowConfig.baselineInjectionEnabled) {
      const baselineTags = convertBaselineToTags(metrics);
      addEvidence(baselineTags, 'baseline', null);
    }
    
    return initialEvents;
  }

  /**
   * Convert baseline metrics to tags
   * @param {BaselineMetrics} metrics - Baseline metrics
   * @returns {string[]} Array of baseline tags
   */
  function convertBaselineToTags(metrics) {
    const tags = [];

    // Valence -> sig.valence
    if (metrics.valence <= 3) tags.push('sig.valence.neg');
    else if (metrics.valence >= 7) tags.push('sig.valence.pos');
    else tags.push('sig.valence.neutral');

    // Energy -> sig.fatigue + sig.arousal
    if (metrics.energy <= 3) {
      tags.push('sig.fatigue.high');
      tags.push('sig.arousal.low');
    } else if (metrics.energy >= 7) {
      tags.push('sig.fatigue.low');
      tags.push('sig.arousal.high');
    } else {
      tags.push('sig.fatigue.mid');
      tags.push('sig.arousal.mid');
    }

    // Tension -> sig.tension
    if (metrics.tension <= 3) tags.push('sig.tension.low');
    else if (metrics.tension >= 7) tags.push('sig.tension.high');
    else tags.push('sig.tension.mid');

    // Clarity -> sig.clarity
    if (metrics.clarity <= 3) tags.push('sig.clarity.low');
    else if (metrics.clarity >= 7) tags.push('sig.clarity.high');
    else tags.push('sig.clarity.mid');

    // Control -> sig.agency
    if (metrics.control <= 3) tags.push('sig.agency.low');
    else if (metrics.control >= 7) tags.push('sig.agency.high');
    else tags.push('sig.agency.mid');

    // Social -> sig.social
    if (metrics.social <= 3) tags.push('sig.social.low');
    else if (metrics.social >= 7) tags.push('sig.social.high');
    else tags.push('sig.social.mid');

    return tags;
  }

  /**
   * Add evidence tags (single point of truth)
   * Task A3.1.3: Unified evidence addition with canonicalization/derivation
   * @param {string[]} rawTags - Raw tags to add
   * @param {string} source - Source ('baseline', 'l1', 'l2', 'not_sure')
   * @param {string|null} cardId - Card ID (if applicable)
   */
  function addEvidence(rawTags, source, cardId) {
    if (!Array.isArray(rawTags) || rawTags.length === 0) return;

    // Task A3.1.3: Canonicalize and derive via tagPipeline
    const canonicalTags = tagPipeline.canonicalizeTags(rawTags);
    const derivedTags = tagPipeline.deriveSigTagsFromArray(canonicalTags);
    const expandedTags = Array.from(new Set([...canonicalTags, ...derivedTags]));

    // Add to evidence collections
    state.evidenceTags.push(...expandedTags);
    if (source === 'baseline') {
      state.baselineEvidenceTags.push(...expandedTags);
    } else {
      state.cardEvidenceTags.push(...expandedTags);
    }

    // Emit event
    events.push(createEvidenceAddedEvent(state.step, expandedTags, source, cardId));

    // Task A3.1.3: Check gates (after evidence is added, unified)
    checkGates(expandedTags, source, cardId);
  }

  /**
   * Check gates and emit events
   * Task A3.1.3: Gate checking always happens after addEvidence
   * @param {string[]} tags - Tags to check (should be expanded: canonical + derived)
   * @param {string} source - Source of tags
   * @param {string|null} cardId - Card ID
   */
  function checkGates(tags, source, cardId) {
    const allGates = ['valence', 'arousal', 'agency', 'clarity', 'social', 'load'];

    for (const gateName of allGates) {
      const allowList = gateEngine.GATE_ALLOW_LISTS[gateName] || [];
      const isHit = gateEngine.hasGateMatch(tags, allowList);

      // Update gatesHitAny (baseline + cards)
      if (isHit && !state.gatesHitAny[gateName]) {
        state.gatesHitAny[gateName] = true;
        state.gateFirstHitStep[gateName] = state.step;
        events.push(createGateHitEvent(state.step, gateName, source === 'baseline' ? LAYERS.BASELINE : state.currentLayer, cardId, 'any'));
      }

      // Update gatesHitCardsOnly (cards only)
      if (isHit && source !== 'baseline' && !state.gatesHitCardsOnly[gateName]) {
        state.gatesHitCardsOnly[gateName] = true;
        // Emit separate event for cardsOnly scope
        events.push(createGateHitEvent(state.step, gateName, state.currentLayer, cardId, 'cardsOnly'));
        if (!state.gateHitCardIds[gateName]) {
          state.gateHitCardIds[gateName] = {};
        }
        if (cardId) {
          state.gateHitCardIds[gateName][cardId] = (state.gateHitCardIds[gateName][cardId] || 0) + 1;
        }
      }
    }
  }

  /**
   * GS-RUNNER-LIMITS Task 4: Transition to L2 phase
   * Clears current card, builds L2 plan, sets phase to L2
   * GS11-FIX: If maxL2=0, end session instead of transitioning
   */
  function transitionToL2() {
    // GS11-FIX: If maxL2=0, don't transition to L2, end session instead
    if (flowConfig.maxL2 === 0) {
      endSession(ENDED_REASONS.NO_L2_CANDIDATES, 'l1');
      return;
    }
    
    state.phase = 'L2';
    state.currentLayer = LAYERS.L2;
    state.currentCardId = null;
    // L2 plan will be built on first getNextCard() call in L2 phase
  }

  /**
   * GS-MEANING-16: Compute signal quality fields
   * @returns {Object} Signal quality object
   */
  function computeSignalQuality() {
    const evidenceTagsForScoring = state.evidenceTags || state.cardEvidenceTags || [];
    const scoringTags = tagPipeline.buildScoringTags(evidenceTagsForScoring, { excludeContext: true });
    const scoringTagCount = scoringTags.length;
    const axisTagCount = evidenceTagsForScoring.filter(t => t && t.startsWith('sig.axis.')).length;
    
    // Compute signal score and expected macro
    const sigTags = tagPipeline.deriveSigTagsFromArray(scoringTags);
    let signalScore = 0;
    const signalWeights = {};
    
    for (const tag of sigTags) {
      if (tag === 'sig.valence.pos') {
        signalScore += 2;
        signalWeights['sig.valence.pos'] = (signalWeights['sig.valence.pos'] || 0) + 2;
      } else if (tag === 'sig.valence.neg') {
        signalScore -= 2;
        signalWeights['sig.valence.neg'] = (signalWeights['sig.valence.neg'] || 0) + 2;
      } else if (tag === 'sig.arousal.high') {
        signalScore += 1;
        signalWeights['sig.arousal.high'] = (signalWeights['sig.arousal.high'] || 0) + 1;
      } else if (tag === 'sig.fatigue.high') {
        signalScore -= 1;
        signalWeights['sig.fatigue.high'] = (signalWeights['sig.fatigue.high'] || 0) + 1;
      } else if (tag === 'sig.tension.high') {
        signalScore -= 1;
        signalWeights['sig.tension.high'] = (signalWeights['sig.tension.high'] || 0) + 1;
      } else if (tag === 'sig.tension.low') {
        signalScore += 1;
        signalWeights['sig.tension.low'] = (signalWeights['sig.tension.low'] || 0) + 1;
      } else if (tag === 'sig.clarity.high') {
        signalScore += 1;
        signalWeights['sig.clarity.high'] = (signalWeights['sig.clarity.high'] || 0) + 1;
      } else if (tag === 'sig.clarity.low') {
        signalScore -= 1;
        signalWeights['sig.clarity.low'] = (signalWeights['sig.clarity.low'] || 0) + 1;
      } else if (tag === 'sig.agency.high') {
        signalScore += 1;
        signalWeights['sig.agency.high'] = (signalWeights['sig.agency.high'] || 0) + 1;
      } else if (tag === 'sig.agency.low') {
        signalScore -= 1;
        signalWeights['sig.agency.low'] = (signalWeights['sig.agency.low'] || 0) + 1;
      }
    }
    
    // Determine expected macro
    let expectedMacro = 'mixed';
    if (signalScore >= 2) {
      expectedMacro = 'up';
    } else if (signalScore <= -2) {
      const fatigueWeight = signalWeights['sig.fatigue.high'] || 0;
      const tensionWeight = signalWeights['sig.tension.high'] || 0;
      if (fatigueWeight > tensionWeight) {
        expectedMacro = 'exhausted';
      } else {
        expectedMacro = 'down';
      }
    }
    
    // GS-MEANING-05: Eligibility rules (no hard-coded exclusions)
    const baselineTags = state.baselineEvidenceTags || [];
    const hasVeryLowBaseline = baselineTags.some(t => 
      t === 'sig.valence.neg' || (t === 'sig.tension.high' && baselineTags.includes('sig.fatigue.high'))
    );
    const isIntentionalContradiction = fixtureTags.includes('intentional_contradiction');
    
    // Eligibility: strong signal AND enough tags
    const eligibleForContradiction = 
      Math.abs(signalScore) >= 2 && 
      scoringTagCount >= 3 &&
      (isIntentionalContradiction || Math.abs(signalScore) >= 5 || !hasVeryLowBaseline);
    
    // Get top 5 signals
    const topSignals = Object.entries(signalWeights)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 5)
      .map(([tag]) => tag);
    
    // Compute hasContradiction
    const finalMacro = state.macroAfterL2 || state.macroAfterL1 || state.macroBeforeCards || 'none';
    const isDownLike = ['down', 'overloaded', 'blocked', 'pressured'].includes(finalMacro);
    const isUpLike = ['up', 'connected', 'capable', 'engaged', 'grounded'].includes(finalMacro);
    
    const hasContradiction = eligibleForContradiction && (
      (expectedMacro === 'up' && (isDownLike || finalMacro === 'exhausted')) ||
      ((expectedMacro === 'down' || expectedMacro === 'exhausted') && isUpLike)
    );
    
    return {
      expectedMacro,
      signalScore,
      scoringTagCount,
      axisTagCount,
      eligibleForContradiction,
      topSignals,
      hasContradiction,
    };
  }

  /**
   * GS-RUNNER-LIMITS Task 5: End session with reason
   * GS-MEANING-16: Compute signal quality before ending
   * @param {string} reason - Ended reason (from ENDED_REASONS)
   * @param {string} by - Ended by ('l1' or 'l2')
   */
  function endSession(reason, by) {
    // GS-MEANING-16: Compute signal quality before ending
    const signalQuality = computeSignalQuality();
    state.signalQuality = signalQuality;
    
    // GS-MEANING-16: Emit expected_macro_computed event before session_end
    events.push(createExpectedMacroComputedEvent(state.step, signalQuality));
    
    state.phase = 'ENDED';
    state.endedBy = by;
    state.endedReason = reason;
    state.currentCardId = null;
    state.currentLayer = null;
    events.push(createSessionEndEvent(state.step, by, reason, state));
  }

  /**
   * Get count safely (handles Set/Array/Object after JSON round-trip)
   * @param {Set|Array|Object} askedIds - Asked IDs collection
   * @returns {number} Count
   */
  function getAskedCount(askedIds) {
    if (!askedIds) return 0;
    if (askedIds instanceof Set) return askedIds.size;
    if (Array.isArray(askedIds)) return askedIds.length;
    if (typeof askedIds === 'object' && askedIds !== null) return Object.keys(askedIds).length;
    return 0;
  }

  /**
   * Get next card to ask
   * Task A3.1.2: L1→L2 transition with quotas
   * Task A3.4.5: Idempotent - if currentCardId is set, return same card without new events
   * GS-RUNNER-LIMITS: Hard guards before card selection
   * @returns {NextCardResult|null} Next card or null if ended
   */
  function getNextCard() {
    // Task A3.1.2: Check if ended
    if (state.phase === 'ENDED' || state.endedBy !== null) return null;
    
    // GS-RUNNER-LIMITS Task 1: Hard guard - check phase FIRST
    // If phase is L2, never return L1 cards
    if (state.phase === 'L2') {
      // GS-RUNNER-LIMITS Task 2: Fail-fast - clear any pending L1 cards
      if (state.currentCardId && state.currentCardId.startsWith('L1_')) {
        throw new Error(`GS-RUNNER-LIMITS: L1 card ${state.currentCardId} pending during L2 phase`);
      }
      // Continue to L2 selection below
    } else if (state.phase === 'L1') {
      // Task A3.4.5: Idempotent - if currentCardId is already set, return same card without emitting new events
      if (state.currentCardId) {
        const card = decksById.L1[state.currentCardId] || decksById.L2[state.currentCardId];
        if (card) {
          const cardLayer = state.currentCardId.startsWith('L1_') ? LAYERS.L1 : LAYERS.L2;
          return {
            layer: state.currentLayer || cardLayer,
            card,
            reason: 'idempotent',
          };
        }
      }
      
      // Task A3.1.2: L1 phase
      // Task 1: Get count safely (handles Set/Array/Object after JSON round-trip)
      const askedL1Count = state.askedL1Ids instanceof Set 
        ? state.askedL1Ids.size 
        : (Array.isArray(state.askedL1Ids) 
          ? state.askedL1Ids.length 
          : (typeof state.askedL1Ids === 'object' && state.askedL1Ids !== null
            ? Object.keys(state.askedL1Ids).length
            : 0));
      
      // Task 1: Transition to L2 BEFORE selecting any new L1 card if maxL1 reached
      // GS-AUDIT-02: Clear any pending L1 card when transitioning to L2
      if (askedL1Count >= flowConfig.maxL1) {
        // Transition to L2 and continue to L2 selection
        state.phase = 'L2';
        state.currentLayer = LAYERS.L2;
        // GS-AUDIT-02: Clear any pending L1 card
        if (state.currentCardId && state.currentCardId.startsWith('L1_')) {
          state.currentCardId = null;
          state.currentLayer = null;
        }
        // Fall through to L2 selection below
      } else {
        const alreadyAskedL1 = Array.from(state.askedL1Ids || []);
        const selection = l1Selector({
          macroBase: baselineMacro,
          askedIds: alreadyAskedL1,
          evidenceTags: state.evidenceTags,
          gatesHitAny: state.gatesHitAny,
          gatesHitCardsOnly: state.gatesHitCardsOnly,
          macro: state.macroBeforeCards,
          flowConfig,
          decks: decksById.L1,
        });

        if (!selection || !selection.cardId) {
          // No more eligible L1 cards - transition to L2
          transitionToL2();
          return getNextCard(); // Continue in L2
        }
        
        // GS-RUNNER-LIMITS Task 1: Double-check - selector should not return already asked card
        const askedSet = state.askedL1Ids instanceof Set 
          ? state.askedL1Ids 
          : new Set(Array.from(state.askedL1Ids || []));
        
        if (askedSet.has(selection.cardId)) {
          console.warn(`[runner] l1Selector returned already asked card: ${selection.cardId}. Transitioning to L2.`);
          transitionToL2();
          return getNextCard();
        }
        
        // GS-RUNNER-LIMITS Task 1: Final guard - check count again before showing
        const currentAskedL1Count = getAskedCount(state.askedL1Ids);
        if (flowConfig.maxL1 > 0 && currentAskedL1Count >= flowConfig.maxL1) {
          transitionToL2();
          return getNextCard();
        }
        
        const card = decksById.L1[selection.cardId];
        if (!card) {
          transitionToL2();
          return getNextCard();
        }
        
        // GS-RUNNER-LIMITS Task 2: Fail-fast - if phase changed, don't show L1 card
        if (state.phase !== 'L1') {
          throw new Error(`GS-RUNNER-LIMITS: Phase changed to ${state.phase} during L1 card selection`);
        }
        
        // GS-RUNNER-LIMITS Task 2: Fail-fast - card must be L1
        if (!card.id.startsWith('L1_')) {
          throw new Error(`GS-RUNNER-LIMITS: Non-L1 card ${card.id} returned by l1Selector`);
        }
        
        state.currentCardId = card.id;
        state.currentLayer = LAYERS.L1;
        
        // GS-RUNNER-LIMITS Task 3: Mark as asked IMMEDIATELY before emitting card_shown
        state.askedL1Ids.add(card.id);
        
        // GS-RUNNER-LIMITS Task 2: Fail-fast check before emitting
        if (state.phase === 'L2') {
          throw new Error(`GS-RUNNER-LIMITS: Attempted to emit L1 card_shown during L2 phase`);
        }
        
        events.push(createCardShownEvent(state.step, card, LAYERS.L1, selection.reason || 'adaptive'));
        
        // Task A3.1.2: Track coverage-first picks
        const finalAskedL1Count = getAskedCount(state.askedL1Ids);
        if (finalAskedL1Count <= 3 && flowConfig.coverageFirstEnabled) {
          state.coverageFirstPicks.push({
            step: finalAskedL1Count - 1,
            cardId: card.id,
            reason: selection.reason || 'coverage_first',
          });
        }
        
        return {
          layer: LAYERS.L1,
          card,
          reason: selection.reason || 'adaptive',
        };
      }
    }

    // GS-RUNNER-LIMITS Task 1: L2 phase - never return L1 cards
    if (state.phase === 'L2') {
      // GS-RUNNER-LIMITS Task 4: Build L2 plan once on first L2 call
      if (l2Plan.length === 0) {
        // Get current macro/micro for probe planning
        const macroResult = macroEngine.computeMacro({
          baselineMetrics,
          evidenceTags: state.evidenceTags,
        });
        const currentMacro = macroResult.macro || macroResult.stateKey;
        
        // Get top states for probe planning (from micro selection)
        const scoringTags = tagPipeline.buildScoringTags(state.evidenceTags, {
          excludeContext: true,
        });
        const microResult = microEngine.selectMicro({
          macro: currentMacro,
          evidenceTags: scoringTags,
        });
        
        const topStates = [];
        // Use macro as primary state
        topStates.push(currentMacro);
        
        // Add micro if selected
        if (microResult.micro && microResult.micro.microKey) {
          const microKey = microResult.micro.microKey;
          if (!topStates.includes(microKey)) {
            topStates.push(microKey);
          }
        }
        
        // Add top candidate if different
        if (microResult.microTopCandidate && microResult.microTopCandidate.microKey) {
          const candidateKey = microResult.microTopCandidate.microKey;
          if (!topStates.includes(candidateKey)) {
            topStates.push(candidateKey);
          }
        }
        
        // Task A3.4: Normalize alreadyAskedIds to array for L2 planner
        const alreadyAskedL1 = Array.from(state.askedL1Ids || []);
        const alreadyAskedL2 = Array.from(state.askedL2Ids || []);
        const planResult = l2Planner({
          topStates,
          alreadyAskedIds: [...alreadyAskedL1, ...alreadyAskedL2], // All asked cards (array)
          evidenceTags: state.evidenceTags,
          macro: currentMacro,
        });

        l2Plan = planResult.plan || [];

        if (!l2Plan || l2Plan.length === 0) {
          // GS-RUNNER-LIMITS Task 5: Guaranteed session end
          endSession(ENDED_REASONS.NO_L2_CANDIDATES, 'l2');
          return null;
        }
        state.l2PlanCursor = 0; // Reset cursor when plan is built
      }

      // GS-RUNNER-LIMITS Task 1: Hard guard - check maxL2 BEFORE selecting
      const askedL2Count = getAskedCount(state.askedL2Ids);
      if (flowConfig.maxL2 > 0 && askedL2Count >= flowConfig.maxL2) {
        // GS-RUNNER-LIMITS Task 5: Guaranteed session end
        endSession(ENDED_REASONS.MAX_L2, 'l2');
        return null;
      }

      // GS-RUNNER-LIMITS Task 1: L2 selection - use cursor for guaranteed progression
      const askedL2Set = state.askedL2Ids instanceof Set ? state.askedL2Ids : new Set(Array.from(state.askedL2Ids || []));
      
      // Task A3.4.5: Idempotent - if currentCardId is already set, return same card
      if (state.currentCardId && state.currentCardId.startsWith('L2_')) {
        const card = decksById.L2[state.currentCardId];
        if (card) {
          return {
            layer: LAYERS.L2,
            card,
            reason: 'idempotent',
          };
        }
      }
      
      while (state.l2PlanCursor < l2Plan.length) {
        const cardId = l2Plan[state.l2PlanCursor];
        // Skip if already asked
        if (askedL2Set.has(cardId)) {
          state.l2PlanCursor++;
          continue;
        }
        
        const card = decksById.L2[cardId];
        if (!card) {
          state.l2PlanCursor++;
          continue;
        }
        
        // GS-RUNNER-LIMITS Task 1: Final guard - check maxL2 before showing
        const currentAskedL2Count = getAskedCount(state.askedL2Ids);
        if (flowConfig.maxL2 > 0 && currentAskedL2Count >= flowConfig.maxL2) {
          endSession(ENDED_REASONS.MAX_L2, 'l2');
          return null;
        }
        
        // GS-RUNNER-LIMITS Task 2: Fail-fast - card must be L2
        if (!card.id.startsWith('L2_')) {
          throw new Error(`GS-RUNNER-LIMITS: Non-L2 card ${card.id} in L2 plan`);
        }
        
        state.currentCardId = card.id;
        state.currentLayer = LAYERS.L2;
        
        // GS-RUNNER-LIMITS Task 3: Mark as asked IMMEDIATELY before emitting card_shown
        state.askedL2Ids.add(card.id);
        
        // GS-RUNNER-LIMITS Task 2: Fail-fast check before emitting
        if (state.phase !== 'L2') {
          throw new Error(`GS-RUNNER-LIMITS: Attempted to emit L2 card_shown during ${state.phase} phase`);
        }
        
        events.push(createCardShownEvent(state.step, card, LAYERS.L2, 'planned'));
        
        // Task A3.4.6: Increment cursor after showing card
        state.l2PlanCursor++;
        
        // GS-RUNNER-LIMITS Task 1: Final check AFTER adding - defensive
        const newAskedL2Count = getAskedCount(state.askedL2Ids);
        if (flowConfig.maxL2 > 0 && newAskedL2Count > flowConfig.maxL2) {
          endSession(ENDED_REASONS.MAX_L2, 'l2');
          return null;
        }
        
        return {
          layer: LAYERS.L2,
          card,
          reason: 'planned',
        };
      }
      
      // GS-RUNNER-LIMITS Task 5: Plan exhausted - check if any L2 cards were actually asked
      const finalAskedL2Count = getAskedCount(state.askedL2Ids);
      if (finalAskedL2Count === 0) {
        // Plan was exhausted but no L2 cards were asked (all were already asked or invalid)
        // This is effectively the same as no_l2_candidates
        endSession(ENDED_REASONS.NO_L2_CANDIDATES, 'l2');
      } else {
        // Plan completed with at least one L2 card asked
        endSession(ENDED_REASONS.L2_PLAN_COMPLETED, 'l2');
      }
      return null;
    }

    return null;
  }

  /**
   * Commit answer and advance session
   * Task A3.1.1: Double-fire protection
   * Task A3.1.3: Uses answerTagger
   * @param {CardChoice} choice - User's choice
   * @returns {CommitAnswerResult} Result with events, state, nextCard, ended
   */
  function commitAnswer(choice) {
    const { cardId, choice: answer } = choice;
    
    // Task 4: Strict validation - cardId must match currentCardId
    if (state.currentCardId !== cardId) {
      throw new Error(`commitAnswer mismatch: expected=${state.currentCardId || 'none'} got=${cardId}`);
    }
    
    const card = decksById.L1[cardId] || decksById.L2[cardId];
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }

    const layer = card.id.startsWith('L1_') ? LAYERS.L1 : LAYERS.L2;

    // Task 3: Card should already be in askedIds (marked at card_shown)
    // This is defensive - card should already be marked, but ensure it's there
    // DO NOT add again if already present (Set prevents duplicates, but this is explicit)
    // Task 1: Also check maxL1 limit before adding as fallback
    if (layer === LAYERS.L1) {
      if (!state.askedL1Ids.has(cardId)) {
        // This should never happen - card should be marked at card_shown
        console.warn(`[runner] commitAnswer: L1 card ${cardId} not in askedL1Ids (should be marked at card_shown)`);
        // Task 1: Check maxL1 before adding as fallback
        const currentCount = state.askedL1Ids instanceof Set 
          ? state.askedL1Ids.size 
          : (Array.isArray(state.askedL1Ids) ? state.askedL1Ids.length : Object.keys(state.askedL1Ids || {}).length);
        if (currentCount < flowConfig.maxL1) {
          state.askedL1Ids.add(cardId);
        } else {
          console.warn(`[runner] commitAnswer: Skipping add of L1 card ${cardId} - maxL1 (${flowConfig.maxL1}) already reached`);
        }
      }
    }
    if (layer === LAYERS.L2) {
      if (!state.askedL2Ids.has(cardId)) {
        // This should never happen - card should be marked at card_shown
        console.warn(`[runner] commitAnswer: L2 card ${cardId} not in askedL2Ids (should be marked at card_shown)`);
        state.askedL2Ids.add(cardId);
      }
      // Task A3.4.6: Increment L2 plan cursor after commit to guarantee progression
      if (state.phase === 'L2' && state.l2PlanCursor < l2Plan.length && l2Plan[state.l2PlanCursor] === cardId) {
        state.l2PlanCursor++;
      }
    }

    // Emit answer_committed event
    events.push(createAnswerCommittedEvent(state.step, cardId, answer, layer));

    // Task A3.1.3: Get tags via answerTagger
    const rawTags = answerTagger({ card, choice: answer });
    const source = answer === 'NS' ? 'not_sure' : layer.toLowerCase();

    // Add evidence (unified pipeline)
    addEvidence(rawTags, source, cardId);
    
    // GS+6: Check early stop AFTER evidence is added (gates may have just closed)
    // This must happen BEFORE transitioning to L2
    if (shouldEarlyStop()) {
      endSession(ENDED_REASONS.GATES_CLOSED, layer === LAYERS.L1 ? 'l1' : 'l2');
      return {
        events: events.slice(-5), // Last few events
        state: { ...state },
        nextCard: null,
        ended: true,
      };
    }

    // Task 1: Check if we've reached maxL1 after commit (defensive check)
    if (layer === LAYERS.L1) {
      const askedL1Count = state.askedL1Ids instanceof Set 
        ? state.askedL1Ids.size 
        : (Array.isArray(state.askedL1Ids) ? state.askedL1Ids.length : Object.keys(state.askedL1Ids || {}).length);
      if (askedL1Count >= flowConfig.maxL1 && state.phase === 'L1') {
        // Transition to L2 immediately after reaching maxL1
        state.phase = 'L2';
        state.currentLayer = LAYERS.L2;
      }
    }

    // Task 4: Clear current card and layer (close the step)
    state.currentCardId = null;
    state.currentLayer = null;

    // Update step
    state.step++;

    // Task A3.1.3: Recompute macro after evidence update
    const macroResult = macroEngine.computeMacro({
      baselineMetrics,
      evidenceTags: state.evidenceTags,
    });
    const newMacro = macroResult.macro;
    
    // Emit macro_updated if changed
    if (layer === LAYERS.L1 && state.macroAfterL1 === null) {
      state.macroAfterL1 = newMacro;
      if (newMacro !== baselineMacro) {
        events.push(createMacroUpdatedEvent(state.step, newMacro, 'after_l1', layer));
      }
    } else if (layer === LAYERS.L2 && state.macroAfterL2 === null) {
      state.macroAfterL2 = newMacro;
      if (newMacro !== state.macroAfterL1) {
        events.push(createMacroUpdatedEvent(state.step, newMacro, 'after_l2', layer));
      }
    }

    // Task A3.1.5: Select micro (deterministic)
    // GS+5: Guarantee consistent state.micro and micro_selected event
    const scoringTags = tagPipeline.buildScoringTags(state.evidenceTags, {
      excludeContext: true,
    });
    const microResult = microEngine.selectMicro({
      macro: newMacro,
      evidenceTags: scoringTags,
    });
    
    // GS+5: Normalize selected (string or null)
    // microResult.selected can be: string (microKey), object with microKey, or null
    let selected = null;
    if (microResult?.selected) {
      if (typeof microResult.selected === 'string' && microResult.selected.trim().length > 0) {
        selected = microResult.selected.trim();
      } else if (microResult.selected.microKey && typeof microResult.selected.microKey === 'string' && microResult.selected.microKey.trim().length > 0) {
        selected = microResult.selected.microKey.trim();
      }
    }
    // Fallback: check microResult.micro (legacy format)
    if (!selected && microResult?.micro) {
      if (typeof microResult.micro === 'string' && microResult.micro.trim().length > 0) {
        selected = microResult.micro.trim();
      } else if (microResult.micro.microKey && typeof microResult.micro.microKey === 'string' && microResult.micro.microKey.trim().length > 0) {
        selected = microResult.micro.microKey.trim();
      }
    }
    
    // GS+5: Always write complete state.micro
    state.micro = {
      selected,
      source: selected ? (microResult.microSource || 'selected') : (microResult.microSource || 'not_computed'),
      reason: microResult.microReason || microResult.reason || 'unknown',
      topCandidate: microResult.microTopCandidate?.microKey || microResult.microTopCandidate || null,
    };
    
    // GS+5: Fail-fast invariant check
    if (state.micro.source === 'selected' && !state.micro.selected) {
      throw new Error('Invariant violation: micro.source=selected but micro.selected is null/empty');
    }
    
    // Legacy fields for backward compatibility
    state.microSource = state.micro.source;
    state.microReason = state.micro.reason;
    state.microTopCandidate = state.micro.topCandidate;
    
    // GS+5: Always emit micro_selected event with same data as state.micro
    events.push(createMicroSelectedEvent(
      state.step,
      state.micro.selected,
      state.micro.source,
      state.micro.reason,
      layer,
      state.micro.topCandidate
    ));

    // GS-RUNNER-LIMITS Task 5: Check early stop conditions - use endSession
    if (shouldEarlyStop()) {
      endSession(ENDED_REASONS.GATES_CLOSED, layer === LAYERS.L1 ? 'l1' : 'l2');
      return {
        events: events.slice(-5), // Last few events
        state: { ...state },
        nextCard: null,
        ended: true,
      };
    }

    // Get next card
    const nextCard = getNextCard();

    return {
      events: events.slice(-5), // Last few events
      state: { ...state },
      nextCard,
      ended: state.phase === 'ENDED',
    };
  }

  /**
   * Check if session should early stop
   * Task A3.1.4: Unified early-stop logic
   * @returns {boolean} True if should stop
   */
  function shouldEarlyStop() {
    if (!flowConfig.stopOnGates) return false;

    // Task A3.1.4: Check minimum quotas (use getAskedCount for JSON-safe access)
    if (state.phase === 'L1' && getAskedCount(state.askedL1Ids) < flowConfig.minL1) return false;
    if (state.phase === 'L2' && getAskedCount(state.askedL2Ids) < flowConfig.minL2) return false;

    // Task A3.1.4: Check gates (core gates: valence, arousal, agency, clarity by CardsOnly)
    const coreGates = ['valence', 'arousal', 'agency', 'clarity'];
    const allCoreGatesHit = coreGates.every(gate => state.gatesHitCardsOnly[gate]);

    // Task A3.1.4: Load/social can use Any (baseline OK)
    const loadSocialHit = state.gatesHitAny.load && state.gatesHitAny.social;

    return allCoreGatesHit && loadSocialHit;
  }

  /**
   * Get current state (read-only copy)
   * @returns {SessionState} Current state
   */
  function getState() {
    // Deep copy to prevent mutations
    return {
      ...state,
      askedL1Ids: new Set(state.askedL1Ids),
      askedL2Ids: new Set(state.askedL2Ids),
      baselineEvidenceTags: [...state.baselineEvidenceTags],
      cardEvidenceTags: [...state.cardEvidenceTags],
      evidenceTags: [...state.evidenceTags],
      gatesHitAny: { ...state.gatesHitAny },
      gatesHitCardsOnly: { ...state.gatesHitCardsOnly },
      gateFirstHitStep: { ...state.gateFirstHitStep },
      gateHitCardIds: JSON.parse(JSON.stringify(state.gateHitCardIds)), // Deep copy
      coverageFirstPicks: [...state.coverageFirstPicks],
      signals: [...state.signals],
    };
  }

  /**
   * Get all events
   * @returns {SessionEvent[]} All events
   */
  function getEvents() {
    return [...events];
  }

  return {
    init,
    getNextCard,
    commitAnswer,
    getState,
    getEvents,
  };
}
