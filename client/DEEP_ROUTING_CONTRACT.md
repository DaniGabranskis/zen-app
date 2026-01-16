# Deep Routing Contract

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Approved (implementation contract)

## Overview

The Deep Routing Contract defines the canonical result type and rules for deep dive state classification. Deep dive refines baseline macro states into micro states using evidence from L1 cards.

## Canonical Result Type

### Deep Classification Result

```typescript
interface DeepClassificationResult {
  // Core state
  macroKey: string;              // Macro state (from baseline, or flipped)
  microKey: string | null;        // Micro state (nullable, deep-only)
  
  // Quality signals
  confidenceBand: 'high' | 'medium' | 'low';
  clarityFlag: 'low' | 'medium' | null;
  needsRefine: boolean;
  
  // Macro flip tracking
  macroFlipApplied: boolean;      // true if macro was flipped from baseline
  macroFlipReason: MacroFlipReason | null;  // Reason for flip (if applied)
  
  // Evidence
  evidenceTags: string[];         // Normalized sig.* tags from L1 cards
  uncertaintySignals: string[];   // uncertainty_note.* tags (if user selected "Not sure")
  
  // Baseline reference
  baselineMacro: string;          // Original macro from baseline engine
  baselineConfidence: 'high' | 'medium' | 'low';  // Baseline confidence
  
  // Diagnostics (for simulation/debugging)
  diagnostics?: {
    microScores?: { [microKey: string]: number };
    macroFlipScore?: number;
    evidenceWeight?: number;
    selectedMicro?: {
      key: string;
      score: number;
      matchedTags: string[];
    };
  };
}
```

### Macro Flip Reasons

```typescript
type MacroFlipReason =
  | 'strong_evidence'        // Evidence strongly contradicts baseline
  | 'cluster_conflict'        // Evidence points to different macro cluster
  | 'semantic_incompatibility' // Baseline macro semantically incompatible with evidence
  | 'score_threshold'         // Alternative macro score exceeds threshold
  | null;                     // No flip applied
```

## Baseline Prior Rule

### Rule: Baseline Macro = Prior

**Principle:** Deep dive starts with baseline macro as the **prior** (starting point), not a blank slate.

**Process:**
1. **Baseline engine** returns `macroKey` (e.g., `pressured`)
2. **Deep engine** receives baseline macro as prior
3. **Micro selection** happens **within** the baseline macro cluster (or top-2 candidates)
4. **Macro flip** is allowed only with "strong evidence" (rare)

### Micro Selection (Within Macro)

**Default behavior:**
- Deep engine selects micro **within** the baseline macro
- Example: Baseline = `pressured` → Deep selects `pressured.rushed` or `pressured.tense_functional`

**Top-2 candidates:**
- If baseline confidence is medium/low, consider top-2 macro candidates
- Micro selection can happen in either candidate
- Final selection based on evidence tags

### Macro Flip (Rare Exception)

**Macro flip is allowed only if ALL conditions are met:**

1. **Strong evidence against baseline:**
   - Evidence tags strongly contradict baseline macro
   - Evidence weight > threshold (e.g., 0.5)

2. **Baseline confidence not high:**
   - `baselineConfidence !== 'high'`
   - High confidence baseline is rarely flipped

3. **Score difference threshold:**
   - Alternative macro score > baseline macro score + threshold (e.g., 0.1)

4. **Semantic compatibility:**
   - Alternative macro is semantically compatible with evidence
   - Hard blockers are respected (e.g., `connected` never with `F_high || T_high || Vneg`)

5. **Cluster proximity:**
   - Alternative macro is in a "neighboring" cluster (stress ↔ low energy, positive ↔ stress, etc.)
   - Cross-cluster flips are extremely rare

**Macro flip examples:**
- Baseline: `pressured`, Evidence: `sig.micro.blocked.frozen` → Flip to `blocked` ✅
- Baseline: `pressured`, Evidence: `sig.micro.overloaded.cognitive` → Flip to `overloaded` ✅
- Baseline: `connected`, Evidence: `sig.micro.down.sad_heavy` → No flip (different cluster) ❌
- Baseline: `grounded` (high confidence), Evidence: `sig.micro.pressured.rushed` → No flip (high confidence) ❌

## Evidence Pipeline

### Evidence Accumulator

**Input:** User responses to L1 cards (including "Not sure / both")

**Output:**
- `evidenceTags[]`: Normalized `sig.*` tags
- `uncertaintySignals[]`: `uncertainty_note.*` tags (if user selected uncertainty)

**Process:**
1. Each L1 card response yields 1-3 tags
2. Tags are normalized using tag alias map (legacy → new schema)
3. Tags are accumulated across all L1 cards
4. Uncertainty signals are collected separately (affect confidence, not classification)

### "Not sure / both" Policy

**Rule:** "Not sure / both" is **not** "no data" — it's a separate signal.

