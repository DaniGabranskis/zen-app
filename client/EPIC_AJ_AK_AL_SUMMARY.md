# EPIC AJ, AK, AL Summary

**Status:** ✅ Partially Completed (Core infrastructure ready)

## EPIC AJ — Real-world Sanity Pass

### AJ1 — Телеметрия Decision Payload ✅

**Completed:**
- Created `client/src/utils/sessionTelemetry.js`
- `logDecisionPayload()` collects:
  - Baseline inputs (quantized metrics + derived levels)
  - Baseline output (stateKey, confidenceBand, clarityFlag, needsRefine)
  - Deep inputs (normalized evidence tags + "not sure" stats)
  - Deep output (stateKey, microKey, macroFlipApplied, confidenceBand, matchWarning)
- Integrated into `L5SummaryScreen.js` (logs before session finish)

**Files:**
- `client/src/utils/sessionTelemetry.js`
- `client/src/screens/L5SummaryScreen.js` (modified)

### AJ2 — Ground Truth Lite от пользователя ✅

**Completed:**
- Created `client/src/components/FeedbackModal.js`
- Modal shows after L5 results (non-history sessions only)
- Questions:
  - "Насколько это попало?" (1-5 rating)
  - "Если мимо — что ближе?" (4-6 macro options from same cluster)
