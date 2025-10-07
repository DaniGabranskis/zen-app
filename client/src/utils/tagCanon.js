// client/utils/tagCanon.js
// Canonicalize tags so that synonymous or case-variant tags collapse to a single form.
// Rationale: scoring, routing and statistics depend on consistent tag vocabulary.

const CANON_MAP = {
  // negatives / tension spectrum
  anxious: 'Anxious',
  anxiety: 'Anxious',     // merge into "Anxious"
  tension: 'Tension',
  overload: 'Overload',
  frustration: 'Frustration',
  anger: 'Anger',
  sadness: 'Sadness',
  disconnected: 'Disconnected',
  confusion: 'Confusion',

  // positives / clarity spectrum
  calm: 'Calm',
  clarity: 'Clarity',
  gratitude: 'Gratitude',
  joy: 'Joy',

  // synonyms seen in data
  centered: 'Calm',       // "Centered" considered a calm/grounded state
};

function titleCase(s) {
  if (!s) return s;
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

export function canonicalizeTag(tag) {
  if (!tag) return tag;
  const key = String(tag).trim().toLowerCase();
  return CANON_MAP[key] || titleCase(tag.trim());
}

export function canonicalizeTags(tags) {
  const arr = Array.isArray(tags) ? tags : [tags];
  const mapped = arr.map(canonicalizeTag).filter(Boolean);
  // De-duplicate while preserving order
  return [...new Set(mapped)];
}
