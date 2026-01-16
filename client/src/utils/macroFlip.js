// Macro Flip Logic (AE4)
// Determines when to flip macro from baseline to alternative

import { calculateEvidenceWeight } from './evidenceAccumulator.js';

// Macro clusters (for cluster proximity check)
const MACRO_CLUSTERS = {
  stress: ['pressured', 'blocked', 'overloaded'],
  low_energy: ['exhausted', 'down', 'averse', 'detached'],
  positive: ['grounded', 'engaged', 'connected', 'capable'],
};

// Cluster neighbors (allowed flip paths)
const CLUSTER_NEIGHBORS = {
  stress: ['low_energy', 'positive'],
  low_energy: ['stress'],
  positive: ['stress'],
};

/**
 * Check if macro flip should be applied
 * @param {Object} params - Flip parameters
 * @returns {{ shouldFlip: boolean, reason: string | null }}
 */
export function shouldFlipMacro({
  baselineMacro,
  baselineConfidence,
  evidenceTags,
  alternativeMacro,
  alternativeScore,
  baselineScore,
}) {
  // 1. Baseline confidence not high
  if (baselineConfidence === 'high') {
    return { shouldFlip: false, reason: null };
  }
  
  // 2. Strong evidence against baseline
  const evidenceWeight = calculateEvidenceWeight(evidenceTags, alternativeMacro);
  if (evidenceWeight < 0.5) {
    return { shouldFlip: false, reason: null };
  }
  
  // 3. Score difference threshold
  const scoreDiff = alternativeScore - baselineScore;
  if (scoreDiff < 0.1) {
    return { shouldFlip: false, reason: null };
  }
  
  // 4. Semantic compatibility
  if (!isSemanticallyCompatible(alternativeMacro, evidenceTags)) {
    return { shouldFlip: false, reason: null };
  }
  
  // 5. Cluster proximity
  if (!isClusterNeighbor(baselineMacro, alternativeMacro)) {
    return { shouldFlip: false, reason: null };
  }
  
  // Determine flip reason
  let reason = 'strong_evidence';
  if (getCluster(baselineMacro) !== getCluster(alternativeMacro)) {
    reason = 'cluster_conflict';
  }
  
  // All conditions met
  return { shouldFlip: true, reason };
}

/**
 * Check semantic compatibility (hard blockers)
 * @param {string} macroKey - Macro state key
 * @param {string[]} evidenceTags - Evidence tags
 * @returns {boolean} True if semantically compatible
 */
function isSemanticallyCompatible(macroKey, evidenceTags) {
  // Hard blockers (same as baseline engine)
  if (macroKey === 'connected') {
    // connected NEVER if F_high || T_high || Vneg
    if (evidenceTags.includes('sig.fatigue.high') ||
        evidenceTags.includes('sig.tension.high') ||
        evidenceTags.includes('sig.valence.neg')) {
      return false;
    }
  }
  
  if (macroKey === 'engaged') {
    // engaged NEVER if !Vpos || F_high || T_high
    if (!evidenceTags.includes('sig.valence.pos') ||
        evidenceTags.includes('sig.fatigue.high') ||
        evidenceTags.includes('sig.tension.high')) {
      return false;
    }
  }
  
  if (macroKey === 'grounded') {
    // grounded NEVER if T_high || Ag_low
    if (evidenceTags.includes('sig.tension.high') ||
        evidenceTags.includes('sig.agency.low')) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if two macros are cluster neighbors
 * @param {string} macro1 - First macro
 * @param {string} macro2 - Second macro
 * @returns {boolean} True if neighbors
 */
function isClusterNeighbor(macro1, macro2) {
  const cluster1 = getCluster(macro1);
  const cluster2 = getCluster(macro2);
  
  if (cluster1 === cluster2) {
    return true; // Same cluster
  }
  
  const neighbors = CLUSTER_NEIGHBORS[cluster1] || [];
  return neighbors.includes(cluster2);
}

/**
 * Get cluster for macro
 * @param {string} macroKey - Macro state key
 * @returns {string} Cluster name
 */
function getCluster(macroKey) {
  for (const [cluster, macros] of Object.entries(MACRO_CLUSTERS)) {
    if (macros.includes(macroKey)) {
      return cluster;
    }
  }
  return 'unknown';
}

/**
 * Get decisive tags for macro flip
 * @param {string[]} evidenceTags - All evidence tags
 * @param {string} targetMacro - Target macro
 * @returns {string[]} Decisive tags
 */
export function getDecisiveTags(evidenceTags, targetMacro) {
  // Micro tags for target macro are most decisive
  const microTags = evidenceTags.filter(tag => 
    tag.startsWith(`sig.micro.${targetMacro}.`)
  );
  
  // Context/trigger tags are secondary
  const contextTags = evidenceTags.filter(tag => 
    tag.startsWith('sig.context.') || tag.startsWith('sig.trigger.')
  );
  
  return [...microTags, ...contextTags.slice(0, 3)]; // Top 3 context tags
}
