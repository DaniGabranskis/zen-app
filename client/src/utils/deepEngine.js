// Deep Engine (Main orchestrator for AE0-AE4)
// Routes state classification in deep dive flows

import { routeStateFromBaseline } from './baselineEngine.js';
import { accumulateEvidence, applyUncertaintyPolicy } from './evidenceAccumulator.js';
import { selectMicro, shouldMicroBeNull, selectMicroDebug } from './microSelector.js';
import { shouldFlipMacro, getDecisiveTags } from './macroFlip.js';
import { microBelongsToMacro, getMicrosForMacro } from '../data/microTaxonomy.js';

/**
 * Get fallback micro key for a macro (first micro in taxonomy)
 * @param {string} macroKey - Macro state key
 * @returns {string|null} Fallback micro key or null if macro has no micros
 */
function getFallbackMicroKey(macroKey) {
  const micros = getMicrosForMacro(macroKey);
  return micros[0]?.microKey || null;
}

/**
 * Deep classification result type (from DEEP_ROUTING_CONTRACT.md)
 * @typedef {Object} DeepClassificationResult
 * @property {string} macroKey - Macro state (from baseline, or flipped)
 * @property {string|null} microKey - Micro state (nullable, deep-only)
 * @property {'high'|'medium'|'low'} confidenceBand - Confidence band
 * @property {'low'|'medium'|null} clarityFlag - Clarity flag
 * @property {boolean} needsRefine - Needs refine flag
 * @property {boolean} macroFlipApplied - True if macro was flipped
 * @property {string|null} macroFlipReason - Reason for flip (if applied)
 * @property {string[]} evidenceTags - Normalized sig.* tags
 * @property {string[]} uncertaintySignals - uncertainty_note.* tags
 * @property {string} baselineMacro - Original macro from baseline
 * @property {'high'|'medium'|'low'} baselineConfidence - Baseline confidence
 * @property {Object} [diagnostics] - Diagnostics for simulation/debugging
 */

/**
 * Route state classification in deep dive flow
 * @param {Object} baselineMetrics - Baseline metrics (6 dimensions)
 * @param {Array<L1CardResponse>} l1Responses - User responses to L1 cards
 * @param {Object} options - Options: { evidenceWeight: number }
 * @returns {Promise<DeepClassificationResult>}
 */
