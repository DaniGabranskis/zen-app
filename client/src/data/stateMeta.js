// src/data/stateMeta.js
// State taxonomy for Zen: primary classification target.
// Emotions remain as a secondary "lens" for explainability and backward compatibility.

export const STATE_META = {
  grounded: {
    key: 'grounded',
    name: 'Grounded',
color: ['#34D399', '#10B981'],
    polarity: 'positive',
    description: 'Stable, calm, and present. Low tension with decent clarity and control.',
  },
  engaged: {
    key: 'engaged',
    name: 'Engaged',
color: ['#FDE047', '#F59E0B'],
    polarity: 'positive',
    description: 'Energized and curious. Activation is up; attention wants a direction.',
  },
  connected: {
    key: 'connected',
    name: 'Connected',
color: ['#60A5FA', '#3B82F6'],
    polarity: 'positive',
    description: 'Supported and socially resourced. Connection and gratitude are accessible.',
  },
  capable: {
    key: 'capable',
    name: 'Capable & Clear',
color: ['#A78BFA', '#7C3AED'],
    polarity: 'positive',
    description: 'High clarity and agency. You can act, decide, and move forward.',
  },
  pressured: {
    key: 'pressured',
    name: 'Pressured',
color: ['#FCA5A5', '#EF4444'],
    polarity: 'negative',
    description: 'Tension is high; energy is up. You can function, but the system is strained.',
  },
  threatened: {
    key: 'threatened',
    name: 'Threatened',
color: ['#FB7185', '#E11D48'],
    polarity: 'negative',
    description: 'Threat response is active. Safety feels low; fear bias is elevated.',
  },
  overloaded: {
    key: 'overloaded',
    name: 'Overloaded',
color: ['#F97316', '#EA580C'],
    polarity: 'negative',
    description: 'Too much input or demand. Low control and clarity with rising fatigue.',
  },
  blocked: {
    key: 'blocked',
    name: 'Blocked',
color: ['#F87171', '#DC2626'],
    polarity: 'negative',
    description: 'Something is in the way. Friction and irritation show up as you try to act.',
  },
  confrontational: {
    key: 'confrontational',
    name: 'Confrontational',
color: ['#F43F5E', '#BE123C'],
    polarity: 'negative',
    description: 'High activation with strong boundaries. Conflict energy is available.',
  },
  down: {
    key: 'down',
    name: 'Down',
color: ['#94A3B8', '#64748B'],
    polarity: 'negative',
    description: 'Low mood and reduced agency. You may need support, warmth, and rest.',
  },
  exhausted: {
    key: 'exhausted',
    name: 'Exhausted',
color: ['#A3A3A3', '#525252'],
    polarity: 'negative',
    description: 'Energy is depleted. Recovery is the priority; cognitive load should be reduced.',
  },
  self_critical: {
    key: 'self_critical',
    name: 'Self-critical',
color: ['#F472B6', '#DB2777'],
    polarity: 'negative',
    description: 'Harsh self-evaluation. Shame/guilt narratives may be dominating.',
  },
  detached: {
    key: 'detached',
    name: 'Detached',
color: ['#93C5FD', '#60A5FA'],
    polarity: 'neutral',
    description: 'Numb or distant. Emotional access is reduced; connection feels far away.',
  },
  uncertain: {
    key: 'uncertain',
    name: 'Uncertain',
color: ['#FDE68A', '#F59E0B'],
    polarity: 'neutral',
    description: 'Low clarity. You need information, structure, or a simpler next question.',
  },
  averse: {
    key: 'averse',
    name: 'Averse',
color: ['#86EFAC', '#22C55E'],
    polarity: 'negative',
    description: 'Strong rejection/avoidance. A boundary or value feels violated.',
  },
  mixed: {
    key: 'mixed',
    name: 'Mixed',
color: ['#A78BFA', '#7C3AED'],
    polarity: 'neutral',
    description: 'Signals are blended or unclear. More evidence may be needed.',
  },
};

// Backward compatibility: map legacy emotion keys to a primary state.
export const EMOTION_TO_STATE = {
  joy: 'engaged',
  calm: 'grounded',
  gratitude: 'connected',
  interest: 'engaged',
  confidence: 'capable',
  connection: 'connected',
  clarity: 'capable',

  anxiety: 'threatened',
  fear: 'threatened',
  overload: 'overloaded',
  tension: 'pressured',
  frustration: 'blocked',
  anger: 'confrontational',

  sadness: 'down',
  fatigue: 'exhausted',
  numbness: 'detached',
  disconnected: 'detached',
  confusion: 'uncertain',

  shame: 'self_critical',
  guilt: 'self_critical',

  disgust: 'averse',

  mixed: 'mixed',
};

export function emotionToStateKey(emotionKey) {
  const k = String(emotionKey || '').toLowerCase().trim();
  return EMOTION_TO_STATE[k] || 'mixed';
}

export function getStateMeta(stateKey) {
  const k = String(stateKey || '').toLowerCase().trim();
  return STATE_META[k] || STATE_META.mixed;
}
