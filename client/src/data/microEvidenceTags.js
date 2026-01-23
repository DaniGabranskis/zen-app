// microEvidenceTags.js (AK1 - Minimal Evidence Tags for Each Micro)
// Defines minimal sufficient evidence tag sets for each micro state

import { MICRO_TAXONOMY } from './microTaxonomy.js';

// Task P1.7: Common context tags that appear frequently in fallback cases
// These are added to supporting (not mustHave) to help avoid zero-score scenarios
const FALLBACK_CONTEXT_TAGS = [
  "sig.context.work.deadline",
  "sig.context.work.overcommit",
  "sig.context.work.performance",
  "sig.context.health.stress",
  "sig.context.family.tension",
  "sig.context.social.isolation",
  "sig.context.social.support",
];

/**
 * Minimal evidence tag sets for each micro state
 * Structure: { microKey: { mustHave: string[], supporting: string[] } }
 */
export const MICRO_EVIDENCE_TAGS = {
  // Grounded micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'grounded.steady': {
    mustHave: ['sig.clarity.high', 'sig.agency.high'],
    supporting: ['sig.tension.low', 'sig.valence.pos'],
  },
  'grounded.present': {
    mustHave: ['sig.clarity.high', 'sig.agency.high'],
    supporting: ['sig.tension.low', 'sig.valence.pos'],
  },
  'grounded.recovered': {
    mustHave: ['sig.fatigue.low', 'sig.tension.low'],
    supporting: ['sig.context.work.deadline', 'sig.agency.mid'],
  },
  
  // Engaged micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'engaged.focused': {
    mustHave: ['sig.arousal.high', 'sig.agency.high'],
    supporting: ['sig.clarity.high', 'sig.valence.pos'],
  },
  'engaged.curious': {
    mustHave: ['sig.context.work.performance', 'sig.arousal.mid'],
    supporting: ['sig.agency.mid', 'sig.valence.pos'],
  },
  'engaged.inspired': {
    mustHave: ['sig.arousal.high', 'sig.valence.pos'],
    supporting: ['sig.agency.high', 'sig.clarity.high'],
  },
  
  // Connected micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'connected.warm': {
    mustHave: ['sig.context.social.support', 'sig.social.high'],
    supporting: ['sig.valence.pos', 'sig.arousal.mid'],
  },
  'connected.social_flow': {
    mustHave: ['sig.social.high', 'sig.valence.pos'],
    supporting: ['sig.arousal.mid', 'sig.agency.mid'],
  },
  'connected.seen': {
    mustHave: ['sig.context.social.support', 'sig.social.mid'],
    supporting: ['sig.valence.pos', 'sig.arousal.low'],
  },
  
  // Capable micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'capable.deciding': {
    mustHave: ['sig.agency.high', 'sig.clarity.high'],
    supporting: ['sig.valence.pos', 'sig.tension.low'],
  },
  'capable.executing': {
    mustHave: ['sig.agency.high', 'sig.arousal.mid'],
    supporting: ['sig.clarity.high', 'sig.valence.pos'],
  },
  'capable.structured': {
    mustHave: ['sig.clarity.high', 'sig.agency.mid'],
    supporting: ['sig.tension.low', 'sig.valence.pos'],
  },
  
  // Pressured micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'pressured.rushed': {
    mustHave: ['sig.context.work.deadline', 'sig.tension.high'],
    supporting: ['sig.agency.mid', 'sig.arousal.high'],
  },
  'pressured.performance': {
    mustHave: ['sig.context.work.performance', 'sig.tension.mid'],
    supporting: ['sig.agency.mid', 'sig.arousal.mid'],
  },
  'pressured.tense_functional': {
    mustHave: ['sig.tension.high', 'sig.agency.mid'],
    supporting: ['sig.context.work.deadline', 'sig.arousal.mid'],
  },
  
  // Blocked micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'blocked.stuck': {
    mustHave: ['sig.cognition.rumination', 'sig.agency.low'],
    supporting: ['sig.tension.mid', 'sig.clarity.low'],
  },
  'blocked.avoidant': {
    mustHave: ['sig.trigger.uncertainty', 'sig.agency.low'],
    supporting: ['sig.tension.mid', 'sig.clarity.low'],
  },
  'blocked.frozen': {
    mustHave: ['sig.cognition.blank', 'sig.agency.low'],
    supporting: ['sig.tension.low', 'sig.arousal.low'],
  },
  
  // Overloaded micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'overloaded.cognitive': {
    mustHave: ['sig.cognition.racing', 'sig.tension.high'],
    supporting: ['sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.social.isolation', 'sig.arousal.high'],
  },
  'overloaded.too_many_tasks': {
    mustHave: ['sig.context.work.overcommit', 'sig.tension.mid'],
    supporting: ['sig.context.work.deadline', 'sig.context.health.stress', 'sig.context.social.isolation', 'sig.agency.mid'],
  },
  'overloaded.overstimulated': {
    mustHave: ['sig.body.headache', 'sig.tension.high'],
    supporting: ['sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.social.isolation', 'sig.arousal.high'],
  },
  
  // Exhausted micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'exhausted.drained': {
    mustHave: ['sig.body.heavy_limbs', 'sig.fatigue.high'],
    supporting: ['sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.social.isolation', 'sig.context.family.tension', 'sig.tension.low'],
  },
  'exhausted.sleepy_fog': {
    mustHave: ['sig.cognition.fog', 'sig.fatigue.high'],
    supporting: ['sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.social.isolation', 'sig.tension.low'],
  },
  'exhausted.burnout': {
    mustHave: ['sig.context.work.overcommit', 'sig.fatigue.high'],
    supporting: ['sig.context.work.deadline', 'sig.context.health.stress', 'sig.context.social.isolation', 'sig.context.family.tension', 'sig.tension.mid'],
  },
  
  // Down micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'down.sad_heavy': {
    mustHave: ['sig.valence.neg', 'sig.context.social.isolation'],
    supporting: ['sig.context.health.stress', 'sig.context.family.tension', 'sig.arousal.low'],
  },
  'down.discouraged': {
    mustHave: ['sig.trigger.rejection', 'sig.valence.neg'],
    supporting: [
      'sig.context.health.stress',
      'sig.context.family.tension',
      'sig.context.social.isolation',
      'sig.agency.low',
      // Task P1.7: Add work context tags to reduce fallback (deadline is top-1 in down fallback)
      'sig.context.work.deadline',
      'sig.context.work.overcommit',
      'sig.context.work.performance',
    ],
  },
  'down.lonely_low': {
    mustHave: ['sig.context.social.isolation', 'sig.social.low'],
    supporting: ['sig.context.health.stress', 'sig.context.family.tension', 'sig.valence.neg'],
  },
  
  // Averse micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'averse.irritated': {
    mustHave: ['sig.trigger.interruption', 'sig.tension.mid'],
    supporting: [
      'sig.valence.neg',
      'sig.arousal.mid',
      // Task P1.7: Add context tags to reduce no_matches_zero_score (averse is 62.87% of fallback)
      ...FALLBACK_CONTEXT_TAGS,
      // Task P1.8: Add top-5 missing tags from averse fallback analysis
      'sig.agency.high',      // 11.67% of averse fallback cases
      'sig.clarity.high',     // 9.83% of averse fallback cases
      'sig.fatigue.high',     // 8.90% of averse fallback cases
      'sig.agency.low',        // 8.60% of averse fallback cases
      'sig.agency.mid',        // 6.96% of averse fallback cases
    ],
  },
  'averse.angry': {
    mustHave: ['sig.trigger.conflict', 'sig.tension.high'],
    supporting: ['sig.valence.neg', 'sig.arousal.high'],
  },
  'averse.disgust_avoid': {
    mustHave: ['sig.trigger.rejection', 'sig.valence.neg'],
    supporting: ['sig.tension.mid', 'sig.social.low'],
  },
  
  // Detached micros
  // P1: sig.micro.* removed from mustHave (it's a result, not input)
  'detached.numb': {
    mustHave: ['sig.cognition.blank', 'sig.arousal.low'],
    supporting: ['sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.family.tension', 'sig.valence.neg'],
  },
  'detached.disconnected': {
    mustHave: ['sig.context.social.isolation', 'sig.social.low'],
    supporting: ['sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.family.tension', 'sig.arousal.low'],
  },
  'detached.autopilot': {
    mustHave: ['sig.cognition.scattered', 'sig.arousal.low'],
    supporting: ['sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.family.tension', 'sig.agency.low'],
  },
};

