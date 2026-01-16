# Micro Taxonomy v1

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** Approved (design artifact)

## Overview

Micro states are **refinements** of macro states, available only in deep dive flows. They provide semantic precision without breaking the macro classification contract.

## Key Principles

1. **Micro = refinement, not replacement**: Micro states refine macro states, they don't create a parallel classification system
2. **Deep-only**: Micro states are never returned in simplified (baseline-only) flows
3. **Evidence-driven**: Micro selection depends on L1 card evidence tags, not on "fine-grained baseline thresholds"
4. **Macro-first**: Deep engine starts with baseline macro (prior), then refines micro within top-2 macro candidates

## Macro → Micro Mapping

### Grounded

**Macro:** `grounded`  
**Micro states:**
- `grounded.steady` — ровно, устойчиво, без суеты
- `grounded.present` — в моменте, ясная голова
- `grounded.recovered` — восстановился после напряжения/усталости

**Evidence tags:**
- `sig.micro.grounded.steady`: stability, calm, no rush
- `sig.micro.grounded.present`: mindfulness, clear head, awareness
- `sig.micro.grounded.recovered`: post-stress recovery, restoration

### Engaged

**Macro:** `engaged`  
**Micro states:**
- `engaged.focused` — энергия + фокус
- `engaged.curious` — интерес/исследование
- `engaged.inspired` — драйв/вдохновение, "хочу делать"

**Evidence tags:**
- `sig.micro.engaged.focused`: energy + focus, concentration
- `sig.micro.engaged.curious`: interest, exploration, questions
- `sig.micro.engaged.inspired`: drive, motivation, "want to do"

### Connected

**Macro:** `connected`  
**Micro states:**
- `connected.warm` — тепло/поддержка
- `connected.social_flow` — легко общаться, "в потоке"
- `connected.seen` — ощущение "меня понимают/видят"

**Evidence tags:**
- `sig.micro.connected.warm`: warmth, support, care
- `sig.micro.connected.social_flow`: easy communication, social flow
- `sig.micro.connected.seen`: feeling understood/seen, validation

### Capable

**Macro:** `capable`  
**Micro states:**
- `capable.deciding` — решительность/определённость
- `capable.executing` — эффективно делаю и двигаюсь
- `capable.structured` — порядок, контроль, план

**Evidence tags:**
- `sig.micro.capable.deciding`: decisiveness, certainty, clarity of choice
- `sig.micro.capable.executing`: effective action, movement, progress
- `sig.micro.capable.structured`: order, control, planning, organization

### Pressured

**Macro:** `pressured`  
**Micro states:**
- `pressured.rushed` — спешка/дедлайны
- `pressured.performance` — "надо соответствовать", напряжение из-за оценки
- `pressured.tense_functional` — давит, но я функционирую

**Evidence tags:**
- `sig.micro.pressured.rushed`: hurry, deadlines, time pressure
- `sig.micro.pressured.performance`: "need to meet expectations", evaluation anxiety
- `sig.micro.pressured.tense_functional`: pressure exists, but still functioning

### Blocked

**Macro:** `blocked`  
**Micro states:**
- `blocked.stuck` — "не могу начать", вязкость
- `blocked.avoidant` — избегание, откладывание, сопротивление
- `blocked.frozen` — "замер", внутренний стоп

**Evidence tags:**
- `sig.micro.blocked.stuck`: "can't start", viscosity, inertia
- `sig.micro.blocked.avoidant`: avoidance, procrastination, resistance
- `sig.micro.blocked.frozen`: "frozen", internal stop, paralysis

### Overloaded

**Macro:** `overloaded`  
**Micro states:**
- `overloaded.cognitive` — голова перегружена, "слишком много вкладок"
- `overloaded.too_many_tasks` — много обязательств, нет приоритета
- `overloaded.overstimulated` — сенсорная/информационная перегрузка

**Evidence tags:**
- `sig.micro.overloaded.cognitive`: head overloaded, "too many tabs"
- `sig.micro.overloaded.too_many_tasks`: many obligations, no priority
- `sig.micro.overloaded.overstimulated`: sensory/information overload

