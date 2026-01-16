// microEvidenceTags.js (AK1 - Minimal Evidence Tags for Each Micro)
// Defines minimal sufficient evidence tag sets for each micro state

import { MICRO_TAXONOMY } from './microTaxonomy.js';

/**
 * Minimal evidence tag sets for each micro state
 * Structure: { microKey: { mustHave: string[], supporting: string[] } }
 */
export const MICRO_EVIDENCE_TAGS = {
  // Grounded micros
  'grounded.steady': {
    mustHave: ['sig.micro.grounded.steady', 'sig.clarity.high'],
    supporting: ['sig.agency.high', 'sig.tension.low'],
  },
  'grounded.present': {
    mustHave: ['sig.micro.grounded.present', 'sig.clarity.high'],
    supporting: ['sig.agency.high', 'sig.tension.low'],
  },
  'grounded.recovered': {
    mustHave: ['sig.micro.grounded.recovered'],
    supporting: ['sig.context.work.deadline', 'sig.fatigue.low'],
  },
  
  // Engaged micros
  'engaged.focused': {
    mustHave: ['sig.micro.engaged.focused'],
    supporting: ['sig.arousal.high', 'sig.agency.high'],
  },
  'engaged.curious': {
    mustHave: ['sig.micro.engaged.curious'],
    supporting: ['sig.context.work.performance', 'sig.arousal.mid'],
  },
  'engaged.inspired': {
    mustHave: ['sig.micro.engaged.inspired'],
    supporting: ['sig.arousal.high', 'sig.valence.pos'],
  },
  
  // Connected micros
  'connected.warm': {
    mustHave: ['sig.micro.connected.warm'],
    supporting: ['sig.context.social.support', 'sig.social.high'],
  },
  'connected.social_flow': {
    mustHave: ['sig.micro.connected.social_flow'],
    supporting: ['sig.social.high', 'sig.valence.pos'],
  },
  'connected.seen': {
    mustHave: ['sig.micro.connected.seen'],
    supporting: ['sig.context.social.support', 'sig.social.mid'],
  },
  
  // Capable micros
  'capable.deciding': {
    mustHave: ['sig.micro.capable.deciding'],
    supporting: ['sig.agency.high', 'sig.clarity.high'],
  },
  'capable.executing': {
    mustHave: ['sig.micro.capable.executing'],
    supporting: ['sig.agency.high', 'sig.arousal.mid'],
  },
  'capable.structured': {
    mustHave: ['sig.micro.capable.structured'],
    supporting: ['sig.clarity.high', 'sig.agency.mid'],
  },
  
  // Pressured micros
  'pressured.rushed': {
    mustHave: ['sig.micro.pressured.rushed'],
    supporting: ['sig.context.work.deadline', 'sig.tension.high'],
  },
  'pressured.performance': {
    mustHave: ['sig.micro.pressured.performance'],
    supporting: ['sig.context.work.performance', 'sig.tension.mid'],
  },
  'pressured.tense_functional': {
    mustHave: ['sig.micro.pressured.tense_functional'],
    supporting: ['sig.tension.high', 'sig.agency.mid'],
  },
  
  // Blocked micros
  'blocked.stuck': {
    mustHave: ['sig.micro.blocked.stuck'],
    supporting: ['sig.cognition.rumination', 'sig.agency.low'],
  },
  'blocked.avoidant': {
    mustHave: ['sig.micro.blocked.avoidant'],
    supporting: ['sig.trigger.uncertainty', 'sig.agency.low'],
  },
  'blocked.frozen': {
    mustHave: ['sig.micro.blocked.frozen'],
    supporting: ['sig.cognition.blank', 'sig.agency.low'],
  },
  
  // Overloaded micros
  'overloaded.cognitive': {
    mustHave: ['sig.micro.overloaded.cognitive'],
    supporting: ['sig.cognition.racing', 'sig.tension.high', 'sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.social.isolation'],
  },
  'overloaded.too_many_tasks': {
    mustHave: ['sig.micro.overloaded.too_many_tasks'],
    supporting: ['sig.context.work.overcommit', 'sig.tension.mid', 'sig.context.work.deadline', 'sig.context.health.stress', 'sig.context.social.isolation'],
  },
  'overloaded.overstimulated': {
    mustHave: ['sig.micro.overloaded.overstimulated'],
    supporting: ['sig.body.headache', 'sig.tension.high', 'sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.social.isolation'],
  },
  
  // Exhausted micros
  'exhausted.drained': {
    mustHave: ['sig.micro.exhausted.drained'],
    supporting: ['sig.body.heavy_limbs', 'sig.fatigue.high', 'sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.social.isolation', 'sig.context.family.tension'],
  },
  'exhausted.sleepy_fog': {
    mustHave: ['sig.micro.exhausted.sleepy_fog'],
    supporting: ['sig.cognition.fog', 'sig.fatigue.high', 'sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.social.isolation'],
  },
  'exhausted.burnout': {
    mustHave: ['sig.micro.exhausted.burnout'],
    supporting: ['sig.context.work.overcommit', 'sig.fatigue.high', 'sig.context.work.deadline', 'sig.context.health.stress', 'sig.context.social.isolation', 'sig.context.family.tension'],
  },
  
  // Down micros
  'down.sad_heavy': {
    mustHave: ['sig.micro.down.sad_heavy'],
    supporting: ['sig.context.social.isolation', 'sig.valence.neg', 'sig.context.health.stress', 'sig.context.family.tension'],
  },
  'down.discouraged': {
    mustHave: ['sig.micro.down.discouraged'],
    supporting: ['sig.trigger.rejection', 'sig.valence.neg', 'sig.context.health.stress', 'sig.context.family.tension', 'sig.context.social.isolation'],
  },
  'down.lonely_low': {
    mustHave: ['sig.micro.down.lonely_low'],
    supporting: ['sig.context.social.isolation', 'sig.social.low', 'sig.context.health.stress', 'sig.context.family.tension'],
  },
  
  // Averse micros
  'averse.irritated': {
    mustHave: ['sig.micro.averse.irritated'],
    supporting: ['sig.trigger.interruption', 'sig.tension.mid'],
  },
  'averse.angry': {
    mustHave: ['sig.micro.averse.angry'],
    supporting: ['sig.trigger.conflict', 'sig.tension.high'],
  },
  'averse.disgust_avoid': {
    mustHave: ['sig.micro.averse.disgust_avoid'],
    supporting: ['sig.trigger.rejection', 'sig.valence.neg'],
  },
  
  // Detached micros
  'detached.numb': {
    mustHave: ['sig.micro.detached.numb'],
    supporting: ['sig.cognition.blank', 'sig.arousal.low', 'sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.family.tension'],
  },
  'detached.disconnected': {
    mustHave: ['sig.micro.detached.disconnected'],
    supporting: ['sig.context.social.isolation', 'sig.social.low', 'sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.family.tension'],
  },
  'detached.autopilot': {
    mustHave: ['sig.micro.detached.autopilot'],
    supporting: ['sig.cognition.scattered', 'sig.arousal.low', 'sig.context.health.stress', 'sig.context.work.deadline', 'sig.context.family.tension'],
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
