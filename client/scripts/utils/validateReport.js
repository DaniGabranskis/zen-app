// validateReport.js
// Validates deep balance report against JSON schema

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load schema
const schemaPath = path.join(__dirname, '../schema/deepBalanceReport.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Initialize AJV
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);

/**
 * Validates a report object against the schema
 * @param {Object} report - Report object to validate
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
export function validateReport(report) {
  const valid = validate(report);
  
  if (!valid) {
    const errors = validate.errors.map(err => {
      const path = err.instancePath || err.schemaPath;
      return `${path}: ${err.message}`;
    });
    return { valid: false, errors };
  }
  
  return { valid: true, errors: [] };
}

/**
 * Validates and throws if invalid
 * @param {Object} report - Report object to validate
 * @throws {Error} If validation fails
 */
export function validateReportOrThrow(report) {
  const result = validateReport(report);
  if (!result.valid) {
    throw new Error(`Report validation failed:\n${result.errors.join('\n')}`);
  }
  
  // TASK 14.1: Fail-fast check for engine type
  const flow = report?.metadata?.flow || report?.metadata?.effectiveFlow || null;
  const engine = report?.metadata?.engine || null;
  
  if ((flow === 'deep-realistic' || flow === 'fixed') && engine !== 'runner') {
    throw new Error(`[TASK 14.1] Flow "${flow}" must use runner engine, but report has engine="${engine}". Report is invalid.`);
  }
  
  // TASK 14.1: Ensure engine field exists
  if (!engine) {
    throw new Error(`[TASK 14.1] Report missing required metadata.engine field. Report must specify engine type (runner or legacy).`);
  }
  
  if (engine !== 'runner' && engine !== 'legacy') {
    throw new Error(`[TASK 14.1] Invalid metadata.engine value: "${engine}". Must be "runner" or "legacy".`);
  }
}
