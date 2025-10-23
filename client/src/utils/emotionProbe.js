// src/utils/emotionProbe.js
// All comments in English only.

/**
 * Map each emotion to a broader category for probe-type selection.
 * Categories: 'tension' | 'social' | 'cognitive' | 'positive'
 */

export const emotionCategoryMap = {
  // A - tension/cognitive high arousal
  anxiety: "tension",
  fear: "tension",
  tension: "tension",
  overwhelm: "tension",
  confusion: "cognitive",

  // B - social / blame / aggression
  anger: "social",
  irritation: "social",
  frustration: "social",
  guilt: "social",   // maps to self-blame patterns
  shame: "social",

  // C - low arousal / isolation
  sadness: "cognitive",      // could be "low" but keep cognitive for routing simplicity
  disappointment: "cognitive",
  loneliness: "cognitive",
  disconnection: "cognitive",
  tiredness: "cognitive",

  // D - positive
  calm: "positive",
  clarity: "positive",
  gratitude: "positive",
  joy: "positive",
  contentment: "positive",
};

/**
 * Decide which probe style to use.
 * If category is 'tension' -> 'breath'
 * If category is 'social' or 'cognitive' -> 'visual'
 * If 'positive' -> random between both
 */
export function pickProbeType(dominant) {
  const cat = emotionCategoryMap[dominant] || 'positive';
  if (cat === 'tension') return 'breath';
  if (cat === 'social' || cat === 'cognitive') return 'visual';
  // positive or unknown => randomize
  return Math.random() < 0.5 ? 'breath' : 'visual';
}

/**
 * Build synthetic probe "card" entry that can be fed back into your routing engine.
 * We keep it minimal: id, label, tags.
 */
export function buildProbeEvidence({ style, label, tags }) {
  const id = style === 'breath' ? 'PR_breath' : 'PR_visual';
  return {
    id,
    selectedKey: label,
    selectedLabel: label,
    tags, // array of canonical tags
  };
}

/**
 * Default visual scenes by category to keep it thematic.
 * Choose a pair that subtly contrasts the likely direction.
 */
export function getVisualScenesFor(dominant) {
  const cat = emotionCategoryMap[dominant] || 'positive';
  // Each option has a label and tags we want to inject.
  if (cat === 'cognitive') {
    return [
      { label: 'Looping thoughts', tags: ['rumination', 'tension?'] },
      { label: 'Letting go for now', tags: ['acceptance', 'calm?'] },
    ];
  }
  if (cat === 'social') {
    return [
      { label: 'Replaying a social moment', tags: ['social_risk', 'shame?'] },
      { label: 'Feeling supported enough', tags: ['support', 'gratitude?'] },
    ];
  }
  if (cat === 'tension') {
    return [
      { label: 'Restless scrolling', tags: ['agitation', 'anxiety?'] },
      { label: 'Quiet break', tags: ['calm_attempt', 'clarity?'] },
    ];
  }
  // positive or fallback
  return [
    { label: 'Grounded presence', tags: ['calm', 'clarity'] },
    { label: 'Bright excitement', tags: ['joy', 'energy_high'] },
  ];
}
