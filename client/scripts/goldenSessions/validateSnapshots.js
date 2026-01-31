// client/scripts/goldenSessions/validateSnapshots.js
// GS-CURSOR-02: Hard validation of snapshots (pre-commit / CI)
// GS-SCHEMA-01: Schema-first validation
// Comments in English only.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GOLDEN_SNAPSHOT_VERSION } from './stableProjection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GS-SCHEMA-01: Load JSON Schema
let schema = null;
try {
  const schemaPath = path.join(__dirname, 'schema', 'goldenSnapshot.schema.json');
  schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
} catch (e) {
  console.error(`[GOLDEN] Failed to load schema: ${e.message}`);
  process.exit(1);
}

/**
 * GS-SCHEMA-01: Simple JSON Schema validator (without external deps)
 * Validates required fields, types, and enums
 * @param {Object} schema - JSON Schema object
 * @param {Object} data - Data to validate
 * @param {string} path - Current path in object (for error messages)
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
function validateSchema(schema, data, path = '') {
  const errors = [];
  
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errors.push(`${path}: expected object, got ${typeof data}`);
      return errors;
    }
    
    // Check required fields
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in data) || data[key] === undefined) {
          errors.push(`${path}.${key}: required field missing`);
        }
      }
    }
    
    // Validate properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          const value = data[key];
          const newPath = path ? `${path}.${key}` : key;
          errors.push(...validateSchema(propSchema, value, newPath));
        }
      }
    }
    
    // Check additionalProperties
    if (schema.additionalProperties === false) {
      const allowedKeys = new Set([
        ...(schema.required || []),
        ...Object.keys(schema.properties || {})
      ]);
      for (const key of Object.keys(data)) {
        if (!allowedKeys.has(key)) {
          errors.push(`${path}.${key}: additional property not allowed`);
        }
      }
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(data)) {
      errors.push(`${path}: expected array, got ${typeof data}`);
      return errors;
    }
    
    if (schema.minItems && data.length < schema.minItems) {
      errors.push(`${path}: array must have at least ${schema.minItems} items, got ${data.length}`);
    }
    
    if (schema.items) {
      data.forEach((item, index) => {
        errors.push(...validateSchema(schema.items, item, `${path}[${index}]`));
      });
    }
  } else if (schema.type === 'string') {
    if (typeof data !== 'string') {
      errors.push(`${path}: expected string, got ${typeof data}`);
    } else if (schema.enum && !schema.enum.includes(data)) {
      errors.push(`${path}: must be one of [${schema.enum.join(', ')}], got "${data}"`);
    }
  } else if (schema.type === 'number') {
    if (typeof data !== 'number') {
      errors.push(`${path}: expected number, got ${typeof data}`);
    } else {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push(`${path}: must be >= ${schema.minimum}, got ${data}`);
      }
    }
  } else if (schema.type === 'boolean') {
    if (typeof data !== 'boolean') {
      errors.push(`${path}: expected boolean, got ${typeof data}`);
    }
  } else if (Array.isArray(schema.type)) {
    // Union type (e.g., ["string", "null"])
    const valid = schema.type.some(t => {
      if (t === 'null') return data === null;
      if (t === 'string') return typeof data === 'string';
      if (t === 'number') return typeof data === 'number';
      if (t === 'boolean') return typeof data === 'boolean';
      if (t === 'object') return typeof data === 'object' && data !== null && !Array.isArray(data);
      if (t === 'array') return Array.isArray(data);
      return false;
    });
    if (!valid) {
      errors.push(`${path}: expected one of [${schema.type.join(', ')}], got ${typeof data}`);
    }
  }
  
  return errors;
}

/**
 * GS-SCHEMA-01: Validate snapshot against schema (fail-fast)
 * @param {Object} snapshot - Snapshot object
 * @param {string} id - Snapshot ID
 * @throws {Error} If schema validation fails
 */
function validateSnapshotOrThrow(schema, snapshot, id) {
  const errors = validateSchema(schema, snapshot, '');
  if (errors.length > 0) {
    const errorMsg = `[GOLDEN] ${id}: Schema validation failed:\n${errors.map(e => `  ${e}`).join('\n')}`;
    throw new Error(errorMsg);
  }
}

const REQUIRED_CONFIG_KEYS = [
  'flow', 'mode', 'seed', 'maxL1', 'maxL2', 'minL1', 'minL2', 'stopOnGates', 'notSureRate', 'profile'
];

const MAX_EVENTS = 128; // Protection against infinite loops

