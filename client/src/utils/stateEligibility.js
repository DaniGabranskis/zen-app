// src/utils/stateEligibility.js
// Eligibility Gates for State Classification
// Prevents semantically invalid states from being selected even if centroid distance is small
//
// BASELINE QUANTIZATION NOTES:
// The baseline generator produces discrete values due to 7-point scale quantization:
// - Arousal: {0, 0.6667, 1.3333, 2.0} (from energy >= 0.5)
// - Fatigue: {0, 0.7333, 1.4667, 2.2} (from energy < 0.5)
// - Agency/Certainty/Socialness: {0, 0.3333, 0.6667, 1.0, 1.3333, 1.6667, 2.0}
// - Tension: {0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4}
// Thresholds below are set to midpoints between discrete steps to avoid impossible combinations.

// ---------------------------------------------------------------------------
// Levelization: Convert continuous stateVec values to discrete levels
// ---------------------------------------------------------------------------

/**
 * Converts a state vector to discrete levels for eligibility checking
 * @param {Object} stateVec - State vector with dimensions
 * @returns {Object} Levels object with Vneg/Vpos/Vmid, Ar_low/Ar_mid/Ar_high, etc.
 */
export function levelizeStateVec(stateVec) {
  const v = stateVec?.valence ?? 0;
  const ar = stateVec?.arousal ?? 0;
  const t = stateVec?.tension ?? 0;
  const ag = stateVec?.agency ?? 0;
  const s = stateVec?.socialness ?? 0;
  const f = stateVec?.fatigue ?? 0;
  const c = stateVec?.certainty ?? 0;

  return {
    // Valence (continuous, no quantization)
    Vneg: v <= -0.8,
    Vpos: v >= 0.8,
    Vmid: v > -0.8 && v < 0.8,
    
    // Arousal (discrete: 0, 0.667, 1.333, 2.0)
    // Thresholds: < 0.35 (effectively zero), >= 1.7 (captures 2.0)
    Ar_low: ar < 0.35,
    Ar_high: ar >= 1.7,
    Ar_mid: ar >= 0.35 && ar < 1.7,
    
    // Tension (discrete: 0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4)
    // Thresholds: < 0.6 (low), >= 1.8 (high)
    T_low: t < 0.6,
    T_high: t >= 1.8,
    T_mid: t >= 0.6 && t < 1.8,
    
    // Agency (discrete: 0, 0.333, 0.667, 1.0, 1.333, 1.667, 2.0)
    // Thresholds: < 0.5 (low), >= 1.5 (high)
    Ag_low: ag < 0.5,
    Ag_high: ag >= 1.5,
    Ag_mid: ag >= 0.5 && ag < 1.5,
    
    // Socialness (discrete: 0, 0.333, 0.667, 1.0, 1.333, 1.667, 2.0)
    // Thresholds: < 0.5 (low), >= 1.5 (high)
    S_low: s < 0.5,
    S_high: s >= 1.5,
    S_mid: s >= 0.5 && s < 1.5,
    
    // Fatigue (discrete: 0, 0.733, 1.467, 2.2)
    // Thresholds: < 0.35 (effectively zero), >= 1.2 (captures 1.467 and 2.2)
    F_low: f < 0.35,
    F_high: f >= 1.2,
    F_mid: f >= 0.35 && f < 1.2,
    
    // Certainty (discrete: 0, 0.333, 0.667, 1.0, 1.333, 1.667, 2.0)
    // Task H4: Tighten C_low threshold to only "almost zero" (only 0, not 0.333)
    // This prevents C_low from covering too large a portion of baseline (>50%)
    // Thresholds: < 0.35 (low - only effectively zero), >= 1.5 (high)
    C_low: c < 0.35,
    C_high: c >= 1.5,
    C_mid: c >= 0.35 && c < 1.5,
  };
}

// ---------------------------------------------------------------------------
// Eligibility Rules for Each State
// ---------------------------------------------------------------------------

/**
 * Checks if a state is eligible given the levelized state vector
 * Task G1: Added pass mode: 'strict' (all rules) vs 'hard' (blockers only)
 * @param {string} stateKey - State key (e.g., 'connected', 'exhausted')
 * @param {Object} levels - Levelized state vector from levelizeStateVec
 * @param {Object} opts - Options: { mode: 'baseline' | 'cards' | 'deep', pass: 'strict' | 'hard' }
 * @returns {Object} { eligible: boolean, reasons: string[] }
 */
