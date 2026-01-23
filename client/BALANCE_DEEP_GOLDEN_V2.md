# Deep Golden Metrics V2

**Generated:** 2026-01-18T10:04:08.224Z  
**Commit:** `17f3b1f8cc41ca8e69d0c5b07229dc256036f9e2`  
**Command:** `node scripts/checkDeepBalance.js --mode noisy-mixed --seed 42 --runs 10000 --outDir ./scripts/out`

## Top-Level Metrics (V2)

- **Micro none rate (overall):** 0.00% (0 cases) - ожидается ≈0%
- **Micro fallback rate (overall):** 1.58% (158 cases) - **главный KPI** (цель: ≤5%) ✅
- **Micro selected rate (overall):** 98.42% (9842 cases)
- **Micro specific rate (overall):** 85.73% of selected (84.38% of total) - **новый KPI**
- **Micro axis-only rate (overall):** 0.00% of selected (0.00% of total)
- **Weak evidence share (overall):** 2.39% (239 cases)
- **Macro flip rate:** 0.00% (0 cases)
- **Illegal flip rate:** 0.00% (0 cases) ✅
- **Avg tags per run:** 5.99
- **Must-have hit rate:** 73.31%

## Fallback Reason Breakdown (V2)

### Overall
- **no_matches_zero_score:** 70.25% (111 cases)
- **no_evidence:** 29.75% (47 cases)

### Per Macro
- **down:** no_matches_zero_score 80.56%, no_evidence 19.44%
- **exhausted:** no_matches_zero_score 43.48%, no_evidence 56.52%
- **overloaded:** no_matches_zero_score 50.00%, no_evidence 50.00%
- **detached:** no_matches_zero_score 53.85%, no_evidence 46.15%

## Micro Fallback Rate (Per Macro - V2)

- **down:** 2.34%
- **overloaded:** 1.10%
- **exhausted:** 0.93%
- **detached:** 0.72%

**Worst macro:** down (2.34%) - в пределах цели ≤8%

## Micro Specificity (Per Macro - V2)

- **down:** 89.60% specific, 0.00% axis-only
- **exhausted:** 75.92% specific, 0.00% axis-only
- **overloaded:** 75.60% specific, 0.00% axis-only
- **detached:** 88.96% specific, 0.00% axis-only

## V1 vs V2 Comparison

| Metric | V1 | V2 | Change | Interpretation |
|--------|----|----|--------|----------------|
| **Micro null/none rate** | 2.11% | 0.00% | -2.11% | ✅ P0: Убран micro=null через fallback mechanism |
| **Micro fallback rate** | N/A | 1.58% | New KPI | ✅ Новая метрика после AK3-POST-1.3 |
| **Micro selected rate** | ~97.89% | 98.42% | +0.53% | ✅ Небольшое улучшение |
| **Macro flip rate** | 0.00% | 0.00% | 0% | ✅ Без изменений, стабильно |
| **Illegal flip rate** | N/A | 0.00% | New KPI | ✅ Новая метрика |
| **Weak evidence share** | N/A | 2.39% | New KPI | ✅ Новая метрика |
| **Micro specific rate** | N/A | 85.73% | New KPI | ✅ Новый главный KPI (AK3-POST-1.4) |
| **Avg tags per run** | N/A | 5.99 | New KPI | ✅ Новая метрика |

### Key Improvements

1. **Eliminated micro=null (P0)**
   - V1: 2.11% cases had `microKey = null`
   - V2: 0.00% - все случаи получают fallback micro через `microSource: 'fallback'`
   - **Impact:** UX improvement - пользователь всегда получает конкретный micro state

2. **Reduced fallback rate (AK3-POST-1.3 - Variant 1)**
   - **Baseline (before Variant 1):** 14.24% fallback rate
   - **V2 (after Variant 1):** 1.58% fallback rate
   - **Improvement:** -12.66% (88.9% reduction)
   - **Method:** Добавлены context теги (`sig.context.health.stress`, `sig.context.work.deadline`, `sig.context.social.isolation`, `sig.context.family.tension`) в `supporting` для релевантных micros
   - **Why it worked:** 96.49% fallback было из-за `no_matches_zero_score` → расширение mapping помогло

3. **New KPIs (AK3-POST-1.1, 1.2, 1.4)**
   - **Fallback reason breakdown:** теперь видим, почему происходит fallback
   - **Micro specific rate:** главный KPI качества (85.73% - хорошо)
   - **Top tags in fallback:** диагностика для дальнейших улучшений

### Fallback Reason Analysis (V2)

**Before Variant 1:**
- `no_matches_zero_score`: 96.49%
- `no_evidence`: 3.51%

**After Variant 1 (V2):**
- `no_matches_zero_score`: 70.25% (-26.24%)
- `no_evidence`: 29.75% (+26.24%)

**Interpretation:**
- Расширение mapping (`supporting` tags) снизило `no_matches_zero_score` с 96.49% до 70.25%
- Остается место для дальнейшего улучшения (добавление больше тегов или alias mapping)
- `no_evidence` увеличился относительно, но абсолютное количество снизилось (это нормально при общем снижении fallback)

## Top Tags in Fallback Cases (V2)

Для дальнейшей оптимизации:

1. **sig.context.work.deadline:** 67 (42.41%) - уже добавлен в supporting, но все еще доминирует
2. **sig.micro.averse.angry:** 12 (7.59%) - возможно нужен alias или supporting
3. **sig.micro.blocked.avoidant:** 11 (6.96%) - возможно нужен alias или supporting

## Sanity Checks (V2)

✅ Micro none rate: 0.00% (threshold: ≤5%)  
✅ Micro fallback rate: 1.58% (threshold: ≤5%)  
✅ Macro flip rate: 0.00% (threshold: ≤10%)  
✅ Illegal flip rate: 0.00% (threshold: 0)  
✅ Micro specific rate: 85.73% (threshold: ≥70%)

## Notes

- **Standard run size:** 10,000 baseline combinations (выбран стандарт для стабильности)
- **Mode:** noisy-mixed (реалистичный режим с конфликтами и неопределенностью)
- **Seed:** 42 (для воспроизводимости)
- **Variant 1 implementation:** Context теги добавлены в `supporting` для 12 micros (overloaded/exhausted/down/detached)
- **Next steps:** AK3-POST-4 (runtime smoke tests), AK3-DEEP-L1-1 (adaptive L1 cards)
