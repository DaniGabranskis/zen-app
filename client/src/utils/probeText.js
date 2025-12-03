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
      valence: 0,
      arousal: 0.5,
      control: 0.5,
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

const PROBE_COPY = {
  default: {
    title: 'Pick what fits your vibe',
    subtitle: 'No right or wrong, just a quick feel',
    byAxis: {
      valence: {
        firstLabel: 'Feels heavier / more tense',
        secondLabel: 'Feels lighter / more at ease',
      },
      arousal: {
        firstLabel: 'More keyed-up',
        secondLabel: 'More slowed-down',
      },
      control: {
        firstLabel: 'Feels more in your hands',
        secondLabel: 'Feels more out of your hands',
      },
      generic: {
        firstLabel: 'First option fits better',
        secondLabel: 'Second option fits better',
      },
    },
  },

  visual: {
    title: 'Pick what fits your vibe',
    subtitle: 'No right or wrong, just a quick feel',
    byAxis: {
      valence: {
        firstLabel: 'Heavier / more tense vibe',
        secondLabel: 'Lighter / more relief vibe',
      },
      arousal: {
        firstLabel: 'More activated / on edge',
        secondLabel: 'More slowed down / drained',
      },
      control: {
        firstLabel: 'Feels more on you to solve',
        secondLabel: 'Feels more outside your control',
      },
      generic: {
        firstLabel: 'Option A fits more right now',
        secondLabel: 'Option B fits more right now',
      },
    },
  },

  body: {
    title: 'How does your body feel?',
    subtitle: 'Go with the sensation that resonates more',
    byAxis: {
      valence: {
        firstLabel: 'Feels heavy / dense in the body',
        secondLabel: 'Feels softer / more relaxed in the body',
      },
      arousal: {
        firstLabel: 'Body feels wired or jittery',
        secondLabel: 'Body feels low or flat',
      },
      control: {
        firstLabel: 'Body feels driven / compelled',
        secondLabel: 'Body feels like it can ease a bit',
      },
      generic: {
        firstLabel: 'First option fits your body more',
        secondLabel: 'Second option fits your body more',
      },
    },
  },

  scenario: {
    title: 'Which scenario matches better?',
    subtitle: 'Quick pick — go with your first instinct',
    byAxis: {
      valence: {
        firstLabel: 'Feels emotionally heavier overall',
        secondLabel: 'Feels emotionally lighter overall',
      },
      arousal: {
        firstLabel: 'More urgent / reactive',
        secondLabel: 'More slow / low-pace',
        firstDesc: 'High pace, quick reactions',
        secondDesc: 'Slower pace, subdued',
      },
      control: {
        firstLabel: 'You mainly drive the outcome',
        secondLabel: 'Circumstances mainly drive it',
        firstDesc: 'You likely affect the outcome',
        secondDesc: 'Mostly situational forces',
      },
      generic: {
        firstLabel: 'First option matches better',
        secondLabel: 'Second option matches better',
      },
    },
  },

  thought: {
    title: 'Pick what fits your vibe',
    subtitle: 'No right or wrong — choose a few, then confirm',
    byAxis: {
      // Thought probe is more generic, we can lean on defaults:
      valence: {
        firstLabel: 'Feels heavier / more tense',
        secondLabel: 'Feels lighter / more at ease',
      },
      arousal: {
        firstLabel: 'More keyed-up',
        secondLabel: 'More slowed-down',
      },
      control: {
        firstLabel: 'Feels more in your hands',
        secondLabel: 'Feels more out of your hands',
      },
      generic: {
        firstLabel: 'First option fits better',
        secondLabel: 'Second option fits better',
      },
    },
  },
};

/**
 * Build copy for any probe type based on emotion pair.
 * @param {'visual'|'body'|'scenario'|'thought'|string} probeType
 * @param {{ first: any, second: any }} context
 * @returns {{ title:string, subtitle:string, axis:string, firstLabel?:string, secondLabel?:string, firstDesc?:string, secondDesc?:string }}
 */
export function buildProbeCopy(probeType, context) {
  const first = context?.first ?? null;
  const second = context?.second ?? null;

  const m1 = getMeta(first);
  const m2 = getMeta(second);

  // Fallback to generic axis if we cannot compute a meaningful one
  const axis =
    m1 && m2
      ? chooseAxis(m1, m2)
      : 'generic';

  // If later you want emotion labels for templating:
  // const E1 = m1?.label ?? 'Option A';
  // const E2 = m2?.label ?? 'Option B';

  const baseConfig = PROBE_COPY.default;
  const typeConfig = PROBE_COPY[probeType] ?? baseConfig;

  const title = typeConfig.title ?? baseConfig.title;
  const subtitle = typeConfig.subtitle ?? baseConfig.subtitle;

  const axisConfig =
    typeConfig.byAxis[axis] ??
    baseConfig.byAxis[axis] ??
    baseConfig.byAxis.generic;

  const {
    firstLabel,
    secondLabel,
    firstDesc,
    secondDesc,
  } = axisConfig;

  const result = {
    title,
    subtitle,
    axis,
    firstLabel,
    secondLabel,
  };

  // Only scenario probe uses extra descriptions
  if (probeType === 'scenario' && (firstDesc || secondDesc)) {
    result.firstDesc = firstDesc;
    result.secondDesc = secondDesc;
  }

  return result;
}
