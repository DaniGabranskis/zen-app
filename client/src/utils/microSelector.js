// Micro Selector (AE3)
// Selects micro state within macro based on evidence tags

import { getMicrosForMacro } from '../data/microTaxonomy.js';
import { getMicroEvidenceTags } from '../data/microEvidenceTags.js';

/**
 * Score all micros for a macro (internal helper)
 * Task AK3-POST-1.1: Extracted for reuse in selectMicroDebug
 * @param {string} macroKey - Macro state key
 * @param {string[]} evidenceTags - Normalized evidence tags
 * @param {Object} options - Options: { preferSpecific: boolean }
 * @returns {Array<{ micro: Object, score: number, matchedTags: string[] }>} Sorted by score (descending)
 */
function scoreMicros(macroKey, evidenceTags, options = {}) {
  const { preferSpecific = true } = options;
  const micros = getMicrosForMacro(macroKey);
  
  if (micros.length === 0) {
    return [];
  }
  
  // Score each micro
  const microScores = micros.map(micro => {
    const matchedTags = [];
    let score = 0;
    
    // Task AK3.4: Check must-have tags (strong boost)
    const evidenceTagSet = getMicroEvidenceTags(micro.microKey);
    if (evidenceTagSet) {
      const mustHaveMatched = evidenceTagSet.mustHave.filter(tag => 
        evidenceTags.includes(tag)
      );
      const supportingMatched = evidenceTagSet.supporting.filter(tag => 
        evidenceTags.includes(tag)
      );

      // Task 2 (P0): Ensure matchedTags reflects what actually contributed to score.
      // Without this, topCandidate.matchedTags can look empty even when mustHave/supporting matched.
      for (const t of mustHaveMatched) {
        if (!matchedTags.includes(t)) matchedTags.push(t);
      }
      for (const t of supportingMatched) {
        if (!matchedTags.includes(t)) matchedTags.push(t);
      }
      
      // Task AK3.4: Must-have tags get strong multiplier
      // If all must-have match → strong boost (2x base)
      // If partial must-have → moderate boost (1.5x base)
      if (mustHaveMatched.length === evidenceTagSet.mustHave.length) {
        score += mustHaveMatched.length * 2.0; // All must-have: 2x multiplier
      } else if (mustHaveMatched.length > 0) {
        score += mustHaveMatched.length * 1.5; // Partial must-have: 1.5x multiplier
      }
      
      // Supporting tags: base weight
      score += supportingMatched.length * 1.0;
    }
    
    // Count matching evidence tags (fallback for micros without microEvidenceTags)
    for (const evidenceTag of evidenceTags) {
      // Direct match (only if not already counted in must-have/supporting)
      if (micro.evidenceTags.includes(evidenceTag)) {
        if (!matchedTags.includes(evidenceTag)) {
          matchedTags.push(evidenceTag);
          // Only add base weight if not already boosted by must-have
          if (!evidenceTagSet || !evidenceTagSet.mustHave.includes(evidenceTag)) {
            score += 1.0; // Base weight for direct match
          }
        }
      }
      
      // Optional weights (context/axis tags that boost this micro)
      if (micro.optionalWeights) {
        for (const [tagPrefix, weight] of Object.entries(micro.optionalWeights)) {
          if (evidenceTag.startsWith(tagPrefix)) {
            // If weight < 1.0 (e.g., 0.8), it should still contribute positively, not penalize.
            const bonus = weight >= 1.0 ? (weight - 1.0) : weight;
            score += bonus;
            
            // Track as matched signal for transparency/ties
            if (!matchedTags.includes(evidenceTag)) {
              matchedTags.push(evidenceTag);
            }
          }
        }
      }
    }
    
    // Task AK3.4: Tag specificity bonus (stronger for must-have matches)
    const specificityBonus = preferSpecific && matchedTags.length > 0
      ? 1.0 / (1.0 + matchedTags.length * 0.1)
      : 0;
    
    return {
      micro,
      score: score + specificityBonus,
      matchedTags,
    };
  });
  
  // Sort by score (descending)
  microScores.sort((a, b) => b.score - a.score);
  
  return microScores;
}

/**
 * Select micro state within macro based on evidence tags
 * Task AK3-POST-2: Changed back to sync (static import instead of dynamic)
 * @param {string} macroKey - Macro state key
 * @param {string[]} evidenceTags - Normalized evidence tags
 * @param {Object} options - Options: { threshold: number, preferSpecific: boolean }
 * @returns {{ microKey: string | null, score: number, matchedTags: string[] } | null}
 */
export function selectMicro(macroKey, evidenceTags, options = {}) {
  const { threshold = 0.3 } = options;
  
  const micros = getMicrosForMacro(macroKey);
  if (micros.length === 0) {
    return null;
  }
  
  const microScores = scoreMicros(macroKey, evidenceTags, options);
  
  // Task AK3.3: Dynamic threshold based on must-have match
  const topMicro = microScores[0];
  if (topMicro) {
    const topEvidenceTagSet = getMicroEvidenceTags(topMicro.micro.microKey);
    let effectiveThreshold = threshold;
    
    if (topEvidenceTagSet) {
      const mustHaveMatched = topEvidenceTagSet.mustHave.filter(tag => 
        evidenceTags.includes(tag)
      );
      
      if (mustHaveMatched.length === topEvidenceTagSet.mustHave.length) {
        effectiveThreshold = Math.min(threshold, 0.1);
      } else if (mustHaveMatched.length > 0) {
        effectiveThreshold = threshold * 0.7;
      }
    }
    
    if (topMicro.score >= effectiveThreshold) {
      // Check for ties
      const tiedMicros = microScores.filter(m => 
        Math.abs(m.score - topMicro.score) < 0.01
      );
      
      if (tiedMicros.length > 1) {
        const mostSpecific = tiedMicros.reduce((best, current) => {
          if (current.matchedTags.length < best.matchedTags.length) {
            return current;
          }
          return best;
        });
        
        return {
          microKey: mostSpecific.micro.microKey,
          score: mostSpecific.score,
          matchedTags: mostSpecific.matchedTags,
        };
      }
      
      return {
        microKey: topMicro.micro.microKey,
        score: topMicro.score,
        matchedTags: topMicro.matchedTags,
      };
    }
  }
  
  return null;
}

