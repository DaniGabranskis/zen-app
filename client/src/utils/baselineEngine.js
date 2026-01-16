// src/utils/baselineEngine.js
// Comments in English only.

import { emptyState, clampState, rankStates } from './stateSpace.js';
import { levelizeStateVec } from './stateEligibility.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function norm7(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 4;
  return clamp(Math.round(n), 1, 7);
}

/**
 * Convert 1..7 to 0..1.
 */
function toUnit7(v) {
  return (norm7(v) - 1) / 6;
}

/**
 * Baseline metrics → state-space vector.
 * Baseline includes valence (mood) as part of the 6-metric measurement layer.
 * Valence is expected to be captured via diagnostic (e.g. L1_mood).
 */
export function baselineToVector(metrics) {
  const m = metrics || {};

  const valence = toUnit7(m.valence); // 0..1 (low -> good)
  const energy  = toUnit7(m.energy);  // 0..1 (drained -> wired)
  const tension = toUnit7(m.tension); // 0..1 (loose -> tight)
  const clarity = toUnit7(m.clarity); // 0..1 (foggy -> clear)
  const control = toUnit7(m.control); // 0..1 (reactive -> in charge)
  const social  = toUnit7(m.social);

  const vec = emptyState();

  // Mood -> valence (-3..+3)
  vec.valence = (valence - 0.5) * 6;

  // Energy: map to arousal (high) OR fatigue (low).
  // We avoid negative arousal because the space clamps arousal >= 0.
  if (energy >= 0.5) {
    vec.arousal = (energy - 0.5) * 2 * 2.0;     // up to ~2
  } else {
    vec.fatigue = (0.5 - energy) * 2 * 2.2;     // up to ~2.2
  }

  // Tension: 0..3
  vec.tension = tension * 2.4;

  // Control → agency: 0..2
  vec.agency = control * 2.0;

  // Clarity → certainty: 0..2
  vec.certainty = clarity * 2.0;

  // Social capacity → socialness: 0..2
  vec.socialness = social * 2.0;

  return clampState(vec);
}

function normalizeProbs(scores) {
  const sum = scores.reduce((a, s) => a + (Number.isFinite(s.score) ? s.score : 0), 0) || 1;
  const probs = {};
  for (const s of scores) probs[s.key] = (s.score || 0) / sum;
  return probs;
}

/**
 * Optional: merge evidence vector (from diagnostic tags) into baseline.
 * evidenceVector must be in the same dimensions as stateSpace.
 */
export function mergeBaselineAndEvidence(baselineVec, evidenceVec, weight = 0.35) {
  if (!evidenceVec) return baselineVec;

  const base = emptyState();
  const delta = {};
  for (const k of Object.keys(base)) {
    const e = Number.isFinite(evidenceVec[k]) ? evidenceVec[k] : base[k];
    delta[k] = e - base[k]; // convert absolute evidence vec into delta vs emptyState
  }

  const merged = { ...(baselineVec || emptyState()) };
  for (const k of Object.keys(delta)) {
    const cur = Number.isFinite(merged[k]) ? merged[k] : base[k];
    merged[k] = cur + delta[k] * weight;
  }

  return clampState(merged);
}

/**
 * Checks if a state represents a strong signal pattern that should override uncertainty.
 * @param {string} topKey - Top-ranked state key
 * @param {Object} levels - Levelized state vector
 * @returns {boolean} true if state matches a strong pattern
 */
function isStrongSignalState(topKey, levels) {
  switch (topKey) {
    case 'exhausted':
      return levels.F_high && levels.Ar_low; // tension may be high; exhausted still valid
    case 'overloaded':
      // Strong overloaded: T_high && F_high and either !Ar_low OR (Ag_low && Vneg)
      return levels.T_high && levels.F_high && (!levels.Ar_low || (levels.Ag_low && levels.Vneg));
    case 'blocked':
      return levels.T_high && levels.Ag_low && !levels.Ar_low;
    case 'engaged':
      return levels.Vpos && levels.Ar_high && !levels.T_high && !levels.F_high && !levels.Ag_low;
    case 'grounded':
      return levels.T_low && levels.Ag_high && !levels.Ar_high && !levels.F_high && !levels.Vneg && levels.C_high;
    default:
      return false;
  }
}

