// src/utils/l1CardSelector.js
// Task AK3-DEEP-L1-1: Adaptive L1 card selection based on macroBase and evidence gaps
// Comments in English only.

// Task AK3-DEEP-L1-1d: Minimum steps before early exit
const MIN_STEPS = 4;

// Task AK3-DEEP-GATES-2: Baseline scale constants
const BASELINE_MIN = 1;
const BASELINE_MAX = 9;
const BASELINE_INFORMATIVE_LOW = 3; // Values <= 3 are "low" (informative)
const BASELINE_INFORMATIVE_HIGH = 7; // Values >= 7 are "high" (informative)

// P0.5: DRY - Single source of truth for load gate high signals
// Load gate closes only on high-load signals (not pressure.low)
const LOAD_HIGH_SIGNALS = [
  'sig.context.work.deadline',
  'sig.context.work.overcommit',
  'sig.context.work.pressure.high',
  'l1_pressure_high',
  'L1_PRESSURE_HIGH',
];

// P1: Exact signals for agency gate (replaces prefix 'sig.agency.')
const AGENCY_SIGNALS = [
  'sig.agency.low',
  'sig.agency.high',
  'sig.agency.mid',
  'l1_control_low',
  'l1_control_high',
  'L1_CONTROL_LOW',
  'L1_CONTROL_HIGH',
  'l1_worth_low',  // derives to sig.agency.low
  'l1_worth_high', // derives to sig.agency.high
];

// P1: Exact signals for clarity gate (replaces prefix 'sig.clarity.')
const CLARITY_SIGNALS = [
  'sig.clarity.low',
  'sig.clarity.high',
  'l1_clarity_low',
  'l1_clarity_high',
  'L1_CLARITY_LOW',
  'L1_CLARITY_HIGH',
  'l1_expect_low',  // derives to sig.clarity.low
  'l1_expect_ok',   // derives to sig.clarity.high
  'L1_EXPECT_LOW',
  'L1_EXPECT',
];

// P1: Exact signals for social gate (replaces prefix 'sig.social.')
const SOCIAL_SIGNALS = [
  'sig.social.threat',
  'sig.social.high',
  'sig.social.mid',
  'sig.context.social.support',
  'l1_social_threat',
  'l1_social_support',
  'L1_SOCIAL_THREAT',
  'L1_SOCIAL_SUPPORT',
  'L1_SOCIAL',
];

// P1: hasLoadHighSignal removed - using LOAD_HIGH_SIGNALS directly in signalMap
// (DRY achieved through shared constant, no need for wrapper function)

/**
 * Normalize card structure (AK3-DEEP-L1-1c)
 * Adds defaults for cluster, macroAllow, signals if missing
 */
function normalizeCard(card) {
  if (!card) return null;
  return {
    ...card,
    cluster: card.cluster || 'GENERAL',
    macroAllow: Array.isArray(card.macroAllow) ? card.macroAllow : null,
    signals: Array.isArray(card.signals) ? card.signals : [],
  };
}

/**
 * Pick next L1 card adaptively based on:
 * - macroBase (current macro from baseline)
 * - askedIds (already asked cards)
 * - evidenceTags (collected signals)
 * - quality (needsRefine flag or quality object)
 *
 * Logic:
 * 1. First, close minimum gates (control/agency, clarity/uncertainty, load, social)
 * 2. Then, pick macro-specific cards
 * 3. Never repeat cards
 * 4. Early exit if quality is good and gates are closed (with MIN_STEPS protection)
 *
 * @param {Object} params
 * @param {string} params.macroBase - Current macro from baseline (e.g., 'overloaded', 'exhausted')
 * @param {Set|string[]} params.askedIds - Already asked card IDs
 * @param {string[]} params.evidenceTags - Collected evidence tags (normalized sig.*)
 * @param {boolean|Object} params.quality - Whether result needs refine (false = good quality) or quality object { needsRefine, confidenceBand, clarityFlag }
 * @param {Object} params.cardsById - Map of card ID -> card object
 * @param {number} params.askedCount - Number of already asked cards (for MIN_STEPS check)
 * @returns {{ cardId: string | null, reason: string, gatesState?: Object }} Next card ID and reason, or null if done
 */
