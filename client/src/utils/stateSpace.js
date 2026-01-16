// src/utils/stateSpace.js
// Primary "state" classification centroids in the same dimensional space
// as emotionSpace (valence/arousal/tension/agency/...)

import { levelizeStateVec, filterRankedByEligibility } from './stateEligibility.js';

// ---------------------------------------------------------------------------
// Dimensional space
// NOTE: Keep these dimensions aligned with tag deltas and probe deltas.

export const DIMENSIONS = [
  'valence',     // -3..+3
  'arousal',     // 0..3
  'tension',     // 0..3
  'agency',      // 0..2
  'self_blame',  // 0..2
  'other_blame', // 0..2
  'certainty',   // 0..2 (clarity / understanding)
  'socialness',  // 0..2 (social context)
  'fatigue',     // 0..3 (exhaustion)
  'fear_bias',   // 0..3 (threat sensitivity)
];

export function emptyState() {
  return {
    valence: 0,
    arousal: 0,
    tension: 0,
    agency: 0,
    self_blame: 0,
    other_blame: 0,
    certainty: 1, // light baseline clarity
    socialness: 0,
    fatigue: 0,
    fear_bias: 0,
  };
}

export function zeroVector() {
  return emptyState();
}

export function clampState(state) {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  return {
    valence: clamp(state.valence ?? 0, -3, 3),
    arousal: clamp(state.arousal ?? 0, 0, 3),
    tension: clamp(state.tension ?? 0, 0, 3),
    agency: clamp(state.agency ?? 0, 0, 2),
    self_blame: clamp(state.self_blame ?? 0, 0, 2),
    other_blame: clamp(state.other_blame ?? 0, 0, 2),
    certainty: clamp(state.certainty ?? 1, 0, 2),
    socialness: clamp(state.socialness ?? 0, 0, 2),
    fatigue: clamp(state.fatigue ?? 0, 0, 3),
    fear_bias: clamp(state.fear_bias ?? 0, 0, 3),
  };
}

export function accumulate(base, delta, weight = 1) {
  const state = { ...(base || emptyState()) };
  const patch = delta || {};

  for (const dim of DIMENSIONS) {
    const cur = state[dim] ?? 0;
    const add = patch[dim] ?? 0;
    state[dim] = cur + weight * add;
  }

  return clampState(state);
}


// ---------------------------------------------------------------------------
// State centroids
// NOTE: These are MVP values. They are deliberately coarse, because "state"
// is broader than "emotion". We can tune them after we have telemetry.
// ---------------------------------------------------------------------------

