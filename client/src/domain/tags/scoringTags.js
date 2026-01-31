// src/domain/tags/scoringTags.js
// Task A2.0: Tag filtering for scoring (excludes context/metadata tags)
// This is the domain layer - single source of truth for scoring tag filters

/**
 * Build scoring tags from expanded tags (canonical + derived)
 * Filters out context/metadata tags that shouldn't participate in micro scoring
 * 
 * @param {string[]} expandedTags - Tags after canonicalization and derivation
 * @param {Object} options - Options
 * @param {boolean} options.excludeContext - Exclude sig.context.* tags (default: true)
 * @param {string[]} options.additionalExcludes - Additional tag prefixes to exclude
 * @returns {string[]} Filtered tags for scoring
 */
export function buildScoringTags(expandedTags = [], options = {}) {
  const {
    excludeContext = true,
    additionalExcludes = [],
  } = options;
  
  if (!Array.isArray(expandedTags)) return [];
  
  // Filter out context tags if requested
  let filtered = expandedTags;
  
  if (excludeContext) {
    filtered = filtered.filter(tag => !tag.startsWith('sig.context.'));
  }
  
  // Apply additional excludes
  for (const prefix of additionalExcludes) {
    filtered = filtered.filter(tag => !tag.startsWith(prefix));
  }

  // POST-04: Never wipe axis signals completely.
  // If filtering removes everything but we originally had axis tags, keep up to 2 axis tags.
  if (filtered.length === 0) {
    const axis = expandedTags.filter(t =>
      t.startsWith('sig.valence.') ||
      t.startsWith('sig.arousal.') ||
      t.startsWith('sig.tension.') ||
      t.startsWith('sig.agency.') ||
      t.startsWith('sig.clarity.') ||
      t.startsWith('sig.fatigue.') ||
      t.startsWith('sig.social.')
    );
    if (axis.length > 0) {
      // Keep stable, minimal axis subset (deterministic)
      const uniq = Array.from(new Set(axis));
      uniq.sort();
      return uniq.slice(0, 2);
    }
  }
  
  return filtered;
}

/**
 * Get axis tag prefixes (tags that are too general for micro discrimination)
 * These are typically excluded from unmapped analysis but may be included in scoring
 */
export const AXIS_TAG_PREFIXES = [
  'sig.valence.',
  'sig.arousal.',
  'sig.tension.',
  'sig.agency.',
  'sig.clarity.',
  'sig.fatigue.',
  'sig.social.',
];

/**
 * Get context tag prefixes (metadata that shouldn't define micro)
 */
export const CONTEXT_TAG_PREFIXES = [
  'sig.context.',
  'sig.trigger.',
];