/**
 * Breaks ties between states with equal scores by checking strong signal patterns.
 * Priority order: overloaded > blocked > pressured > exhausted > down > averse > engaged > grounded > capable > connected > detached
 * @param {Object} params - { topKeys: string[], levels: Object }
 * @returns {string | null} Winning state key, or null if no valid candidate
 */
function breakTieBySignals({ topKeys, levels }) {
  if (!topKeys || topKeys.length === 0) return null;
  
  const priority = [
    'overloaded',
    'blocked',
    'pressured',
    'exhausted',
    'down',
    'averse',
    'engaged',
    'grounded',
    'capable',
    'connected',
    'detached',
  ];

  // First pass: check for strong signal states
  for (const key of priority) {
    if (!topKeys.includes(key)) continue;
    if (isStrongSignalState(key, levels)) {
      return key;
    }
  }

  // Second pass: if no strong signals, use priority order
  for (const key of priority) {
    if (topKeys.includes(key)) return key;
  }
  
  // Fallback: return first key
  return topKeys[0] || null;
}

/**
 * Decides when to force uncertain as the output state for baseline routing.
 * Task P(B).1: Uncertain only for "extreme uncertainty" — very rare cases.
 * 
 * Extreme uncertainty requires ALL of:
 * - Certainty at minimum quantized level (0 or 0.333)
 * - Extremely weak match (score1 below floor)
 * - No strong-signal states match
 * 
 * Low clarity alone does NOT force uncertain — it becomes a clarityFlag instead.
 * @param {Object} params - { levels, delta, score1, score2, topKey, certaintyRaw }
 * @returns {{ force: boolean, reason: string | null, clarityFlag: string | null }} Object with force flag, reason, and clarity flag
 */
function shouldReturnUncertainBaseline({ levels, delta, score1, score2, topKey, certaintyRaw }) {
  // Task P(B).6: Thresholds based on quantized baseline values
  // Baseline quantization: certainty can be 0, 0.333, 0.667, 1.0, 1.333, 1.667, 2.0
  // Minimum quantized certainty = 0 (or 0.333 if we consider 0 as "not measured")
  const CERTAINTY_MIN_QUANTIZED = 0.0; // Minimum possible quantized value
  const CERTAINTY_EXTREME_LOW = 0.35; // Below this is "extreme low" (captures 0 and 0.333)
  
  // Task P(B).6: Score floor based on p01/p05 distribution
  // From previous analysis: p05 ≈ 0.05, p01 likely lower
  const SCORE_FLOOR_EXTREME = 0.04; // Below this: extremely weak match (p01-p05 range)
  const SCORE_OK = 0.16; // Above this: match is acceptable

  // 0) If top score is strong, do NOT force uncertain
  if (score1 >= SCORE_OK) {
    return { force: false, reason: null, clarityFlag: null };
  }

  // 1) Strong-signal override: do NOT force uncertain if top-1 matches a strong pattern
  if (topKey && isStrongSignalState(topKey, levels)) {
    return { force: false, reason: null, clarityFlag: null };
  }

  // 2) Absolute confidence override: if top score is very high, accept it
  if (score1 >= 0.78 && delta >= 0.01) {
    return { force: false, reason: null, clarityFlag: null };
  }

  // Task P(B).1: Extreme uncertainty — requires ALL conditions:
  // - Certainty at extreme low (quantized minimum or near-minimum)
  // - Extremely weak match (score1 below floor)
  // - No strong-signal override (already checked above)
  const isExtremeUncertainty = 
    (certaintyRaw !== null && certaintyRaw <= CERTAINTY_EXTREME_LOW) &&
    score1 < SCORE_FLOOR_EXTREME;

  if (isExtremeUncertainty) {
    return { force: true, reason: 'extreme_uncertainty', clarityFlag: null };
  }

  // Task P(B).2: Low clarity does NOT force uncertain — it becomes a flag
  // If clarity is low but not extreme, set clarityFlag but keep stateKey as top1
  let clarityFlag = null;
  if (levels.C_low) {
    clarityFlag = 'low';
  } else if (certaintyRaw !== null && certaintyRaw < 0.7) {
    // Medium-low clarity (not extreme, but below comfortable threshold)
    clarityFlag = 'medium';
  }

  // Task I1.3: Extremely weak match: do NOT return uncertain as a state.
  // We still choose the best macro state, but mark confidence as low and attach a warning reason.
  if (score1 < SCORE_FLOOR_EXTREME) {
    return { force: false, reason: null, warn: 'weak_match_extreme', clarityFlag };
  }

  // Otherwise do not force uncertain, but may have clarityFlag
  return { force: false, reason: null, clarityFlag };
}

