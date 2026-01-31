# A3.2.3 Stability Test

## Overview

This test runs mass simulations to verify stability of the deep session runner across different seeds and flow modes.

## Quick Start

```bash
cd client
npm run stability:a3_2_3
```

For quick smoke test (5k runs instead of 50k):

```bash
npm run stability:a3_2_3 -- --smoke
```

## What It Does

1. **Deep-Realistic Runs**: Runs 50k simulations (or 5k in smoke mode) for seeds: 42, 1337, 2025
2. **Fixed Flow Run**: Runs 50k simulations (or 5k in smoke mode) for seed 42 with fixed flow
3. **Validation**: After each run:
   - Schema validation (`validateReportOrThrow`)
   - Engine type check (must be `runner` for deep-realistic/fixed)
   - Step0 results validation (`checkStep0Results.js`)
   - Sanity validation (`checkSanityResults.js`)
4. **Summary Generation**: Creates `A3_2_3_STABILITY_SUMMARY.json` and `.md` files

## Output Files

All outputs are saved to `client/scripts/out/`:

- `deep_balance_noisy_mixed_deep-realistic_seed42.json` - Report for seed 42
- `deep_balance_noisy_mixed_deep-realistic_seed1337.json` - Report for seed 1337
- `deep_balance_noisy_mixed_deep-realistic_seed2025.json` - Report for seed 2025
- `deep_balance_noisy_mixed_fixed_seed42.json` - Fixed flow report
- `manifest_deep-realistic_seed42.json` - Manifest for seed 42
- `manifest_deep-realistic_seed1337.json` - Manifest for seed 1337
- `manifest_deep-realistic_seed2025.json` - Manifest for seed 2025
- `manifest_fixed_seed42.json` - Fixed flow manifest
- `A3_2_3_STABILITY_SUMMARY.json` - **Main summary (JSON)**
- `A3_2_3_STABILITY_SUMMARY.md` - **Main summary (Markdown)**

## Summary Metrics

The summary includes:

- **Fallback Rate**: mean/min/max/spread across seeds
- **Asked L2 Average**: mean/spread across seeds
- **Core Gate Rates**: mean rates for valence/arousal/agency/clarity
- **Top Ended Reason**: Most common endedReason (aggregated)
- **Top-3 Macros**: Most common macros (aggregated)
- **Per-Seed Details**: Individual metrics for each seed

## Engine Verification

All reports must have `metadata.engine: "runner"` for deep-realistic and fixed flows. The script will fail-fast if:
- Engine is not `runner` for these flows
- Engine field is missing
- Schema validation fails

## Acceptance Criteria

Stability is considered acceptable if:

- Fallback rate spread ≤ 1-2 percentage points
- Asked L2 average spread ≤ 0.1-0.2
- Fixed fallback ≤ 2%
- Gate hit rates and macro distribution present
- All validations pass

## Troubleshooting

If validation fails:

1. Check that `simulateDeepRealistic.js` uses `wireDeps.js` (same harness as Golden Sessions)
2. Verify that reports contain `metadata.engine: "runner"`
3. Check schema validation errors in console output
4. Review individual report files in `scripts/out/`

## Related Commands

- `npm run golden:check` - Run Golden Sessions (deterministic tests)
- `npm run deep:balance:smoke` - Quick deep balance smoke test
- `npm run deep:balance:realistic` - Single deep-realistic run

## CI Integration

This test is automatically run in CI via `.github/workflows/golden-sessions.yml` on every push/PR to `client/**`.

---

## Golden Sessions: When to Update Snapshots

### ✅ DO Update Snapshots (`npm run golden:update`) When:

1. **Intentional behavior change**: You've deliberately changed selector logic, tag normalization, or micro taxonomy, and the new behavior is correct.
2. **Bug fix that changes output**: You fixed a bug that was causing incorrect snapshots (e.g., wrong card selection, incorrect tag normalization).
3. **Schema/format changes**: You updated the snapshot schema or event format, and all fixtures need to reflect the new structure.
4. **New test cases added**: You added new Golden Session fixtures and need to generate initial snapshots.
5. **Refactoring with verified correctness**: You refactored code (e.g., moved functions, renamed variables) but verified that output is identical to expected behavior.

### ❌ DO NOT Update Snapshots (Fix Code Instead) When:

1. **Unexpected regression**: CI fails with snapshot mismatches that you didn't intend (e.g., different card selected, wrong micro state).
2. **Non-deterministic behavior**: Snapshots differ between runs without code changes (indicates a seed/RNG issue, not a snapshot issue).
3. **Golden:check fails**: If `npm run golden:check` shows failures, investigate the root cause in code, not update snapshots to match broken behavior.
4. **Contradictions appear**: If `npm run golden:summary` shows new non-intentional contradictions, fix the logic that caused them.
5. **Golden:doctor flags issues**: If `npm run golden:doctor` reports structural problems (missing fields, invalid data), fix the code that generates snapshots.

