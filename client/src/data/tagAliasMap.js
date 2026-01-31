// Tag Alias Map (from TAG_NORMALIZATION_V1.md)
// Maps legacy tags to normalized sig.* tags

export const TAG_ALIAS_MAP = {
  // Legacy attribution tags → new attribution tags
  'self_blame': 'sig.attribution.self',
  'other_blame': 'sig.attribution.other',
  
  // Legacy fear_bias → threat levels (requires value, handled separately)
  // 'fear_bias' → 'sig.threat.{level}' (converted based on value)
  
  // Legacy axis tags → new axis tags (if different naming)
  'certainty': 'sig.clarity',  // Note: requires level conversion
  'socialness': 'sig.social',  // Note: requires level conversion
  
  // Legacy tags that are already normalized (no change needed)
  // 'valence', 'arousal', 'tension', 'agency', 'fatigue' → already sig.* format
};

// Validate normalized tag format
// TAGS-01: Accept both sig.* and l1_* tags as valid normalized tags
export function isValidNormalizedTag(tag) {
  if (!tag || typeof tag !== 'string') return false;
  const lower = tag.toLowerCase();
  return lower.startsWith('sig.') || lower.startsWith('l1_');
}

// Normalize a tag (legacy → new schema)
export function normalizeTag(legacyTag, value = null) {
  // Direct mapping
  if (TAG_ALIAS_MAP[legacyTag]) {
    const normalized = TAG_ALIAS_MAP[legacyTag];
    
    // Handle tags that require level conversion
    if (normalized === 'sig.clarity' && value !== null) {
      return getClarityLevel(value);
    }
    if (normalized === 'sig.social' && value !== null) {
      return getSocialLevel(value);
    }
    if (legacyTag === 'fear_bias' && value !== null) {
      return getThreatLevel(value);
    }
    
    return normalized;
  }
  
  // Already normalized
  if (isValidNormalizedTag(legacyTag)) {
    return legacyTag;
  }
  
  // Unknown tag - return as-is (will be validated later)
  return legacyTag;
}

// Convert certainty value to clarity level
function getClarityLevel(certainty) {
  if (certainty < 0.5) return 'sig.clarity.low';
  if (certainty < 1.5) return 'sig.clarity.mid';
  return 'sig.clarity.high';
}

// Convert socialness value to social level
function getSocialLevel(socialness) {
  if (socialness < 0.5) return 'sig.social.low';
  if (socialness < 1.5) return 'sig.social.mid';
  return 'sig.social.high';
}

// Convert fear_bias value to threat level
function getThreatLevel(fearBias) {
  // Thresholds to be defined based on distribution
  if (fearBias < 0.5) return 'sig.threat.low';
  if (fearBias < 1.5) return 'sig.threat.mid';
  return 'sig.threat.high';
}

// Normalize an array of tags
export function normalizeTags(tags, values = {}) {
  return tags.map(tag => {
    const value = values[tag] || null;
    return normalizeTag(tag, value);
  }).filter(tag => tag !== null);
}

// TAGS-01: Track invalid tags with context
let invalidTagsCounter = new Map(); // tag -> { count, contexts: [{ cardId, flow, source }] }
let invalidTagsTotal = 0;

export function getInvalidTagsStats() {
  const top20 = Array.from(invalidTagsCounter.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([tag, data]) => ({
      tag,
      count: data.count,
      sampleContexts: data.contexts.slice(0, 3), // Top 3 contexts
    }));
  
  return {
    total: invalidTagsTotal,
    top20,
  };
}

export function resetInvalidTagsStats() {
  invalidTagsCounter.clear();
  invalidTagsTotal = 0;
}

// Validate all tags are normalized
export function validateTagsNormalized(tags, context = {}) {
  const invalid = tags.filter(tag => !isValidNormalizedTag(tag));
  if (invalid.length > 0) {
    invalidTagsTotal += invalid.length;
    
    for (const tag of invalid) {
      const existing = invalidTagsCounter.get(tag) || { count: 0, contexts: [] };
      existing.count += 1;
      if (existing.contexts.length < 10) { // Keep up to 10 sample contexts
        existing.contexts.push({
          cardId: context.cardId || context.id || 'unknown',
          flow: context.flow || 'unknown',
          source: context.source || 'unknown',
        });
      }
      invalidTagsCounter.set(tag, existing);
    }
    
    // Only log first occurrence to avoid spam
    if (invalidTagsTotal <= 5) {
      console.warn('[tagAliasMap] Invalid normalized tags:', invalid, 'Context:', context);
    }
    return false;
  }
  return true;
}