### Exhausted

**Macro:** `exhausted`  
**Micro states:**
- `exhausted.drained` — выжатость
- `exhausted.sleepy_fog` — сонливость/туман
- `exhausted.burnout` — хроническая усталость + отвращение к нагрузке

**Evidence tags:**
- `sig.micro.exhausted.drained`: drained, depleted, empty
- `sig.micro.exhausted.sleepy_fog`: sleepiness, fog, drowsiness
- `sig.micro.exhausted.burnout`: chronic fatigue + aversion to load

### Down

**Macro:** `down`  
**Micro states:**
- `down.sad_heavy` — грусть/тяжесть
- `down.discouraged` — подавленность/безнадёга
- `down.lonely_low` — "одиноко" как оттенок down (не равно detached)

**Evidence tags:**
- `sig.micro.down.sad_heavy`: sadness, heaviness, weight
- `sig.micro.down.discouraged`: discouragement, hopelessness, defeat
- `sig.micro.down.lonely_low`: loneliness as shade of down (not equal to detached)

### Averse

**Macro:** `averse`  
**Micro states:**
- `averse.irritated` — раздражение/нетерпимость
- `averse.angry` — злость/готовность конфликтовать
- `averse.disgust_avoid` — отторжение/"не могу это видеть/делать"

**Evidence tags:**
- `sig.micro.averse.irritated`: irritation, intolerance, annoyance
- `sig.micro.averse.angry`: anger, readiness to conflict, rage
- `sig.micro.averse.disgust_avoid`: rejection, "can't see/do this", disgust

### Detached

**Macro:** `detached`  
**Micro states:**
- `detached.numb` — онемение, "ничего не чувствую"
- `detached.disconnected` — социальное отключение
- `detached.autopilot` — "делаю на автомате"

**Evidence tags:**
- `sig.micro.detached.numb`: numbness, "feel nothing", emotional shutdown
- `sig.micro.detached.disconnected`: social disconnection, isolation
- `sig.micro.detached.autopilot`: "doing on autopilot", mechanical, no presence

### Uncertain (Macro-Only)

**Macro:** `uncertain`  
**Micro states:** None (macro-only, extreme uncertainty)

**Uncertainty notes (not states, but explanation tags):**
- `uncertainty_note.conflict` — conflicting signals
- `uncertainty_note.low_clarity` — low clarity of signals

**Note:** `uncertain` remains a macro-only state for extreme uncertainty cases. In deep dive, we can provide "uncertainty notes" as explanation tags, but not separate micro states.

## Macro Flip Rules

**Default:** Micro refinement happens **within** the baseline macro (or top-2 macro candidates).

**Macro flip allowed only if:**
1. **Strong evidence against baseline macro**: Evidence tags strongly contradict baseline macro
2. **Score difference threshold**: Alternative macro has significantly higher score after evidence
3. **Required tags present**: Specific evidence tags that are incompatible with baseline macro

**Macro flip criteria (to be defined in implementation):**
- Evidence weight > threshold (e.g., 0.5)
- Score difference > threshold (e.g., 0.1)
- Presence of "hard blocker" evidence tags

## Implementation Notes

1. **Micro selection algorithm:**
   - Start with baseline macro (prior)
   - Collect evidence tags from L1 cards
   - Score micro states within macro cluster
   - Select top micro (or remain at macro level if no strong micro match)

2. **Micro state format:**
   - Full key: `{macro}.{micro}` (e.g., `pressured.rushed`)
   - Display: Can show as "Pressured (Rushed)" or just "Rushed" depending on context

3. **Fallback:**
   - If no micro matches strongly, return macro state only
   - Micro is optional refinement, not required

## Related Documents

- `BASELINE_MACRO_CONTRACT.md` — Macro state contract
- `TAG_NORMALIZATION_V1.md` — Tag schema and normalization
- `L1_CARDS_DESIGN.md` — L1 card design principles
