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
      visual:   [`More like ${E1} — heavier/tense vibe`, `More like ${E2} — lighter/relief vibe`],
      body:     [`Feels heavy/dense (like ${E1})`,       `Feels lighter/eased (like ${E2})`],
      scenario: [`Closer to ${E1} in tone`,              `Closer to ${E2} in tone`],
      default:  [`Closer to ${E1} right now`,            `Closer to ${E2} right now`],
    },
    arousal: {
      visual:   [`Feels amped/edgy like ${E1}`,          `Feels slow/drained like ${E2}`],
      body:     [`Tense/charged (like ${E1})`,           `Low/flat energy (like ${E2})`],
      scenario: [`More urgent/reactive (${E1})`,         `More calm/low-pace (${E2})`],
      default:  [`Closer to ${E1} right now`,            `Closer to ${E2} right now`],
    },
    control: {
      visual:   [`It’s mostly on me (like ${E1})`,       `Mostly outside my control (like ${E2})`],
      body:     [`Body-driven/compelled (${E1})`,        `I can ease it a bit (${E2})`],
      scenario: [`I drive the outcome (${E1})`,          `Circumstances drive it (${E2})`],
      default:  [`Closer to ${E1} right now`,            `Closer to ${E2} right now`],
    },
    generic: {
      visual:   [`Closer to ${E1} right now`,            `Closer to ${E2} right now`],
      body:     [`More like ${E1} in the body`,          `More like ${E2} in the body`],
      scenario: [`This feels more like ${E1}`,           `This feels more like ${E2}`],
      default:  [`Closer to ${E1} right now`,            `Closer to ${E2} right now`],
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
