// src/utils/tagCanon.js
// Pure tag canonicalization (no store), producing lowercase / snake_case tokens.
// Make sure these canonical tags MATCH the keys used in weights.tag2emotion.v1.json.

const ALIASES = {
  // negative spectrum
  anxious: 'anxiety',
  anxiety: 'anxiety',
  tension: 'tension',
  tight: 'tension',
  anger: 'anger',
  frustration: 'frustration',
  sad: 'sadness',
  sadness: 'sadness',
  lonely: 'loneliness',
  isolation: 'loneliness',
  disconnected: 'disconnection',
  disconnection: 'disconnection',
  confusion: 'confusion',
  overwhelm: 'overwhelm',
  overloaded: 'overwhelm',
  tired: 'tiredness',
  tiredness: 'tiredness',
  guilt: 'guilt',
  shame: 'shame',
  fear: 'fear',
  threat: 'threat',

  // positive / clarity spectrum
  calm: 'calm',
  clarity: 'clarity',
  clear: 'clarity',
  gratitude: 'gratitude',
  joy: 'joy',
  contentment: 'contentment',
  connection: 'connection',
  connected: 'connection',
  energy: 'energy_high',
  high: 'energy_high',
  low: 'energy_low',
  wired: 'energy_high',
  steady: 'energy_steady',

  // cognition/body patterns
  racing: 'racing_thoughts',
  'racing_thoughts': 'racing_thoughts',
  stuck: 'rumination',
  looping: 'rumination',
  rumination: 'rumination',
  shallow_breath: 'shallow_breath',
  catastrophizing: 'catastrophizing',
  scanning_threats: 'scanning_threats',

  // control/uncertainty
  on_guard: 'vigilant',
  vigilant: 'vigilant',
  outcome_fear: 'uncertainty',
  uncertainty: 'uncertainty',
  unknowns: 'uncertainty',
  low_control: 'low_control',
  losing_control: 'low_control',
  in_control: 'in_control',
};

const BLOCKLIST = new Set(['', null, undefined]);

/** Canonicalize a single tag to lowercase/snake_case token used by weights. */
export function canonicalizeTag(tag) {
  if (BLOCKLIST.has(tag)) return null;
  const raw = String(tag).trim();
  if (!raw) return null;

  // normalize to lowercase + replace spaces & slashes with underscores
  const base = raw.toLowerCase().replace(/[\/\s]+/g, '_');
  // strip punctuation like "?" "," "." "!" etc.
  const cleaned = base.replace(/[^a-z0-9_]/g, '');
  return ALIASES[base] || base;
}

/** Canonicalize an array of tags; de-duplicate preserving order. */
export function canonicalizeTags(tags = []) {
  const arr = Array.isArray(tags) ? tags : [tags];
  const out = [];
  const seen = new Set();
  for (const t of arr) {
    const c = canonicalizeTag(t);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

/** For debugging/tests */
export function getAliasMap() {
  return { ...ALIASES };
}
