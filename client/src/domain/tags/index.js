// src/domain/tags/index.js
// Task A2.0: Unified entry point for tag pipeline
// Single source of truth for tag processing

// Canonicalization
export { canonicalizeTag, canonicalizeTags, getAliasMap } from './canonicalizeTags.js';

// Derivation
export { deriveSigTags, deriveSigTagsFromArray } from './deriveSigTags.js';

// Scoring tags (filtering)
export { buildScoringTags, AXIS_TAG_PREFIXES, CONTEXT_TAG_PREFIXES } from './scoringTags.js';

// Gate allow-lists and evaluation
export {
  GATE_ALLOW_LISTS,
  VALENCE_SIGNALS,
  AROUSAL_SIGNALS,
  AGENCY_SIGNALS,
  CLARITY_SIGNALS,
  SOCIAL_SIGNALS,
  LOAD_HIGH_SIGNALS,
  getGateAllowList,
  matchesGatePattern,
  hasGateMatch,
} from './gateAllowLists.js';

export {
  evalGates,
  isGateClosed,
  getClosedGates,
} from './gates.js';
