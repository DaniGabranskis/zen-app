// All comments in English only.
import { zeroVector, accumulate } from './emotionSpace';

/**
 * Map a single canonical tag from L1/L2 to an emotion-space delta.
 * Tweak these weights over time with data.
 */
export function tagDeltaFromCanonical(tag) {
  // Start from neutral
  const delta = zeroVector();

  switch (tag) {
    // Valence negative / positive hints
    case 'mood_negative':       delta.valence -= 1; break;
    case 'work_ok':             delta.valence += 1; break;
    case 'self_ok':             delta.valence += 1; delta.agency += 1; break;
    case 'contentment?':        delta.valence += 1; delta.tension -= 1; break;
    case 'gratitude?':          delta.valence += 1; delta.certainty += 1; delta.socialness += 1; break;
    case 'calm?':               delta.valence += 1; delta.tension -= 1; break;

    // Tension / arousal / fatigue
    case 'body_tension':        delta.tension += 1; delta.arousal += 1; break;
    case 'tension?':            delta.tension += 1; break;
    case 'overwhelm?':          delta.tension += 1; delta.arousal += 1; break;
    case 'energy_low':          delta.arousal -= 1; delta.fatigue += 1; delta.valence -= 1; break;
    case 'tiredness?':          delta.fatigue += 1; break;

    // Control / uncertainty
    case 'low_control':         delta.agency -= 1; delta.arousal += 1; break;
    case 'uncertainty_low':     delta.certainty += 1; break;
    case 'clarity?':            delta.certainty += 1; break;
    case 'anxiety?':            delta.arousal += 1; delta.certainty -= 1; break;

    // Social
    case 'social_avoid':        delta.socialness += 1; delta.valence -= 1; break; // marks social dimension
    case 'disconnection?':      delta.socialness += 2; delta.valence -= 1; delta.certainty -= 1; break;
    case 'support':             delta.socialness += 2; delta.valence += 1; break;

    // Safety
    case 'safe':                delta.tension -= 1; delta.arousal -= 1; delta.certainty += 1; break;

    default:
      // Unknown tag → no delta
      break;
  }
  return delta;
}

/**
 * Fold an array of canonical tags into a single delta vector.
 */
export function foldCanonicalTags(tags = []) {
  let delta = zeroVector();
  for (const t of tags) {
    delta = accumulate(delta, tagDeltaFromCanonical(t));
  }
  return delta;
}
