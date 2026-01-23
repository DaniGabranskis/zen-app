// src/utils/canonicalizeTags.js
import registry from '../data/tag_registry.json' with { type: 'json' };

// ===== Нормализация токенов =====
function normalizeToken(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[\/\s\-]+/g, '_') // пробелы, слеши и дефисы → _
    .replace(/[?,!]+/g, '');   // убираем пунктуацию (точка удалена, чтобы сохранить sig.* и l1_*)
}

// ===== Строим словарь алиасов из registry =====
const aliasDict = (() => {
  const dict = Object.create(null);
  for (const item of registry) {
    const key = normalizeToken(item.key);
    dict[key] = item.emits || [item.key];
    if (item.aliases) {
      for (const a of item.aliases) {
        dict[normalizeToken(a)] = item.emits || [item.key];
      }
    }
  }
  return dict;
})();

// ===== Канонизация одного тега =====
export function canonicalizeTag(tag) {
  if (!tag) return null;
  
  // PATCH 1: Fast-path for signal-like tags (sig.* and l1_*)
  // Do not normalize these tags; dots are meaningful (sig.* namespace).
  const raw = String(tag).trim();
  const lower = raw.toLowerCase();
  
  if (lower.startsWith('sig.') || lower.startsWith('l1_')) {
    return lower;
  }
  
  // For other tags, use normal normalization and alias lookup
  const norm = normalizeToken(tag);
  return aliasDict[norm] ? aliasDict[norm][0] : norm;
}

// ===== P1: Map L1 tags to sig.* tags for gates/micro =====
function deriveSigTags(canonicalTag) {
  const derived = [];
  
  // L1 control tags → sig.agency
  if (canonicalTag === 'l1_control_low') {
    derived.push('sig.agency.low');
  } else if (canonicalTag === 'l1_control_high') {
    derived.push('sig.agency.high');
  }
  
  // L1 clarity tags → sig.clarity
  if (canonicalTag === 'l1_clarity_low') {
    derived.push('sig.clarity.low');
  } else if (canonicalTag === 'l1_clarity_high') {
    derived.push('sig.clarity.high');
  }
  
  // L1 expect tags → sig.clarity (gates treat this as clarity)
  if (canonicalTag === 'l1_expect_low') {
    derived.push('sig.clarity.low');
  } else if (canonicalTag === 'l1_expect_ok') {
    derived.push('sig.clarity.high');
  }
  
  // L1 pressure tags → sig.context.work.pressure
  if (canonicalTag === 'l1_pressure_high') {
    derived.push('sig.context.work.pressure.high');
  } else if (canonicalTag === 'l1_pressure_low') {
    derived.push('sig.context.work.pressure.low');
  }
  
  // L1 social tags → sig.social
  if (canonicalTag === 'l1_social_threat') {
    derived.push('sig.social.threat');
  } else if (canonicalTag === 'l1_social_support') {
    derived.push('sig.social.high');
  }
  
  // L1 energy tags → sig.arousal / sig.fatigue
  if (canonicalTag === 'l1_energy_low') {
    derived.push('sig.fatigue.high');
  } else if (canonicalTag === 'l1_energy_high') {
    derived.push('sig.arousal.high');
  }
  
  // L1 body/tension tags → sig.tension
  if (canonicalTag === 'l1_body_tension') {
    derived.push('sig.tension.high');
  } else if (canonicalTag === 'l1_body_relaxed') {
    derived.push('sig.tension.low');
  }
  
  // L1 mood tags → sig.valence
  if (canonicalTag === 'l1_mood_neg') {
    derived.push('sig.valence.neg');
  } else if (canonicalTag === 'l1_mood_pos') {
    derived.push('sig.valence.pos');
  }
  
  // L1 safety tags → sig.safety (for future use)
  if (canonicalTag === 'l1_safety_low') {
    derived.push('sig.safety.low');
  } else if (canonicalTag === 'l1_safety_high') {
    derived.push('sig.safety.high');
  }
  
  // AK3-DEEP-TAGS-WORTH-SPLIT: L1 worth tags → sig.self_worth.* + sig.agency.*
  // Self-worth is about agency/self-perception, not general mood (valence)
  if (canonicalTag === 'l1_worth_low') {
    derived.push('sig.self_worth.low');
    derived.push('sig.agency.low');
  } else if (canonicalTag === 'l1_worth_high') {
    derived.push('sig.self_worth.high');
    derived.push('sig.agency.high');
  }
  
  return derived;
}

// ===== Канонизация массива тегов =====
export function canonicalizeTags(rawTags = []) {
  const arr = Array.isArray(rawTags) ? rawTags : [rawTags];
  const seen = new Set();
  const out = [];

  for (const t of arr) {
    const c = canonicalizeTag(t);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
    
    // P1: Derive sig.* tags from l1_* tags for gates/micro
    if (c.startsWith('l1_')) {
      const derived = deriveSigTags(c);
      for (const d of derived) {
        if (!seen.has(d)) {
          seen.add(d);
          out.push(d);
        }
      }
    }
  }
  return out;
}

// ===== Для отладки / тестов =====
export function getAliasMap() {
  return { ...aliasDict };
}
