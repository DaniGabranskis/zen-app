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
  const catA = getCategory(a);
  const catB = getCategory(b);

  if (!b || catA === catB) {
    // same category → start from its first probe
    return categoryProbeOrder(catA)[0];
  }

  // different categories → conflict matrix
  const key1 = `${catA}|${catB}`;
  const key2 = `${catB}|${catA}`;
  const direct = CONFLICT_MATRIX[key1] || CONFLICT_MATRIX[key2];
  if (direct) return direct;

  // fallback to cluster-level rule
  const cl = `${toCluster(catA)}|${toCluster(catB)}`;
  const cl2 = `${toCluster(catB)}|${toCluster(catA)}`;
  const clusterPick = CONFLICT_MATRIX[cl] || CONFLICT_MATRIX[cl2];
  if (clusterPick) return clusterPick;

  // ultimate fallback
  return "visual";
}

/** Adaptive next probe based on current top category and confidence */
export function nextProbeAdaptive(prevType, topKey, confidence, confThreshold) {
  const cat = getCategory(topKey);
  const order = categoryProbeOrder(cat);

  // If confidence is far from threshold, choose the most diagnostic remaining
  const lowConf = (confidence ?? 0) < (confThreshold * 0.85);

  // Try to pick the first option from order that is not the prevType and not yet overused
  const candidates = lowConf ? order : [...order].reverse(); // when low conf, push to the strongest
  for (const t of candidates) {
    if (t !== prevType) return t;
  }

  // Safe fallback rotation
  const rot = ["visual", "body", "scenario", "thought"];
  const idx = Math.max(0, rot.indexOf(prevType));
  return rot[(idx + 1) % rot.length];
}