- Feedback logged to telemetry as `session_feedback` event
- Modal can be skipped (doesn't block session finish)

**Files:**
- `client/src/components/FeedbackModal.js`
- `client/src/screens/L5SummaryScreen.js` (modified)

### AJ3 — Рубрика оценки результатов ✅

**Completed:**
- Created `client/scripts/analyzeSessionResults.js`
- Analyzes telemetry logs to generate:
  - Rating distribution (1-5)
  - Rating ≥4 rate (target: ≥70%)
  - Cluster match rate (closest state in same cluster)
  - NeedsRefine rate (target: ≤35%)
  - Micro null rate for deep sessions (target: ≤35%)
- Success criteria clearly defined

**Files:**
- `client/scripts/analyzeSessionResults.js`

### AJ4 — Разбор ложных позитивов ✅

**Completed:**
- Integrated into `client/scripts/analyzeSessionResults.js`
- Identifies false positive patterns:
  - `exhausted_wants_connection_but_connected_blocked`
  - `overloaded_misclassified_as_pressured_exhausted`
  - `pressured_misclassified_as_blocked`
  - `grounded_misclassified_as_capable`
- For each false positive, collects:
  - Baseline inputs/outputs
  - Deep inputs/outputs
  - Diagnostic info (axes, evidence tags, pattern)

**Files:**
- `client/scripts/analyzeSessionResults.js`

## EPIC AK — Micro Coverage Harness

### AK1 — Минимальный набор Evidence Tags для каждого Micro ✅

**Completed:**
- Created `client/src/data/microEvidenceTags.js`
- Defines `MICRO_EVIDENCE_TAGS` for all 33 micro states
- Structure: `{ mustHave: string[], supporting: string[] }`
- Helper functions:
  - `getMicroEvidenceTags(microKey)`
  - `getMicrosForTag(tag)`
  - `checkMicroEvidenceSufficiency(microKey, evidenceTags)`

**Files:**
- `client/src/data/microEvidenceTags.js`

### AK2 — Синтетический генератор L1 "Targeted Micro" ✅

**Completed:**
- Created `client/scripts/checkMicroCoverage.js`
- Generates targeted L1 responses for each micro state
- Uses `getMicroEvidenceTags()` to create must-have + supporting tags
- Tests each micro with representative baseline for its macro
- Reports reachable vs. unreachable micros

**Current Results:**
- Reachable: 24/33 (72.7%)
- Unreachable: 9/33 (27.3%)
- Unreachable micros: `grounded.*`, `blocked.*`, `detached.*`
- Reason: `microKey is null` (evidence tags not matching micro selector logic)

**Files:**
- `client/scripts/checkMicroCoverage.js`

### AK3 — Репорт "Unreachable Micro — почему" ⚠️

**Partially Completed:**
- `checkMicroCoverage.js` categorizes unreachable reasons:
  - No evidence tags defined
  - Wrong micro selected
  - Micro null
  - No baseline
- **Issue:** 9 micros return `null` even with targeted evidence
- **Next Steps:** Investigate `microSelector.js` logic for `grounded`, `blocked`, `detached` micros

**Files:**
- `client/scripts/checkMicroCoverage.js`

## EPIC AL — Macro Flip Calibration

### AL1 — Зафиксировать ожидаемый Flip Rate ✅

**Completed:**
- Created `client/MACRO_FLIP_POLICY.md`
- Defines two policy options:
  - **Conservative (Current):** ≤1% flip rate
  - **Moderate (Alternative):** 1-5% flip rate
- Current status: 0.00% (aligns with conservative policy)
- Implementation notes for adjusting flip rate

**Files:**
- `client/MACRO_FLIP_POLICY.md`

### AL2 — Набор Flip Spot Checks ✅

**Completed:**
- Created `client/scripts/macroFlipSpotChecks.js`
- Tests 7 scenarios:
  - **Flip SHOULD happen (2 tests):**
    - `pressured → blocked` (strong evidence)
    - `pressured → overloaded` (strong evidence)
  - **Flip SHOULD NOT happen (5 tests):**
    - `grounded` (high confidence baseline)
    - `connected` (semantic blocker)
    - `exhausted → connected` (semantic blocker)
    - Weak evidence (low weight)
    - Cross-cluster (not neighbor)

**Files:**
- `client/scripts/macroFlipSpotChecks.js`

### AL3 — Точечное ослабление Flip критериев ⚠️

**Pending:**
- Flip logic exists in `client/src/utils/macroFlip.js`
- Current thresholds:
  - Evidence weight: ≥0.5
  - Score difference: ≥0.1
  - Cluster neighbor check
  - Semantic compatibility check
- **Next Steps:** If flip rate needs to increase, adjust thresholds in `macroFlip.js` per `MACRO_FLIP_POLICY.md`

**Files:**
- `client/src/utils/macroFlip.js` (needs adjustment if flip rate too low)

## Summary

### ✅ Completed

- **AJ1:** Telemetry infrastructure
- **AJ2:** Feedback modal UI
- **AJ3:** Results evaluation script
- **AJ4:** False positive detection
- **AK1:** Evidence tags mapping
- **AK2:** Targeted micro generator
- **AL1:** Flip policy document
- **AL2:** Flip spot checks

### ⚠️ Issues to Address

1. **Micro Coverage (AK3):** 9/33 micros unreachable even with targeted evidence
   - Likely issue: `microSelector.js` logic too strict for `grounded`, `blocked`, `detached`
   - Action: Review `shouldMicroBeNull()` and micro scoring thresholds

2. **Macro Flip Rate (AL3):** Currently 0% (may be too conservative)
   - Action: Run `macroFlipSpotChecks.js` to validate flip logic
   - If flip rate needs to increase, adjust thresholds per policy

### 📝 Next Steps

1. **Run real-world sessions:**
   - Collect 20-30 sessions with feedback
   - Run `analyzeSessionResults.js` on telemetry logs
   - Evaluate success metrics (AJ3)

2. **Fix micro coverage:**
   - Investigate why `grounded.*`, `blocked.*`, `detached.*` return null
   - Adjust `microSelector.js` if needed
   - Re-run `checkMicroCoverage.js` to verify 33/33 reachable

3. **Validate flip logic:**
   - Run `macroFlipSpotChecks.js`
   - If tests fail, adjust `macroFlip.js` thresholds
   - Re-run deep simulation to check flip rate

## Related Documents

- `MACRO_FLIP_POLICY.md` — Flip policy definition
- `BALANCE_DEEP_GOLDEN_V1.md` — Deep golden metrics
- `DEEP_ROUTING_CONTRACT.md` — Deep routing contract
