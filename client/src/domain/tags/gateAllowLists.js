// src/domain/tags/gateAllowLists.js
// Task A2.1: Single source of truth for gate allow-lists
// Comments in English only.

/**
 * Gate allow-lists define which tags (patterns) can close each gate.
 * 
 * Patterns can be:
 * - Exact match: 'sig.valence.neg'
 * - Prefix match: 'sig.valence.' (matches any tag starting with this)
 * 
 * Tags are checked after canonicalization and derivation (l1_* → sig.*).
 */

// P3.1: Valence signals (normalized to sig.*)
export const VALENCE_SIGNALS = [
  'sig.valence.neg',
  'sig.valence.pos',
  'sig.valence.neutral',
  'l1_mood_neg', // derives to sig.valence.neg
  'l1_mood_pos', // derives to sig.valence.pos
];

// P3.1: Arousal signals (normalized to sig.*)
export const AROUSAL_SIGNALS = [
  'sig.arousal.high',
  'sig.arousal.mid',
  'sig.arousal.low',
  'sig.fatigue.high',
  'sig.fatigue.mid',
  'sig.fatigue.low',
  'l1_energy_low',  // derives to sig.fatigue.high + sig.arousal.low
  'l1_energy_high', // derives to sig.fatigue.low + sig.arousal.high
];

// P3.1: Agency gate signals (normalized to sig.*)
export const AGENCY_SIGNALS = [
  'sig.agency.low',
  'sig.agency.high',
  'sig.agency.mid',
  'l1_control_low',  // derives to sig.agency.low
  'l1_control_high', // derives to sig.agency.high
  'l1_worth_low',    // derives to sig.agency.low
  'l1_worth_high',   // derives to sig.agency.high
];

// P3.1: Clarity gate signals (normalized to sig.*)
export const CLARITY_SIGNALS = [
  'sig.clarity.low',
  'sig.clarity.high',
  'sig.clarity.mid',
  'l1_clarity_low',  // derives to sig.clarity.low
  'l1_clarity_high', // derives to sig.clarity.high
  'l1_expect_low',   // derives to sig.clarity.low
  'l1_expect_ok',    // derives to sig.clarity.high
];

// P3.1: Social gate signals (normalized to sig.*)
export const SOCIAL_SIGNALS = [
  'sig.social.threat',
  'sig.social.high',
  'sig.social.low',
  'sig.social.mid',
  'sig.context.social.support',
  'sig.trigger.rejection', // social threat marker
  'sig.trigger.conflict',  // social threat marker
  'l1_social_threat',      // derives to sig.social.threat
  'l1_social_support',      // derives to sig.social.high
];

// P3.1: Load gate signals (only high-load, not pressure.low)
// Load gate closes only on high-load signals (not pressure.low)
export const LOAD_HIGH_SIGNALS = [
  'sig.context.work.deadline',
  'sig.context.work.overcommit',
  'sig.context.work.pressure.high',
  'l1_pressure_high', // derives to sig.context.work.pressure.high
];

/**
 * Gate allow-lists map (gate name -> array of patterns)
 * Task A2.1: Single source of truth for all gate allow-lists
 */
export const GATE_ALLOW_LISTS = {
  valence: VALENCE_SIGNALS,
  arousal: AROUSAL_SIGNALS,
  agency: AGENCY_SIGNALS,
  clarity: CLARITY_SIGNALS,
  social: SOCIAL_SIGNALS,
  load: LOAD_HIGH_SIGNALS,
};

/**
 * Get allow-list for a specific gate
 * @param {string} gateName - Gate name ('valence', 'arousal', 'agency', 'clarity', 'social', 'load')
 * @returns {string[]} Array of tag patterns
 */
export function getGateAllowList(gateName) {
  return GATE_ALLOW_LISTS[gateName] || [];
}

/**
 * Check if a tag matches a pattern (supports prefix matching)
 * @param {string} tag - Tag to check (should be canonicalized)
 * @param {string} pattern - Pattern from allow-list
 * @returns {boolean} True if tag matches pattern
 */
export function matchesGatePattern(tag, pattern) {
  if (!tag || !pattern) return false;
  if (pattern.endsWith('.')) return tag.startsWith(pattern);
  return tag === pattern;
}

/**
 * Check if any tag in the array matches any pattern in the allow-list
 * @param {string[]} tags - Array of tags (should be canonicalized + derived)
 * @param {string[]} allowList - Array of patterns from gate allow-list
 * @returns {boolean} True if any tag matches any pattern
 */
export function hasGateMatch(tags, allowList) {
  if (!Array.isArray(tags) || !Array.isArray(allowList)) return false;
  return allowList.some(pattern => 
    tags.some(tag => matchesGatePattern(tag, pattern))
  );
}
