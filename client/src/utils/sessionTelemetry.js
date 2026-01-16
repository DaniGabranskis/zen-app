// sessionTelemetry.js (AJ1 - Decision Payload Telemetry)
// Collects decision payload for each session for real-world validation

import { logEvent } from './telemetry.js';
import { levelizeStateVec } from './stateEligibility.js';
import { baselineToVector } from './baselineEngine.js';

/**
 * Log decision payload for a session
 * @param {Object} params - Session parameters
 * @param {Object} params.baselineMetrics - Baseline metrics (6 dimensions)
 * @param {Object} params.baselineResult - Baseline engine result
 * @param {Object} params.deepResult - Deep engine result (if deep flow)
 * @param {Array} params.l1Responses - L1 card responses (if deep flow)
 * @param {string} params.sessionType - 'morning' | 'evening'
 * @param {string} params.flowMode - 'simplified' | 'deep'
 */
export function logDecisionPayload({
  baselineMetrics,
  baselineResult,
  deepResult = null,
  l1Responses = [],
  sessionType,
  flowMode,
}) {
  // Derive levels from baseline vector
  const baselineVector = baselineToVector(baselineMetrics);
  const levels = levelizeStateVec(baselineVector);
  
  // Collect baseline inputs
  const baselineInputs = {
    metrics: { ...baselineMetrics },
    quantized: {
      valence: baselineMetrics.valence,
      energy: baselineMetrics.energy,
      tension: baselineMetrics.tension,
      clarity: baselineMetrics.clarity,
      control: baselineMetrics.control,
      social: baselineMetrics.social,
    },
    derivedLevels: {
      Vneg: levels.Vneg,
      Vpos: levels.Vpos,
      Vmid: levels.Vmid,
      Ar_low: levels.Ar_low,
      Ar_high: levels.Ar_high,
      Ar_mid: levels.Ar_mid,
      T_low: levels.T_low,
      T_high: levels.T_high,
      T_mid: levels.T_mid,
      Ag_low: levels.Ag_low,
      Ag_high: levels.Ag_high,
      Ag_mid: levels.Ag_mid,
      F_high: levels.F_high,
      C_low: levels.C_low,
      S_high: levels.S_high,
    },
  };
  
  // Collect baseline output
  const baselineOutput = {
    stateKey: baselineResult?.stateKey || null,
    confidenceBand: baselineResult?.confidenceBand || null,
    clarityFlag: baselineResult?.clarityFlag || null,
    needsRefine: baselineResult?.needsRefine || false,
    score1: baselineResult?.score1 || null,
    score2: baselineResult?.score2 || null,
    delta: baselineResult?.delta || null,
  };
  
  // Collect deep inputs (if deep flow)
  const deepInputs = deepResult ? {
    evidenceTags: deepResult.evidenceTags || [],
    uncertaintySignals: deepResult.uncertaintySignals || [],
    notSureCount: l1Responses.filter(r => r.uncertainty).length,
    totalL1Responses: l1Responses.length,
  } : null;
  
  // Collect deep output (if deep flow)
  const deepOutput = deepResult ? {
    stateKey: deepResult.stateKey || deepResult.macroKey || null,
    microKey: deepResult.microKey || null,
    macroFlipApplied: deepResult.macroFlipApplied || false,
    macroFlipReason: deepResult.macroFlipReason || null,
    confidenceBand: deepResult.confidenceBand || null,
    clarityFlag: deepResult.clarityFlag || null,
    needsRefine: deepResult.needsRefine || false,
    matchWarning: deepResult.matchWarning || null,
    baselineMacro: deepResult.baselineMacro || null,
  } : null;
  
  // Log telemetry event
  logEvent(
    'session_decision_payload',
    {
      sessionType,
      flowMode,
      baselineInputs,
      baselineOutput,
      deepInputs,
      deepOutput,
    },
    `Session decision payload: ${flowMode} flow, baseline=${baselineOutput.stateKey}, deep=${deepOutput?.stateKey || 'N/A'}`
  );
  
  return {
    baselineInputs,
    baselineOutput,
    deepInputs,
    deepOutput,
  };
}

/**
 * Get decision payload from current session (for validation/reporting)
 * @returns {Object | null} Decision payload or null if not available
 */
export function getCurrentSessionPayload() {
  // This would read from store or telemetry log
  // For now, return structure for reference
  return {
    baselineInputs: null,
    baselineOutput: null,
    deepInputs: null,
    deepOutput: null,
  };
}
