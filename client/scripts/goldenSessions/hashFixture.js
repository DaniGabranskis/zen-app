// client/scripts/goldenSessions/hashFixture.js
// GS-HYGIENE-01: Hash fixture to detect when fixture changes
// Comments in English only.

import crypto from 'crypto';

/**
 * Recursively sort object keys and arrays
 * @param {any} value - Value to sort
 * @returns {any} Sorted value
 */
function sortRecursively(value) {
  if (Array.isArray(value)) return value.map(sortRecursively);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = sortRecursively(value[k]);
    return out;
  }
  return value;
}

/**
 * Stable stringify (sort object keys recursively, no whitespace for hash stability)
 * @param {any} obj - Object to stringify
 * @returns {string} Stable JSON string (no whitespace)
 */
function stableStringify(obj) {
  // No whitespace for hash stability
  return JSON.stringify(sortRecursively(obj));
}

/**
 * Compute SHA1 hash of any object (for fixture or config)
 * @param {Object} obj - Object to hash
 * @returns {string} SHA1 hash (hex)
 */
export function hashObject(obj) {
  const text = stableStringify(obj);
  return crypto.createHash('sha1').update(text, 'utf8').digest('hex');
}

/**
 * Compute SHA1 hash of fixture object
 * @param {Object} fixtureObj - Fixture object
 * @returns {string} SHA1 hash (hex)
 */
export function hashFixture(fixtureObj) {
  return hashObject(fixtureObj);
}