export async function routeStateFromDeep(baselineMetrics, l1Responses = [], options = {}) {
  // Step 1: Get baseline prior
  const baselineResult = routeStateFromBaseline(baselineMetrics, {
    evidenceVector: null,
    evidenceWeight: 0.25,
  });
  
  const baselineMacro = baselineResult.stateKey;
  const baselineConfidence = baselineResult.confidenceBand || 'medium';
  
  // Task AF: Ensure compatibility - deep result should have stateKey for L5
  // Use macroKey as stateKey for backward compatibility
  
  // Step 2: Accumulate evidence from L1 cards
  const { evidenceTags, uncertaintySignals } = accumulateEvidence(l1Responses);
  
  // Step 3: Apply uncertainty policy (reduce confidence but don't break classification)
  const adjustedConfidence = applyUncertaintyPolicy(baselineConfidence, uncertaintySignals);
  
  // Step 4: Select micro within baseline macro
  // Task AK3-POST-2: selectMicro is now sync (static import)
  // Task AK3-POST-1.1: Use selectMicroDebug to get diagnostic info
  const microDebug = selectMicroDebug(baselineMacro, evidenceTags, {
    threshold: 0.3,
    preferSpecific: true,
  });
  
  let microResult = microDebug.selected;
  let microReason = microDebug.reason;
  let microTopCandidate = microDebug.topCandidate;
  
  // Step 5: Check if micro should be null (weak/conflicting evidence)
  if (microResult && shouldMicroBeNull(baselineMacro, evidenceTags, adjustedConfidence)) {
    microResult = null;
    microReason = 'should_be_null_weak_evidence';
  }
  
  // Step 6: Check for macro flip (rare)
  let finalMacro = baselineMacro;
  let macroFlipApplied = false;
  let macroFlipReason = null;
  let flipDiagnostics = null;
  
  // Only consider flip if baseline confidence is not high
  if (adjustedConfidence !== 'high' && evidenceTags.length > 0) {
    // TODO: Calculate alternative macro scores based on evidence
    // For now, skip macro flip (to be implemented in full deep engine)
    // This is a placeholder for the full implementation
  }
  
  // Step 7: Calculate final confidence and clarity
  let finalConfidence = adjustedConfidence;
  let clarityFlag = baselineResult.clarityFlag || null;
  
  // If micro is null, reduce confidence
  if (!microResult) {
    if (finalConfidence === 'high') {
      finalConfidence = 'medium';
    } else if (finalConfidence === 'medium') {
      finalConfidence = 'low';
    }
    clarityFlag = clarityFlag || 'low';
  }
  
  // Step 7.5: Compute final microKey with fallback + microSource
  const selectedMicroKey = microResult?.microKey || null;
  const fallbackMicroKey = selectedMicroKey ? null : getFallbackMicroKey(finalMacro);
  const microKeyFinal = selectedMicroKey || fallbackMicroKey;
  
  const microSource = selectedMicroKey
    ? 'selected'
    : (fallbackMicroKey ? 'fallback' : 'none');
  
  // If we had to fallback, be honest in quality
  if (microSource === 'fallback') {
    finalConfidence = 'low';
    clarityFlag = 'low';
  }
  
  // Step 8: Calculate needsRefine
  const needsRefine =
    finalConfidence === 'low' ||
    clarityFlag === 'low' ||
    uncertaintySignals.length > 0 ||
    microSource === 'fallback';
  
  // Step 9: Build result (Task AF: compatible with baseline format for L5)
  const result = {
    // Core state (backward compatible with baseline format)
    stateKey: finalMacro, // Task AF: Use stateKey for L5 compatibility (same as macroKey)
    macroKey: finalMacro,
    microKey: microKeyFinal,
    microSource,
    microReason, // Task AK3-POST-1.1: Reason for micro selection/fallback
    microTopCandidate, // Task AK3-POST-1.1: Top candidate even if not selected
    dominant: finalMacro, // Backward compatibility
    secondary: null, // Could be set if needed
    
    // Quality signals
    confidenceBand: finalConfidence,
    clarityFlag,
    needsRefine,
    
    // Macro flip tracking
    macroFlipApplied,
    macroFlipReason,
    
    // Evidence
    evidenceTags,
    uncertaintySignals,
    
    // Baseline reference
    baselineMacro,
    baselineConfidence,
    
    // Backward compatibility fields (from baseline result)
    score1: baselineResult.score1,
    score2: baselineResult.score2,
    delta: baselineResult.delta,
    vector: baselineResult.vector,
    
    // Diagnostics (for simulation/debugging)
    diagnostics: {
      microScores: microResult ? { [microResult.microKey]: microResult.score } : {},
      selectedMicro: microResult ? {
        key: microResult.microKey,
        score: microResult.score,
        matchedTags: microResult.matchedTags,
      } : null,
      evidenceWeight: evidenceTags.length,
      ...flipDiagnostics,
    },
  };
  
  // Step 10: Sanity checks
  if (result.microKey && !microBelongsToMacro(result.microKey, result.macroKey)) {
    console.error('[deepEngine] Sanity check failed: micro does not belong to macro', {
      microKey: result.microKey,
      macroKey: result.macroKey,
    });
    
    const repaired = getFallbackMicroKey(result.macroKey);
    result.microKey = repaired;
    result.microSource = repaired ? 'fallback_sanity' : 'none';
    
    // Be honest in quality after repair
    result.confidenceBand = 'low';
    result.clarityFlag = 'low';
    result.needsRefine = true;
  }
  
  if (result.macroFlipApplied && !result.macroFlipReason) {
    console.error('[deepEngine] Sanity check failed: macro flip applied but no reason', result);
    // Fix: set flip to false
    result.macroFlipApplied = false;
  }
  
  return result;
}
