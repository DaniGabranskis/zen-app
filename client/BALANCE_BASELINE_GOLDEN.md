# Golden Metrics Baseline (After EPIC P(B))

**Date**: 2024-12-XX  
**EPIC**: P(B) — Replace "forced uncertain on low clarity" with "low clarity flag"  
**Status**: ⚠️ Baseline captured, but `uncertain_state_rate` exceeds target (29.57% vs ≤12%)

## Summary

This document captures the "golden metrics" after implementing EPIC P(B), which replaced "forced uncertain on low clarity" with a `clarityFlag` system. These metrics serve as a baseline for future improvements.

## Key Findings

### ⚠️ Critical Issues

1. **High `uncertain_state_rate`**: 29.57% (target: ≤12%)
   - **Root cause**: 100% of forced uncertain cases are due to `all_filtered` (eligibility gates filter out all states)
   - This indicates eligibility gates are too strict for baseline vectors

2. **`all_filtered` dominates**: 100% of forced uncertain cases are `all_filtered`
   - No cases of `extreme_uncertainty` (the intended rare case)
   - This suggests eligibility gates need adjustment for baseline quantization

### ✅ Positive Outcomes

1. **`clarityFlag` system working**: Low clarity no longer forces `uncertain`
   - `low_clarity_rate`: 0.00% (expected, as `clarityFlag` is set but not counted separately yet)
   - This is correct behavior — `clarityFlag` is a quality flag, not a state

2. **`needsRefine` tracking**: 4.79% of cases need refinement
   - This includes low confidence, match warnings, and low clarity flags
   - Provides clear UX signal for when Deep Dive is recommended

3. **Confidence band distribution**:
   - High: 58.24%
   - Medium: 7.40%
   - Low: 4.79%

4. **`overloaded` reachable**: 0.19% (60 paths)
   - Confirms state is not completely blocked

## Metrics (Morning & Evening)

### Quality Metrics (Task P(B).4)

**Morning:**
- `uncertain_state_rate`: 29.57% (4,620 cases) ⚠️ **EXCEEDS TARGET**
- `forced_uncertain_rate`: 29.57% (4,620 cases)
- `low_clarity_rate`: 0.00% (0 cases) — *Note: `clarityFlag` is set but not counted here*
- `medium_clarity_rate`: 0.00% (0 cases)
- `needs_refine_rate`: 4.79% (748 cases)
- `low_confidence_rate`: 4.79% (748 cases)
- `match_warning_rate`: 0.00% (0 cases)

**Evening:**
- `uncertain_state_rate`: 0.00% (0 cases) — *Note: Evening flow not collecting metrics correctly*
- `forced_uncertain_rate`: 0.00% (0 cases)
- `low_clarity_rate`: 0.00% (0 cases)
- `medium_clarity_rate`: 0.00% (0 cases)
- `needs_refine_rate`: 0.00% (0 cases)
- `low_confidence_rate`: 0.00% (0 cases)
- `match_warning_rate`: 0.00% (0 cases)

### Forced Uncertain Breakdown

**Morning:**
- `all_filtered`: 4,620 (100.0%)
- `extreme_uncertainty`: 0 (0.0%)

**Evening:**
- `all_filtered`: 4,620 (100.0%)
- `extreme_uncertainty`: 0 (0.0%)

### Confidence Band Distribution

**Morning:**
- High: 9,100 (58.24%)
- Medium: 1,157 (7.40%)
- Low: 748 (4.79%)

**Evening:**
- *Data not available (evening flow metrics collection issue)*

### State Distribution

**Top States:**
- `uncertain`: 29.57% (9,240 paths) ⚠️
- `exhausted`: 18.49% (5,778 paths)
- `pressured`: 4.51% (1,410 paths)
- `down`: 3.70% (1,156 paths)
- `grounded`: 1.47% (460 paths)
- `blocked`: 1.38% (432 paths)
- `overloaded`: 0.19% (60 paths) ✅

### Intersections

**Morning:**
- Low clarity AND needs refine: 0
- Low clarity AND low confidence: 0
- Uncertain state AND low clarity: 0

## Sanity Checks

### ❌ Errors

1. **Morning: `uncertain_state_rate` is 29.57% (target: ≤12%)**
2. **Evening: `uncertain_state_rate` is 29.57% (target: ≤12%)**

### ⚠️ Warnings

1. **Morning: `connected` appears 1,941 times (should be 0 if F_high/T_high/Vneg)**
   - Indicates eligibility gates for `connected` may not be working correctly
   - Or baseline vectors with F_high/T_high/Vneg are not being filtered

2. **Evening: `connected` appears 1,941 times (should be 0 if F_high/T_high/Vneg)**
   - Same issue as morning

## Next Steps

### Immediate (EPIC Q)

1. **Q1**: ✅ Golden metrics captured (this document)
2. **Q2**: Semantic spot checks on manual profiles
3. **Q3**: Product rule for Deep Dive recommendation
4. **Q4**: (Optional) EPIC I6: Reduce low confidence rate

### Future Improvements

1. **Fix `all_filtered` issue**:
   - Review eligibility gates for baseline quantization compatibility
   - Consider "rescue pass" or relaxed gates for baseline-only vectors
   - Target: Reduce `all_filtered` from 100% to <5% of forced uncertain cases

2. **Fix `connected` semantic issue**:
   - Verify eligibility gates for `connected` are correctly applied
   - Check if baseline vectors with F_high/T_high/Vneg are being correctly identified

3. **Fix evening flow metrics collection**:
   - Evening flow should collect same metrics as morning flow
   - Currently showing 0% for all quality metrics

4. **Improve `clarityFlag` tracking**:
   - Currently `low_clarity_rate` shows 0% because `clarityFlag` is not being counted
   - Need to add separate counter for `clarityFlag === 'low'` cases

## Notes

- **Total baseline combinations**: 15,625 (9⁶)
- **Morning paths**: 15,625
- **Evening paths**: 15,625 (simplified mode, no diagnostics)

## Acceptance Criteria Status

- ✅ `uncertain` is no longer forced due to `clarity_low` (replaced with `clarityFlag`)
- ✅ `clarityFlag` system implemented and working
- ✅ `needsRefine` correctly tracks quality flags
- ⚠️ `uncertain_state_rate` exceeds target (29.57% vs ≤12%)
- ⚠️ `all_filtered` dominates forced uncertain (100%)
- ✅ `overloaded` remains reachable (0.19%)
- ⚠️ Semantic correctness issue: `connected` appears with F_high/T_high/Vneg
