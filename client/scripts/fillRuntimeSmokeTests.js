// fillRuntimeSmokeTests.js (AK3-POST-4c.3)
// Automatically fills RUNTIME_SMOKE_DEEP.md from JSON session logs
//
// Usage:
//   1. Collect JSON logs from console (prefix [DEEP_SMOKE_SESSION])
//   2. Save them to scripts/out/deep_smoke_sessions.jsonl (one JSON per line)
//   3. Run: node scripts/fillRuntimeSmokeTests.js --input scripts/out/deep_smoke_sessions.jsonl --output RUNTIME_SMOKE_DEEP_FILLED.md
//
// Format: NDJSON (one JSON object per line)

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    input: path.join(__dirname, 'out', 'deep_smoke_sessions.jsonl'),
    output: path.join(__dirname, '..', 'RUNTIME_SMOKE_DEEP_FILLED.md'),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      config.input = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      config.output = args[i + 1];
      i++;
    }
  }

  return config;
}

function formatBaseline(baseline) {
  if (!baseline) return '- Valence: [N/A]\n- Energy: [N/A]\n- Tension: [N/A]\n- Clarity: [N/A]\n- Control: [N/A]\n- Social: [N/A]';
  
  return `- Valence: ${baseline.valence ?? '[N/A]'}
- Energy: ${baseline.energy ?? '[N/A]'}
- Tension: ${baseline.tension ?? '[N/A]'}
- Clarity: ${baseline.clarity ?? '[N/A]'}
- Control: ${baseline.control ?? '[N/A]'}
- Social: ${baseline.social ?? '[N/A]'}`;
}

function formatSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return '- [No steps recorded]';
  }

  return steps.map((step, idx) => {
    const cardId = step.cardId || '[unknown]';
    const response = step.response || '[unknown]';
    const selectedBecause = step.selectedBecause || 'fixed_plan';
    const gatesState = step.gatesState 
      ? `{ control: ${step.gatesState.control}, clarity: ${step.gatesState.clarity}, load: ${step.gatesState.load}, social: ${step.gatesState.social} }`
      : 'N/A';
    const tagsCount = step.addedTagsCount || 0;
    const tagsSample = step.addedTags && step.addedTags.length > 0
      ? step.addedTags.slice(0, 5).join(', ') + (step.addedTagsTruncated ? ' ...' : '')
      : '(none)';

    return `- Step ${idx}: \`${cardId}\` → \`${response}\` (selectedBecause: \`${selectedBecause}\`, gatesState: ${gatesState}, tags: ${tagsCount} [${tagsSample}])`;
  }).join('\n');
}

function formatOutput(output) {
  if (!output) {
    return `- macroBase: [N/A]
- macroFinal: [N/A]
- microKey: [N/A]
- microSource: [N/A]
- confidenceBand: [N/A]
- clarityFlag: [N/A]
- needsRefine: [N/A]
- endedBy: [N/A]
- finalEvidenceTagsCount: [N/A]`;
  }

  return `- macroBase: \`${output.macroBase || '[N/A]'}\`
- macroFinal: \`${output.macroFinal || '[N/A]'}\`
- microKey: \`${output.microKey || '[N/A]'}\`
- microSource: \`${output.microSource || '[N/A]'}\`
- confidenceBand: \`${output.confidenceBand || '[N/A]'}\`
- clarityFlag: \`${output.clarityFlag || '[N/A]'}\`
- needsRefine: \`${output.needsRefine || '[N/A]'}\`
- endedBy: \`${output.endedBy || '[N/A]'}\`
- finalEvidenceTagsCount: ${output.finalEvidenceTagsCount || '[N/A]'}`;
}

