# Все 10 сценариев для Runtime Smoke Tests (A1–C3)

## ГРУППА A: Overloaded/Exhausted (4 сессии)

### A1: Overloaded — "слишком много задач"
- **Тип:** Overloaded/Exhausted (A1)
- **Ответы:** Конкретные, мало NS
- **Ожидание:** `overloaded.rushed` или `overloaded.cognitive`
- **Baseline:** Высокий tension, средний energy, низкий control
- **Фокус:** Много задач, дедлайны, перегрузка

### A2: Overloaded — "много стимулов/хаос/переключения"
- **Тип:** Overloaded/Exhausted (A2) — **конфликтный**
- **Ответы:** 1 конфликтный шаг (противоречивые ответы)
- **Ожидание:** `overloaded.overstimulated` или `overloaded.cognitive`
- **Baseline:** Высокий tension, высокий energy, низкая clarity
- **Фокус:** Хаос, переключения, информационная перегрузка

### A3: Exhausted — "низкая энергия, но без высокого напряжения"
- **Тип:** Overloaded/Exhausted (A3) — **чистые ответы**
- **Ответы:** Чистые, без NS
- **Ожидание:** `exhausted.drained` или `exhausted.sleepy_fog`
- **Baseline:** Низкий energy, низкий tension, средняя clarity
- **Фокус:** Усталость без напряжения, истощение

### A4: Exhausted vs Overloaded конфликт — "устал + напряжён + срочно"
- **Тип:** Overloaded/Exhausted (A4) — **конфликтный**
- **Ответы:** 2 конфликтных шага
- **Ожидание:** `exhausted.*` или `overloaded.*`, но не уверен
- **Baseline:** Низкий energy, высокий tension, низкий control
- **Фокус:** Конфликт между усталостью и напряжением

---

## ГРУППА B: Connected/Detached (3 сессии)

### B1: Connected — "поддержка, контакт, энергия норм"
- **Тип:** Connected/Detached (B1)
- **Ответы:** Чистые
- **Ожидание:** `connected.*` (connected.supported, connected.engaged, etc.)
- **Baseline:** Высокий social, средний energy, положительный valence
- **Фокус:** Поддержка, контакт, позитивные социальные связи

### B2: Detached — "отстранённость, как будто не со мной, мало эмоций"
- **Тип:** Connected/Detached (B2)
- **Ответы:** Чистые
- **Ожидание:** `detached.numb` или `detached.disconnected`
- **Baseline:** Низкий social, низкий valence, низкая clarity
- **Фокус:** Отстранённость, эмоциональная отключённость

### B3: Social conflict — "контакт есть, но неприятно/раздражает"
- **Тип:** Connected/Detached (B3) — **конфликтный**
- **Ответы:** Конфликтные
- **Ожидание:** `connected.*` или `detached.*`, но с конфликтом
- **Baseline:** Средний social, низкий valence, высокий tension
- **Фокус:** Конфликтные социальные взаимодействия

---

## ГРУППА C: Размытые/Not sure (3 сессии)

### C1: Размытое состояние — много NS (минимум 3 NS)
- **Тип:** Размытые/Not sure (C1)
- **Ответы:** Минимум 3 NS
- **Ожидание:** Не уверен, возможно `grounded.*` или fallback
- **Baseline:** Средние значения по всем метрикам
- **Фокус:** Высокая неопределённость, много "Not sure"

### C2: Смешанное — "чуть вниз, но и немного контроля" (2 NS + 1 конфликт)
- **Тип:** Размытые/Not sure (C2)
- **Ответы:** 2 NS + 1 конфликтный шаг
- **Ожидание:** Не уверен, возможно `down.*` или `grounded.*`
- **Baseline:** Низкий valence, средний control, средняя clarity
- **Фокус:** Смешанное состояние с элементами неопределённости

### C3: Высокая неопределённость — "почти все NS"
- **Тип:** Размытые/Not sure (C3)
- **Ответы:** Почти все NS
- **Ожидание:** Не уверен, возможно fallback или `grounded.steady`
- **Baseline:** Средние значения, но с высокой неопределённостью
- **Фокус:** Максимальная неопределённость, почти все ответы "Not sure"

---

## Итоговая таблица

| ID | Название | Тип | Ответы | Ожидание |
|----|----------|-----|--------|----------|
| **A1** | Overloaded — "слишком много задач" | Overloaded/Exhausted | Конкретные, мало NS | `overloaded.rushed` / `overloaded.cognitive` |
| **A2** | Overloaded — "много стимулов/хаос" | Overloaded/Exhausted (конфликтный) | 1 конфликтный шаг | `overloaded.overstimulated` / `overloaded.cognitive` |
| **A3** | Exhausted — "низкая энергия, без напряжения" | Overloaded/Exhausted (чистые) | Чистые, без NS | `exhausted.drained` / `exhausted.sleepy_fog` |
| **A4** | Exhausted vs Overloaded конфликт | Overloaded/Exhausted (конфликтный) | 2 конфликтных шага | `exhausted.*` / `overloaded.*` (не уверен) |
| **B1** | Connected — "поддержка, контакт" | Connected/Detached | Чистые | `connected.*` |
| **B2** | Detached — "отстранённость, мало эмоций" | Connected/Detached | Чистые | `detached.numb` / `detached.disconnected` |
| **B3** | Social conflict — "контакт неприятен" | Connected/Detached (конфликтный) | Конфликтные | `connected.*` / `detached.*` (с конфликтом) |
| **C1** | Размытое состояние — много NS | Размытые/Not sure | Минимум 3 NS | `grounded.*` / fallback |
| **C2** | Смешанное — "чуть вниз + контроль" | Размытые/Not sure | 2 NS + 1 конфликт | `down.*` / `grounded.*` |
| **C3** | Высокая неопределённость | Размытые/Not sure | Почти все NS | fallback / `grounded.steady` |

---

## Распределение по типам

- **Overloaded/Exhausted:** 4 сессии (A1–A4)
- **Connected/Detached:** 3 сессии (B1–B3)
- **Размытые/Not sure:** 3 сессии (C1–C3)

**Итого: 10 сессий**

---

## Инструкция по проведению

1. Для каждого сценария:
   - Запустите Deep Dive flow в приложении
   - Выберите baseline согласно описанию
   - Отвечайте на L1 карточки согласно типу ответов (чистые/конфликтные/NS)
   - Скопируйте JSON из консоли (префикс `[DEEP_SMOKE_SESSION]`)

2. Сохраните все 10 JSON в файл `scripts/out/deep_smoke_sessions.jsonl` (по одному на строку)

3. Запустите скрипт заполнения:
   ```bash
   node scripts/fillRuntimeSmokeTests.js
   ```

4. Заполните вручную:
   - "Ожидание до прохождения" (что ожидали)
   - "Оценка" (✅ Попали / ⚠️ Частично / ❌ Мимо)
   - "Почему" (1 строка объяснения)