export function pickNextL1Card({ macroBase, askedIds = [], evidenceTags = [], quality = true, cardsById = {}, askedCount = 0, baselineMetrics = null, baselineConfidence = null }) {
  const asked = askedIds instanceof Set ? askedIds : new Set(askedIds || []);
  
  // Normalize quality parameter (can be boolean or object)
  const qualityObj = typeof quality === 'object' ? quality : { needsRefine: quality };
  const needsRefine = qualityObj.needsRefine !== false; // Default to true if not specified
  const confidenceBand = qualityObj.confidenceBand || null;
  const clarityFlag = qualityObj.clarityFlag || null;
  
  // Get all L1 cards (filter by id starting with 'L1_') and normalize
  const allL1Cards = Object.values(cardsById)
    .filter(card => card?.id && card.id.startsWith('L1_'))
    .map(normalizeCard)
    .filter(Boolean);
  
  // Task AK3-DEEP-L1-REDUNDANCY-1: Filter out baseline-duplicate cards by default
  const isBaselineAxisCard = (card) => {
    // Map card IDs to baseline axes
    const axisMap = {
      'L1_energy': 'energy',
      'L1_body': 'tension',
      'L1_control': 'control',
      'L1_clarity': 'clarity',
      'L1_social': 'social',
      'L1_mood': 'valence',
    };
    
    const axis = axisMap[card.id];
    if (!axis || !baselineMetrics) return false;
    
    // Task AK3-DEEP-GATES-2: Check if baseline value is informative (not middle/neutral)
    // Informative = value <= BASELINE_INFORMATIVE_LOW (low) or >= BASELINE_INFORMATIVE_HIGH (high) on BASELINE_MIN-BASELINE_MAX scale
    const value = baselineMetrics[axis];
    if (value === undefined) return false;
    
    const isInformative = value <= BASELINE_INFORMATIVE_LOW || value >= BASELINE_INFORMATIVE_HIGH;
    return isInformative;
  };
  
  // Filter cards: skip baseline-axis cards unless conditions are met
  let notAskedL1 = allL1Cards.filter(card => !asked.has(card.id));
  
  // Task AK3-DEEP-L1-REDUNDANCY-1: Skip baseline duplicates unless:
  // 1. baselineConfidence === 'low'
  // 2. Risk zone (overloaded/exhausted) and need to distinguish wired vs tired
  // 3. Baseline value is middle/neutral (not informative)
  // 4. There's conflicting evidence
  // 5. P1: evidenceTagsCount is low (< 3) - need more evidence, even if baseline is informative
  // Task AK3-DEEP-GATES-3: Don't skip if card can close an open gate
  const shouldSkipBaselineCard = (card) => {
    if (!isBaselineAxisCard(card)) return false;
    
    // P1: If evidence is low, skip less aggressively to collect more signals
    // Otherwise system eats up the card pool too quickly (pressured → no_card)
    if (evidenceTags.length < 3) {
      return false; // Need more evidence, don't skip baseline cards
    }
    
    // Task AK3-DEEP-GATES-3: Never skip if this card can close an open gate
    // Map card IDs to gate signals
    const cardToGateMap = {
      'L1_control': 'agency',
      'L1_clarity': 'clarity',
      'L1_pressure': 'load',
      'L1_social': 'social',
    };
    const gateSignal = cardToGateMap[card.id];
    if (gateSignal) {
      // Check if this gate is still open
      const requiredGates = [
        { signal: 'agency', cardId: 'L1_control' },
        { signal: 'clarity', cardId: 'L1_clarity' },
      ];
      if (['overloaded', 'exhausted', 'pressured'].includes(macroBase)) {
        requiredGates.push({ signal: 'load', cardId: 'L1_pressure' });
      }
      if (['connected', 'detached'].includes(macroBase)) {
        requiredGates.push({ signal: 'social', cardId: 'L1_social' });
      }
      
      const gate = requiredGates.find(g => g.signal === gateSignal);
      if (gate) {
        // Check if gate is open (not closed by baseline or evidence)
        const hasSignal = (signal) => {
          // P0: Helper for pattern matching
          const matchesPattern = (tag, pattern) => {
            if (pattern.endsWith('.')) return tag.startsWith(pattern);
            return tag === pattern;
          };
          
          const signalMap = {
            'control': ['sig.agency.', 'L1_CONTROL'],
            'agency': ['sig.agency.', 'L1_CONTROL'],
            'clarity': ['sig.clarity.', 'L1_CLARITY', 'L1_EXPECT'],
            'uncertainty': ['sig.clarity.', 'L1_CLARITY', 'L1_EXPECT'],
            // P0.5: Use shared helper for load signals (DRY)
            'load': LOAD_HIGH_SIGNALS,
            'overwhelm': LOAD_HIGH_SIGNALS,
            'social': ['sig.social.', 'L1_SOCIAL'],
          };
          const patterns = signalMap[signal] || [];
          const hasEvidence = patterns.some(pattern => 
            evidenceTags.some(tag => matchesPattern(tag, pattern))
          );
          if (!hasEvidence && baselineMetrics) {
            // Check baseline
            switch (signal) {
              case 'control':
              case 'agency':
                const control = baselineMetrics.control;
                return control !== undefined && (control <= BASELINE_INFORMATIVE_LOW || control >= BASELINE_INFORMATIVE_HIGH);
              case 'clarity':
                const clarity = baselineMetrics.clarity;
                return clarity !== undefined && (clarity <= BASELINE_INFORMATIVE_LOW || clarity >= BASELINE_INFORMATIVE_HIGH);
              case 'load':
                const tension = baselineMetrics.tension;
                const energy = baselineMetrics.energy;
                return (tension !== undefined && tension >= BASELINE_INFORMATIVE_HIGH) || (energy !== undefined && energy <= BASELINE_INFORMATIVE_LOW);
              case 'social':
                const social = baselineMetrics.social;
                return social !== undefined && (social <= BASELINE_INFORMATIVE_LOW || social >= BASELINE_INFORMATIVE_HIGH);
              default:
                return false;
            }
          }
          return hasEvidence;
        };
        
        if (!hasSignal(gateSignal)) {
          // Gate is open, don't skip this card
          return false;
        }
      }
    }
    
    // Allow if baseline confidence is low
    if (baselineConfidence === 'low') return false;
    
    // Allow in risk zones (overloaded/exhausted) for energy differentiation
    if (['overloaded', 'exhausted'].includes(macroBase) && card.id === 'L1_energy') {
      return false; // Need to distinguish wired vs tired
    }
    
    // Task AK3-DEEP-GATES-2: Allow if baseline value is middle/neutral (not informative)
    const axisMap = {
      'L1_energy': 'energy',
      'L1_body': 'tension',
      'L1_control': 'control',
      'L1_clarity': 'clarity',
      'L1_social': 'social',
      'L1_mood': 'valence',
    };
    const axis = axisMap[card.id];
    if (axis && baselineMetrics) {
      const value = baselineMetrics[axis];
      if (value !== undefined && value > BASELINE_INFORMATIVE_LOW && value < BASELINE_INFORMATIVE_HIGH) {
        return false; // Middle value, allow card
      }
    }
    
    // Allow if there's conflicting evidence (e.g., evidence tag contradicts baseline)
    // This is a simple check - can be enhanced later
    const hasConflictingEvidence = evidenceTags.some(tag => {
      if (card.id === 'L1_energy' && tag.includes('sig.energy.') && tag.includes('high')) {
        const baselineEnergy = baselineMetrics?.energy;
        return baselineEnergy !== undefined && baselineEnergy <= BASELINE_INFORMATIVE_LOW; // Baseline says low, evidence says high
      }
      // Add more conflict checks as needed
      return false;
    });
    if (hasConflictingEvidence) return false;
    
    // Otherwise, skip baseline duplicate
    return true;
  };
  
  // P0: Collect diagnostics before filtering to understand why cards became ineligible
  const skipReasons = {
    skip_closed_gate_agency: 0,
    skip_closed_gate_clarity: 0,
    skip_closed_gate_load: 0,
    skip_closed_gate_social: 0,
    skip_baseline_informative_energy: 0,
    skip_baseline_informative_body: 0,
    skip_baseline_informative_control: 0,
    skip_baseline_informative_clarity: 0,
    skip_baseline_informative_social: 0,
    skip_baseline_informative_mood: 0,
    skip_baseline_confidence_low: 0,
    skip_risk_zone: 0,
    skip_conflicting_evidence: 0,
    skip_evidence_low: 0, // evidenceTags.length >= 3 but still skipped
    skip_unknown: 0,
  };
  
  // Helper to determine skip reason for diagnostics (simplified, doesn't use hasSignal)
  const getSkipReason = (card) => {
    if (!isBaselineAxisCard(card)) return null;
    if (evidenceTags.length < 3) return null; // This check prevents skip, don't track as reason
    
    // Baseline informative checks (most common skip reason)
    const axisMap = {
      'L1_energy': 'energy',
      'L1_body': 'tension',
      'L1_control': 'control',
      'L1_clarity': 'clarity',
      'L1_social': 'social',
      'L1_mood': 'valence',
    };
    const axis = axisMap[card.id];
    if (axis && baselineMetrics) {
      const value = baselineMetrics[axis];
      if (value !== undefined && (value <= BASELINE_INFORMATIVE_LOW || value >= BASELINE_INFORMATIVE_HIGH)) {
        return `skip_baseline_informative_${axis}`;
      }
    }
    
    if (baselineConfidence === 'low') return null; // Prevents skip, don't track
    if (['overloaded', 'exhausted'].includes(macroBase) && card.id === 'L1_energy') return null; // Prevents skip, don't track
    
    // Gate checks simplified (just track, full logic in shouldSkipBaselineCard)
    const cardToGateMap = {
      'L1_control': 'agency',
      'L1_clarity': 'clarity',
      'L1_pressure': 'load',
      'L1_social': 'social',
    };
    const gateSignal = cardToGateMap[card.id];
    if (gateSignal) {
      // Note: full gate check happens in shouldSkipBaselineCard, this is just for categorization
      return `skip_closed_gate_${gateSignal}`;
    }
    
    return 'skip_unknown';
  };
  
  // Task 2: If evidence is low (< 3), do not filter cards out.
  // We need more chances to collect signals, even if baseline is "informative".
  // This prevents premature "no_eligible_cards" when user hasn't provided enough data yet.
  let eligible = notAskedL1;
  const beforeFilterCount = notAskedL1.length;
  
  if (evidenceTags.length >= 3) {
    // Only apply filtering when we have enough evidence
    eligible = notAskedL1.filter(card => {
      const skip = shouldSkipBaselineCard(card);
      if (skip) {
        const reason = getSkipReason(card) || 'skip_unknown';
        skipReasons[reason] = (skipReasons[reason] || 0) + 1;
      }
      return !skip;
    });
  }
  
  // Task 2: Emergency fallback - never end early if we have cards and low evidence
  if (eligible.length === 0 && notAskedL1.length > 0 && evidenceTags.length < 3) {
    // Force ask first available card instead of no_card
    const emergencyCard = notAskedL1[0];
    console.warn(`[l1CardSelector] Force asking ${emergencyCard.id} (low evidence, emergency fallback)`, {
      askedCount: asked.size,
      evidenceTagsCount: evidenceTags.length,
      availableCards: notAskedL1.length,
      macroBase,
    });
    return { cardId: emergencyCard.id, reason: 'force_ask_low_evidence', gatesState };
  }
  
  // P0: Enhanced diagnostics when no eligible cards remain
  if (eligible.length === 0) {
    const askedIds = Array.from(asked);
    const allIds = allL1Cards.map(c => c.id);
    const skippedBeforeFilter = beforeFilterCount - eligible.length;
    
    // Determine reason: all asked vs no eligible
    const reason = askedIds.length >= allIds.length 
      ? 'all_l1_cards_asked' 
      : 'no_eligible_cards';
    
    console.warn(`[l1CardSelector] No eligible cards:`, {
      reason,
      askedCount: askedIds.length,
      totalL1Cards: allIds.length,
      beforeFilterCount,
      skippedBeforeFilter,
      askedIds,
      notAskedIds: allIds.filter(id => !asked.has(id)),
      eligibleIds: [], // Empty because notAskedL1.length === 0
      skippedByReason: skipReasons,
      macroBase,
      evidenceTagsCount: evidenceTags.length,
    });
    return { cardId: null, reason, skipReasons };
  }
  
  // Use eligible cards instead of notAskedL1 from now on
  notAskedL1 = eligible;
  
  // Helper: check if signal/topic is covered
  const hasSignal = (signal) => {
    // Check if evidenceTags contains tags related to the signal
    const signalMap = {
      // P1: Use exact signals instead of prefixes (DRY + precise matching)
      'control': AGENCY_SIGNALS,
      'agency': AGENCY_SIGNALS,
      'clarity': CLARITY_SIGNALS,
      'uncertainty': CLARITY_SIGNALS,
      // P0.5: Use shared helper for load signals (DRY)
      'load': LOAD_HIGH_SIGNALS,
      'overwhelm': LOAD_HIGH_SIGNALS,
      'social': SOCIAL_SIGNALS,
      // Keep prefixes for rare cases (to be refined later if needed)
      'threat': ['sig.threat.', 'L1_SAFETY'],
      'blame': ['sig.attribution.', 'L1_WORTH'],
    };
    
    const patterns = signalMap[signal] || [];
    // P0: Use matchesPattern helper for proper pattern matching (not includes())
    const matchesPattern = (tag, pattern) => {
      if (pattern.endsWith('.')) return tag.startsWith(pattern);
      return tag === pattern;
    };
    return patterns.some(pattern => 
      evidenceTags.some(tag => matchesPattern(tag, pattern))
    );
  };
  
  // Helper: check if card covers a signal
  const cardCoversSignal = (card, signal) => {
    const covers = card?.meta?.covers || [];
    return covers.includes(signal);
  };
  
  // Step 1: Close minimum gates (required topics)
  const requiredGates = [
    { signal: 'agency', cardId: 'L1_control' },
    { signal: 'clarity', cardId: 'L1_clarity' },
  ];
  
  // Add load/overwhelm gate if macro is overloaded/exhausted/pressured
  if (['overloaded', 'exhausted', 'pressured'].includes(macroBase)) {
    requiredGates.push({ signal: 'load', cardId: 'L1_pressure' });
  }
  
  // Add social gate if macro is connected/detached
  if (['connected', 'detached'].includes(macroBase)) {
    requiredGates.push({ signal: 'social', cardId: 'L1_social' });
  }
  
  // Task AK3-POST-4c.1b: Calculate gates state for logging
  const gatesState = {
    control: hasSignal('control') || hasSignal('agency'),
    clarity: hasSignal('clarity') || hasSignal('uncertainty'),
    load: hasSignal('load') || hasSignal('overwhelm'),
    social: hasSignal('social'),
  };
  
  // Find missing gates
  for (const gate of requiredGates) {
    if (!hasSignal(gate.signal)) {
      const card = notAskedL1.find(c => c.id === gate.cardId);
      if (card) {
        console.log(`[l1CardSelector] Selected ${card.id} (gate: ${gate.signal})`);
        return { cardId: card.id, reason: `gate_${gate.signal}`, gatesState };
      }
      
      // Fallback: any card that covers this signal
      const fallback = notAskedL1.find(c => cardCoversSignal(c, gate.signal));
      if (fallback) {
        console.log(`[l1CardSelector] Selected ${fallback.id} (gate fallback: ${gate.signal})`);
        return { cardId: fallback.id, reason: `gate_fallback_${gate.signal}`, gatesState };
      }
    }
  }
  
  // Step 2: Macro-specific cards (differentiators)
  // Task AK3-DEEP-L1-REDUNDANCY-2: Macro-specific selection should also respect baseline duplicates
  const macroSpecificMap = {
    'overloaded': ['L1_energy', 'L1_pressure', 'L1_clarity'], // wired vs drained, too many tasks, urgency
    'exhausted': ['L1_energy', 'L1_body', 'L1_pressure'], // wired vs drained, too many tasks
    'down': ['L1_self_worth', 'L1_mood', 'L1_social'], // self-worth, hope, withdrawal
    'detached': ['L1_social', 'L1_energy', 'L1_safety'], // disconnection vs overload
    'pressured': ['L1_pressure', 'L1_control', 'L1_energy'],
    'blocked': ['L1_control', 'L1_clarity', 'L1_safety'],
    'averse': ['L1_body', 'L1_safety', 'L1_mood'],
    'connected': ['L1_social', 'L1_mood', 'L1_energy'],
    'grounded': ['L1_control', 'L1_clarity', 'L1_safety'],
    'engaged': ['L1_energy', 'L1_mood', 'L1_control'],
    'capable': ['L1_control', 'L1_clarity', 'L1_energy'],
  };
  
  const macroCards = macroSpecificMap[macroBase] || [];
  for (const cardId of macroCards) {
    if (asked.has(cardId)) continue;
    const card = notAskedL1.find(c => c.id === cardId);
    if (card) {
      // Task AK3-DEEP-L1-REDUNDANCY-2: Skip baseline duplicates in macro-specific selection too
      if (shouldSkipBaselineCard(card)) {
        console.log(`[l1CardSelector] Skipped ${card.id} (macro-specific but baseline duplicate)`);
        continue;
      }
      console.log(`[l1CardSelector] Selected ${card.id} (macro-specific: ${macroBase})`);
      return { cardId: card.id, reason: `macro_specific_${macroBase}`, gatesState };
    }
  }
  
  // Step 3: Early exit check (AK3-DEEP-L1-1d: protected by MIN_STEPS)
  // Task AK3-DEEP-L1-2b: Log early exit decision with full context
  if (!needsRefine && askedCount >= MIN_STEPS) {
    const allGatesClosed = areMinimumGatesClosed({ macroBase, evidenceTags, baselineMetrics });
    // Additional quality checks: confidence should not be low, clarity should not be low
    const qualityGood = confidenceBand !== 'low' && clarityFlag !== 'low';
    
    // Task AK3-DEEP-L1-2b: Debug logging for early exit decision
    if (allGatesClosed && qualityGood) {
      console.log(`[l1CardSelector] Early exit decision:`, {
        askedCount,
        minSteps: MIN_STEPS,
        gatesClosed: allGatesClosed,
        needsRefine,
        confidenceBand,
        clarityFlag,
        qualityGood,
        macroBase,
        evidenceTagsCount: evidenceTags.length,
      });
      return { cardId: null, reason: 'early_exit_gates_closed' };
    } else {
      // Task AK3-DEEP-L1-2b: Log why early exit was not triggered
      if (askedCount >= MIN_STEPS && (!allGatesClosed || !qualityGood)) {
        console.log(`[l1CardSelector] Early exit blocked:`, {
          askedCount,
          gatesClosed: allGatesClosed,
          qualityGood,
          needsRefine,
          confidenceBand,
          clarityFlag,
        });
      }
    }
  }
  
  // Step 4: Fallback - any remaining L1 card not asked
  const fallback = notAskedL1[0];
  if (fallback) {
    console.log(`[l1CardSelector] Selected ${fallback.id} (fallback)`, {
      askedCount: asked.size,
      remainingCards: notAskedL1.length,
      macroBase,
    });
    return { cardId: fallback.id, reason: 'fallback', gatesState };
  }
  
  // AK3-DEEP-NO_CARD-FALLBACK_SKIPPED: Emergency fallback from skipped candidates
  // If no cards available, try to use cards that were skipped due to baseline redundancy
  // This prevents no_card when there are still useful cards available
  const skippedCards = allL1Cards.filter(card => {
    if (asked.has(card.id)) return false; // Already asked
    if (notAskedL1.includes(card)) return false; // Already in notAskedL1
    return shouldSkipBaselineCard(card); // Was skipped
  });
  
  if (skippedCards.length > 0) {
    // Pick the first skipped card as emergency fallback
    const emergencyCard = skippedCards[0];
    console.warn(`[l1CardSelector] Emergency fallback from skipped: ${emergencyCard.id}`, {
      askedCount: asked.size,
      skippedCount: skippedCards.length,
      macroBase,
      reason: 'baseline_redundant_but_emergency_fallback',
    });
    return { cardId: emergencyCard.id, reason: 'emergency_fallback_skipped', gatesState };
  }
  
  // Task AK3-DEEP-L1-2b: Log when no more cards available
  console.warn(`[l1CardSelector] No more cards available:`, {
    askedCount: asked.size,
    totalL1Cards: allL1Cards.length,
    notAskedCount: notAskedL1.length,
    skippedCount: skippedCards.length,
    macroBase,
  });
  return { cardId: null, reason: 'no_more_cards' };
}