/**
 * Debug version of selectMicro that returns diagnostic information
 * Task AK3-POST-1.1: Provides reason and topCandidate even when returning null
 * @param {string} macroKey - Macro state key
 * @param {string[]} evidenceTags - Normalized evidence tags
 * @param {Object} options - Options: { threshold: number, preferSpecific: boolean }
 * @returns {Object} { selected: Object | null, topCandidate: Object | null, effectiveThreshold: number, reason: string }
 */
export function selectMicroDebug(macroKey, evidenceTags, options = {}) {
  const { threshold = 0.3 } = options;
  
  const micros = getMicrosForMacro(macroKey);
  if (micros.length === 0) {
    return {
      selected: null,
      topCandidate: null,
      effectiveThreshold: threshold,
      reason: 'no_micros',
    };
  }
  
  // Task P1.3: no_evidence only when evidenceTags.length === 0
  // If evidence exists but no match, use 'no_matches_zero_score' or 'below_threshold_nonzero'
  if (evidenceTags.length === 0) {
    const microScores = scoreMicros(macroKey, evidenceTags, options);
    const topCandidate = microScores[0] ? {
      microKey: microScores[0].micro.microKey,
      score: microScores[0].score,
      matchedTags: microScores[0].matchedTags,
    } : null;
    
    return {
      selected: null,
      topCandidate,
      effectiveThreshold: threshold,
      reason: 'no_evidence', // Only when evidenceTags.length === 0
    };
  }
  
  const microScores = scoreMicros(macroKey, evidenceTags, options);
  const topMicro = microScores[0];
  
  if (!topMicro) {
    return {
      selected: null,
      topCandidate: null,
      effectiveThreshold: threshold,
      reason: 'no_matches_zero_score',
    };
  }
  
  const topCandidate = {
    microKey: topMicro.micro.microKey,
    score: topMicro.score,
    matchedTags: topMicro.matchedTags,
  };
  
  // Calculate effective threshold
  const topEvidenceTagSet = getMicroEvidenceTags(topMicro.micro.microKey);
  let effectiveThreshold = threshold;
  
  if (topEvidenceTagSet) {
    const mustHaveMatched = topEvidenceTagSet.mustHave.filter(tag => 
      evidenceTags.includes(tag)
    );
    
    if (mustHaveMatched.length === topEvidenceTagSet.mustHave.length) {
      effectiveThreshold = Math.min(threshold, 0.1);
    } else if (mustHaveMatched.length > 0) {
      effectiveThreshold = threshold * 0.7;
    }
  }
  
  // Check if top candidate passes threshold
  if (topMicro.score >= effectiveThreshold) {
    // Check for ties
    const tiedMicros = microScores.filter(m => 
      Math.abs(m.score - topMicro.score) < 0.01
    );
    
    let selected;
    if (tiedMicros.length > 1) {
      const mostSpecific = tiedMicros.reduce((best, current) => {
        if (current.matchedTags.length < best.matchedTags.length) {
          return current;
        }
        return best;
      });
      
      selected = {
        microKey: mostSpecific.micro.microKey,
        score: mostSpecific.score,
        matchedTags: mostSpecific.matchedTags,
      };
    } else {
      selected = topCandidate;
    }
    
    return {
      selected,
      topCandidate,
      effectiveThreshold,
      // Task 2 (P0): Make reasons explicit and stable for downstream logging.
      // "matched" means we selected a micro (i.e., passed threshold).
      reason: 'matched',
    };
  }
  
  // Below threshold
  return {
    selected: null,
    topCandidate,
    effectiveThreshold,
    reason: topMicro.score === 0 ? 'no_matches_zero_score' : 'below_threshold_nonzero',
  };
}

/**
 * Check if micro should be null (weak/conflicting evidence)
 * Task AK3.3: Relaxed logic - only null if extremely weak evidence
 * @param {string} macroKey - Macro state key
 * @param {string[]} evidenceTags - Normalized evidence tags
 * @param {string} baselineConfidence - Baseline confidence band
 * @returns {boolean} True if micro should be null
 */
export function shouldMicroBeNull(macroKey, evidenceTags, baselineConfidence) {
  // Task AK3.3: Only null if baseline confidence is very low AND evidence is extremely weak
  // Previously: required sig.micro.* tags, now only check overall evidence strength
  if (baselineConfidence === 'low' && evidenceTags.length === 0) {
    return true; // No evidence at all
  }
  
  // Task AK3.3: Removed strict requirement for sig.micro.* tags
  // The selectMicro function already handles scoring and thresholding
  // If selectMicro returned a result, we should trust it (unless confidence is extremely low)
  
  // Only null if baseline is low AND we have very few tags (< 1)
  // This is a minimal check - selectMicro's threshold is the main gate
  if (baselineConfidence === 'low' && evidenceTags.length < 1) {
    return true;
  }
  
  return false;
}