### How to Update Snapshots

```bash
cd client
npm run golden:summary    # Review current state
npm run golden:update      # Update all snapshots
npm run golden:doctor      # Verify health
npm run golden:check      # Verify all pass
npm run golden:summary    # Verify no new contradictions
git add client/scripts/goldenSessions/snapshots/ client/out/GOLDEN_SESSIONS_SUMMARY.md
git commit -m "chore(golden): update snapshots after [reason]"
```

---

## Stability Diff Gate: Understanding and Updating Baseline

### What is the Stability Diff Gate?

The stability diff gate (`npm run stability:diff`) compares the current stability summary against a frozen baseline (`A3_2_3_STABILITY_BASELINE.json`). It ensures that key performance indicators (KPIs) don't regress:

- **Fallback Rate**: Should not increase significantly
- **Micro Zero-Score Pick Rate**: Should not exceed thresholds
- **Scoring Tags Empty Rate**: Should not exceed thresholds
- **Scoring Tags Length (P95)**: Should not drop below minimum

### When the Diff Gate Fails

If `npm run stability:diff` fails in CI:

1. **Check the error message**: It will show which KPI exceeded the allowed delta.
2. **Review the summary**: Compare `A3_2_3_STABILITY_SUMMARY.json` with the baseline to see what changed.
3. **Investigate root cause**: 
   - Did you change selector logic? Check if the change was intentional.
   - Did you change tag normalization? Review `npm run zero-score:report`.
   - Did you change micro taxonomy? Check if evidence tags are still matching correctly.
4. **Decide on action**:
   - **If regression is intentional**: Update the baseline (see below).
   - **If regression is unintentional**: Fix the code that caused it.

### How to Update the Baseline

**⚠️ Only update the baseline if the current metrics represent the new expected behavior.**

```bash
cd client
npm run stability:smoke      # Generate current summary
npm run stability:diff      # Verify what changed (will fail if regressed)
npm run stability:baseline  # Update baseline from current summary
git add client/scripts/baselines/A3_2_3_STABILITY_BASELINE.json
git commit -m "chore(stability): update baseline after [reason]"
```

**Before updating baseline, ensure:**
- The change was intentional (e.g., you relaxed a threshold, changed selector logic)
- You've reviewed `ZERO_SCORE_PICK_REPORT.md` and understand why metrics changed
- You've verified that the new metrics are acceptable for production
- You've documented the reason for the change in the commit message

### Baseline Update Checklist

- [ ] Current stability summary generated (`npm run stability:smoke`)
- [ ] Reviewed `A3_2_3_STABILITY_SUMMARY.md` and understand all changes
- [ ] Reviewed `ZERO_SCORE_PICK_REPORT.md` if zero-score metrics changed
- [ ] Verified that changes are intentional and acceptable
- [ ] Updated baseline (`npm run stability:baseline`)
- [ ] Verified diff passes after update (`npm run stability:diff`)
- [ ] Committed baseline with clear reason in commit message

---

## Troubleshooting CI Failures

### Golden Sessions Failures

**Symptom**: `Run golden:check` fails in CI

**Steps**:
1. Run `npm run golden:check` locally
2. If it fails locally, fix the code (don't update snapshots unless intentional)
3. If it passes locally but fails in CI, check for:
   - Node.js version differences
   - Missing dependencies
   - Environment-specific behavior (RNG, file paths)

### Stability Smoke Failures

**Symptom**: `Stability (smoke)` step fails or times out

**Steps**:
1. Check the timeout: Should complete in < 20 minutes
2. Review progress logs: Should show regular progress updates
3. If timeout: Consider reducing smoke runs (5000 → 2000) in `runA3_2_3Stability.js`
4. If crash: Check error logs and fix the root cause

### Stability Diff Gate Failures

**Symptom**: `Stability diff gate` fails

**Steps**:
1. Review the error message to see which KPI regressed
2. Check `A3_2_3_STABILITY_SUMMARY.md` in artifacts
3. Compare with baseline to understand the change
4. Fix code if regression is unintentional, or update baseline if intentional

### Zero-Score Report Failures

**Symptom**: `Zero-score report` fails

**Steps**:
1. Check if `micro_fallback_samples_*.jsonl` files exist
2. Verify that `--sampleFailures` was passed to simulation
3. Check file permissions and paths
