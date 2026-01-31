# Golden Sessions Summary

Generated summary of all Golden Session snapshots.

## Overview

| ID | Ended Reason | L1/L2/NS | Macro (Before → After) | Micro | Core Gates (Any/CardsOnly) | Expected Macro | Signal Score | Contradiction | Top Signals |
|----|-------------|----------|-------------------------|-------|----------------------------|----------------|--------------|---------------|-------------|
| GS01 | l2_plan_completed | 5/1/1 | down | down.sad_heavy | 4/3 | up | 4 | ✅ NO | sig.valence.pos, sig.agency.high, sig.arousal.high |
| GS02 | l2_plan_completed | 5/1/0 | exhausted | exhausted.drained | 4/2 | exhausted | -3 | ✅ NO | sig.valence.neg, sig.fatigue.high |
| GS03 | no_l2_candidates | 4/0/0 | connected | connected.social_flow | 4/2 | up | 3 | ✅ NO | sig.valence.pos, sig.arousal.high |
| GS04 | no_l2_candidates | 5/0/1 | averse | averse.angry | 4/2 | mixed | -1 | ✅ NO | sig.valence.neg, sig.arousal.high |
| GS05 | l2_plan_completed | 5/1/1 | connected | connected.social_flow | 4/2 | up | 3 | ✅ NO | sig.valence.pos, sig.agency.high |
| GS06 | l2_plan_completed | 5/1/4 | connected | connected.social_flow | 4/0 | mixed | 0 | ✅ NO | none |
| GS07 | l2_plan_completed | 5/2/3 | detached | detached.autopilot | 4/2 | up | 3 | ✅ NO | sig.valence.pos, sig.arousal.high |
| GS08 | no_l2_candidates | 3/0/0 | connected | connected.social_flow | 4/2 | mixed | -1 | ✅ NO | sig.valence.neg, sig.arousal.high |
| GS09 | l2_plan_completed | 5/2/4 | detached | detached.autopilot | 4/2 | exhausted | -3 | ✅ NO | sig.valence.neg, sig.fatigue.high |
| GS10 | l2_plan_completed | 5/1/6 | connected | connected.social_flow | 4/0 | mixed | 0 | ✅ NO | none |
| GS11 | gates_closed | 5/0/0 | detached | detached.autopilot | 4/4 | up | 5 | ✅ NO | sig.valence.pos, sig.agency.high, sig.clarity.high, sig.arousal.high |
| GS12 | max_l2 | 5/2/1 | detached | detached.autopilot | 4/2 | up | 3 | ✅ NO | sig.valence.pos, sig.arousal.high |
| GS13 | l2_plan_completed | 5/1/1 | down | down.discouraged | 4/3 | exhausted | -2 | ✅ NO | sig.valence.neg, sig.agency.high, sig.fatigue.high |
| GS14 | l2_plan_completed | 5/1/1 | exhausted | exhausted.drained | 4/2 | exhausted | -3 | ✅ NO | sig.valence.neg, sig.fatigue.high |
| GS15 | l2_plan_completed | 5/1/1 | overloaded | overloaded.cognitive | 4/3 | up | 4 | ⚠️ YES | sig.valence.pos, sig.arousal.high, sig.clarity.high |

## Legend

- **L1/L2/NS**: Asked L1 count / Asked L2 count / Not Sure count
- **Macro**: Macro state before cards → after L2 (or L1 if no L2)
- **Micro**: Selected micro (or source if not selected)
- **Core Gates**: Number of core gates hit (Any source / CardsOnly)
- **Expected Macro**: Macro predicted from signal polarity score
- **Signal Score**: Computed from scoring tags (valence ±2, arousal/fatigue/tension/clarity/agency ±1)
- **Contradiction**: ⚠️ YES = expected macro contradicts final macro, ✅ NO = no contradiction
- **Top Signals**: Top 5 scoring tags driving the signal score

## Notes

- This summary is generated from snapshot files.
- For detailed event logs, see individual snapshot files.
- Contradiction detection uses signal polarity from scoring tags.
- Low-signal sessions (e.g., GS10 with many "not_sure") should show neutral/mixed expected macro.