// Scenario mapping: A1-A4, B1-B3, C1-C3
const SCENARIO_MAP = {
  0: { id: 'A1', name: 'Overloaded — "слишком много задач"', type: 'Overloaded/Exhausted (A1)' },
  1: { id: 'A2', name: 'Overloaded — "много стимулов/хаос/переключения"', type: 'Overloaded/Exhausted (A2) — конфликтный (1 конфликтный шаг)' },
  2: { id: 'A3', name: 'Exhausted — "низкая энергия, но без высокого напряжения"', type: 'Overloaded/Exhausted (A3) — чистые ответы' },
  3: { id: 'A4', name: 'Exhausted vs Overloaded конфликт — "устал + напряжён + срочно"', type: 'Overloaded/Exhausted (A4) — конфликтный (2 конфликтных шага)' },
  4: { id: 'B1', name: 'Connected — "поддержка, контакт, энергия норм"', type: 'Connected/Detached (B1)' },
  5: { id: 'B2', name: 'Detached — "отстранённость, как будто не со мной, мало эмоций"', type: 'Connected/Detached (B2)' },
  6: { id: 'B3', name: 'Social conflict — "контакт есть, но неприятно/раздражает"', type: 'Connected/Detached (B3) — конфликтный' },
  7: { id: 'C1', name: 'Размытое состояние — много NS (минимум 3 NS)', type: 'Размытые/Not sure (C1)' },
  8: { id: 'C2', name: 'Смешанное — "чуть вниз, но и немного контроля" (2 NS + 1 конфликт)', type: 'Размытые/Not sure (C2)' },
  9: { id: 'C3', name: 'Высокая неопределённость — "почти все NS"', type: 'Размытые/Not sure (C3)' },
};

function generateScenarioSection(index, sessionData) {
  const scenario = SCENARIO_MAP[index];
  if (!scenario) {
    return `### Scenario ${index + 1}: [Unknown scenario]\n\n**Type:** [Unknown]\n\n**Baseline Snapshot:** [No data]\n\n**Ожидание до прохождения:** [Fill manually]\n\n**L1 Steps:** [No data]\n\n**Output:** [No data]\n\n**Оценка:** ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**\n\n**Почему:** [Fill manually]\n\n**Notes:**\n\n---\n\n`;
  }

  const baseline = sessionData?.baseline || null;
  const steps = sessionData?.steps || [];
  const output = sessionData?.output || null;
  const macroBase = sessionData?.macroBase || '[N/A]';
  const macroFinal = sessionData?.macroFinal || '[N/A]';

  // Build output object with all fields
  const outputObj = {
    macroBase: sessionData?.macroBase || macroBase,
    macroFinal: sessionData?.macroFinal || macroFinal,
    microKey: output?.microKey || null,
    microSource: output?.microSource || null,
    confidenceBand: output?.confidenceBand || null,
    clarityFlag: output?.clarityFlag || null,
    needsRefine: output?.needsRefine !== undefined ? output.needsRefine : false,
    endedBy: sessionData?.endedBy || output?.endedBy || null,
    finalEvidenceTagsCount: output?.finalEvidenceTagsCount || null,
  };

  return `### Scenario ${index + 1}: ${scenario.name}
**Type:** ${scenario.type}  
**Baseline Snapshot:** (из JSON: \`baseline\`)
${formatBaseline(baseline)}

**Ожидание до прохождения:** [Fill manually - what did you expect?]

**L1 Steps:** (из JSON: \`steps\`)
${formatSteps(steps)}

**Output:** (из JSON: \`output\`)
${formatOutput(outputObj)}

**Оценка:** 
- ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**

**Почему:** [Fill manually - 1 line explanation]

**Notes:**

---

`;
}

