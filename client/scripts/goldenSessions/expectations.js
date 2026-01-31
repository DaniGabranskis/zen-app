// client/scripts/goldenSessions/expectations.js
// Task A3.4: Expectations for Golden Sessions fixtures
// Comments in English only.

/**
 * Get expectations for a fixture
 * @param {Object} fixture - Fixture object
 * @returns {Object} Expectations object
 */
export function getFixtureExpectations(fixture) {
  const id = fixture.id;
  const maxL1 = fixture.flowConfigOverrides?.maxL1 || 5;
  const maxL2 = fixture.flowConfigOverrides?.maxL2 || 5;
  
  // Base expectations (apply to all realistic fixtures)
  const base = {
    endedReason: null, // null = any valid reason except max_steps_reached
    askedL1Count: { max: maxL1 },
    askedL2Count: { max: maxL2 },
    noDuplicateCardShownPerStep: true,
    microSelectedNotNull: false, // Optional for now
  };
  
  // Fixture-specific expectations
  const specific = {
    GS01: { endedReason: ['gates_closed', 'l2_plan_completed', 'max_l2'] },
    GS02: { endedReason: ['gates_closed', 'l2_plan_completed', 'max_l2'] },
    GS03: { endedReason: ['gates_closed', 'l2_plan_completed', 'max_l2', 'no_l2_candidates'] }, // May have empty plan
    GS04: { endedReason: ['gates_closed', 'l2_plan_completed', 'max_l2', 'no_l2_candidates'] }, // May have empty plan
    GS05: { endedReason: ['gates_closed', 'l2_plan_completed', 'max_l2'] },
    GS06: { endedReason: ['no_l2_candidates', 'max_l2', 'l2_plan_completed'] }, // Edge case
    GS07: { endedReason: ['l2_plan_completed'] }, // Edge case
    GS08: { endedReason: ['max_l2', 'l2_plan_completed', 'no_l2_candidates'] }, // Edge case, may have empty plan
    GS09: { endedReason: ['gates_closed', 'l2_plan_completed', 'max_l2'] },
    GS10: { endedReason: ['gates_closed', 'l2_plan_completed', 'max_l2', 'max_steps_reached'] }, // Low signal may hit max_steps
    GS11: { endedReason: ['gates_closed'] }, // GS+6: Must always end with gates_closed
    GS12: { endedReason: ['max_l2'] }, // GS+6: Must always end with max_l2
    GS13: { endedReason: ['gates_closed', 'l2_plan_completed', 'max_l2'], microSelectedNotNull: true }, // GS+5: micro.selected must not be null (strict)
    GS14: { endedReason: ['gates_closed', 'l2_plan_completed', 'max_l2'], microSelectedNotNull: true }, // GS+5: micro.selected must not be null (strict)
    GS15: { endedReason: ['gates_closed', 'l2_plan_completed', 'max_l2'] }, // GS-MEANING-02: Intentional contradiction test
  };
  
  const spec = specific[id] || {};
  return {
    ...base,
    ...spec,
  };
}

/**
 * Validate expectations against projection
 * @param {Object} projection - Stable projection
 * @param {Object} expectations - Expectations
 * @param {string} id - Fixture ID
 * @returns {Array<string>} Array of error messages (empty if all pass)
 */
