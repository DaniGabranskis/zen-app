// client/scripts/goldenSessions/assertGoldenInvariants.js
// Task A3.4.3: Strict validator for Golden Sessions invariants
// Comments in English only.

const REQUIRED_CONFIG_KEYS = [
  'flow', 'mode', 'seed', 'maxL1', 'maxL2', 'minL1', 'minL2', 'stopOnGates', 'notSureRate', 'profile'
];

function fail(errors) {
  const msg = errors.map(e => `- ${e}`).join('\n');
  throw new Error(`Golden invariant violation:\n${msg}`);
}

function indexOfType(events, type) {
  return events.findIndex(e => e && e.type === type);
}

function groupByStepAndType(events, type) {
  const map = new Map();
  for (const e of events) {
    if (!e || e.type !== type) continue;
    const key = `${e.step ?? 'NA'}::${e.cardId ?? 'NA'}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function isServiceMacroKey(k) {
  return k === 'none' || k === 'fallback' || k === 'mixed';
}

export function assertGoldenInvariants(snapshot, { id } = {}) {
  const errors = [];

  if (!snapshot || typeof snapshot !== 'object') {
    fail([`${id || 'snapshot'}: snapshot is not an object`]);
  }

  const { config, events, final } = snapshot;

  // 1) Config completeness
  if (!config || typeof config !== 'object') {
    errors.push(`${id}: config missing`);
  } else {
    for (const k of REQUIRED_CONFIG_KEYS) {
      if (config[k] === undefined || config[k] === null) {
        errors.push(`${id}: config.${k} missing`);
      }
    }
  }

  // 2) Must end cleanly
  if (!final || typeof final !== 'object') {
    errors.push(`${id}: final missing`);
  } else {
    if (final.phase !== 'ENDED') errors.push(`${id}: final.phase must be ENDED (got ${final.phase})`);
    if (!final.endedReason) errors.push(`${id}: final.endedReason missing`);
  }

  if (!Array.isArray(events) || events.length === 0) {
    errors.push(`${id}: events missing/empty`);
  } else {
    const startIdx = indexOfType(events, 'session_start');
    const endIdx = indexOfType(events, 'session_end');

    if (startIdx !== 0) errors.push(`${id}: session_start must be the first event (idx=${startIdx})`);
    if (endIdx !== events.length - 1) errors.push(`${id}: session_end must be the last event (idx=${endIdx}, len=${events.length})`);

    // 3) No duplicate card_shown for same (step, cardId)
    const cardShownCounts = groupByStepAndType(events, 'card_shown');
    for (const [k, c] of cardShownCounts.entries()) {
      if (c > 1) errors.push(`${id}: duplicate card_shown for ${k} (count=${c})`);
    }

    // 4) Every answer must have exactly one card_shown
    const answers = events.filter(e => e && e.type === 'answer_committed');
    for (const a of answers) {
      const key = `${a.step ?? 'NA'}::${a.cardId ?? 'NA'}`;
      const shown = cardShownCounts.get(key) || 0;
      if (shown !== 1) errors.push(`${id}: answer_committed without matching single card_shown for ${key} (shown=${shown})`);
    }
  }

  // 5) macroDistributionFlat must not contain service keys (optional, if present)
  if (final && final.macroDistributionFlat && typeof final.macroDistributionFlat === 'object') {
    for (const k of Object.keys(final.macroDistributionFlat)) {
      if (isServiceMacroKey(k)) errors.push(`${id}: macroDistributionFlat contains service key "${k}"`);
    }
  }

  if (errors.length) fail(errors);
}