**Effect:**
- Adds `uncertainty_note.low_clarity` or `uncertainty_note.conflict` to `uncertaintySignals`
- **Reduces confidence** (e.g., `high` → `medium`, `medium` → `low`)
- **Does NOT break classification** — system still selects micro/macro based on available evidence

**Example:**
- User selects "Not sure" for 2 out of 3 L1 cards
- Result: `confidenceBand: 'low'`, `clarityFlag: 'low'`, but still returns `macroKey` and `microKey`

## Micro Selection Rules

### Rule: Micro May Be Null

**Principle:** Deep dive is **not required** to always return a micro state.

**Conditions for `microKey = null`:**
1. **Weak evidence:** Evidence tags don't strongly match any micro within macro
2. **Conflicting evidence:** Evidence tags point to multiple micro states equally
3. **Low confidence:** Baseline confidence is low and evidence doesn't strengthen it

**Result when `microKey = null`:**
- `macroKey` is still returned (macro state)
- `confidenceBand` is reduced (e.g., `high` → `medium`)
- `clarityFlag` may be set to `'low'`
- `needsRefine` may be `true`

### Micro Selection Algorithm

1. **Collect evidence tags** from L1 cards
2. **Score each micro** within baseline macro:
   - Count matching tags: `micro.evidenceTags ∩ evidenceTags`
   - Weight by tag specificity (micro tags > context tags > axis tags)
   - Calculate score: `matchCount * tagWeight`
3. **Select top micro** if score > threshold (e.g., 0.3)
4. **Tie-breaker:** If scores are equal, prefer micro with:
   - More specific tags (fewer, but more precise)
   - Or leave `microKey = null` and reduce confidence

## Macro Flip Implementation

### Flip Criteria Check

```typescript
function shouldFlipMacro(
  baselineMacro: string,
  baselineConfidence: 'high' | 'medium' | 'low',
  evidenceTags: string[],
  alternativeMacro: string,
  alternativeScore: number,
  baselineScore: number
): { shouldFlip: boolean; reason: MacroFlipReason | null } {
  // 1. Baseline confidence not high
  if (baselineConfidence === 'high') {
    return { shouldFlip: false, reason: null };
  }
  
  // 2. Strong evidence against baseline
  const evidenceWeight = calculateEvidenceWeight(evidenceTags, alternativeMacro);
  if (evidenceWeight < 0.5) {
    return { shouldFlip: false, reason: null };
  }
  
  // 3. Score difference threshold
  const scoreDiff = alternativeScore - baselineScore;
  if (scoreDiff < 0.1) {
    return { shouldFlip: false, reason: null };
  }
  
  // 4. Semantic compatibility
  if (!isSemanticallyCompatible(alternativeMacro, evidenceTags)) {
    return { shouldFlip: false, reason: null };
  }
  
  // 5. Cluster proximity
  if (!isClusterNeighbor(baselineMacro, alternativeMacro)) {
    return { shouldFlip: false, reason: null };
  }
  
  // All conditions met
  return { shouldFlip: true, reason: 'strong_evidence' };
}
```

### Flip Logging

**When macro flip occurs, log:**
- `macroFlipReason`: Why flip happened
- `decisiveTags`: Which evidence tags were decisive
- `baselineMacro` → `newMacro`: Flip path
- `scoreDiff`: Score difference that triggered flip

## Integration Points

### Baseline Engine → Deep Engine

**Input:**
```typescript
{
  baselineResult: BaselineResult,  // From baselineEngine.routeStateFromBaseline
  l1Responses: L1CardResponse[],    // User responses to L1 cards
}
```

**Output:**
```typescript
DeepClassificationResult
```

### Deep Engine → UI

**UI displays:**
- `macroKey` (always)
- `microKey` (if not null, e.g., "Pressured (Rushed)")
- `confidenceBand` (visual indicator)
- `clarityFlag` (if low, show message)
- `needsRefine` (if true, show "Refine (Deep Dive)" CTA)

## Sanity Checks

### Required Invariants

1. **Macro always present:** `macroKey` never `null` or `undefined`
2. **Micro belongs to macro:** If `microKey` is not null, it must start with `macroKey.` (e.g., `pressured.rushed` belongs to `pressured`)
3. **Semantic invariants:** Hard blockers are respected even after macro flip
4. **Flip reason present:** If `macroFlipApplied === true`, then `macroFlipReason !== null`

### Expected Thresholds

- **Macro flip rate:** < 10% (if > 10%, red flag)
- **Micro coverage:** All micro states in taxonomy are reachable (or explicitly documented as unreachable)
- **Micro null rate:** < 20% (most deep dives should return micro)

## Related Documents

- `MICRO_TAXONOMY_V1.md` — Micro state taxonomy
- `TAG_NORMALIZATION_V1.md` — Tag schema
- `L1_CARDS_DESIGN.md` — L1 card design
- `BASELINE_MACRO_CONTRACT.md` — Baseline macro contract
