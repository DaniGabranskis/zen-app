// src/domain/deepSession/events.js
// Task A3.0: Event creation utilities
// Comments in English only.

import { EVENT_TYPES, LAYERS } from './types.js';

/**
 * Create a session event
 * @param {string} type - Event type
 * @param {number} step - Step number
 * @param {Object} payload - Event payload
 * @param {string} [layer] - Layer (L1, L2, BASELINE)
 * @param {string} [cardId] - Card ID
 * @returns {SessionEvent} Event object
 */
export function createEvent(type, step, payload = {}, layer = null, cardId = null) {
  return {
    type,
    step,
    layer,
    cardId,
    payload,
    ts: Date.now(), // Optional timestamp
  };
}

/**
 * Create session_start event
 */
export function createSessionStartEvent(step, baselineMetrics) {
  return createEvent(EVENT_TYPES.SESSION_START, step, {
    baselineMetrics,
  });
}

/**
 * Create baseline_injected event
 */
export function createBaselineInjectedEvent(step, tags) {
  return createEvent(EVENT_TYPES.BASELINE_INJECTED, step, {
    tags,
    count: tags.length,
  }, LAYERS.BASELINE);
}

/**
 * Create card_shown event
 */
export function createCardShownEvent(step, card, layer, reason) {
  return createEvent(EVENT_TYPES.CARD_SHOWN, step, {
    cardId: card.id,
    cardTitle: card.title,
    cardType: card.type,
    reason,
  }, layer, card.id);
}

/**
 * Create answer_committed event
 */
export function createAnswerCommittedEvent(step, cardId, choice, layer) {
  return createEvent(EVENT_TYPES.ANSWER_COMMITTED, step, {
    choice,
  }, layer, cardId);
}

/**
 * Create evidence_added event
 */
export function createEvidenceAddedEvent(step, tags, source, cardId = null) {
  return createEvent(EVENT_TYPES.EVIDENCE_ADDED, step, {
    tags,
    source, // 'baseline', 'l1', 'l2', 'not_sure'
    count: tags.length,
  }, source === 'baseline' ? LAYERS.BASELINE : (source === 'l1' ? LAYERS.L1 : LAYERS.L2), cardId);
}

/**
 * Create gate_hit event
 * @param {number} step - Step number
 * @param {string} gateName - Gate name (valence, arousal, agency, clarity, social, load)
 * @param {string} layer - Layer (BASELINE, L1, L2)
 * @param {string|null} cardId - Card ID (if applicable)
 * @param {string} scope - Scope: 'any' (baseline + cards) or 'cardsOnly' (cards only)
 */
export function createGateHitEvent(step, gateName, layer, cardId = null, scope = 'any') {
  return createEvent(EVENT_TYPES.GATE_HIT, step, {
    gateName,
    scope, // 'cardsOnly' | 'any'
  }, layer, cardId);
}

/**
 * Create macro_updated event
 */
export function createMacroUpdatedEvent(step, macro, reason, layer) {
  return createEvent(EVENT_TYPES.MACRO_UPDATED, step, {
    macro,
    reason,
  }, layer);
}

/**
 * Create micro_selected event
 */
export function createMicroSelectedEvent(step, selected, source, reason, layer, topCandidate = null) {
  return createEvent(EVENT_TYPES.MICRO_SELECTED, step, {
    selected,
    source,
    reason,
    topCandidate,
  }, layer);
}

/**
 * Create expected_macro_computed event
 * GS-MEANING-16: Signal quality computation event
 */
export function createExpectedMacroComputedEvent(step, signalQuality) {
  return createEvent(EVENT_TYPES.EXPECTED_MACRO_COMPUTED, step, {
    expectedMacro: signalQuality.expectedMacro,
    signalScore: signalQuality.signalScore,
    scoringTagCount: signalQuality.scoringTagCount,
    topSignals: signalQuality.topSignals,
  });
}

/**
 * Create session_end event
 */
export function createSessionEndEvent(step, endedBy, endedReason, finalState) {
  // Handle Set/Array/Object safely for askedL1Ids/askedL2Ids
  const getCount = (x) => {
    if (!x) return 0;
    if (Array.isArray(x)) return x.length;
    if (x instanceof Set) return x.size;
    if (typeof x === 'object') return Object.keys(x).length;
    return 0;
  };
  
  return createEvent(EVENT_TYPES.SESSION_END, step, {
    endedBy,
    endedReason,
    askedL1Count: getCount(finalState.askedL1Ids),
    askedL2Count: getCount(finalState.askedL2Ids),
    evidenceTagsCount: Array.isArray(finalState.evidenceTags) ? finalState.evidenceTags.length : 0,
    gatesHitCount: Object.values(finalState.gatesHitAny || {}).filter(Boolean).length,
  });
}
