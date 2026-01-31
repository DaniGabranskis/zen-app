# Golden Sessions Test Suite

## Overview

Golden Sessions — это быстрый, детерминированный e2e-тест runner'а, который:
- За секунды ловит регрессии в выборе карточек, добавлении тегов, gates, micro selection
- Снимает зависимость от тяжёлых 50k прогонов на каждую правку
- Становится "страховкой" перед подключением runner в GUI (A3.3) и перед архитектурой/рефлексией

## Concepts

### Fixture

**Fixture** — это входные данные для теста (`.fixture.json`):
- `id` — уникальный идентификатор (например, `GS01`)
- `seed` — seed для RNG (детерминированность)
- `flowConfigOverrides` — переопределения конфигурации потока (maxL1, maxL2, minL1, minL2, stopOnGates, notSureRate, profile)
- `baselineMetrics` — 6 метрик baseline (valence, energy, tension, clarity, control, social, все 1-9)
- `answerPolicy` — политика ответов:
  - `profile: "mix"` — использует profiles.js (реалистичные ответы)
  - `forcedAnswers: { "<cardId>": "left|right|not_sure" }` — жёстко заданные ответы (детерминированность)

### Snapshot

**Snapshot** — это ожидаемый результат теста (`.snapshot.json`):
- Содержит стабильную проекцию (`stableProjection`) результата сессии
- Включает только детерминированные поля (без timestamp, nodeVersion и т.п.)
- Генерируется через `--update` и хранится в репозитории

### Stable Projection

**Stable Projection** — нормализованное представление результата сессии:
- `finalState`: endedReason, askedL1Count, askedL2Count, phase, macro/micro состояния, gates, evidence
- `eventDigest`: урезанный массив событий (type, cardId, choice, tags, gate, macro, micro)

Результат строго детерминирован и одинаков при каждом запуске на той же версии кода.

## Usage

### Run all tests

```bash
npm run test:golden-sessions
```

### Update snapshots (after code changes)

```bash
npm run test:golden-sessions:update
```

### Run single test

```bash
node scripts/runGoldenSessions.js --only GS01
```

### Print human-readable diff on failure

```bash
node scripts/runGoldenSessions.js --printDiff
```

## Test Cases

- **GS01-GS04**: Реалистичные профили (down/work, exhausted, detached, averse)
- **GS05**: Smoke mixed realistic (базовый сценарий)
- **GS06-GS08**: Edge cases (no L2 candidates, plan completed, max steps)
- **GS09**: Heavy "not sure" usage
- **GS10**: Low signal forced fallback

## Stability Notes

Чтобы golden не "плавали" из-за маленьких правок контента:
- Минимум 30–50% кейсов используют `forcedAnswers` (жёстко заданные ответы)
- Остальные — через профиль (`mix`, `uncertain`) для реализма

Это одновременно:
- Защищает core-runner от регрессий
- Не превращает тесты в ад при любом контент-редакте

## When to Run `golden:update`

You **must** run `npm run golden:update` (or `npm run test:golden-sessions:update`) when:

1. **You changed a fixture** (`*.fixture.json`):
   - Changed `flowConfigOverrides`, `baselineMetrics`, or `answerPolicy`
   - The harness will detect `fixtureHash` mismatch and fail with: `"Snapshot is OUTDATED (fixtureHash mismatch)"`

2. **You changed `stableProjection.js`**:
   - Changed projection format, normalization logic, or added/removed fields
   - You must increment `GOLDEN_SNAPSHOT_VERSION` in `stableProjection.js`
   - The harness will detect `snapshotVersion` mismatch and fail with: `"config.snapshotVersion mismatch"`

3. **You changed runner/events** in a way that affects output:
   - Changed event structure, added/removed event types
   - Changed state structure that affects `stableProjection`
   - Snapshots will fail diff comparison

**After `golden:update`**, all snapshots will be regenerated and `golden:check` will pass again.

## Schema-First Validation

**GS-SCHEMA-01**: All snapshots are validated against a JSON Schema (`schema/goldenSnapshot.schema.json`) before other checks.

The schema enforces:
- **Required config fields**: `snapshotVersion`, `fixtureHash`, `configHash`, `flow`, `mode`, `seed`, `maxL1`, `maxL2`, `minL1`, `minL2`, `stopOnGates`, `notSureRate`, `profile`
- **Required final fields**: `phase`, `endedReason`, `askedL1Count`, `askedL2Count`, `notSureCount`
- **Required signal quality fields**: `expectedMacro`, `signalScore`, `scoringTagCount`, `axisTagCount`, `eligibleForContradiction`, `hasContradiction`, `topSignals[]`
- **Event structure**: All events must have `i`, `type`, and optional fields per event type

If schema validation fails, the error message includes the exact path and field that failed.

**When to update schema**: If you add new required fields to `projection.final` or change event structure, update `schema/goldenSnapshot.schema.json` and bump `GOLDEN_SNAPSHOT_VERSION`.

## SnapshotVersion Policy

**GS-HYGIENE-06**: `snapshotVersion` must be bumped when:

| Change Type | Must Bump? | Example |
|------------|------------|---------|
| `projection.final` structure changes | ✅ **YES** | Added `final.signalQuality`, removed `final.oldField` |
| Event payload contract changes | ✅ **YES** | Added `expected_macro_computed` event, changed `micro_selected` payload |
| Normalization rules change | ✅ **YES** | Changed how `stableProjection.js` normalizes events |
| Only fixture content changes | ❌ **NO** | Changed `baselineMetrics` in fixture (detected by `fixtureHash`) |
| Runner logic changes (same output format) | ❌ **NO** | Bug fix that doesn't change projection structure |

**Enforcement**: `validateSnapshots.js` and `goldenDoctor.js` check that `config.snapshotVersion === GOLDEN_SNAPSHOT_VERSION`. Mismatch causes CI failure with instruction to run `npm run golden:update`.

## Snapshot Hygiene

Each snapshot includes two metadata fields to detect outdated snapshots:

- **`config.fixtureHash`**: SHA1 hash of the fixture JSON (detects fixture changes)
- **`config.snapshotVersion`**: Version string from `stableProjection.js` (detects format changes)

If either doesn't match, `golden:check` will fail with a clear error message telling you to run `golden:update`.

## CI Integration

- **`npm run golden:check`** (or `npm run test:golden-sessions`) is a **blocker** in CI
- Snapshot updates (`golden:update`) should be done **manually** and committed
- Never auto-update snapshots in CI (this would hide regressions)

## Contradiction Budget

**`npm run golden:summary`** generates a summary and checks the **contradiction budget**:

- **Maximum 1 intentional contradiction allowed**
- Contradictions are only evaluated for **eligible sessions** (signalScore ≥ 2 and scoringTagCount ≥ 3)
- Low-signal sessions (e.g., GS10 with many "not_sure") are automatically ineligible and NOT flagged
- Intentional contradictions must have `tags: ["intentional_contradiction"]` in the fixture
- If more than 1 eligible contradiction is detected (or any unexpected ones), the script exits with code 1 (CI fail)

**Eligibility Rules (GS-MEANING-05):**

- No hard-coded fixture ID exclusions
- Eligibility is computed: `Math.abs(signalScore) >= 2 && scoringTagCount >= 3`
- This ensures only sessions with strong, clear signals are evaluated for contradictions

**When to add intentional contradictions:**

- Add `tags: ["intentional_contradiction"]` to the fixture JSON
- The budget check will allow exactly 1 such fixture
- This ensures regressions don't introduce unexpected contradictions while allowing intentional test cases
