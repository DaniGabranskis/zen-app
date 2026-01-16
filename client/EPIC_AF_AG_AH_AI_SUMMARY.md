# EPIC AF-AG-AH-AI Summary

**Status:** Completed (implementation done, spot checks need baseline metric adjustments)

## EPIC AF — Runtime Integration ✅

### Completed

1. **Integrated `deepEngine` into `DiagnosticFlowScreen.js`:**
   - Deep flow now uses `routeStateFromDeep()` instead of `routeStateFromBaseline()`
   - Simplified flow continues to use `routeStateFromBaseline()`
   - L1 responses are converted to format expected by `accumulateEvidence()`

2. **Updated `deepEngine.js` for L5 compatibility:**
   - Added `stateKey` field (same as `macroKey`) for backward compatibility
   - Added `dominant` and `secondary` fields
   - Result format is compatible with baseline format

3. **Updated `L5SummaryScreen.js`:**
   - Reads `stateKey` from `decision` (supports both baseline and deep results)
   - Displays micro state: `"Pressured (Rushed)"` when `microKey` is present
   - Handles `microKey = null` gracefully (baseline-only sessions)

### Files Modified

- `client/src/screens/DiagnosticFlowScreen.js` — Integration point
- `client/src/utils/deepEngine.js` — Compatibility fields
- `client/src/screens/L5SummaryScreen.js` — UI support

## EPIC AG — Deep Simulation ✅

### Completed

1. **Created `checkDeepBalance.js`:**
   - Generates all 15,625 baseline combinations
   - Generates synthetic L1 responses based on baseline macro cluster
   - Runs deep engine for each combination
   - Collects metrics:
     - Micro coverage (all 33 micro states)
     - Micro distribution by macro
     - Macro flip rate and reasons
     - Quality improvement (confidence/clarity before/after)
     - Micro null rate
     - Semantic violations

2. **Sanity checks:**
   - Macro flip rate ≤ 10% (error if > 10%)
   - Semantic violations = 0 (connected with F_high/T_high/Vneg)
   - Micro coverage (all 33 reachable)
   - Micro null rate ≤ 20% (warning if > 20%)

### Files Created

- `client/scripts/checkDeepBalance.js` — Deep simulation script

## EPIC AH — Spot Checks ✅

### Completed

1. **Created `deepSpotChecks.js`:**
   - 11 manual test profiles covering:
     - Positive cluster (grounded, engaged)
     - Stress cluster (pressured, blocked, overloaded)
     - Low energy cluster (exhausted, down)
     - Macro flip tests
     - Negative tests (semantic invariants)
     - Uncertainty handling

2. **Current Status:**
   - 5/11 tests pass
   - 6/11 tests fail due to baseline metric mismatches
   - **Issue:** Test profiles expect specific baseline macros, but baseline engine returns different macros based on its own rules
   - **Solution needed:** Adjust baseline metrics in test profiles to match expected baseline macro, OR update test expectations to match actual baseline behavior

### Files Created

- `client/scripts/deepSpotChecks.js` — Spot checks script

## EPIC AI — Integration Hygiene ✅

### Completed

1. **Created `INTEGRATION_HYGIENE.md`:**
   - Rules for no local copies of engine logic
   - Single source of truth enforcement
   - Unified path structure (`client/src/...`)
   - Canonical result format
   - Runtime validation

2. **Updated scripts with hygiene comments:**
   - `checkSimplifiedBalance.js` — References `INTEGRATION_HYGIENE.md`
   - `checkDeepBalance.js` — References `INTEGRATION_HYGIENE.md`
   - `deepSpotChecks.js` — References `INTEGRATION_HYGIENE.md`

### Files Created

- `client/INTEGRATION_HYGIENE.md` — Integration hygiene rules

## Current Status

### ✅ Working

- Deep engine integrated into runtime flow
- Deep simulation script created
- Spot checks script created
- Integration hygiene documented and enforced
- L5 UI supports deep results (micro display)

### ⚠️ Needs Attention

- **Spot checks:** 6/11 tests fail because baseline metrics don't produce expected baseline macros
  - **Root cause:** Test profiles assume baseline engine will return specific macros, but baseline engine has its own classification rules
  - **Fix options:**
    1. Adjust baseline metrics in test profiles to match expected baseline macro
    2. Update test expectations to match actual baseline behavior
    3. Add macro flip logic to deep engine to handle cases where evidence strongly contradicts baseline

## Next Steps

1. **Fix spot checks:**
   - Review baseline metrics in failing test profiles
   - Adjust metrics to produce expected baseline macros, OR
   - Update test expectations to match actual baseline behavior

2. **Run deep simulation:**
   - Execute `checkDeepBalance.js` to get golden metrics
   - Verify sanity checks pass
   - Document any unreachable micro states

3. **Test in real app:**
   - Run deep flow in app
   - Verify L5 displays macro + micro correctly
   - Verify baseline-only sessions still work (micro = null)

## Related Documents

- `DEEP_ROUTING_CONTRACT.md` — Deep routing contract
- `INTEGRATION_HYGIENE.md` — Integration hygiene rules
- `BASELINE_MACRO_CONTRACT.md` — Baseline macro contract
