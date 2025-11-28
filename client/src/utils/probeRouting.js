import { emotionCategoryMap } from "./emotionProbe";

/** Return category for an emotion key. Fallback to 'cognitive' (A-like) */
export function getCategory(key) {
  return emotionCategoryMap[key] || "cognitive";
}

/** Conflict matrix: given two categories, which probe is most discriminative */
const CONFLICT_MATRIX = {
  "tension|cognitive": "body",     // A internal split
  "tension|social":    "visual",
  "tension|positive":  "visual",
  "cognitive|social":  "visual",
  "cognitive|positive":"visual",
  "social|positive":   "visual",

  // Cross-cluster strong rules:
  "A|B": "thought",
  "A|C": "body",
  "A|D": "visual",
  "B|C": "body",
  "B|D": "thought",
  "C|D": "visual",
};

/** Map category labels to cluster letters */
function toCluster(cat) {
  switch (cat) {
    case "tension":    return "A";
    case "cognitive":  return "A"; // treat cognitive like A for routing
    case "social":     return "B"; // social conflicts lean B-like
    case "positive":   return "D";
    default:           return "A";
  }
}

// Emotion-specific preferred probe order (dominant emotion → probes)
const EMOTION_PROBE_ORDER = {
  // Примеры, ты потом допишешь/поправишь под себя:

  confusion: ["thought", "visual", "scenario", "body"],
  guilt:     ["scenario", "thought", "body", "visual"],
  shame:     ["scenario", "thought", "visual", "body"],
  anxiety:   ["body", "visual", "thought", "scenario"],
  overwhelm: ["body", "visual", "scenario", "thought"],
  sadness:   ["visual", "thought", "scenario", "body"],
  disappointment: ["thought", "scenario", "visual", "body"],
  anger:     ["body", "thought", "scenario", "visual"],
  irritation:["body", "thought", "visual", "scenario"],
  joy:       ["visual", "thought", "scenario", "body"],
  gratitude: ["thought", "visual", "scenario", "body"],
  calm:      ["visual", "body", "thought", "scenario"],
  tension:   ["body", "scenario", "thought", "visual"],
  fear:      ["scenario", "visual", "thought", "body"],
  frustration: ["thought", "scenario", "visual", "body"],
  loneliness: ["visual", "thought", "scenario", "body"],
  tiredness: ["body", "thought", "visual", "scenario"],
  clarity:   ["visual", "scenario", "body", "thought"],
  contentment: ["body", "visual", "scenario", "thought"],
  disconnection: ["visual", "thought", "scenario", "body"],
};

// Emotion-based order with fallback to category order
export function emotionProbeOrder(emotionKey) {
  if (!emotionKey) {
    // fallback to generic rotation if no key
    return ["visual", "body", "scenario", "thought"];
  }

  const custom = EMOTION_PROBE_ORDER[emotionKey];
  if (custom && custom.length) {
    // ensure all types present (in case we define not all 4)
    const all = ["visual", "body", "scenario", "thought"];
    const tail = all.filter((t) => !custom.includes(t));
    return [...custom, ...tail];
  }

  // if no custom mapping → use category-based order
  const cat = getCategory(emotionKey);
  return categoryProbeOrder(cat);
}

/** Category → preferred probe order (start, then fallbacks) */
export function categoryProbeOrder(cat) {
  switch (cat) {
    case "tension":   return ["body", "visual", "thought", "scenario"];   // A
    case "cognitive": return ["visual", "thought", "scenario", "body"];   // A-like
    case "social":    return ["thought", "scenario", "body", "visual"];   // B-like
    case "positive":  return ["thought", "scenario", "visual", "body"];   // D (moved scenario before visual)
    default:          return ["visual", "body", "scenario", "thought"];
  }
}

/** Pick the best start probe from top-2 candidates */
export function pickStartProbe(topTwoKeys) {
  const [a, b] = topTwoKeys;

  // 0) No emotions at all → safe default
  if (!a) {
    return "visual";
  }

  // 1) Emotion-specific order first
  const primaryOrder = emotionProbeOrder(a);
  if (primaryOrder && primaryOrder.length) {
    return primaryOrder[0];
  }

  // 2) Fallback: category-based (старое поведение)
  const catA = getCategory(a);
  const catB = getCategory(b);

  // same or single category → просто первый из categoryProbeOrder
  if (!b || catA === catB) {
    return categoryProbeOrder(catA)[0];
  }

  // 3) Разные категории → пробуем conflict matrix
  const key1 = `${catA}|${catB}`;
  const key2 = `${catB}|${catA}`;
  const direct = CONFLICT_MATRIX[key1] || CONFLICT_MATRIX[key2];
  if (direct) return direct;

  // 4) Fallback по кластерам A/B/D
  const cl = `${toCluster(catA)}|${toCluster(catB)}`;
  const cl2 = `${toCluster(catB)}|${toCluster(catA)}`;
  const clusterPick = CONFLICT_MATRIX[cl] || CONFLICT_MATRIX[cl2];
  if (clusterPick) return clusterPick;

  // 5) Ultimate fallback
  return "visual";
}

/** Adaptive next probe based on current top emotion and confidence */
export function nextProbeAdaptive(prevType, topKey, confidence, confThreshold) {
  // Base rotation as ultimate fallback
  const rot = ["visual", "body", "scenario", "thought"];

  // 1) Получаем order для эмоции (или дефолт)
  const order = emotionProbeOrder(topKey) || rot;

  // 2) low/high confidence режим
  const lowConf = (confidence ?? 0) < (confThreshold * 0.85);

  const candidates = lowConf ? order : [...order].reverse();

  // 3) Выбираем первый отличный от prevType
  for (const t of candidates) {
    if (t && t !== prevType) return t;
  }

  // 4) Fallback rotation
  const idx = Math.max(0, rot.indexOf(prevType));
  return rot[(idx + 1) % rot.length];
}
