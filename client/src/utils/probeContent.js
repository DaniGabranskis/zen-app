import { zeroVector } from "./emotionSpace";

// Helper to quickly build a delta vector
const d = (partial) => Object.assign(zeroVector(), partial);

// ---------- VISUAL (A/B metaphors) ----------
export function getVisualScenesFor(dominant) {
  // You can branch by `dominant` or return a generic pair.
  // Each option returns: { label, tags }
  // Keep content short and intuitive.
  switch (dominant) {
    case "anxiety":
    case "fear":
      return [
        { label: "Stormy sky", tags: d({ valence: -2, arousal: +2, tension: +2, certainty: -1 }) },
        { label: "Foggy forest", tags: d({ valence: -1, arousal: +1, tension: +1, certainty: -2 }) },
      ];
    case "anger":
    case "irritation":
      return [
        { label: "Crackling fire", tags: d({ valence: -1, arousal: +2, tension: +2, other_blame: +2, certainty: +2 }) },
        { label: "Pressure cooker", tags: d({ valence: -1, arousal: +2, tension: +3, other_blame: +1 }) },
      ];
    case "sadness":
    case "loneliness":
    case "disconnection":
      return [
        { label: "Empty bench in rain", tags: d({ valence: -2, arousal: 0, tension: +1, socialness: +2, fatigue: +1 }) },
        { label: "Grey shoreline", tags: d({ valence: -2, arousal: 0, tension: 0, certainty: +1, fatigue: +1 }) },
      ];
    case "frustration":
      return [
        {
          label: "Stuck in a traffic jam",
          tags: d({ valence: -1, arousal: +2, tension: +2, other_blame: +1, certainty: +1 }),
        },
        {
          label: "Loading bar stuck at 99%",
          tags: d({ valence: -1, arousal: +1, tension: +1, fatigue: +1 }),
        },
      ];
    default:
      return [
        { label: "Quiet lake", tags: d({ valence: +1, arousal: 0, tension: 0, certainty: +1 }) },
        { label: "Busy market", tags: d({ valence: +1, arousal: +2, tension: +1, socialness: +2 }) },
      ];
  }
}

// ---------- SCENARIO (A/B micro-situations) ----------
export function getScenarioItemsFor(dominant) {
  // Each item returns: { label, tags }
  switch (dominant) {
    case "frustration":
      return [
        {
          label: "You keep hitting blockers and feel stuck in place.",
          tags: d({ valence: -1, arousal: +1, tension: +2, other_blame: +1, certainty: +1 }),
        },
        {
          label: "You have to redo the same task again and again.",
          tags: d({ valence: -1, arousal: +1, tension: +1, fatigue: +1 }),
        },
      ];
    case "loneliness":
    case "disconnection":
      return [
        {
          label: "You scroll through chats and no one replies.",
          tags: d({ valence: -2, arousal: 0, tension: +1, socialness: +2, fatigue: +1 }),
        },
        {
          label: "You are home and feel like nobody really sees you.",
          tags: d({ valence: -2, arousal: -1, tension: 0, socialness: +2, fatigue: +1 }),
        },
      ];
    default:
      return [
        {
          label: "A teammate overlooked your idea and you feel heat rising.",
          tags: d({ valence: -1, arousal: +2, tension: +2, other_blame: +1, socialness: +2, certainty: +1 }),
        },
        {
          label: "You have an upcoming call and your stomach is tight.",
          tags: d({ valence: -2, arousal: +2, tension: +2, certainty: -1 }),
        },
      ];
  }
}

// ---------- BODY (chips/checkboxes) ----------
export const BODY_MARKERS = [
  { key: "knot_stomach", label: "Knot in stomach", tags: d({ tension: +2, arousal: +1, certainty: -1 }) },
  { key: "tight_chest",  label: "Tight chest",     tags: d({ tension: +2, arousal: +1 }) },
  { key: "jaw_clench",   label: "Jaw clench",      tags: d({ tension: +2, arousal: +1, other_blame: +1 }) },
  { key: "low_energy",   label: "Low energy",      tags: d({ arousal: -1, fatigue: +2, valence: -1 }) },
  { key: "lightness",    label: "Lightness",       tags: d({ tension: -1, arousal: 0, valence: +1, certainty: +1 }) },
];

// ---------- THOUGHTS (checkboxes/toggles) ----------
export const THOUGHT_ITEMS = [
  { key: "self_criticism",  label: "I'm hard on myself",        tags: d({ self_blame: +2, valence: -1 }) },
  { key: "blame_others",    label: "They did me wrong",         tags: d({ other_blame: +2, valence: -1 }) },
  { key: "uncertainty",     label: "I don't know what's right", tags: d({ certainty: -2, arousal: +1 }) },
  { key: "lack_control",    label: "It's out of my hands",      tags: d({ agency: -1, arousal: +1 }) },
  { key: "gratitude_focus", label: "I notice what's good",      tags: d({ valence: +2, certainty: +1, socialness: +1 }) },
];
