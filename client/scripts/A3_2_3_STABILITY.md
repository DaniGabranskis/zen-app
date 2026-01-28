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