export function getEligibility(stateKey, levels, opts = {}) {
  const { mode = 'baseline', pass = 'strict' } = opts;
  const reasons = [];

  // Deep-only states are never eligible in baseline mode
  const DEEP_ONLY_STATES = ['threatened', 'self_critical', 'confrontational'];
  if (mode === 'baseline' && DEEP_ONLY_STATES.includes(stateKey)) {
    return {
      eligible: false,
      reasons: ['deep-only state in baseline mode'],
    };
  }

  // Gate rules for each state
  // Task G2: In 'hard' mode, only check blockers (not requirements)
  switch (stateKey) {
    case 'connected':
      // Task G2: Hard mode - only blockers, no requirements
      if (pass === 'hard') {
        // Hard blockers only: blocked if F_high OR T_high OR Vneg OR Ag_low
        if (levels.F_high) {
          reasons.push('blocked by fatigue high');
          return { eligible: false, reasons };
        }
        if (levels.T_high) {
          reasons.push('blocked by tension high');
          return { eligible: false, reasons };
        }
        if (levels.Vneg) {
          reasons.push('blocked by negative valence');
          return { eligible: false, reasons };
        }
        if (levels.Ag_low) {
          reasons.push('blocked by agency low');
          return { eligible: false, reasons };
        }
        return { eligible: true, reasons: [] };
      }
      // Strict mode: full rules
      if (!levels.S_high) {
        reasons.push('needs S_high');
        return { eligible: false, reasons };
      }
      if (levels.F_high) {
        reasons.push('blocked by fatigue high');
        return { eligible: false, reasons };
      }
      if (levels.T_high) {
        reasons.push('blocked by tension high');
        return { eligible: false, reasons };
      }
      if (levels.Vneg) {
        reasons.push('blocked by negative valence');
        return { eligible: false, reasons };
      }
      return { eligible: true, reasons: [] };

    case 'exhausted':
      // Task G2: Hard mode - only blockers
      if (pass === 'hard') {
        // Hard blockers: blocked if F_low AND Ar_high (opposite of exhausted pattern)
        if (levels.F_low && levels.Ar_high) {
          reasons.push('blocked by low fatigue and high arousal');
          return { eligible: false, reasons };
        }
        // Task: Precision improvement - block exhausted if T_high (overloaded pattern)
        // This prevents exhausted from winning when user is actually overloaded
        if (levels.T_high) {
          reasons.push('blocked by tension high (likely overloaded)');
          return { eligible: false, reasons };
        }
        return { eligible: true, reasons: [] };
      }
      // Strict mode: full rules
      if (!levels.F_high) {
        reasons.push('needs F_high');
        return { eligible: false, reasons };
      }
      if (!levels.Ar_low) {
        reasons.push('needs Ar_low');
        return { eligible: false, reasons };
      }
      // Task: Precision improvement - block exhausted if T_high (overloaded pattern)
      // Exhausted = tired but not tense. If tense, prefer overloaded/blocked/pressured.
      if (levels.T_high) {
        reasons.push('blocked by tension high (likely overloaded)');
        return { eligible: false, reasons };
      }
      return { eligible: true, reasons: [] };

    case 'engaged':
      // Task G2: Hard mode - only blockers
      if (pass === 'hard') {
        // Hard blockers: blocked if Vneg OR F_high OR T_high OR Ag_low
        if (levels.Vneg) {
          reasons.push('blocked by negative valence');
          return { eligible: false, reasons };
        }
        if (levels.F_high) {
          reasons.push('blocked by fatigue high');
          return { eligible: false, reasons };
        }
        if (levels.T_high) {
          reasons.push('blocked by tension high');
          return { eligible: false, reasons };
        }
        if (levels.Ag_low) {
          reasons.push('blocked by agency low');
          return { eligible: false, reasons };
        }
        return { eligible: true, reasons: [] };
      }
      // Strict mode: full rules
      if (!levels.Vpos) {
        reasons.push('needs Vpos');
        return { eligible: false, reasons };
      }
      if (!levels.Ar_high) {
        reasons.push('needs Ar_high');
        return { eligible: false, reasons };
      }
      if (levels.T_high) {
        reasons.push('blocked by tension high');
        return { eligible: false, reasons };
      }
      if (levels.F_high) {
        reasons.push('blocked by fatigue high');
        return { eligible: false, reasons };
      }
      if (levels.Ag_low) {
        reasons.push('blocked by agency low');
        return { eligible: false, reasons };
      }
      return { eligible: true, reasons: [] };

    case 'capable':
      // Eligible if: Ag_high AND NOT T_high AND NOT F_high AND NOT Vneg
      // Relaxed: removed C requirement to make it more reachable
      if (!levels.Ag_high) {
        reasons.push('needs Ag_high');
        return { eligible: false, reasons };
      }
      if (levels.T_high) {
        reasons.push('blocked by tension high');
        return { eligible: false, reasons };
      }
      if (levels.F_high) {
        reasons.push('blocked by fatigue high');
        return { eligible: false, reasons };
      }
      if (levels.Vneg) {
        reasons.push('blocked by negative valence');
        return { eligible: false, reasons };
      }
      return { eligible: true, reasons: [] };

    case 'grounded':
      // Task G2: Hard mode - only blockers
      if (pass === 'hard') {
        // Hard blockers: blocked if T_high OR F_high OR Vneg
        if (levels.T_high) {
          reasons.push('blocked by tension high');
          return { eligible: false, reasons };
        }
        if (levels.F_high) {
          reasons.push('blocked by fatigue high');
          return { eligible: false, reasons };
        }
        if (levels.Vneg) {
          reasons.push('blocked by negative valence');
          return { eligible: false, reasons };
        }
        return { eligible: true, reasons: [] };
      }
      // Strict mode: full rules
      if (!levels.T_low) {
        reasons.push('needs T_low');
        return { eligible: false, reasons };
      }
      if (!levels.Ag_high) {
        reasons.push('needs Ag_high');
        return { eligible: false, reasons };
      }
      if (levels.Ar_high) {
        reasons.push('blocked by arousal high');
        return { eligible: false, reasons };
      }
      if (levels.F_high) {
        reasons.push('blocked by fatigue high');
        return { eligible: false, reasons };
      }
      if (levels.Vneg) {
        reasons.push('blocked by negative valence');
        return { eligible: false, reasons };
      }
      return { eligible: true, reasons: [] };

    case 'pressured':
      // Task G2: Hard mode - only blockers
      if (pass === 'hard') {
        // Hard blockers: blocked if Ar_low OR Ag_low OR F_high
        if (levels.Ar_low) {
          reasons.push('blocked by arousal low');
          return { eligible: false, reasons };
        }
        if (levels.Ag_low) {
          reasons.push('blocked by agency low');
          return { eligible: false, reasons };
        }
        if (levels.F_high) {
          reasons.push('blocked by fatigue high');
          return { eligible: false, reasons };
        }
        return { eligible: true, reasons: [] };
      }
      // Strict mode: full rules
      if (!levels.T_high) {
        reasons.push('needs T_high');
        return { eligible: false, reasons };
      }
      if (levels.Ar_low) {
        reasons.push('blocked by arousal low');
        return { eligible: false, reasons };
      }
      if (levels.Ag_low) {
        reasons.push('blocked by agency low');
        return { eligible: false, reasons };
      }
      if (levels.F_high) {
        reasons.push('blocked by fatigue high');
        return { eligible: false, reasons };
      }
      return { eligible: true, reasons: [] };

    case 'blocked':
      // Task G2: Hard mode - only blockers
      if (pass === 'hard') {
        // Hard blockers: blocked if Ar_low OR F_high
        if (levels.Ar_low) {
          reasons.push('blocked by arousal low');
          return { eligible: false, reasons };
        }
        if (levels.F_high) {
          reasons.push('blocked by fatigue high');
          return { eligible: false, reasons };
        }
        return { eligible: true, reasons: [] };
      }
      // Strict mode: full rules
      if (!levels.T_high) {
        reasons.push('needs T_high');
        return { eligible: false, reasons };
      }
      if (!levels.Ag_low) {
        reasons.push('needs Ag_low');
        return { eligible: false, reasons };
      }
      if (levels.Ar_low) {
        reasons.push('blocked by arousal low');
        return { eligible: false, reasons };
      }
      if (levels.F_high) {
        reasons.push('blocked by fatigue high');
        return { eligible: false, reasons };
      }
      return { eligible: true, reasons: [] };

    case 'overloaded':
      // Task M2: Simplified eligibility for overloaded (baseline-compatible)
      // Overloaded = high fatigue + high tension + low agency, negative valence.
      // In baseline mapping, fatigue > 0 implies arousal == 0, so do NOT block Ar_low.
      
      // Helper functions for cleaner code
      const ineligible = (reason) => {
        reasons.push(reason);
        return { eligible: false, reasons };
      };
      const eligible = () => ({ eligible: true, reasons: [] });
      
      if (!levels.T_high) return ineligible('needs T_high');
      if (levels.Vpos) return ineligible('blocked by positive valence');
      
      // Task G2: Hard mode - only blockers
      if (pass === 'hard') {
        if (!levels.F_high) return ineligible('needs F_high');
        return eligible();
      }
      
      // Strict mode: full rules
      if (!levels.F_high) return ineligible('needs F_high');
      if (!levels.Ag_low) return ineligible('needs Ag_low');
      if (!levels.Vneg) return ineligible('needs Vneg');
      // Optional: keeps it out of "clear but tired" (reduces overlap with exhausted)
      if (levels.C_high) return ineligible('blocked by certainty high');
      
      // Task M2: Do NOT block Ar_low - for baseline this is normal when fatigue is high
      return eligible();

    case 'down':
      // Task G2: Hard mode - only blockers
      if (pass === 'hard') {
        // Hard blockers: blocked if Vpos OR T_high (opposite of down pattern)
        if (levels.Vpos) {
          reasons.push('blocked by positive valence');
          return { eligible: false, reasons };
        }
        if (levels.T_high) {
          reasons.push('blocked by tension high');
          return { eligible: false, reasons };
        }
        return { eligible: true, reasons: [] };
      }
      // Strict mode: full rules
      if (!levels.Vneg) {
        reasons.push('needs Vneg');
        return { eligible: false, reasons };
      }
      if (!levels.Ag_low) {
        reasons.push('needs Ag_low');
        return { eligible: false, reasons };
      }
      if (!levels.F_mid && !levels.F_high && !levels.Ar_low) {
        reasons.push('needs F_mid or F_high or Ar_low');
        return { eligible: false, reasons };
      }
      return { eligible: true, reasons: [] };

    case 'averse':
      // Eligible if: Vneg AND NOT Ar_low AND (T_mid OR T_high)
      // Fixed: removed NOT Ag_low constraint (unnecessary, allows more vectors)
      if (!levels.Vneg) {
        reasons.push('needs Vneg');
        return { eligible: false, reasons };
      }
      if (levels.Ar_low) {
        reasons.push('blocked by arousal low');
        return { eligible: false, reasons };
      }
      if (!levels.T_mid && !levels.T_high) {
        reasons.push('needs T_mid or T_high');
        return { eligible: false, reasons };
      }
      return { eligible: true, reasons: [] };

    case 'detached':
      // Task G2: Hard mode - only blockers
      if (pass === 'hard') {
        // Hard blockers: blocked if Ar_high OR Vpos
        if (levels.Ar_high) {
          reasons.push('blocked by arousal high');
          return { eligible: false, reasons };
        }
        if (levels.Vpos) {
          reasons.push('blocked by positive valence');
          return { eligible: false, reasons };
        }
        return { eligible: true, reasons: [] };
      }
      // Strict mode: full rules
      if (!levels.S_low) {
        reasons.push('needs S_low');
        return { eligible: false, reasons };
      }
      if (!levels.Ar_low && !levels.Ar_mid) {
        reasons.push('needs Ar_low or Ar_mid');
        return { eligible: false, reasons };
      }
      if (!levels.T_low && !levels.T_mid) {
        reasons.push('needs T_low or T_mid');
        return { eligible: false, reasons };
      }
      if (levels.Ar_high) {
        reasons.push('blocked by arousal high');
        return { eligible: false, reasons };
      }
      if (levels.Vpos) {
        reasons.push('blocked by positive valence');
        return { eligible: false, reasons };
      }
      return { eligible: true, reasons: [] };

    case 'uncertain':
      // uncertain is no longer a ranked candidate (excluded in rankStates)
      // This case should not be reached, but return false for safety
      return { eligible: false, reasons: ['uncertain is fallback-only, not a ranked candidate'] };

    // Deep-only states (handled above, but explicit for clarity)
    case 'threatened':
    case 'self_critical':
    case 'confrontational':
      if (mode === 'baseline') {
        return { eligible: false, reasons: ['deep-only state in baseline mode'] };
      }
      // In deep mode, these are eligible (no additional gates for now)
      return { eligible: true, reasons: [] };

    default:
      // Unknown state: allow it (don't break existing behavior)
      return { eligible: true, reasons: [] };
  }
}

