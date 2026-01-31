// src/domain/deepSession/index.js
// Task A3.0: Unified entry point for deep session runner
// Comments in English only.

export { createDeepSessionRunner } from './runner.js';
export { createFlowConfig, validateFlowConfig, DEFAULT_FLOW_CONFIG } from './config.js';
export {
  createEvent,
  createSessionStartEvent,
  createBaselineInjectedEvent,
  createCardShownEvent,
  createAnswerCommittedEvent,
  createEvidenceAddedEvent,
  createGateHitEvent,
  createMacroUpdatedEvent,
  createMicroSelectedEvent,
  createSessionEndEvent,
} from './events.js';
export {
  EVENT_TYPES,
  LAYERS,
  ENDED_REASONS,
  normalizeEndedReason,
} from './types.js';
