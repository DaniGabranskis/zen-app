// src/utils/canonicalizeTags.js
import registry from '../data/tag_registry.json' with { type: 'json' };

// ===== Нормализация токенов =====
function normalizeToken(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[\/\s\-]+/g, '_') // пробелы, слеши и дефисы → _
    .replace(/[?.,!]+/g, '');   // убираем пунктуацию
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
  const norm = normalizeToken(tag);
  return aliasDict[norm] ? aliasDict[norm][0] : norm;
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
  }
  return out;
}

// ===== Для отладки / тестов =====
export function getAliasMap() {
  return { ...aliasDict };
}