/**
 * Get minimal evidence tags for a micro state
 * @param {string} microKey - Micro state key (e.g., 'pressured.rushed')
 * @returns {{ mustHave: string[], supporting: string[] } | null}
 */
export function getMicroEvidenceTags(microKey) {
  return MICRO_EVIDENCE_TAGS[microKey] || null;
}

/**
 * Get all micro keys that require a specific evidence tag
 * @param {string} tag - Evidence tag (e.g., 'sig.micro.pressured.rushed')
 * @returns {string[]} Array of micro keys
 */
export function getMicrosForTag(tag) {
  const micros = [];
  for (const [microKey, tags] of Object.entries(MICRO_EVIDENCE_TAGS)) {
    if (tags.mustHave.includes(tag) || tags.supporting.includes(tag)) {
      micros.push(microKey);
    }
  }
  return micros;
}

/**
 * Check if evidence tags are sufficient for a micro state
 * @param {string} microKey - Micro state key
 * @param {string[]} evidenceTags - Available evidence tags
 * @returns {{ sufficient: boolean, missingMustHave: string[], missingSupporting: string[] }}
 */
export function checkMicroEvidenceSufficiency(microKey, evidenceTags) {
  const required = MICRO_EVIDENCE_TAGS[microKey];
  if (!required) {
    return { sufficient: false, missingMustHave: [], missingSupporting: [] };
  }
  
  const missingMustHave = required.mustHave.filter(tag => !evidenceTags.includes(tag));
  const missingSupporting = required.supporting.filter(tag => !evidenceTags.includes(tag));
  
  // Sufficient if all must-have tags are present
  const sufficient = missingMustHave.length === 0;
  
  return {
    sufficient,
    missingMustHave,
    missingSupporting,
  };
}