/**
 * GS-AUDIT-01: Derive counts from events
 * @param {Array} events - Array of events
 * @returns {Object} Derived counts
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

export function validateExpectations(projection, expectations, id) {
  const errors = [];
  const final = projection.final || {};
  const events = projection.events || [];
  const config = projection.config || {};
  
  // GS-AUDIT-01: Derive counts from events and verify against final
  const derived = deriveCountsFromEvents(events);
  
  if (final.askedL1Count !== derived.askedL1Count) {
    errors.push(`${id}: askedL1Count mismatch: final=${final.askedL1Count}, derived from events=${derived.askedL1Count}`);
  }
  
  if (final.askedL2Count !== derived.askedL2Count) {
    errors.push(`${id}: askedL2Count mismatch: final=${final.askedL2Count}, derived from events=${derived.askedL2Count}`);
  }
  
  if (final.notSureCount !== derived.notSureCount) {
    errors.push(`${id}: notSureCount mismatch: final=${final.notSureCount}, derived from events=${derived.notSureCount}`);
  }
  
  // GS-AUDIT-02: Invariants on limits
  if (derived.askedL1Count > (config.maxL1 || 5)) {
    errors.push(`${id}: derivedAskedL1Count (${derived.askedL1Count}) exceeds maxL1 (${config.maxL1 || 5})`);
  }
  
  if (derived.askedL2Count > (config.maxL2 || 5)) {
    errors.push(`${id}: derivedAskedL2Count (${derived.askedL2Count}) exceeds maxL2 (${config.maxL2 || 5})`);
  }
  
  // GS-AUDIT-02: After first L2 card, no L1 cards should appear
  let firstL2Step = null;
  let lastL1Step = null;
  for (const e of events) {
    if (!e || e.type !== 'card_shown') continue;
    const cardId = e.cardId || e.payload?.cardId;
    const step = e.step ?? 0;
    if (cardId && cardId.startsWith('L2_')) {
      if (firstL2Step === null) firstL2Step = step;
    }
    if (cardId && cardId.startsWith('L1_')) {
      lastL1Step = step;
    }
  }
  if (firstL2Step !== null && lastL1Step !== null && lastL1Step > firstL2Step) {
    errors.push(`${id}: L1 card shown after first L2 card (L2 at step ${firstL2Step}, L1 at step ${lastL1Step})`);
  }
  
  // GS-AUDIT-02: If endedReason === "l2_plan_completed", must have askedL2Count > 0
  // If plan was empty (askedL2Count=0), endedReason should be "no_l2_candidates", not "l2_plan_completed"
  if (final.endedReason === 'l2_plan_completed' && derived.askedL2Count === 0) {
    // This is a logic error: plan was empty, so it should have ended with no_l2_candidates
    errors.push(`${id}: endedReason=l2_plan_completed but askedL2Count=0 (plan was empty, should be no_l2_candidates)`);
  }
  
  // Check endedReason
  if (expectations.endedReason !== null) {
    const allowed = Array.isArray(expectations.endedReason) 
      ? expectations.endedReason 
      : [expectations.endedReason];
    if (!allowed.includes(final.endedReason)) {
      errors.push(`${id}: endedReason must be one of ${allowed.join(', ')}, got ${final.endedReason}`);
    }
    // For realistic fixtures (GS01-GS05, GS09), max_steps_reached is NOT allowed
    if (!allowed.includes('max_steps_reached') && final.endedReason === 'max_steps_reached') {
      errors.push(`${id}: endedReason must NOT be max_steps_reached for realistic fixture`);
    }
  }
  
  // Check askedL1Count
  if (expectations.askedL1Count?.max !== undefined) {
    if (final.askedL1Count > expectations.askedL1Count.max) {
      errors.push(`${id}: askedL1Count (${final.askedL1Count}) exceeds max (${expectations.askedL1Count.max})`);
    }
  }
  
  // Check askedL2Count
  if (expectations.askedL2Count?.max !== undefined) {
    if (final.askedL2Count > expectations.askedL2Count.max) {
      errors.push(`${id}: askedL2Count (${final.askedL2Count}) exceeds max (${expectations.askedL2Count.max})`);
    }
  }
  
  // Check no duplicate card_shown per step
  if (expectations.noDuplicateCardShownPerStep) {
    const cardShownByStep = new Map();
    for (const e of events) {
      if (e.type === 'card_shown') {
        const key = `${e.step ?? 'NA'}::${e.cardId ?? 'NA'}`;
        const count = cardShownByStep.get(key) || 0;
        cardShownByStep.set(key, count + 1);
        if (count > 0) {
          errors.push(`${id}: duplicate card_shown for ${key} (count=${count + 1})`);
        }
      }
    }
  }
  
  // GS+2: Check micro selected (required for GS13/GS14)
  if (expectations.microSelectedNotNull) {
    if (!final.micro?.selected || typeof final.micro.selected !== 'string') {
      errors.push(`${id}: micro.selected must be a non-empty string, got ${typeof final.micro.selected}`);
    }
    if (final.micro?.source !== 'selected') {
      errors.push(`${id}: micro.source must be "selected" when microSelectedNotNull=true, got ${final.micro?.source}`);
    }
  }
  
  // GS-AUDIT-03: Strict micro invariants
  if (final.micro) {
    // If source === "selected", selected MUST be a non-empty string
    if (final.micro.source === 'selected') {
      if (!final.micro.selected || typeof final.micro.selected !== 'string') {
        errors.push(`${id}: Invariant failed: micro.source=selected but micro.selected is not a string (got ${typeof final.micro.selected})`);
      }
    }
    
    // If selected === null, source MUST be "not_computed"
    if (final.micro.selected === null && final.micro.source !== 'not_computed') {
      errors.push(`${id}: Invariant failed: micro.selected=null but micro.source=${final.micro.source} (must be "not_computed")`);
    }
  }
  
  // GS-FIX-3: GS09 specific - notSureCount > 0
  if (id === 'GS09' && !(final.notSureCount > 0)) {
    errors.push(`${id}: GS09 expects notSureCount > 0, got ${final.notSureCount}`);
  }
  
  // GS11-FIX-04: Strict expectations for GS11
  if (id === 'GS11') {
    // Must end with gates_closed
    if (final.endedReason !== 'gates_closed') {
      errors.push(`${id}: GS11 expected endedReason=gates_closed, got ${final.endedReason}`);
    }
    // If maxL2=0, askedL2Count must be 0
    if (config.maxL2 === 0 && (final.askedL2Count || 0) !== 0) {
      errors.push(`${id}: GS11 expected askedL2Count=0 when maxL2=0, got ${final.askedL2Count}`);
    }
  }
  
  return errors;
}
