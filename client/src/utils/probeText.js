// src/utils/probeText.js
// Comments in English only.
import { EMOTION_META } from '../data/emotionMeta';

const getMeta = (input) => {
  if (!input) return null;
  if (typeof input === 'string') return EMOTION_META[input] ?? null;
  const key = input.emotionId ?? input.id ?? input.key ?? null;
  const meta = key ? EMOTION_META[key] : null;
  if (!meta) {
    return {
      valence: 0, arousal: 0.5, control: 0.5,
      label: input.label ?? 'Emotion',
    };
  }
  return { ...meta, label: input.label ?? meta.label };
};

const chooseAxis = (m1, m2) => {
  if (Math.sign(m1.valence) !== Math.sign(m2.valence)) return 'valence';
  if (Math.abs(m1.arousal - m2.arousal) >= 0.3) return 'arousal';
  if (Math.abs(m1.control - m2.control) >= 0.3) return 'control';
  return 'generic';
};

/**
 * Build copy for any probe type based on emotion pair.
 * @param {'visual'|'body'|'scenario'|'thought'|string} probeType
 * @param {{first:any, second:any}} context
 * @returns {{ title:string, subtitle:string, axis:string, firstLabel?:string, secondLabel?:string, firstDesc?:string, secondDesc?:string }}
 */
export function buildProbeCopy(probeType, context) {
  const m1 = getMeta(context?.first) ?? { label: 'Option A', valence: 0, arousal: 0.5, control: 0.5 };
  const m2 = getMeta(context?.second) ?? { label: 'Option B', valence: 0, arousal: 0.5, control: 0.5 };

  const axis = chooseAxis(m1, m2);
  const E1 = m1.label, E2 = m2.label;

  // Titles and subtitles per probeType
  const TITLES = {
    visual:   'Pick what fits your vibe',
    body:     'How does your body feel?',
    scenario: 'Which scenario matches better?',
    thought:  'Pick what fits your vibe',
    default:  'Pick what fits your vibe',
  };
  const SUBS = {
    visual:   'No right or wrong, just a quick feel',
    body:     'Go with the sensation that resonates more',
    scenario: 'Quick pick — go with your first instinct',
    thought:  'No right or wrong — choose a few, then confirm',
    default:  'No right or wrong, just a quick feel',
  };

  const title = TITLES[probeType] ?? TITLES.default;
  const subtitle = SUBS[probeType] ?? SUBS.default;

  // Labels by axis + probeType (keep tone aligned to screen)
   const byAxis = {
    valence: {
      visual: [
        'Heavier / more tense vibe',
        'Lighter / more relief vibe',
      ],
      body: [
        'Feels heavy / dense in the body',
        'Feels softer / more relaxed in the body',
      ],
      scenario: [
        'Feels emotionally heavier overall',
        'Feels emotionally lighter overall',
      ],
      default: [
        'Feels heavier / more tense',
        'Feels lighter / more at ease',
      ],
    },

    arousal: {
      visual: [
        'More activated / on edge',
        'More slowed down / drained',
      ],
      body: [
        'Body feels wired or jittery',
        'Body feels low or flat',
      ],
      scenario: [
        'More urgent / reactive',
        'More slow / low-pace',
      ],
      default: [
        'More keyed-up',
        'More slowed-down',
      ],
    },

    control: {
      visual: [
        'Feels more on you to solve',
        'Feels more outside your control',
      ],
      body: [
        'Body feels driven / compelled',
        'Body feels like it can ease a bit',
      ],
      scenario: [
        'You mainly drive the outcome',
        'Circumstances mainly drive it',
      ],
      default: [
        'Feels more in your hands',
        'Feels more out of your hands',
      ],
    },

    generic: {
      visual: [
        'Option A fits more right now',
        'Option B fits more right now',
      ],
      body: [
        'First option fits your body more',
        'Second option fits your body more',
      ],
      scenario: [
        'First option matches better',
        'Second option matches better',
      ],
      default: [
        'First option fits better',
        'Second option fits better',
      ],
    },
  };

  const labels = (byAxis[axis][probeType] ?? byAxis[axis].default);
  const [firstLabel, secondLabel] = labels;

  // Scenario can also use descriptions (optional).
  const scenarioDescs = axis === 'control'
    ? { firstDesc: 'You likely affect the outcome', secondDesc: 'Mostly situational forces' }
    : axis === 'arousal'
    ? { firstDesc: 'High pace, quick reactions',    secondDesc: 'Slower pace, subdued' }
    : undefined;

  return { title, subtitle, axis, firstLabel, secondLabel, ...(probeType === 'scenario' ? scenarioDescs : {}) };
}