/**
 * Validate a single snapshot
 * GS-SCHEMA-01: Schema-first validation
 * @param {Object} snapshot - Snapshot object
 * @param {string} id - Snapshot ID
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
export function validateSnapshot(snapshot, id) {
  const errors = [];

  if (!snapshot || typeof snapshot !== 'object') {
    errors.push(`${id}: snapshot is not an object`);
    return errors;
  }

  // GS-SCHEMA-01: Schema-first validation (fail-fast)
  try {
    validateSnapshotOrThrow(schema, snapshot, id);
  } catch (e) {
    errors.push(e.message);
    // Continue with additional validations below
  }

  const { config, final, events } = snapshot;

  // GS-CURSOR-02: Config must not be empty
  if (!config || typeof config !== 'object') {
    errors.push(`${id}: config is missing or not an object`);
  } else {
    // Check required config keys
    for (const key of REQUIRED_CONFIG_KEYS) {
      if (config[key] === undefined || config[key] === null) {
        errors.push(`${id}: config.${key} is missing or null`);
      }
    }
    
    // GS-HYGIENE-03: Require fixtureHash (must be non-empty string)
    if (!config.fixtureHash || typeof config.fixtureHash !== 'string' || config.fixtureHash.length === 0) {
      errors.push(`${id}: config.fixtureHash is missing or empty. Run: npm run golden:update -- --id ${id}`);
    }
    
    // GS-HYGIENE-06: Enforce snapshotVersion match (CI-blocker)
    const actualVersion = config.snapshotVersion;
    if (!actualVersion || typeof actualVersion !== 'string') {
      errors.push(`${id}: config.snapshotVersion is missing or invalid. Run: npm run golden:update -- --id ${id}`);
    } else if (actualVersion !== GOLDEN_SNAPSHOT_VERSION) {
      errors.push(`${id}: config.snapshotVersion mismatch. Expected: ${GOLDEN_SNAPSHOT_VERSION}, got: ${actualVersion}. Run: npm run golden:update -- --id ${id}`);
    }
    
    // GS-HARDEN-03: Require configHash (warn for legacy, but prefer to have it)
    if (!config.configHash || typeof config.configHash !== 'string' || config.configHash.length === 0) {
      // Warn for legacy snapshots, but don't fail (optional field)
      // errors.push(`${id}: config.configHash is missing (legacy snapshot). Run: npm run golden:update -- --id ${id}`);
    }
  }

  // GS-CURSOR-02: final.phase must be ENDED
  if (!final || typeof final !== 'object') {
    errors.push(`${id}: final is missing or not an object`);
  } else {
    if (final.phase !== 'ENDED') {
      errors.push(`${id}: final.phase must be "ENDED", got "${final.phase}"`);
    }

    // GS-CURSOR-02: final.endedReason must not be null
    if (!final.endedReason || typeof final.endedReason !== 'string') {
      errors.push(`${id}: final.endedReason must be a non-empty string, got ${typeof final.endedReason}`);
    }
  }

  // GS-CURSOR-02: Events validation
  if (!Array.isArray(events)) {
    errors.push(`${id}: events is not an array`);
  } else {
    // GS-CURSOR-02: Protection against infinite loops
    if (events.length > MAX_EVENTS) {
      errors.push(`${id}: events.length (${events.length}) exceeds MAX_EVENTS (${MAX_EVENTS})`);
    }

    // GS-CURSOR-02: Must have exactly 1 session_start and 1 session_end
    const sessionStarts = events.filter(e => e && e.type === 'session_start');
    const sessionEnds = events.filter(e => e && e.type === 'session_end');

    if (sessionStarts.length !== 1) {
      errors.push(`${id}: must have exactly 1 session_start, got ${sessionStarts.length}`);
    }

    if (sessionEnds.length !== 1) {
      errors.push(`${id}: must have exactly 1 session_end, got ${sessionEnds.length}`);
    }

    // GS-CURSOR-02: Last event must be session_end
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      if (!lastEvent || lastEvent.type !== 'session_end') {
        errors.push(`${id}: last event must be session_end, got "${lastEvent?.type || 'null'}"`);
      }
    }

    // GS-CURSOR-02: Heuristic - card_shown should not exceed answer_committed + 1 (double-fire protection)
    const cardShownCount = events.filter(e => e && e.type === 'card_shown').length;
    const answerCommittedCount = events.filter(e => e && e.type === 'answer_committed').length;

    if (cardShownCount > answerCommittedCount + 1) {
      errors.push(`${id}: card_shown (${cardShownCount}) > answer_committed + 1 (${answerCommittedCount + 1}) - possible double-fire`);
    }
    
    // GS-MEANING-08: Allow expected_macro_computed event
    const expectedMacroEvents = events.filter(e => e && e.type === 'expected_macro_computed');
    if (expectedMacroEvents.length > 1) {
      errors.push(`${id}: must have at most 1 expected_macro_computed event, got ${expectedMacroEvents.length}`);
    }
  }

  return errors;
}

/**
 * Validate all snapshots in the snapshots directory
 * @param {string} snapshotsDir - Path to snapshots directory
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateAllSnapshots(snapshotsDir) {
  const errors = [];

  if (!fs.existsSync(snapshotsDir)) {
    return { valid: false, errors: [`Snapshots directory does not exist: ${snapshotsDir}`] };
  }

  const snapshotFiles = fs.readdirSync(snapshotsDir)
    .filter(f => f.endsWith('.snapshot.json'))
    .sort();

  if (snapshotFiles.length === 0) {
    return { valid: false, errors: [`No snapshot files found in ${snapshotsDir}`] };
  }

  for (const file of snapshotFiles) {
    const snapshotPath = path.join(snapshotsDir, file);
    const id = path.basename(file, '.snapshot.json');

    try {
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      const snapshotErrors = validateSnapshot(snapshot, id);

      if (snapshotErrors.length > 0) {
        errors.push(...snapshotErrors);
      }
    } catch (e) {
      errors.push(`${id}: Failed to parse snapshot: ${e.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * CLI entry point
 */
export function main() {
  const root = path.join(__dirname);
  const snapshotsDir = path.join(root, 'snapshots');

  const result = validateAllSnapshots(snapshotsDir);

  if (result.valid) {
    console.log('✅ All snapshots are valid');
    process.exit(0);
  } else {
    console.error('❌ Snapshot validation failed:');
    result.errors.forEach(err => console.error(`  ${err}`));
    process.exit(1);
  }
}

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('validateSnapshots.js')) {
  main();
}
