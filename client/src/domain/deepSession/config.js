// src/domain/deepSession/config.js
// Task A3.0: Flow configuration utilities
// Comments in English only.

/**
 * Default flow configuration
 */
export const DEFAULT_FLOW_CONFIG = {
  maxL1: 6,
  maxL2: 6,
  minL1: 3,
  minL2: 2,
  stopOnGates: true,
  notSureRate: 0.25,
  profile: 'mix',
  coverageFirstEnabled: true,
  baselineInjectionEnabled: true,
};

/**
 * Create flow config with defaults
 * @param {Partial<FlowConfig>} overrides - Configuration overrides
 * @returns {FlowConfig} Complete flow configuration
 */
export function createFlowConfig(overrides = {}) {
  return {
    ...DEFAULT_FLOW_CONFIG,
    ...overrides,
  };
}

/**
 * Validate flow configuration
 * @param {FlowConfig} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
export function validateFlowConfig(config) {
  if (config.maxL1 <= 0) {
    throw new Error('flowConfig.maxL1 must be > 0');
  }
  if (config.maxL2 < 0) {
    throw new Error('flowConfig.maxL2 must be >= 0');
  }
  if (config.minL1 > config.maxL1) {
    throw new Error('flowConfig.minL1 cannot be greater than maxL1');
  }
  if (config.minL2 > config.maxL2) {
    throw new Error('flowConfig.minL2 cannot be greater than maxL2');
  }
  if (config.notSureRate < 0 || config.notSureRate > 1) {
    throw new Error('flowConfig.notSureRate must be between 0 and 1');
  }
}
