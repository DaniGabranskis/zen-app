# Release Readiness Checklist (12 Personas)

This checklist is used before APK/beta builds to verify that the deep session logic produces reasonable results for diverse user scenarios.

## How to Use

1. For each persona, run a deep session simulation (or manual test) with the described baseline state.
2. Check the resulting macro state and micro selection.
3. Mark whether the result "feels wrong" and document why.
4. If multiple personas show issues, investigate before releasing.

---

## Personas

### 1. **Morning High Energy, Clear Goals**
- **Baseline**: `{ valence: 5, energy: 6, tension: 2, clarity: 6, control: 5, social: 4 }`
- **Expected Macro**: `up` (engaged/grounded)
- **Why**: High valence, energy, clarity, and control indicate positive, motivated state
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 2. **Evening Exhausted, Low Motivation**
- **Baseline**: `{ valence: 2, energy: 1, tension: 3, clarity: 3, control: 2, social: 2 }`
- **Expected Macro**: `exhausted` (drained/fatigued)
- **Why**: Very low energy, low valence, low control indicate depletion
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 3. **Work Stress, High Pressure**
- **Baseline**: `{ valence: 3, energy: 5, tension: 6, clarity: 4, control: 3, social: 3 }`
- **Expected Macro**: `overloaded` (cognitive/pressure) or `down` (anxious)
- **Why**: High tension, moderate energy, low control indicate stress
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 4. **Social Conflict, Withdrawal**
- **Baseline**: `{ valence: 2, energy: 3, tension: 5, clarity: 3, control: 2, social: 1 }`
- **Expected Macro**: `down` (sad_heavy/discouraged) or `averse` (angry)
- **Why**: Low valence, low social, high tension indicate social distress
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 5. **Post-Workout, Energized**
- **Baseline**: `{ valence: 5, energy: 6, tension: 2, clarity: 5, control: 5, social: 4 }`
- **Expected Macro**: `up` (engaged/grounded)
- **Why**: High energy, positive valence, low tension indicate physical activation
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 6. **Decision Fatigue, Indecisive**
- **Baseline**: `{ valence: 3, energy: 3, tension: 4, clarity: 2, control: 2, social: 3 }`
- **Expected Macro**: `detached` (autopilot/disconnected) or `exhausted` (drained)
- **Why**: Very low clarity, low control indicate cognitive depletion
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 7. **Creative Flow State**
- **Baseline**: `{ valence: 5, energy: 5, tension: 2, clarity: 6, control: 6, social: 3 }`
- **Expected Macro**: `up` (engaged/grounded)
- **Why**: High clarity, control, positive valence indicate flow
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 8. **Social Anxiety, Overthinking**
- **Baseline**: `{ valence: 2, energy: 4, tension: 6, clarity: 2, control: 2, social: 5 }`
- **Expected Macro**: `down` (anxious) or `overloaded` (cognitive)
- **Why**: High tension, low clarity, high social indicate social anxiety
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 9. **Post-Social High, Connected**
- **Baseline**: `{ valence: 5, energy: 5, tension: 2, clarity: 5, control: 4, social: 6 }`
- **Expected Macro**: `connected` (social_flow/warmth)
- **Why**: High social, positive valence, low tension indicate positive connection
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 10. **Burnout, Disengaged**
- **Baseline**: `{ valence: 2, energy: 1, tension: 3, clarity: 2, control: 1, social: 2 }`
- **Expected Macro**: `exhausted` (drained) or `detached` (disconnected)
- **Why**: Very low across all dimensions indicates burnout
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 11. **Mixed Signals, Ambivalent**
- **Baseline**: `{ valence: 3, energy: 4, tension: 4, clarity: 3, control: 3, social: 3 }`
- **Expected Macro**: `mixed` (could be any, depends on evidence)
- **Why**: Neutral/mixed baseline should produce mixed or evidence-driven result
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

### 12. **Anger, High Arousal**
- **Baseline**: `{ valence: 1, energy: 6, tension: 6, clarity: 4, control: 2, social: 2 }`
- **Expected Macro**: `averse` (angry) or `down` (frustrated)
- **Why**: High energy, high tension, low valence, low control indicate anger
- **Result feels wrong?**: ☐ Yes ☐ No
- **Why**: 
- **What to fix**: 

---

## Summary

- **Total checked**: ___ / 12
- **Feels wrong**: ___ / 12
- **Blocking release**: ☐ Yes ☐ No
- **Notes**: 

---

## Next Steps

If any persona shows unexpected results:
1. Check `npm run stability:smoke` output for similar patterns
2. Review `npm run zero-score:report` for tag normalization issues
3. Check `client/out/GOLDEN_SESSIONS_SUMMARY.md` for contradictions
4. Investigate micro selection logic if macro is correct but micro feels off
5. Document findings and fix before release
