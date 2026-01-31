// src/domain/tags/gates.js
// Task A2.0: Gate evaluation functions
// This is the domain layer - single source of truth for gate checking

import { getGateAllowList, hasGateMatch } from './gateAllowLists.js';

/**
 * Evaluate which gates are closed given a set of tags
 * @param {string[]} tags - Tags to check (should be canonicalized + derived)
 * @param {string[]} gateNames - Gate names to check (default: all gates)
 * @returns {Object} Map of gate name -> boolean (true if closed)
 */
export function evalGates(tags = [], gateNames = ['valence', 'arousal', 'agency', 'clarity', 'social', 'load']) {
  const result = {};
  
  for (const gateName of gateNames) {
    const allowList = getGateAllowList(gateName);
    result[gateName] = hasGateMatch(tags, allowList);
  }
  
  return result;
}

/**
 * Check if a specific gate is closed
 * @param {string} gateName - Gate name
 * @param {string[]} tags - Tags to check (should be canonicalized + derived)
 * @returns {boolean} True if gate is closed
 */
export function isGateClosed(gateName, tags = []) {
  const allowList = getGateAllowList(gateName);
  return hasGateMatch(tags, allowList);
}

/**
 * Get list of closed gates
 * @param {string[]} tags - Tags to check (should be canonicalized + derived)
 * @param {string[]} gateNames - Gate names to check (default: all gates)
 * @returns {string[]} Array of closed gate names
 */
export function getClosedGates(tags = [], gateNames = ['valence', 'arousal', 'agency', 'clarity', 'social', 'load']) {
  const closed = evalGates(tags, gateNames);
  return Object.entries(closed)
    .filter(([_, isClosed]) => isClosed)
    .map(([gateName]) => gateName);
}
