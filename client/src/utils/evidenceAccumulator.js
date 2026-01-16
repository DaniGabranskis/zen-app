// Evidence Accumulator (AE2)
// Collects and normalizes evidence tags from L1 card responses

import { normalizeTags, validateTagsNormalized } from '../data/tagAliasMap.js';

/**
 * Accumulates evidence tags from L1 card responses
 * @param {Array<L1CardResponse>} l1Responses - User responses to L1 cards
 * @returns {{ evidenceTags: string[], uncertaintySignals: string[] }}
 */
export function accumulateEvidence(l1Responses) {
  const evidenceTags = [];
  const uncertaintySignals = [];
  
  for (const response of l1Responses) {
    // Extract tags from response
    const responseTags = response.tags || [];
    const normalizedTags = normalizeTags(responseTags, response.values || {});
    
    // Validate normalized tags
    if (!validateTagsNormalized(normalizedTags)) {
      console.warn('[evidenceAccumulator] Invalid tags in response:', response);
    }
    
    // Add to evidence
    evidenceTags.push(...normalizedTags);
    
    // Handle "Not sure / both" responses
    if (response.uncertainty) {
      if (response.uncertainty === 'low_clarity') {
        uncertaintySignals.push('uncertainty_note.low_clarity');
      } else if (response.uncertainty === 'conflict') {
        uncertaintySignals.push('uncertainty_note.conflict');
      } else {
        uncertaintySignals.push('uncertainty_note.unknown');
      }
    }
  }
  
  // Remove duplicates
  const uniqueEvidenceTags = [...new Set(evidenceTags)];
  const uniqueUncertaintySignals = [...new Set(uncertaintySignals)];
  
  return {
    evidenceTags: uniqueEvidenceTags,
    uncertaintySignals: uniqueUncertaintySignals,
  };
}

/**
 * Calculate evidence weight (for macro flip decisions)
 * @param {string[]} evidenceTags - Normalized evidence tags
 * @param {string} targetMacro - Target macro state
 * @returns {number} Evidence weight (0-1)
 */
export function calculateEvidenceWeight(evidenceTags, targetMacro) {
  // Count micro tags that match target macro
  const microTags = evidenceTags.filter(tag => 
    tag.startsWith('sig.micro.') && tag.includes(targetMacro)
  );
  
  // Count context/trigger tags that are relevant
  const contextTags = evidenceTags.filter(tag => 
    tag.startsWith('sig.context.') || tag.startsWith('sig.trigger.')
  );
  
  // Weight: micro tags are strongest, context tags are medium
  const microWeight = microTags.length * 0.5;
  const contextWeight = contextTags.length * 0.2;
  
  // Normalize to 0-1
  const totalWeight = Math.min(microWeight + contextWeight, 1.0);
  return totalWeight;
}

/**
 * Apply "Not sure / both" policy: reduce confidence but don't break classification
 * @param {string} baselineConfidence - Baseline confidence band
 * @param {string[]} uncertaintySignals - Uncertainty signals from user responses
 * @returns {string} Adjusted confidence band
 */
export function applyUncertaintyPolicy(baselineConfidence, uncertaintySignals) {
  if (uncertaintySignals.length === 0) {
    return baselineConfidence;
  }
  
  // Each uncertainty signal reduces confidence by one level
  let adjusted = baselineConfidence;
  for (const _ of uncertaintySignals) {
    if (adjusted === 'high') {
      adjusted = 'medium';
    } else if (adjusted === 'medium') {
      adjusted = 'low';
    }
    // 'low' cannot go lower
  }
  
  return adjusted;
}