const STATE_CENTROIDS = {
  grounded: {
    valence: 2.1, arousal: 0.6, tension: 0.2, agency: 1.9,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.9,
    socialness: 0.9, fatigue: 0.1, fear_bias: 0.0,
  },

  engaged: {
    valence: 1.4, arousal: 1.8, tension: 0.8, agency: 1.4,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.4,
    socialness: 1.0, fatigue: 0.0, fear_bias: 0.0,
  },

  connected: {
    valence: 1.2, arousal: 1.0, tension: 0.5, agency: 1.2,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.4,
    socialness: 2.0, fatigue: 0.0, fear_bias: 0.0,
  },

  capable: {
    valence: 1.0, arousal: 1.3, tension: 0.5, agency: 2.0,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.7,
    socialness: 0.9, fatigue: 0.0, fear_bias: 0.0,
  },

  pressured: {
    valence: -0.8, arousal: 1.6, tension: 2.1, agency: 1.1,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.1,
    socialness: 0.6, fatigue: 0.3, fear_bias: 0.0,
  },

  // Keep threatened as "deep-only": baseline will almost never hit it.
  threatened: {
    valence: -2.3, arousal: 2.0, tension: 2.4, agency: 0.2,
    self_blame: 0.4, other_blame: 0.0, certainty: 0.6,
    socialness: 0.7, fatigue: 0.2, fear_bias: 2.2,
  },

  // Task M1: Baseline-compatible overloaded (high fatigue implies arousal ~ 0)
  // Baseline energy splits into arousal OR fatigue, so fatigue-high → arousal=0
  overloaded: {
    valence: -2.0,
    arousal: 0.0,  // Task M1: Baseline energy splits into arousal OR fatigue, so fatigue-high → arousal=0
    tension: 2.3,
    agency: 0.3,
    self_blame: 0.0,
    other_blame: 0.0,
    certainty: 0.7,
    socialness: 0.6,
    fatigue: 1.8,  // Task M1: High fatigue (baseline-compatible)
    fear_bias: 0.0,
  },

  blocked: {
    valence: -1.5, arousal: 1.8, tension: 2.3, agency: 0.2,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.0,
    socialness: 0.5, fatigue: 0.1, fear_bias: 0.0,
  },

  // Keep confrontational as "deep-only"
  confrontational: {
    valence: -2.4, arousal: 2.0, tension: 2.4, agency: 1.8,
    self_blame: 0.0, other_blame: 1.8, certainty: 1.7,
    socialness: 0.8, fatigue: 0.2, fear_bias: 0.3,
  },

  down: {
    valence: -2.4, arousal: 0.6, tension: 1.1, agency: 0.2,
    self_blame: 0.0, other_blame: 0.0, certainty: 0.9,
    socialness: 0.7, fatigue: 1.4, fear_bias: 0.0,
  },

  exhausted: {
    valence: -1.4, arousal: 0.2, tension: 0.8, agency: 0.3,
    self_blame: 0.0, other_blame: 0.0, certainty: 0.9,
    socialness: 0.4, fatigue: 2.1, fear_bias: 0.0,
  },

  // Keep self_critical as "deep-only"
  self_critical: {
    valence: -2.2, arousal: 1.4, tension: 1.8, agency: 0.3,
    self_blame: 1.9, other_blame: 0.0, certainty: 1.3,
    socialness: 1.0, fatigue: 0.9, fear_bias: 0.8,
  },

  detached: {
    valence: -0.9, arousal: 0.4, tension: 0.6, agency: 0.4,
    self_blame: 0.0, other_blame: 0.0, certainty: 0.8,
    socialness: 0.2, fatigue: 1.4, fear_bias: 0.0,
  },

  uncertain: {
    valence: -0.3, arousal: 1.1, tension: 1.3, agency: 0.8,
    self_blame: 0.0, other_blame: 0.0, certainty: 0.7,
    socialness: 0.8, fatigue: 0.6, fear_bias: 0.0,
  },

  averse: {
    valence: -2.0, arousal: 1.4, tension: 1.9, agency: 0.9,
    self_blame: 0.0, other_blame: 0.0, certainty: 1.4,
    socialness: 0.6, fatigue: 0.1, fear_bias: 0.0,
  },

  // Make mixed unattractive for simplified by adding blame/fear (baseline lacks them).
  mixed: {
    valence: 0.0, arousal: 1.2, tension: 1.2, agency: 0.9,
    self_blame: 1.2, other_blame: 1.2, certainty: 1.0,
    socialness: 0.8, fatigue: 0.6, fear_bias: 1.2,
  },
};

// Squared distance between a state vector and centroid
function squaredDistance(state, centroid) {
  let sumSq = 0;

  for (const dim of DIMENSIONS) {
    const sRaw = state?.[dim];
    const cRaw = centroid?.[dim];

    const s = Number.isFinite(sRaw) ? sRaw : 0;
    const c = Number.isFinite(cRaw) ? cRaw : 0;

    const d = s - c;
    sumSq += d * d;
  }

  return sumSq;
}

// Similarity in [0,1]
function similarity(stateVec, centroid) {
  const dist = squaredDistance(stateVec, centroid);
  const sqrtDist = Number.isFinite(dist) ? Math.sqrt(dist) : 0;
  const result = 1 / (1 + sqrtDist);
  return Number.isFinite(result) ? result : 0;
}

