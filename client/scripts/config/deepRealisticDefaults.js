// deepRealisticDefaults.js
// Task A1.1: Central defaults config for deep-realistic flow
// Single source of truth for default parameters

/**
 * Default configuration for deep-realistic flow
 * These values are used when CLI arguments are not provided
 */
// Backwards-compatible name kept for existing imports
export const deepRealisticDefaults = {
  // L1/L2 card limits
  maxL1: 6,
  maxL2: 6,
  
  // Minimum quotas (Task P2.18)
  minL1: 3,
  minL2: 2,
  
  // Early stop behavior
  stopOnGates: true,
  
  // User response simulation
  notSureRate: 0.25,
  profile: 'mix', // 'decisive', 'uncertain', 'somatic', 'cognitive', 'mix'
};

/**
 * Get default value for a parameter
 * @param {string} key - Parameter name
 * @returns {any} Default value or undefined
 */
export function getDefault(key) {
  return deepRealisticDefaults[key];
}

/**
 * Get all defaults as a copy (to avoid mutations)
 * @returns {Object} Copy of defaults
 */
export function getDefaults() {
  return { ...deepRealisticDefaults };
}

// FIX-DR-02: Canonical API expected by checkDeepBalance.js
export function getDeepRealisticDefaults() {
  // Clone to avoid accidental mutation across runs
  return JSON.parse(JSON.stringify(deepRealisticDefaults));
}

/**
 * Validate that defaults are realistic
 * Throws if defaults would produce invalid runs
 */
export function validateDefaults() {
  if (deepRealisticDefaults.maxL2 === 0) {
    throw new Error('deepRealisticDefaults.maxL2 cannot be 0 (would produce askedL2.avg=0)');
  }
  if (deepRealisticDefaults.minL1 > deepRealisticDefaults.maxL1) {
    throw new Error('deepRealisticDefaults.minL1 cannot be greater than maxL1');
  }
  if (deepRealisticDefaults.minL2 > deepRealisticDefaults.maxL2) {
    throw new Error('deepRealisticDefaults.minL2 cannot be greater than maxL2');
  }
  if (deepRealisticDefaults.notSureRate < 0 || deepRealisticDefaults.notSureRate > 1) {
    throw new Error('deepRealisticDefaults.notSureRate must be between 0 and 1');
  }
}