/**
 * Route state from baseline (and optionally evidence).
 * Returns a structure compatible with routeStateFromCards().
 * Always returns a concrete state (never 'mixed' as dominant), but flags uncertainty via isUncertain.
 * uncertain is only returned via explicit rule, not by similarity ranking.
 */
export function routeStateFromBaseline(metrics, opts = {}) {
  const baselineVec = baselineToVector(metrics);
  const merged = mergeBaselineAndEvidence(baselineVec, opts?.evidenceVector, opts?.evidenceWeight ?? 0.35);

  // Enable eligibility gates for baseline mode
  // Task F3: Enable debug to collect eligibility diagnostics
  // Task W1: rankStates now guarantees non-empty result (throws if impossible)
  const ranked = rankStates(merged, {
    eligibility: {
      enabled: true,
      mode: 'baseline',
      debug: opts?.eligibilityDebug !== false, // Default to true for diagnostics
    },
  });
  
  // Task W1: Extract selection diagnostics
  const selectionDiagnostics = ranked?._selectionDiagnostics || {};
  const selectionPath = ranked?._eligibilityPass || 'none';
  const strictCount = selectionDiagnostics.strictCount ?? ranked.length;
  const hardCount = selectionDiagnostics.hardCount ?? 0;
  const fallbackUsed = selectionDiagnostics.fallbackUsed ?? false;
  const lastResortUsed = selectionDiagnostics.lastResortUsed ?? false;
  
  // Task W2: allFiltered is now only for impossible situations (should never happen after W1)
  // If rankStates returns empty (should throw), this is a system error
  const rankedCount = ranked?.length ?? 0;
  const allFiltered = rankedCount === 0;
  
  if (allFiltered) {
    // Task W2: This should never happen - rankStates should throw instead
    // But if it does, treat as system error and throw
    throw new Error(`baselineEngine: rankStates returned empty array. This violates W1 contract. StateVec: ${JSON.stringify(merged)}, SelectionPath: ${selectionPath}`);
  }

  const top1 = ranked[0];
  const top2 = ranked[1];
  
  const score1 = top1?.score || 0;
  const score2 = top2?.score || 0;
  const delta = score1 - score2;

  // Compute levels for uncertainty rule
  const levels = levelizeStateVec(merged);
  // Task P(B).6: Get raw certainty value for quantized threshold checks
  const certaintyRaw = merged?.certainty ?? null;
  
  // Task D2.1: Handle ties BEFORE forcing uncertain
  // Task D2.2: Handle multi-way ties (top-k, not only top-2)
  // Task D2.5.1: Always resolve ties (do not require score1 >= SCORE_WEAK)
  let dominant;
  let secondary;
  let forceUncertain = false;
  let uncertainReason = null;
  let tieResolved = false;
  let tieWinner = null;
  let tiedKeysCount = 0;
  let matchWarning = null; // Task I1.3: weak_match_extreme warning (declared here for scope)
  let clarityFlag = null; // Task P(B).2: Low clarity flag (declared here for scope)
  
  const EPS = 1e-9;
  // Fix: Only consider it a tie if we have at least 2 candidates with the same score
  // If ranked.length === 1, delta === 0 is not a tie, it's just one candidate with score 0
  const isTie = ranked.length >= 2 && Math.abs(delta) <= EPS;
  
  if (isTie) {
    // Multi-way tie: collect all candidates with score === score1
    // Exclude 'uncertain' from tied keys (it should not be in ranked, but safety check)
    const tied = ranked.filter(r => Math.abs((r.score ?? 0) - score1) <= EPS);
    const tiedKeys = tied.map(r => r.key).filter(Boolean).filter(k => k !== 'uncertain');
    tiedKeysCount = tiedKeys.length;
    
    if (tiedKeys.length > 0) {
      // Task D2.3: Guaranteed tie-breaker (never returns null when tiedKeys non-empty)
      tieWinner = breakTieBySignals({ topKeys: tiedKeys, levels });
      
      // Guaranteed winner by design (D2.3); still guard just in case.
      if (tieWinner && tieWinner !== 'uncertain') {
        dominant = tieWinner;
        // secondary can be previous top1/top2 or null; keep for debug
        secondary = top1?.key && top1.key !== tieWinner ? top1.key : (top2?.key || null);
        
        // Mark tie resolution in decision for reporting
        tieResolved = true;
        forceUncertain = false;
      } else {
        // Task O1: Should not happen due to D2.3 guarantee, but safety fallback
        // Never choose uncertain from tie-breaker
        const fallback = tiedKeys.find(k => k !== 'uncertain') || tiedKeys[0];
        if (fallback) {
          dominant = fallback;
          secondary = tiedKeys.find(k => k !== fallback && k !== 'uncertain') || tiedKeys[1] || null;
        } else if (top1?.key) {
          dominant = top1.key;
          secondary = top2?.key || null;
        } else {
          // Task O1: If no fallback and no top1, this is an error - should force uncertain
          console.error('[baselineEngine] ERROR: No fallback candidate in tie-breaker. Setting forceUncertain=true.');
          dominant = 'uncertain';
          secondary = null;
          forceUncertain = true;
          uncertainReason = 'all_tied_uncertain';
        }
        if (!forceUncertain) {
          tieResolved = true;
        }
      }
    } else {
      // No tied keys found (all were uncertain or empty) - this should not happen
      // Fallback to top1 if it's not uncertain, otherwise force uncertain
      if (top1?.key && top1.key !== 'uncertain') {
        dominant = top1.key;
        secondary = top2?.key || null;
        forceUncertain = false;
      } else {
        // All candidates were uncertain - this is an error case
        dominant = 'uncertain';
        secondary = null;
        forceUncertain = true;
        uncertainReason = 'all_tied_uncertain';
      }
    }
  } else {
    // Normal case (no tie): apply uncertainty rule
    // Task P(B).6: Pass certaintyRaw for quantized threshold checks
    const certaintyRaw = merged?.certainty ?? null;
    const result = shouldReturnUncertainBaseline({
      levels,
      delta,
      score1,
      score2,
      topKey: top1?.key,
      certaintyRaw, // Task P(B).6: For quantized threshold checks
    });

    forceUncertain = result.force;
    uncertainReason = result.reason;
    matchWarning = result.warn || null; // Task I1.3: weak_match_extreme warning
    clarityFlag = result.clarityFlag || null; // Task P(B).2: Low clarity flag (not forcing uncertain)

    // Select dominant: force uncertain if rule applies, otherwise use top ranked candidate
    // Task O1: Do NOT use 'uncertain' as fallback if forceUncertain === false
    // If top1?.key is missing, this is an error case - should not happen after eligibility
    if (forceUncertain) {
      dominant = 'uncertain';
      secondary = top1?.key || null;
    } else {
        // Task O1: top1 should always exist (ranked is non-empty), but if not, log error
        if (!top1?.key) {
          console.error('[baselineEngine] ERROR: top1?.key is missing but forceUncertain === false. ranked.length =', ranked.length);
          // Task O1: If ranked is non-empty, first item should have a key
          // If not, this is an error - should force uncertain
          if (ranked.length > 0 && ranked[0]?.key) {
            dominant = ranked[0].key;
          } else {
            console.error('[baselineEngine] ERROR: ranked is non-empty but first item has no key. Setting forceUncertain=true.');
            dominant = 'uncertain';
            forceUncertain = true;
            uncertainReason = 'missing_top1_key';
          }
        } else {
          dominant = top1.key;
        }
      secondary = top2?.key || null;
    }
  }
  
  // Task D2.5.2: Make forced uncertain ignore ties (ties are resolved first)
  // If a tie was resolved, do not force uncertain based on delta rules.
  // Uncertain remains possible only for all_filtered.
  // Task O1: If tie was resolved and dominant is uncertain, correct dominant to top1
  if (tieResolved) {
    // Ties are already resolved, do not override with uncertain
    if (dominant === 'uncertain' && top1?.key && top1.key !== 'uncertain') {
      // Task O1: If dominant is uncertain but tie was resolved, use top1 instead
      dominant = top1.key;
      secondary = top2?.key || null;
    }
    forceUncertain = false;
    uncertainReason = null;
  }

  // Task I2: Calculate confidenceBand and relative delta
  const deltaRel = score1 > 1e-6 ? (delta / score1) : 0;
  
  // Task I2: Confidence bands tuned for low-score regime
  // Task P(B).2: Low clarity also implies low confidence
  let confidenceBand = 'medium';
  if (score1 < 0.12 || deltaRel < 0.06 || matchWarning === 'weak_match_extreme' || clarityFlag === 'low') {
    // Task I1.3: weak_match_extreme implies low confidence
    // Task P(B).2: clarityFlag === 'low' also implies low confidence
    confidenceBand = 'low';
  } else if (score1 >= 0.18 && deltaRel >= 0.10 && clarityFlag !== 'low' && clarityFlag !== 'medium') {
    confidenceBand = 'high';
  }
  
  // Task N1: Continuous confidence (0..1) kept for UI/debug.
  // Do NOT treat this as "uncertain state".
  const confidence = clamp(delta / 0.06, 0, 1);
  
  // Task P(B).2: "Needs refine" includes low clarity flag
  // Task N1: "Needs refine" is the new semantic: forced uncertain OR low confidence OR match warning OR low clarity.
  const needsRefine = forceUncertain || confidenceBand === 'low' || matchWarning != null || clarityFlag === 'low';
  
  // Task N1: Backward-compat alias (if old UI expects isUncertain).
  // NOTE: This is NOT the same as stateKey === 'uncertain'!
  // stateKey === 'uncertain' only when forceUncertain === true.
  const isUncertain = needsRefine;

  // Task O2.5: CRITICAL INVARIANT — stateKey === 'uncertain' ONLY if forcedUncertain === true
  // If dominant is 'uncertain' but forcedUncertain is false, we have a bug — fix it
  if (dominant === 'uncertain' && !forceUncertain) {
    console.error('[baselineEngine] CRITICAL BUG: dominant === "uncertain" but forcedUncertain === false. Correcting to top1.');
    if (top1?.key && top1.key !== 'uncertain') {
      dominant = top1.key;
      secondary = top2?.key || null;
    } else if (ranked.length > 0 && ranked[0]?.key && ranked[0].key !== 'uncertain') {
      dominant = ranked[0].key;
      secondary = ranked[1]?.key || null;
    } else {
      // Last resort: force uncertain
      console.error('[baselineEngine] ERROR: No valid candidate found, forcing uncertain.');
      dominant = 'uncertain';
      forceUncertain = true;
      uncertainReason = 'invariant_violation_fallback';
    }
  }

  // Task W3: Apply semantic hard-blocks to final winner
  // Even if a state passed through eligibility/fallback, check it one more time
  let finalWinner = dominant;
  const finalLevels = levelizeStateVec(merged);
  
  // Task W3: Check if final winner violates semantic hard-blocks
  let winnerBlocked = false;
  if (finalWinner === 'connected' && (finalLevels.F_high || finalLevels.T_high || finalLevels.Vneg)) {
    winnerBlocked = true;
  } else if (finalWinner === 'engaged' && (!finalLevels.Vpos || finalLevels.F_high || finalLevels.T_high)) {
    winnerBlocked = true;
  } else if (finalWinner === 'grounded' && (finalLevels.T_high || finalLevels.Ag_low)) {
    winnerBlocked = true;
  }
  
  // Task W3: If winner is blocked, find next valid candidate
  if (winnerBlocked) {
    for (const candidate of ranked) {
      if (candidate.key === finalWinner) continue; // Skip the blocked one
      
      let candidateBlocked = false;
      if (candidate.key === 'connected' && (finalLevels.F_high || finalLevels.T_high || finalLevels.Vneg)) {
        candidateBlocked = true;
      } else if (candidate.key === 'engaged' && (!finalLevels.Vpos || finalLevels.F_high || finalLevels.T_high)) {
        candidateBlocked = true;
      } else if (candidate.key === 'grounded' && (finalLevels.T_high || finalLevels.Ag_low)) {
        candidateBlocked = true;
      }
      
      if (!candidateBlocked) {
        finalWinner = candidate.key;
        console.warn(`[baselineEngine] W3: Winner ${dominant} blocked by semantic hard-blocks, using ${finalWinner} instead.`);
        break;
      }
    }
    
    // If all candidates are blocked, this is an error (should not happen after fallback)
    if (finalWinner === dominant && winnerBlocked) {
      throw new Error(`baselineEngine W3: All candidates blocked by semantic hard-blocks. Dominant: ${dominant}, Levels: ${JSON.stringify(finalLevels)}`);
    }
  }
  
  // Task O2.1: Normalize flags — ensure forcedUncertain is always boolean (never undefined)
  // Task O2.2: stateKey is the canonical source — always equals dominant
  const finalStateKey = finalWinner; // Task W3: Use validated winner
  const finalForcedUncertain = Boolean(forceUncertain); // Explicitly convert to boolean
  const finalUncertainReason = finalForcedUncertain ? (uncertainReason || 'unknown') : null;

  // Task O2.5: Final invariant check before return
  if (finalStateKey === 'uncertain' && !finalForcedUncertain) {
    console.error('[baselineEngine] FATAL: Invariant violation detected before return. stateKey="uncertain" but forcedUncertain=false. This should never happen.');
    throw new Error('Invariant violation: stateKey === "uncertain" but forcedUncertain !== true');
  }
  if (finalForcedUncertain && finalStateKey !== 'uncertain') {
    console.error('[baselineEngine] FATAL: Invariant violation detected before return. forcedUncertain=true but stateKey !== "uncertain". This should never happen.');
    throw new Error('Invariant violation: forcedUncertain === true but stateKey !== "uncertain"');
  }

  // Always return dominant as stateKey (never 'mixed'), but flag uncertainty
  const finalTop = [finalStateKey, secondary].filter(Boolean);
  const probs = normalizeProbs(ranked);

  return {
    stateKey: finalStateKey, // Task O2.2: stateKey is the canonical source
    top: finalTop.length > 0 ? finalTop : [dominant],
    dominant,
    secondary,

    // Diagnostics for analysis/tuning
    top1Key: top1?.key || null,
    top2Key: top2?.key || null,
    score1,
    score2,

    confidence: needsRefine ? Math.max(confidence, 0.2) : confidence,
    delta,
    deltaRel, // Task I2: Relative delta (delta / score1)
    isUncertain, // Task N1: Backward-compat alias for needsRefine (NOT stateKey === 'uncertain'!)
    needsRefine, // Task P(B).2: Semantic flag: forced uncertain OR low confidence OR match warning OR low clarity
    confidenceBand, // Task I2: 'high' | 'medium' | 'low'
    matchWarning, // Task I1.3 + N3: 'weak_match_extreme' | null
    clarityFlag, // Task P(B).2: 'low' | 'medium' | null — indicates clarity quality without forcing uncertain
    probs,
    tagFreq: {},
    mode: 'baseline',
    vector: merged,
    emotionKey: 'mixed', // Emotion lens can still use 'mixed' as fallback
    emotionTop: [],

    forcedUncertain: finalForcedUncertain, // Task O2.1: Always boolean, never undefined
    uncertainReason: finalUncertainReason, // Task O2.1: null or string (only if forcedUncertain=true)
    
    // Task F1: Diagnostic fields
    rankedCount,
    allFiltered: false, // Task W2: Should always be false after W1 (rankStates never returns empty)
    eligibilityPass: selectionPath,
    selectionPath, // Task W1: Canonical selection path
    selectionDiagnostics: { // Task W1: Full selection diagnostics
      selectionPath,
      strictCount,
      hardCount,
      fallbackUsed,
      lastResortUsed,
    },
    
    // Task F3: Eligibility diagnostics (if available)
    _eligibilityDiagnostics: ranked?._eligibilityDiagnostics || null,
    
    // Task D2.4 + D2.7: Tie diagnostics
    _tieDiagnostics: {
      isTie,
      tieResolved,
      tieWinner,
      tiedCount: tiedKeysCount,
    },
  };
}
