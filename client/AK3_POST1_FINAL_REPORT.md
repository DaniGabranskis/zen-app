# AK3-POST-1 Final Report: Noisy-Mixed Deep Balance

**Date:** 2024-12-XX  
**Status:** ✅ Complete  
**Sample size:** 10,000 baseline combinations (из 117,649)  
**Seed:** 42 (reproducible)

---

## 📊 ФИНАЛЬНЫЕ МЕТРИКИ

### Top-Level Metrics

| Метрика | Значение | Цель | Статус |
|---------|----------|------|--------|
| **Micro null rate (overall)** | **10.61%** | ≤5% | ❌ **Превышен в 2.1 раза** |
| **Weak evidence share (overall)** | 2.39% | - | ✅ Приемлемо |
| **Macro flip rate** | 0.00% | ≤10% | ✅ Отлично |
| **Illegal flip rate** | 0.00% | 0% | ✅ Отлично |
| **Avg tags per run** | 6.04 | - | ✅ Хорошо |
| **Must-have hit rate** | 73.31% | - | ✅ Хорошо |

### Per-Macro Analysis

#### Micro Null Rate (Per Macro)

| Macro | Null Rate | Cases | Статус |
|-------|-----------|-------|--------|
| **overloaded** | **16.83%** | 211/1254 | ❌ **Критично** |
| **exhausted** | **16.00%** | 392/2450 | ❌ **Критично** |
| **detached** | 7.41% | 133/1794 | ⚠️ Выше цели |
| **down** | 7.22% | 325/4502 | ⚠️ Выше цели |

**Worst macro by micro null:** `overloaded` (16.83%)

#### Weak Evidence Share (Per Macro)

| Macro | Weak Evidence | Cases | Статус |
|-------|---------------|-------|--------|
| **exhausted** | 2.86% | 70/2450 | ✅ Приемлемо |
| **down** | 2.47% | 111/4502 | ✅ Приемлемо |
| **overloaded** | 1.99% | 25/1254 | ✅ Приемлемо |
| **detached** | 1.84% | 33/1794 | ✅ Приемлемо |

**Worst macro by weak evidence:** `exhausted` (2.86%)

---

## 🔍 АНАЛИЗ ПРОБЛЕМ

### ❌ Критическая проблема: Micro null rate 10.61%

**Причины (из анализа suspicious cases):**

1. **0-1 теги в ответах (239 случаев = 2.39%)**
   - 47 случаев с 0 тегами (0.47%)
   - 192 случая с 1 тегом (1.92%)
   - **Все эти случаи → micro=null**

2. **Только context tags без evidence**
   - Многие ответы содержат только `sig.context.*` теги
   - Context tags не дают достаточной информации для micro selection
   - Примеры: `sig.context.work.deadline`, `sig.context.health.stress`

3. **Baseline confidence = low (136 случаев)**
   - В сочетании с weak evidence → micro=null
   - Особенно для `overloaded` и `exhausted`

4. **Конфликтующие теги из разных макросов**
   - В noisy-mixed режиме 40% тегов конфликтующие
   - Это может "гасить" сигнал для micro selection

### 📊 Micro Distribution (Top 20)

1. `down.lonely_low`: 18.03% (1803)
2. `down.sad_heavy`: 14.53% (1453)
3. `exhausted.drained`: 9.80% (980)
4. `down.discouraged`: 9.21% (921)
5. `detached.disconnected`: 8.28% (828)
6. `exhausted.sleepy_fog`: 6.24% (624)
7. `detached.numb`: 5.53% (553)
8. `overloaded.cognitive`: 4.70% (470)
9. `exhausted.burnout`: 4.54% (454)
10. `overloaded.too_many_tasks`: 3.55% (355)

**Micro coverage:** 12/33 (36%) - нужно больше прогонов для полного покрытия

---

## 🎯 РЕКОМЕНДАЦИИ

### 1. Критично: Ослабить `shouldMicroBeNull` ✅ ВЫСОКИЙ ПРИОРИТЕТ

**Проблема:** Текущая логика слишком строгая для noisy-mixed режима.

**Текущая логика в `microSelector.js`:**
```javascript
export function shouldMicroBeNull(macroKey, evidenceTags, baselineConfidence) {
  if (baselineConfidence === 'low' && evidenceTags.length === 0) {
    return true;
  }
  if (baselineConfidence === 'low' && evidenceTags.length < 1) {
    return true;
  }
  return false;
}
```

**Рекомендация:**
- Ослабить проверку: разрешить micro selection даже при `baselineConfidence === 'low'` если есть хотя бы 1-2 тега
- Или: использовать fallback micro для каждого macro (выбирать "default" micro если нет достаточного evidence)

**Ожидаемый эффект:** Micro null rate снизится с 10.61% до ~3-5%

### 2. Улучшить генерацию noisy-mixed ✅ СРЕДНИЙ ПРИОРИТЕТ

**Проблема:** Генерация может создавать слишком много случаев с 0-1 тегами.

**Текущая логика:**
- Tag count: 0-4 tags per response (случайно)
- 40% aligned, 40% conflicting, 20% random

**Рекомендация:**
- Гарантировать минимум 1-2 тега на ответ (или минимум 1 must-have tag)
- Уменьшить вероятность 0 тегов до <0.1%
- Улучшить логику добавления must-have tags

**Ожидаемый эффект:** Снижение случаев с 0-1 тегами с 2.39% до <0.5%