// ---------------------------------------------------------------------------
// Filter Ranked States by Eligibility
// ---------------------------------------------------------------------------

/**
 * Filters a ranked list of states by eligibility
 * @param {Array} ranked - Array of { key, score } from rankStates
 * @param {Object} levels - Levelized state vector
 * @param {Object} opts - Options: { mode, debug }
 * @returns {Object} { filtered: Array, diagnostics: Object (if debug) }
 */
export function filterRankedByEligibility(ranked, levels, opts = {}) {
  const { debug = false } = opts;
  const filtered = [];
  const filteredOut = [];
  const preFilterTop3 = ranked.slice(0, 3);

  for (const item of ranked) {
    const eligibility = getEligibility(item.key, levels, opts);
    if (eligibility.eligible) {
      filtered.push(item);
    } else {
      filteredOut.push({
        key: item.key,
        score: item.score,
        reasons: eligibility.reasons,
      });
    }
  }

  const postFilterTop3 = filtered.slice(0, 3);

  const diagnostics = debug ? {
    preFilterTop3,
    filteredOut: filteredOut.slice(0, 10), // Limit to top 10 filtered
    postFilterTop3,
    totalFiltered: filteredOut.length,
    totalKept: filtered.length,
  } : null;

  return {
    filtered,
    diagnostics,
  };
}
