// src/recommendations/flowRegistry.js
import { BreezeTimerStep } from './flows/BreezeFlow';
import { GroundingPromptStep } from './flows/GroundingFlow';
import { MicroPlanStep } from './flows/MicroPlanFlow';
import { CompassionStep } from './flows/CompassionFlow';
import { GenericRecommendationStep } from './flows/GenericRecommendationFlow';

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
    const sec = Math.max(10, Number(rec.durationSec || 60));

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
    const prompts = [
      { key: 'see', label: '5 things you can see', prompt: 'Look around and name five things you can see.' },
      { key: 'feel', label: '4 things you can feel', prompt: 'Notice four sensations (hands, feet, clothes, chair).' },
      { key: 'hear', label: '3 things you can hear', prompt: 'Listen and name three sounds.' },
      { key: 'smell', label: '2 things you can smell', prompt: 'Name two smells (or imagine two neutral scents).' },
      { key: 'taste', label: '1 thing you can taste', prompt: 'Notice one taste (or one neutral mouth sensation).' },
    ];

    return {
      title: rec.title,
      subtitle: rec.detail,
      steps: prompts.map((p) => ({
        key: p.key,
        label: p.label,
        prompt: p.prompt,
        Component: GroundingPromptStep,
      })),
      initialState: { notes: {} },
      canProceed: () => true,
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
      subtitle: rec.detail,
      steps: [
        { key: 'phrase', label: 'Read the phrase slowly', Component: CompassionStep, variant: 'phrase' },
        { key: 'breath', label: 'One gentle breath', Component: CompassionStep, variant: 'breath' },
      ],
      initialState: { acknowledged: false },
      canProceed: () => true,
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