async function main() {
  const config = parseArgs();

  console.log('='.repeat(80));
  console.log('FILL RUNTIME SMOKE TESTS (AK3-POST-4c.3)');
  console.log('='.repeat(80));
  console.log('');
  console.log('Configuration:');
  console.log(`  Input: ${config.input}`);
  console.log(`  Output: ${config.output}`);
  console.log('');

  // Read input file
  if (!fs.existsSync(config.input)) {
    console.error(`Error: Input file not found: ${config.input}`);
    console.error('');
    console.error('Usage:');
    console.error('  1. Collect JSON logs from console (prefix [DEEP_SMOKE_SESSION])');
    console.error('  2. Save them to scripts/out/deep_smoke_sessions.jsonl (one JSON per line)');
    console.error('  3. Run: node scripts/fillRuntimeSmokeTests.js --input <path> --output <path>');
    process.exit(1);
  }

  const inputContent = fs.readFileSync(config.input, 'utf8');
  const lines = inputContent.split('\n').filter(line => line.trim().length > 0);

  console.log(`Found ${lines.length} session logs`);
  console.log('');

  if (lines.length < 10) {
    console.warn(`Warning: Expected 10 sessions, found ${lines.length}`);
  }

  // Parse JSON logs
  const sessions = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Remove [DEEP_SMOKE_SESSION] prefix if present
    const jsonStr = line.replace(/^\[DEEP_SMOKE_SESSION\]\s*/, '');
    
    try {
      const session = JSON.parse(jsonStr);
      sessions.push(session);
    } catch (e) {
      console.warn(`Warning: Failed to parse line ${i + 1}: ${e.message}`);
      console.warn(`  Line preview: ${line.substring(0, 100)}...`);
    }
  }

  console.log(`Successfully parsed ${sessions.length} sessions`);
  console.log('');

  // Generate markdown
  const header = `# Runtime Smoke Tests - Deep Dive (AK3-POST-4c.2)

**Generated:** ${new Date().toISOString()}  
**Goal:** Проверить Deep Dive в приложении, не в симуляции  
**Instructions:** 
1. Запустите Deep Dive flow в приложении
2. Для каждой сессии скопируйте JSON из консоли (префикс \`[DEEP_SMOKE_SESSION]\`)
3. Заполните секцию ниже на основе JSON-лога
4. Оцените: "попали" / "частично" / "мимо" + 1 строка почему

**Note:** This file was auto-generated from JSON logs. Please fill in "Ожидание до прохождения", "Оценка", and "Почему" manually.

## Test Scenarios

`;

  const scenarios = [];
  for (let i = 0; i < 10; i++) {
    const sessionData = sessions[i] || null;
    scenarios.push(generateScenarioSection(i, sessionData));
  }

  const summary = `
## Summary

### Test Results

| Scenario | Type | Assessment | Issues |
|----------|------|------------|--------|
${Array.from({ length: 10 }, (_, i) => {
  const scenario = SCENARIO_MAP[i];
  return `| ${scenario?.id || i + 1} | ${scenario?.type.split('(')[0].trim() || 'Unknown'} | ⏳ Pending | - |`;
}).join('\n')}

### Strange Cases (for AJ4)

1. [Case description]
2. [Case description]
3. [Case description]
4. [Case description]
5. [Case description]

---

## Instructions

### Как заполнять

1. **Запустите Deep Dive flow в приложении** для каждого сценария
2. **Скопируйте JSON из консоли** (префикс \`[DEEP_SMOKE_SESSION]\`)
3. **Заполните секцию сценария:**
   - \`Baseline Snapshot\` — из JSON поля \`baseline\`
   - \`Ожидание до прохождения\` — что вы ожидали получить
   - \`L1 Steps\` — из JSON поля \`steps\` (можно кратко: cardId → response, selectedBecause)
   - \`Output\` — из JSON поля \`output\`
   - \`Оценка\` — ✅ **Попали** / ⚠️ **Частично** / ❌ **Мимо**
   - \`Почему\` — 1 строка объяснения

### Что смотреть в JSON

- \`baseline\` — 6 метрик (valence, energy, tension, clarity, control, social)
- \`macroBase\` — начальный macro из baseline
- \`steps[]\` — массив шагов:
  - \`cardId\` — какая карточка
  - \`response\` — A/B/NS
  - \`selectedBecause\` — почему выбрана (gate:*, macro_specific:*, fallback)
  - \`gatesState\` — состояние gates на этом шаге
  - \`addedTags\` — какие теги добавились
- \`output\` — финальный результат:
  - \`microKey\`, \`microSource\`, \`confidenceBand\`, \`clarityFlag\`, \`needsRefine\`
  - \`finalEvidenceTagsSample\` — итоговые теги (до 40)
- \`endedBy\` — как завершилось (early_exit, no_card, normal)

### После всех тестов

Вынести 5 странных кейсов для AJ4 (False Positives Analysis)
`;

  const fullContent = header + scenarios.join('') + summary;

  // Ensure output directory exists
  const outputDir = path.dirname(config.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(config.output, fullContent, 'utf8');

  console.log('✅ Successfully generated report:');
  console.log(`  ${config.output}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review the generated file');
  console.log('  2. Fill in "Ожидание до прохождения", "Оценка", and "Почему" for each scenario');
  console.log('  3. Identify 5 strange cases for AJ4 analysis');
  console.log('');
}

main().catch(console.error);
