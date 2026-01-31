// client/scripts/goldenSessions/stableProjection.js
// Task A3.4.2: Normalize session result to stable, deterministic projection
// Comments in English only.

// GS-HYGIENE-02: Snapshot version to detect when projection format changes
// GS-MEANING-10: Bump to 1.1.0 for signal quality fields and expectedMacro event
// GS-MEANING-16: Bump to 1.2.0 for moving signal quality computation to runner
export const GOLDEN_SNAPSHOT_VERSION = '1.2.0';

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function toArraySafe(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.slice();
  if (v instanceof Set) return Array.from(v);
  if (isPlainObject(v)) return Object.values(v);
  return [];
}

function uniqSorted(arr) {
  const out = Array.from(new Set(arr.filter(Boolean)));
  out.sort();
  return out;
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function normalizeGatesHit(gatesHit) {
  // gatesHit expected shape: { valence: true/false, ... } or array of strings.
  if (!gatesHit) return {};
  if (Array.isArray(gatesHit)) {
    const res = {};
    for (const g of gatesHit) res[g] = true;
    return res;
  }
  if (isPlainObject(gatesHit)) {
    const res = {};
    for (const [k, v] of Object.entries(gatesHit)) res[k] = Boolean(v);
    return res;
  }
  return {};
}

function normalizeMicro(micro) {
  if (!micro) return { selected: null, source: 'not_computed', reason: 'missing', topCandidate: null };

  // Support multiple shapes:
  // { selected, microSource, microReason, microTopCandidate }
  // { selected, source, reason, topCandidate }
  // Or from state directly: state.microSelected, state.microSource, etc.
  const normalized = {
    selected: micro.selected ?? micro.microSelected ?? null,
    source: micro.source ?? micro.microSource ?? null,
    reason: micro.reason ?? micro.microReason ?? null,
    topCandidate: micro.topCandidate ?? micro.microTopCandidate ?? null,
  };
  
  // GS+5: Fail-fast if source === "selected" but selected is null (don't mask runner bugs)
  if (normalized.source === 'selected' && (!normalized.selected || String(normalized.selected).trim() === '')) {
    throw new Error('Snapshot invalid: micro.source=selected but micro.selected empty');
  }
  
  // If no source but we have data, default to not_computed
  if (!normalized.source && (normalized.selected || normalized.reason)) {
    normalized.source = normalized.selected ? 'selected' : 'not_computed';
  }
  
  return normalized;
}

/**
 * GS-AUDIT-01: Derive all counts from events (source of truth)
 * @param {Array} events - Array of events
 * @returns {Object} Derived counts { askedL1Count, askedL2Count, notSureCount }
 */
function deriveCountsFromEvents(events) {
  if (!Array.isArray(events)) {
    return { askedL1Count: 0, askedL2Count: 0, notSureCount: 0 };
  }
  
  const l1CardIds = new Set();
  const l2CardIds = new Set();
  let notSureCount = 0;
  
  for (const e of events) {
    if (!e || !e.type) continue;
    
    // Count unique L1/L2 cards from card_shown events
    if (e.type === 'card_shown') {
      const cardId = e.cardId || e.payload?.cardId;
      if (cardId) {
        if (cardId.startsWith('L1_')) {
          l1CardIds.add(cardId);
        } else if (cardId.startsWith('L2_')) {
          l2CardIds.add(cardId);
        }
      }
    }
    
    // Count not_sure from answer_committed events
    if (e.type === 'answer_committed') {
      const choice = e.choice || e.payload?.choice;
      if (choice === 'NS') {
        notSureCount++;
      }
    }
  }
  
  return {
    askedL1Count: l1CardIds.size,
    askedL2Count: l2CardIds.size,
    notSureCount,
  };
}

/**
 * GS-FIX-1: Derive notSureCount from events if not in state (deprecated, use deriveCountsFromEvents)
 * @param {Array} events - Array of events
 * @returns {number} Count of "NS" choices
 */
function deriveNotSureCount(events) {
  const counts = deriveCountsFromEvents(events);
  return counts.notSureCount;
}

function stableEventDigest(events) {
  // AFTER: keep original order, normalize only payload fields
  // Do NOT reorder events - this preserves sequencing and makes bugs visible
  const list = Array.isArray(events) ? events : [];
  const out = [];

  for (let i = 0; i < list.length; i++) {
    const e = list[i] || {};
    const type = e.type || e.eventType || null;

    // Keep only stable fields. Ignore timestamps, nodeVersion, etc.
    const item = {
      i,
      type,
      step: e.step ?? null,
      cardId: e.cardId ?? e.payload?.cardId ?? null,
      choice: e.choice ?? e.payload?.choice ?? null,
      // evidence_added events may carry tags (sort tags for stability, but keep event order)
      tags: uniqSorted(toArraySafe(e.tags ?? e.payload?.tags)),
      // gate_hit: extract gateName from payload (gateName is the field name in createGateHitEvent)
      gate: e.gate ?? e.payload?.gate ?? e.payload?.gateName ?? null,
      // scope for gate_hit: 'cardsOnly' | 'any' (can be inferred from layer/source)
      scope: e.payload?.scope ?? null,
      macro: e.macro ?? e.payload?.macro ?? null,
      // GS+5: Extract micro fields from payload (selected, source, reason, topCandidate)
      micro: e.micro ?? e.payload?.micro ?? (e.payload?.selected !== undefined ? {
        selected: e.payload.selected ?? null,
        source: e.payload.source ?? null,
        reason: e.payload.reason ?? null,
        topCandidate: e.payload.topCandidate ?? null,
      } : null),
      endedReason: e.endedReason ?? e.payload?.endedReason ?? null,
    };

    // Drop empty arrays to reduce snapshot churn
    if (item.tags.length === 0) delete item.tags;

    // Drop null fields to keep snapshots clean
    if (item.step === null) delete item.step;
    if (item.cardId === null) delete item.cardId;
    if (item.choice === null) delete item.choice;
    if (item.gate === null) delete item.gate;
    if (item.scope === null) delete item.scope;
    if (item.macro === null) delete item.macro;
    if (item.micro === null) delete item.micro;
    if (item.expectedMacro === null) delete item.expectedMacro;
    if (item.signalScore === null) delete item.signalScore;
    if (item.scoringTagCount === null) delete item.scoringTagCount;
    if (item.topSignals === null) delete item.topSignals;
    if (item.endedReason === null) delete item.endedReason;

    out.push(item);
  }

  return out;
}

function stableProjection(run, fixtureMeta = {}) {
  const state = run?.state || {};
  const events = run?.events || [];
  const fixtureTags = fixtureMeta.tags || [];

  // GS-AUDIT-01: Derive counts from events (source of truth)
  // This ensures consistency between events and final counts
  const derived = deriveCountsFromEvents(events);
  
  // Use derived counts as primary, fallback to state if events are empty
  const askedL1Count = events.length > 0 ? derived.askedL1Count : (toArraySafe(state.askedL1Ids).length || state.askedL1Count || 0);
  const askedL2Count = events.length > 0 ? derived.askedL2Count : (toArraySafe(state.askedL2Ids).length || state.askedL2Count || 0);

  const baselineEvidenceTags = uniqSorted(toArraySafe(state.baselineEvidenceTags));
  const cardEvidenceTags = uniqSorted(toArraySafe(state.cardEvidenceTags));
  const evidenceTags = uniqSorted(toArraySafe(state.evidenceTags));

  const micro = normalizeMicro(state.micro || state);
  
  // GS-AUDIT-01: Use derived notSureCount from events (source of truth)
  const notSureCount = derived.notSureCount;

  // Build config from flowConfig and fixture
  // flowConfig may be in state.flowConfig or passed separately in run.flowConfig
  const flowConfig = state.flowConfig || run?.flowConfig || {};
  const config = {
    flow: flowConfig.flow || 'deep-realistic',
    mode: flowConfig.mode || 'noisy-mixed',
    maxL1: flowConfig.maxL1 ?? 5,
    maxL2: flowConfig.maxL2 ?? 5,
    minL1: flowConfig.minL1 ?? 3,
    minL2: flowConfig.minL2 ?? 2,
    stopOnGates: flowConfig.stopOnGates ?? true,
    notSureRate: flowConfig.notSureRate ?? 0.2,
    profile: flowConfig.profile ?? 'mix',
    seed: fixtureMeta.seed ?? null,
    // GS-HYGIENE-02: Snapshot version to detect format changes
    snapshotVersion: GOLDEN_SNAPSHOT_VERSION,
    // GS-HYGIENE-01: Fixture hash will be added by runGoldenSessions.js
  };
  
  // Ensure all required keys are present (validator expects them)
  // Use defaults if still null/undefined
  if (config.maxL1 === null || config.maxL1 === undefined) config.maxL1 = 5;
  if (config.maxL2 === null || config.maxL2 === undefined) config.maxL2 = 5;
  if (config.minL1 === null || config.minL1 === undefined) config.minL1 = 3;
  if (config.minL2 === null || config.minL2 === undefined) config.minL2 = 2;
  if (config.stopOnGates === null || config.stopOnGates === undefined) config.stopOnGates = true;
  if (config.notSureRate === null || config.notSureRate === undefined) config.notSureRate = 0.2;
  if (config.profile === null || config.profile === undefined) config.profile = 'mix';

  const projection = {
    fixture: pick(fixtureMeta, ['id', 'seed']),
    config,
    final: {
      phase: state.phase || null,
      endedReason: state.endedReason || null,
      endedBy: state.endedBy || null,
      askedL1Count,
      askedL2Count,
      notSureCount,

      macroBeforeCards: state.macroBeforeCards ?? null,
      macroAfterL1: state.macroAfterL1 ?? null,
      macroAfterL2: state.macroAfterL2 ?? null,

      micro,

      gatesHitAny: normalizeGatesHit(state.gatesHitAny),
      gatesHitCardsOnly: normalizeGatesHit(state.gatesHitCardsOnly),

      baselineEvidenceTags,
      cardEvidenceTags,
      evidenceTags,
    },

    // Optional deep diagnostics: keep stable summaries only
    coverage: {
      coverageFirstPicks: uniqSorted(toArraySafe(state.coverageFirstPicks)),
      gateFirstHitStep: isPlainObject(state.gateFirstHitStep) ? state.gateFirstHitStep : undefined,
    },

    events: stableEventDigest(events),
  };

  // Remove undefined to keep snapshots clean
  if (!projection.coverage.coverageFirstPicks.length) delete projection.coverage.coverageFirstPicks;
  if (!projection.coverage.gateFirstHitStep) delete projection.coverage.gateFirstHitStep;
  if (Object.keys(projection.coverage).length === 0) delete projection.coverage;

  // GS-MEANING-17: Read signal quality from state (source of truth)
  // Runner computes signal quality in endSession() and stores in state.signalQuality
  const signalQuality = state.signalQuality;
  
  if (!signalQuality) {
    throw new Error(`[GOLDEN] Runner must provide signal quality fields in state.signalQuality. This indicates runner.endSession() did not compute signal quality.`);
  }
  
  // GS-MEANING-17: Copy signal quality fields from state to projection
  projection.final.expectedMacro = signalQuality.expectedMacro;
  projection.final.signalScore = signalQuality.signalScore;
  projection.final.scoringTagCount = signalQuality.scoringTagCount;
  projection.final.axisTagCount = signalQuality.axisTagCount;
  projection.final.eligibleForContradiction = signalQuality.eligibleForContradiction;
  projection.final.topSignals = signalQuality.topSignals;
  projection.final.hasContradiction = signalQuality.hasContradiction;
  
  // GS-MEANING-16: expected_macro_computed event is now emitted by runner, not synthesized here
  // Just normalize it in stableEventDigest if needed

  return projection;
}

export { stableProjection };