/**
 * Check if minimum gates are closed
 * Task AK3-DEEP-GATES-1: Gates should consider baseline + evidence (not only evidence)
 * @param {Object} params
 * @param {string} params.macroBase
 * @param {string[]} params.evidenceTags
 * @param {Object} params.baselineMetrics - Optional baseline metrics { control, clarity, energy, tension, social }
 * @returns {boolean}
 */
export function areMinimumGatesClosed({ macroBase, evidenceTags = [], baselineMetrics = null }) {
  // P0: Helper for pattern matching - treat patterns ending with '.' as prefixes, otherwise exact match
  const matchesPattern = (tag, pattern) => {
    if (pattern.endsWith('.')) return tag.startsWith(pattern);
    return tag === pattern;
  };
  
  const hasSignal = (signal) => {
    const signalMap = {
      // P1: Use exact signals instead of prefixes (DRY + precise matching)
      'control': AGENCY_SIGNALS,
      'clarity': CLARITY_SIGNALS,
      // P0.5: Use shared helper for load signals (DRY)
      'load': LOAD_HIGH_SIGNALS,
      'social': SOCIAL_SIGNALS,
    };
    const patterns = signalMap[signal] || [];
    const hasEvidence = patterns.some(pattern => 
      evidenceTags.some(tag => matchesPattern(tag, pattern))
    );
    
    // Task AK3-DEEP-GATES-1: Check baseline if evidence doesn't have signal
    if (!hasEvidence && baselineMetrics) {
    // Task AK3-DEEP-GATES-2: Gate is closed if baseline value is "informative" (not middle/neutral)
    // Informative = value <= BASELINE_INFORMATIVE_LOW (low) or >= BASELINE_INFORMATIVE_HIGH (high) on BASELINE_MIN-BASELINE_MAX scale
    switch (signal) {
      case 'control':
      case 'agency':
        const control = baselineMetrics.control;
        return control !== undefined && (control <= BASELINE_INFORMATIVE_LOW || control >= BASELINE_INFORMATIVE_HIGH);
      case 'clarity':
        const clarity = baselineMetrics.clarity;
        return clarity !== undefined && (clarity <= BASELINE_INFORMATIVE_LOW || clarity >= BASELINE_INFORMATIVE_HIGH);
      case 'load':
        // Load is inferred from tension/energy combination
        const tension = baselineMetrics.tension;
        const energy = baselineMetrics.energy;
        return (tension !== undefined && tension >= BASELINE_INFORMATIVE_HIGH) || (energy !== undefined && energy <= BASELINE_INFORMATIVE_LOW);
      case 'social':
        const social = baselineMetrics.social;
        return social !== undefined && (social <= BASELINE_INFORMATIVE_LOW || social >= BASELINE_INFORMATIVE_HIGH);
      default:
        return false;
    }
    }
    
    return hasEvidence;
  };
  
  const required = ['agency', 'clarity'];
  if (['overloaded', 'exhausted', 'pressured'].includes(macroBase)) {
    required.push('load');
  }
  if (['connected', 'detached'].includes(macroBase)) {
    required.push('social');
  }
  
  return required.every(signal => hasSignal(signal));
}