export const STATE_KEYS = Object.keys(STATE_CENTROIDS).filter(k => k !== 'mixed' && k !== 'uncertain');
export const MIXED_STATE_KEY = 'mixed'; // Fallback only, not in ranking
export const UNCERTAIN_STATE_KEY = 'uncertain'; // Fallback only, not in ranking

export function rankStates(stateVec, opts = {}) {
  // Exclude 'mixed' and 'uncertain' from ranking - they are fallback only, not real candidates
  const scores = Object.entries(STATE_CENTROIDS)
    .filter(([key]) => key !== 'mixed' && key !== 'uncertain') // Exclude mixed and uncertain from candidates
    .map(([key, centroid]) => ({
      key,
      score: similarity(stateVec, centroid),
    }));
  scores.sort((a, b) => b.score - a.score);

  // Apply eligibility gates if enabled
  if (opts.eligibility?.enabled) {
    const levels = levelizeStateVec(stateVec);
    
    // Task G3: First pass - strict gates
    const { filtered, diagnostics } = filterRankedByEligibility(scores, levels, {
      mode: opts.eligibility.mode || 'baseline',
      debug: opts.eligibility.debug !== false, // Default to true for diagnostics
      pass: 'strict',
    });
    
    // Task W1: Track counts for diagnostics
    const strictCount = filtered.length;
    const hardCount = 0; // Will be set if hard pass is used
    let fallbackUsed = false;
    let lastResortUsed = false;
    let selectionPath = 'strict';

    // Task G3: If strict filtered everything, try rescue pass with hard blockers only
    if (filtered.length === 0) {
      // Rescue pass: hard blockers only
      const rescue = filterRankedByEligibility(scores, levels, {
        mode: opts.eligibility.mode || 'baseline',
        debug: opts.eligibility.debug !== false,
        pass: 'hard',
      });
      
      const hardCountActual = rescue.filtered.length;

      if (rescue.filtered.length > 0) {
        rescue.filtered._eligibilityPass = 'hard';
        selectionPath = 'hard';
        // Attach diagnostics if debug is enabled
        if (rescue.diagnostics) {
          rescue.filtered._eligibilityDiagnostics = rescue.diagnostics;
        }
        // Task W1: Attach selection diagnostics
        rescue.filtered._selectionDiagnostics = {
          selectionPath: 'hard',
          strictCount: 0,
          hardCount: hardCountActual,
          fallbackUsed: false,
          lastResortUsed: false,
        };
        return rescue.filtered;
      }

      // Task R2: Even rescue pass filtered everything - apply final fallback
      // Task S1: Final fallback with semantic hard-blocks (no full eligibility, but critical blockers)
      const MACRO_STATES = ['grounded', 'exhausted', 'connected', 'down', 'averse', 'detached', 'engaged', 'pressured', 'capable', 'blocked', 'overloaded'];
      const macroScores = scores.filter(item => MACRO_STATES.includes(item.key));
      
      if (macroScores.length > 0) {
        // Task S1: Apply semantic hard-blocks even in final fallback
        // These are critical semantic violations that must never happen
        const semanticHardBlocks = [];
        
        for (const item of macroScores) {
          let blocked = false;
          const blockReason = [];
          
          switch (item.key) {
            case 'connected':
              // Task S1: connected NEVER if F_high || T_high || Vneg
              if (levels.F_high) {
                blocked = true;
                blockReason.push('F_high');
              }
              if (levels.T_high) {
                blocked = true;
                blockReason.push('T_high');
              }
              if (levels.Vneg) {
                blocked = true;
                blockReason.push('Vneg');
              }
              break;
              
            case 'engaged':
              // Task S1: engaged NEVER if !Vpos || F_high || T_high
              if (!levels.Vpos) {
                blocked = true;
                blockReason.push('!Vpos');
              }
              if (levels.F_high) {
                blocked = true;
                blockReason.push('F_high');
              }
              if (levels.T_high) {
                blocked = true;
                blockReason.push('T_high');
              }
              break;
              
            case 'grounded':
              // Task S1: grounded NEVER if T_high || Ag_low
              if (levels.T_high) {
                blocked = true;
                blockReason.push('T_high');
              }
              if (levels.Ag_low) {
                blocked = true;
                blockReason.push('Ag_low');
              }
              break;
              
            // Other states can pass through (they don't have critical semantic violations)
          }
          
          if (!blocked) {
            semanticHardBlocks.push(item);
          }
        }
        
        // If semantic hard-blocks filtered everything, use the original macroScores (last resort)
        // But this should be extremely rare
        const fallbackCandidates = semanticHardBlocks.length > 0 ? semanticHardBlocks : macroScores;
        const fallback = fallbackCandidates.slice(0, 1);
        
        const isLastResortNoBlocks = semanticHardBlocks.length === 0;
        fallbackUsed = !isLastResortNoBlocks;
        lastResortUsed = isLastResortNoBlocks;
        selectionPath = isLastResortNoBlocks ? 'last_resort' : 'final_fallback'; // Task W0.4: Use 'last_resort' consistently
        
        fallback._eligibilityPass = selectionPath;
        fallback._eligibilityDiagnostics = {
          note: isLastResortNoBlocks
            ? 'All states filtered including semantic hard-blocks. Using last resort: top macro state by similarity (no blocks).'
            : 'All states filtered by strict and hard passes. Using final fallback: top macro state by similarity (with semantic hard-blocks applied).',
          strictFiltered: scores.length,
          hardFiltered: scores.length,
          semanticHardBlocksApplied: semanticHardBlocks.length < macroScores.length,
          fallbackUsed: fallback[0]?.key || 'unknown',
        };
        // Task W1: Attach selection diagnostics
        fallback._selectionDiagnostics = {
          selectionPath,
          strictCount: 0,
          hardCount: 0,
          fallbackUsed,
          lastResortUsed,
        };
        return fallback;
      }
      
      // Last resort: return top-1 by similarity (any state, no gates)
      // This should never happen if MACRO_STATES is complete
      const lastResort = scores.slice(0, 1);
      if (lastResort.length > 0) {
        lastResortUsed = true;
        selectionPath = 'last_resort';
        lastResort._eligibilityPass = 'last_resort';
        lastResort._eligibilityDiagnostics = {
          note: 'All states filtered. Using last resort: top state by similarity (no eligibility).',
          strictFiltered: scores.length,
          hardFiltered: scores.length,
          fallbackUsed: lastResort[0]?.key || 'unknown',
        };
        // Task W1: Attach selection diagnostics
        lastResort._selectionDiagnostics = {
          selectionPath: 'last_resort',
          strictCount: 0,
          hardCount: 0,
          fallbackUsed: false,
          lastResortUsed: true,
        };
        return lastResort;
      }
      
      // Task W1: CONTRACT VIOLATION - rankStates must never return []
      // This indicates a system error (no states available, NaN/undefined in scores, etc.)
      throw new Error(`rankStates contract violation: No candidates available after all fallbacks. StateVec: ${JSON.stringify(stateVec)}, Scores length: ${scores.length}, Strict filtered: ${scores.length}, Hard filtered: ${scores.length}`);
    }

    // Strict pass succeeded - mark it
    filtered._eligibilityPass = 'strict';
    
    // Attach diagnostics if debug is enabled
    if (diagnostics) {
      filtered._eligibilityDiagnostics = diagnostics;
    }
    
    // Task W1: Attach selection diagnostics
    filtered._selectionDiagnostics = {
      selectionPath: 'strict',
      strictCount: filtered.length,
      hardCount: 0,
      fallbackUsed: false,
      lastResortUsed: false,
    };

    return filtered;
  }

  return scores;
}
