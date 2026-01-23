// src/utils/probePlanBuilder.js
// Comments in English only.

import L1 from '../data/flow/L1.json';
import L2 from '../data/flow/L2.json';

/**
 * Build a probe plan (1-2 clarifying questions) when decision is uncertain.
 * Selects questions that help discriminate between top-2 candidate states.
 */
export function buildProbePlan({
  topStates = [], // [dominant, secondary] - top 2 state candidates
  alreadyAskedIds = [], // IDs of questions already asked in main plan
} = {}) {
  const [top1, top2] = topStates || [];
  if (!top1 && !top2) {
    // No candidates → use generic clarifying questions
    return pickGenericProbeQuestions(alreadyAskedIds, 2);
  }

  // Map of state pairs to best discriminator questions
  const discriminatorMap = {
    // Uncertainty vs clarity states
    'uncertain|capable': ['L2_uncertainty', 'L1_control', 'L2_clarity'],
    'uncertain|grounded': ['L2_clarity', 'L1_expectations'],
    
    // High vs low energy states
    'exhausted|down': ['L2_heavy', 'L2_regulation', 'L1_energy'],
    'exhausted|pressured': ['L2_heavy', 'L1_energy'],
    
    // Social vs internal states
    'detached|down': ['L2_numb', 'L2_positive_moments', 'L2_social_pain'],
    'detached|connected': ['L2_social_pain', 'L1_social'],
    
    // High vs low control states
    'self_critical|down': ['L2_guilt', 'L2_shame', 'L1_self_worth'],
    'blocked|overloaded': ['L2_source', 'L1_control'],
    
    // Tension-related states
    'threatened|pressured': ['L1_safety', 'L2_regulation', 'L1_pressure'],
    'pressured|overloaded': ['L2_source', 'L1_pressure'],
    
    // Depressed vs exhausted (Task B: avoid duplicate themes)
    'depressed|exhausted': ['L2_meaning', 'L2_heavy', 'L1_energy'],
  };

  const candidates = [];
  // Task P1.4: Filter out cards already asked in L1 phase to avoid UX repetition
  const used = new Set(alreadyAskedIds);

  // Try to find discriminator questions for this state pair
  if (top1 && top2) {
    const key1 = `${top1}|${top2}`;
    const key2 = `${top2}|${top1}`;
    const questions = discriminatorMap[key1] || discriminatorMap[key2] || [];
    
    // Task P1.4: Skip questions already asked in L1
    for (const qId of questions) {
      if (used.has(qId)) continue; // Filter out already asked cards
      candidates.push(qId);
      used.add(qId);
      if (candidates.length >= 2) break;
    }
  }

  // If we don't have enough, pick based on top state alone
  if (candidates.length < 2 && top1) {
    const stateSpecificQuestions = getQuestionsForState(top1);
    for (const qId of stateSpecificQuestions) {
      if (used.has(qId)) continue;
      candidates.push(qId);
      used.add(qId);
      if (candidates.length >= 2) break;
    }
  }

  // Final fallback: generic clarifying questions
  if (candidates.length < 2) {
    const generic = pickGenericProbeQuestions(Array.from(used), 2 - candidates.length);
    candidates.push(...generic);
  }

  return candidates.slice(0, 2); // Max 2 probe questions
}

/**
 * Get clarifying questions best suited for a specific state.
 */
function getQuestionsForState(stateKey) {
  const stateMap = {
    uncertain: ['L2_uncertainty', 'L1_clarity', 'L2_clarity'],
    exhausted: ['L2_heavy', 'L1_energy'],
    down: ['L2_positive_moments', 'L1_mood'],
    detached: ['L2_numb', 'L2_social_pain', 'L1_social'],
    self_critical: ['L2_guilt', 'L2_shame', 'L1_self_worth'],
    pressured: ['L1_pressure', 'L2_regulation'],
    overloaded: ['L2_source', 'L1_control'],
    threatened: ['L1_safety', 'L2_regulation'],
    blocked: ['L2_source', 'L1_control'],
  };

  return stateMap[stateKey] || ['L1_mood', 'L1_body', 'L1_clarity'];
}

/**
 * Pick generic clarifying questions that haven't been asked yet.
 */
function pickGenericProbeQuestions(alreadyAskedIds, count = 2) {
  const genericPool = [
    'L1_mood',
    'L1_body',
    'L1_clarity',
    'L1_control',
    'L2_uncertainty',
    'L2_clarity',
  ];

  const used = new Set(alreadyAskedIds);
  const picks = [];

  for (const qId of genericPool) {
    if (used.has(qId)) continue;
    picks.push(qId);
    if (picks.length >= count) break;
  }

  return picks;
}
