// simulateDeepRealistic.js (Task A3.2.0)
// TASK 14.2: Refactored to use adapter (same harness as Golden Sessions)
// Comments in English only.

import { createDeepSessionRunner, createFlowConfig, normalizeEndedReason } from '../src/domain/deepSession/index.js';
import { buildRunnerDeps } from './goldenSessions/wireDeps.js';
import { sampleAnswer } from './profiles.js';

// TASK 14.2: Uses wireDeps.js (same as Golden Sessions) for consistency

/**
 * Simulate a realistic deep flow session using adapter (TASK 14.2)
 * Uses the same harness as Golden Sessions (adapter + wireDeps)
 * @param {Object} params
 * @param {string} params.baselineMacro - Starting macro from baseline (legacy, not used by adapter)
 * @param {Object} params.baselineMetrics - Baseline metrics object
 * @param {Function} params.rng - Random number generator object with random() method
 * @param {Object} params.config - Config object with maxL1, maxL2, stopOnGates, profile, notSureRate
 * @param {Array} params.L1_CARDS - Array of L1 card objects
 * @param {Object} params.L1_CARDS_BY_ID - Map of L1 card ID -> card object
 * @param {Array} params.L2_CARDS - Array of L2 card objects
 * @param {Object} params.L2_CARDS_BY_ID - Map of L2 card ID -> card object
 * @returns {Promise<Object>} { responses, stepsTaken, askedCardIds, session, state, events }
 */
export async function simulateDeepRealisticSession({
  baselineMacro, // Legacy param, not used (adapter computes from baselineMetrics)
  baselineMetrics,
  rng,
  config,
  L1_CARDS,
  L1_CARDS_BY_ID,
  L2_CARDS,
  L2_CARDS_BY_ID,
}) {
  // TASK 14.2: Build flow config (same as Golden Sessions)
  const flowConfigObj = {
    maxL1: config.maxL1 || 6,
    maxL2: config.maxL2 || 6,
    minL1: config.minL1 || 3,
    minL2: config.minL2 || 2,
    stopOnGates: config.stopOnGates !== false,
    notSureRate: config.notSureRate || 0.25,
    profile: config.profile || 'mix',
  };
  
  // TASK 14.2: Use wireDeps.js (same harness as Golden Sessions)
  const seed = config.seed || Date.now();
  const rngFn = () => rng.random();
  const deps = buildRunnerDeps(rngFn, { tags: [] }); // No fixture tags in mass runs
  deps.flowConfig = createFlowConfig(flowConfigObj);
  
  // TASK 14.2: Create runner (same as Golden Sessions)
  const runner = createDeepSessionRunner(deps);
  runner.init(baselineMetrics, []); // No fixture tags
  
  // TASK 14.2: Main simulation loop using runner (same as Golden Sessions)
  const responses = [];
  const askedCardIds = [];
  
  while (true) {
    const next = runner.getNextCard();
    if (!next) break;
    
    const { card } = next;
    
    // Sample user answer based on notSureRate and profile
    let choice;
    const notSureRoll = rng.random();
    if (notSureRoll < flowConfigObj.notSureRate) {
      choice = 'NS';
    } else {
      // Use sampleAnswer for profile-based selection
      choice = sampleAnswer(card, flowConfigObj.profile, rngFn, config.smokeCalibPath);
    }
    
    // Commit answer
    try {
      const result = runner.commitAnswer({
        cardId: card.id,
        choice,
      });
      
      // Track response
      const option = choice === 'A' ? card.options[0] : choice === 'B' ? card.options[1] : null;
      responses.push({
        id: card.id,
        selectedKey: choice,
        selectedLabel: option?.label || 'Not sure',
        selectedTags: option?.tags || [],
        answer: choice,
        isNotSure: choice === 'NS',
        group: card.id.startsWith('L1_') ? 'l1' : card.id.startsWith('L2_') ? 'l2' : 'unknown',
      });
      
      askedCardIds.push(card.id);
      
      if (result.ended) {
        break;
      }
    } catch (e) {
      // Soft-ignore double-fire errors
      if (e.message.includes('Cannot commit answer')) {
        console.warn(`[simulateDeepRealistic] Double-fire detected for card ${card.id}, skipping`);
        continue;
      }
      throw e;
    }
  }
  
  // TASK 14.2: Get final state and events from runner (same as Golden Sessions)
  const state = runner.getState();
  const events = runner.getEvents();
  
  // Normalize endedReason
  const normalizedEndedReason = normalizeEndedReason(state.endedReason);
  
  // Build backward-compatible session object
  const sessionData = {
    askedL1Ids: Array.from(state.askedL1Ids || []),
    askedL2Ids: Array.from(state.askedL2Ids || []),
    evidenceTags: state.evidenceTags || [],
    baselineEvidenceTags: state.baselineEvidenceTags || [],
    cardEvidenceTags: state.cardEvidenceTags || [],
    evidenceTagEvents: events.filter(e => e.type === 'evidence_added').map(e => ({
      tag: e.payload?.tags?.[0] || e.tags?.[0] || null,
      source: e.payload?.source || 'card',
      cardId: e.cardId || e.payload?.cardId || null,
    })),
    signals: state.signals || [],
    gateState: {
      agency: state.gatesHitCardsOnly?.agency || false,
      clarity: state.gatesHitCardsOnly?.clarity || false,
      load: state.gatesHitAny?.load || false,
      social: state.gatesHitAny?.social || false,
    },
    gateFirstHitStep: state.gateFirstHitStep || null,
    gateHitCardIds: state.gateHitCardIds || [],
    coverageFirstPicks: state.coverageFirstPicks || [],
    endedBy: state.endedBy || 'unknown',
    endedReason: normalizedEndedReason,
    microSource: state.microSource || null,
    microReason: state.microReason || null,
    microTopCandidate: state.microTopCandidate || null,
  };
  
  return {
    responses,
    stepsTaken: state.askedL1Count + state.askedL2Count,
    askedCardIds,
    session: sessionData,
    // TASK 14.2: Expose state and events for analysis
    state,
    events,
  };
}
