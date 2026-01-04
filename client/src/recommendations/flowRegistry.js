// src/recommendations/flowRegistry.js
import { BreezeTimerStep } from './flows/BreezeFlow';
import { GroundingMiniTasksStep } from './flows/GroundingMiniTasksFlow';
import { MicroPlanStep } from './flows/MicroPlanFlow';
import { CompassionStep } from './flows/CompassionFlow';
import { GenericRecommendationStep } from './flows/GenericRecommendationFlow';
import { ReframePrecisionSprintStep } from './flows/ReframePrecisionSprintFlow';

// English-only comments as requested.

/**
 * Returns a flow config for RecommendationScreen:
 * - steps: [{ key, label, Component, ...meta }]
 * - initialState: state bag for step components
 * - canProceed: gate Next/Finish (e.g., require timer done)
 */
export function buildRecommendationFlow(recommendation) {
  const rec = recommendation || {};
  const kind = String(rec.kind || '').trim();

  if (!rec || !kind) {
    return {
      title: 'Recommendation',
      subtitle: 'No recommendation provided.',
      steps: [
        { key: 'empty', label: 'Missing recommendation', Component: GenericRecommendationStep, variant: 'empty' },
      ],
      initialState: { done: true },
      canProceed: () => true,
    };
  }

  if (kind === 'breath') {
    const sec = Math.max(10, Number(rec.durationSec || 45));

    return {
      title: rec.title,
      subtitle: rec.description || rec.detail,
      steps: [
        { key: 'breath', label: 'Follow the breathing pattern', Component: BreezeTimerStep },
      ],
      initialState: {
        started: false,
        done: false,
        totalSec: sec,
        remainingSec: sec,
      },
      // Start must be allowed; Finish only when done.
      canProceed: (_, state) => {
        if (!state?.started) return true;
        return !!state?.done;
      },
      // RecommendationScreen will pass state as 3rd arg.
      getPrimaryLabel: (_, __, state) => (!state?.started ? 'Start' : 'Finish'),
    };
  }

  if (kind === 'grounding') {
    return {
      title: rec.title,
      subtitle: rec.description || rec.detail,
      steps: [
        {
          key: 'grounding_write',
          label: 'Draft 3 mini tasks',
          Component: GroundingMiniTasksStep,
          mode: 'write',
        },
        {
          key: 'grounding_check',
          label: 'Check them off',
          Component: GroundingMiniTasksStep,
          mode: 'check',
        },
      ],
      initialState: {
        tasks: [
          { text: '', done: false },
          { text: '', done: false },
          { text: '', done: false },
        ],
      },
      canProceed: (stepIndex, state) => {
        const tasks = Array.isArray(state?.tasks) ? state.tasks : [];
        if (tasks.length < 3) return false;

        const allFilled = tasks.every((t) => String(t?.text || '').trim().length > 0);
        if (stepIndex === 0) return allFilled;

        // Step 2: require all checked (and still filled)
        const allDone = tasks.every((t) => !!t?.done);
        return allFilled && allDone;
      },
    };
  }

  if (kind === 'plan') {
    return {
      title: rec.title,
      subtitle: rec.detail,
      steps: [
        { key: 'action', label: 'Pick one tiny action', Component: MicroPlanStep, field: 'action' },
        { key: 'obstacle', label: 'Name a likely obstacle', Component: MicroPlanStep, field: 'obstacle' },
        { key: 'when', label: 'Decide when you will do it', Component: MicroPlanStep, field: 'when' },
      ],
      initialState: { plan: { action: '', obstacle: '', when: '' } },
      canProceed: (stepIndex, state) => {
        // Require action to be filled on step 1.
        if (stepIndex === 0) {
          const v = String(state?.plan?.action || '').trim();
          return v.length >= 3;
        }
        return true;
      },
    };
  }

  if (kind === 'compassion') {
    return {
      title: rec.title,
      subtitle: rec.description || rec.detail,
      steps: [
        { key: 'phrase', label: 'Read the phrase slowly', Component: CompassionStep, variant: 'phrase' },
        { key: 'breath', label: 'One gentle breath', Component: CompassionStep, variant: 'breath' },
      ],
      initialState: { acknowledged: false },
      canProceed: () => true,
    };
  }

    if (rec.key === 'reframe') {
    return {
      title: rec.title,
      subtitle: rec.description || rec.detail,
      steps: [
        { key: 'reframe_claim', label: 'Name the claim', Component: ReframePrecisionSprintStep, stage: 'claim' },
        { key: 'reframe_precision', label: 'Add one precision', Component: ReframePrecisionSprintStep, stage: 'precision' },
        { key: 'reframe_lever', label: 'Pick one lever', Component: ReframePrecisionSprintStep, stage: 'lever' },
      ],
      initialState: {
        reframe: {
          beforeControl: null,
          claimPresetKey: null,
          claimText: '',
          precisionUpgrade: null,
          reframedText: '',
          leverKey: null,
          customLeverText: '',
          afterControl: null,
        },
      },
      canProceed: (stepIndex, state) => {
        const r = state?.reframe || {};
        const beforeOk = typeof r.beforeControl === 'number';
        const afterOk = typeof r.afterControl === 'number';

        const claimOk = String(r.claimText || '').trim().length >= 8;
        const upgradeOk = !!r.precisionUpgrade;
        const reframedOk = String(r.reframedText || '').trim().length >= 8;

        const leverOk = !!r.leverKey;
        const customOk = r.leverKey !== 'custom' || String(r.customLeverText || '').trim().length >= 6;

        if (stepIndex === 0) return beforeOk && claimOk;
        if (stepIndex === 1) return claimOk && upgradeOk && reframedOk;
        return claimOk && upgradeOk && reframedOk && leverOk && customOk && afterOk;
      },
    };
  }


  // Fallback for body/journal/social/reframe/savor (and future kinds)
  return {
    title: rec.title,
    subtitle: rec.description || rec.detail,
    steps: [
      { key: 'generic', label: 'Follow the prompt', Component: GenericRecommendationStep, variant: kind },
    ],
    initialState: { input: {} },
    canProceed: () => true,
  };
}