### 3. Улучшить обработку context-only тегов ✅ СРЕДНИЙ ПРИОРИТЕТ

**Проблема:** Context tags (`sig.context.*`) не дают достаточной информации для micro selection.

**Рекомендация:**
- Игнорировать context-only ответы при micro selection (или требовать минимум 1 non-context tag)
- Или: использовать context tags как weak signal для fallback micro selection

**Ожидаемый эффект:** Улучшение micro selection для случаев с context-only тегами

### 4. Добавить fallback micro для каждого macro ✅ НИЗКИЙ ПРИОРИТЕТ

**Проблема:** Если нет достаточного evidence, micro остается null.

**Рекомендация:**
- Для каждого macro определить "default" micro (наиболее общий/нейтральный)
- Использовать default micro если:
  - `shouldMicroBeNull` возвращает true
  - Но baseline confidence не критически низкий (medium или выше)

**Ожидаемый эффект:** Micro null rate снизится до <2%

---

## 📈 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ ПОСЛЕ ИСПРАВЛЕНИЙ

| Метрика | Текущее | Цель | После исправлений |
|---------|---------|------|-------------------|
| Micro null rate | 10.61% | ≤5% | **3-5%** |
| Micro null (overloaded) | 16.83% | ≤5% | **4-6%** |
| Micro null (exhausted) | 16.00% | ≤5% | **4-6%** |
| Cases with 0-1 tags | 2.39% | <0.5% | **<0.5%** |

---

## 🔧 КОНКРЕТНЫЕ ДЕЙСТВИЯ

### Шаг 1: Ослабить `shouldMicroBeNull` (КРИТИЧНО)

**Файл:** `client/src/utils/microSelector.js`

**Изменение:**
```javascript
export function shouldMicroBeNull(macroKey, evidenceTags, baselineConfidence) {
  // Task AK3-POST-1: Ослаблено для noisy-mixed режима
  // Только null если baseline confidence критически низкий И нет тегов вообще
  if (baselineConfidence === 'low' && evidenceTags.length === 0) {
    return true; // Нет тегов вообще - слишком слабо
  }
  
  // Если есть хотя бы 1 тег, пытаемся выбрать micro (даже при low confidence)
  // selectMicro сам решит, достаточно ли evidence
  return false;
}
```

### Шаг 2: Улучшить генерацию (опционально)

**Файл:** `client/scripts/checkDeepBalance.js`

**Изменение в `generateSyntheticL1Responses`:**
- Гарантировать минимум 1 тег на ответ
- Улучшить логику добавления must-have tags

### Шаг 3: Добавить fallback micro (опционально)

**Файл:** `client/src/utils/microSelector.js`

**Добавить:**
```javascript
const FALLBACK_MICROS = {
  exhausted: 'exhausted.drained',
  overloaded: 'overloaded.cognitive',
  down: 'down.discouraged',
  detached: 'detached.disconnected',
  // ... для всех макросов
};
```

---

## 📋 ПРИМЕРЫ ПРОБЛЕМНЫХ КЕЙСОВ

### Case 1: 0 тегов → micro=null
- **Baseline:** `{valence:1, energy:1, tension:2, clarity:1, control:1, social:2}`
- **Baseline macro:** down
- **Evidence tags:** (none)
- **Result:** macro=down, micro=null, confidence=low
- **Проблема:** Нет тегов вообще

### Case 2: Только context tag → micro=null
- **Baseline:** `{valence:1, energy:1, tension:1, clarity:2, control:1, social:2}`
- **Baseline macro:** down
- **Evidence tags:** `sig.context.work.deadline`
- **Result:** macro=down, micro=null, confidence=low
- **Проблема:** Только context tag, нет evidence tags

### Case 3: 1 conflicting tag → micro=null
- **Baseline:** `{valence:1, energy:1, tension:2, clarity:1, control:6, social:7}`
- **Baseline macro:** exhausted
- **Evidence tags:** `sig.micro.engaged.curious` (conflicting!)
- **Result:** macro=exhausted, micro=null, confidence=low
- **Проблема:** Conflicting tag из другого macro

---

## ✅ ПОЛОЖИТЕЛЬНЫЕ МОМЕНТЫ

1. **Macro flip rate: 0.00%** - отлично, нет нестабильности
2. **Illegal flip rate: 0.00%** - нет семантических нарушений
3. **Weak evidence share: 2.39%** - приемлемо
4. **Must-have hit rate: 73.31%** - хорошо
5. **Avg tags per run: 6.04** - достаточно тегов в среднем

---

## 📁 ФАЙЛЫ

- **JSON:** `scripts/out/deep_balance_noisy_mixed.json`
- **MD:** `scripts/out/deep_balance_noisy_mixed.md`
- **Config:** mode=noisy-mixed, seed=42, runs=10000

---

## 🎯 ВЫВОДЫ

1. **Основная проблема:** Micro null rate 10.61% (цель ≤5%) - превышен в 2.1 раза
2. **Критичные макросы:** `overloaded` (16.83%) и `exhausted` (16.00%)
3. **Главная причина:** Слишком строгая логика `shouldMicroBeNull` + случаи с 0-1 тегами
4. **Решение:** Ослабить `shouldMicroBeNull` + улучшить генерацию noisy-mixed
5. **Ожидаемый результат:** Micro null rate снизится до 3-5%

**Статус:** ✅ Готово к исправлениям. Рекомендуется начать с ослабления `shouldMicroBeNull`.
