# AK3-POST-1.3 — Правильный рычаг снижения fallback (Завершено)

**Дата:** 2026-01-15  
**Статус:** ✅ Завершено

## Задача

Реализовать **Вариант 1** из AK3-POST-1.3: расширить mapping `evidenceTags → microEvidenceTags` на основе breakdown причин fallback.

### Анализ breakdown (до изменений)

Из `deep_balance_noisy_mixed.md` (5000 прогонов):
- **Fallback reason:** `no_matches_zero_score` — 96.49% (доминирует)
- **Top tags в fallback cases:**
  - `sig.context.health.stress`: 52.53%
  - `sig.context.work.deadline`: 50.28%
  - `sig.context.social.isolation`: 47.05%
  - `sig.context.family.tension`: 18.26%

### Реализация

Добавлены context теги в `supporting` для релевантных micros в `client/src/data/microEvidenceTags.js`:

#### Overloaded micros
- `overloaded.cognitive`: добавлены `sig.context.health.stress`, `sig.context.work.deadline`, `sig.context.social.isolation`
- `overloaded.too_many_tasks`: добавлены `sig.context.work.deadline`, `sig.context.health.stress`, `sig.context.social.isolation`
- `overloaded.overstimulated`: добавлены `sig.context.health.stress`, `sig.context.work.deadline`, `sig.context.social.isolation`

#### Exhausted micros
- `exhausted.drained`: добавлены `sig.context.health.stress`, `sig.context.work.deadline`, `sig.context.social.isolation`, `sig.context.family.tension`
- `exhausted.sleepy_fog`: добавлены `sig.context.health.stress`, `sig.context.work.deadline`, `sig.context.social.isolation`
- `exhausted.burnout`: добавлены `sig.context.work.deadline`, `sig.context.health.stress`, `sig.context.social.isolation`, `sig.context.family.tension`

#### Down micros
- `down.sad_heavy`: добавлены `sig.context.health.stress`, `sig.context.family.tension`
- `down.discouraged`: добавлены `sig.context.health.stress`, `sig.context.family.tension`, `sig.context.social.isolation`
- `down.lonely_low`: добавлены `sig.context.health.stress`, `sig.context.family.tension`

#### Detached micros
- `detached.numb`: добавлены `sig.context.health.stress`, `sig.context.work.deadline`, `sig.context.family.tension`
- `detached.disconnected`: добавлены `sig.context.health.stress`, `sig.context.work.deadline`, `sig.context.family.tension`
- `detached.autopilot`: добавлены `sig.context.health.stress`, `sig.context.work.deadline`, `sig.context.family.tension`

## Результаты

### До изменений (baseline)
- **Micro fallback rate:** 14.24% (712 случаев из 5000)
- **Micro selected rate:** 85.76%
- **Fallback reason:** `no_matches_zero_score` — 96.49%

### После изменений
- **Micro fallback rate:** 1.42% (71 случай из 5000) — **снижение на 12.82%** ✅
- **Micro selected rate:** 98.58% — **улучшение на 12.82%** ✅
- **Fallback reason breakdown:**
  - `no_matches_zero_score`: 64.79% (снижение с 96.49%)
  - `no_evidence`: 35.21% (новый фактор)
- **Illegal flip rate:** 0.00% (без регрессии) ✅
- **Micro specific rate:** 80.22% of selected (79.08% of total)

### Per-macro fallback rates

| Macro | До | После | Улучшение |
|-------|-----|-------|-----------|
| overloaded | 14.40% | 1.10% | -13.30% |
| exhausted | 13.79% | 0.93% | -12.86% |
| down | 7.71% | 2.64% | -5.07% |
| detached | 9.09% | 0.00% | -9.09% |

**Worst macro:** down (2.64%) — все еще в пределах цели ≤8%

## Выводы

1. ✅ **Цель достигнута:** Fallback rate снизился с 14.24% до 1.42% (цель ≤5%)
2. ✅ **Без регрессии:** Illegal flip rate остался 0.00%
3. ✅ **Специфичность сохранена:** Micro specific rate 80.22% — хороший показатель
4. ✅ **Метод работает:** Добавление context тегов в `supporting` значительно улучшило matching

## Следующие шаги

1. **AK3-POST-1.3 (Вариант 2)** — не требуется, так как Вариант 1 успешно решил проблему
2. **AK3-POST-3** — Update golden deep metrics v2 (создать `BALANCE_DEEP_GOLDEN_V2.md`)
3. **AK3-POST-4** — Runtime smoke tests (5–10 реальных сессий)

## Файлы изменены

- `client/src/data/microEvidenceTags.js` — добавлены context теги в supporting для 12 micros
