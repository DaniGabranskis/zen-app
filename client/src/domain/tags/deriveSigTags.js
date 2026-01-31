// src/domain/tags/deriveSigTags.js
// Task A2.5: Real implementation (migrated from utils)
// This is the domain layer - single source of truth for tag derivation
// Comments in English only.

// ===== P1: Map L1 tags to sig.* tags for gates/micro =====
export function deriveSigTags(canonicalTag) {
  const derived = [];
  
  if (!canonicalTag || typeof canonicalTag !== 'string') return derived;
  
  const lower = canonicalTag.toLowerCase();
  
  // L1 mood → sig.valence
  if (lower === 'l1_mood_neg') {
    derived.push('sig.valence.neg');
  } else if (lower === 'l1_mood_pos') {
    derived.push('sig.valence.pos');
  }
  
  // L1 energy → sig.fatigue + sig.arousal
  if (lower === 'l1_energy_low') {
    derived.push('sig.fatigue.high');
    derived.push('sig.arousal.low');
  } else if (lower === 'l1_energy_high') {
    derived.push('sig.fatigue.low');
    derived.push('sig.arousal.high');
  }
  
  // L1 control → sig.agency
  if (lower === 'l1_control_low') {
    derived.push('sig.agency.low');
  } else if (lower === 'l1_control_high') {
    derived.push('sig.agency.high');
  }
  
  // L1 clarity → sig.clarity
  if (lower === 'l1_clarity_low') {
    derived.push('sig.clarity.low');
  } else if (lower === 'l1_clarity_high') {
    derived.push('sig.clarity.high');
  }
  
  // L1 expect → sig.clarity
  if (lower === 'l1_expect_low') {
    derived.push('sig.clarity.low');
  } else if (lower === 'l1_expect_ok') {
    derived.push('sig.clarity.high');
  }
  
  // L1 social → sig.social
  if (lower === 'l1_social_threat') {
    derived.push('sig.social.threat');
  } else if (lower === 'l1_social_support') {
    derived.push('sig.social.high');
  }
  
  // L1 pressure → sig.context.work.pressure.high
  if (lower === 'l1_pressure_high') {
    derived.push('sig.context.work.pressure.high');
  }
  
  // L1 worth → sig.agency + sig.self_worth
  if (lower === 'l1_worth_low') {
    derived.push('sig.self_worth.low');
    derived.push('sig.agency.low');
  } else if (lower === 'l1_worth_high') {
    derived.push('sig.self_worth.high');
    derived.push('sig.agency.high');
  }
  
  return derived;
}

// P3.10.3B: Helper to derive sig.* tags from canonical tags array
export function deriveSigTagsFromArray(canonicalTags = []) {
  const seen = new Set();
  const derived = [];
  
  for (const tag of canonicalTags) {
    if (tag.startsWith('l1_')) {
      const sigTags = deriveSigTags(tag);
      for (const sigTag of sigTags) {
        if (!seen.has(sigTag)) {
          seen.add(sigTag);
          derived.push(sigTag);
        }
      }
    }
  }
  
  return derived;
}
