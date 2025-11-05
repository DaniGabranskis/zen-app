// src/utils/promptBuilder.js

// Default builder (оставляем, если тебе нужен "большой" JSON для других экранов)
export default function buildPrompt({ answers }) {
  const formatted = (answers || [])
    .map((a) => {
      const q = String(a.questionId || '').slice(0, 80);
      const ans = String(a.answerText || '').slice(0, 400);
      const tags = Array.isArray(a.tags) ? a.tags.join(', ') : '';
      return `Q: ${q}\nA: ${ans}${tags ? `\nTags: ${tags}` : ''}`;
    })
    .join('\n\n');

  return `
User completed a structured reflection. Their anonymized answers:

${formatted || '(no answers provided)'}

Return ONLY a valid JSON object with keys:
{
  "insight": "1 short paragraph (<=3 sentences). Kind, specific, neutral.",
  "tips": [
    "2-4 actionable steps (<=14 words each). No emojis.",
    "Start with a verb. Avoid generic platitudes."
  ],
  "encouragement": "1 sentence that acknowledges effort and agency (<=20 words)."
}

Constraints:
- English, CEFR B2, globally neutral.
- No diagnoses, no guarantees, no medical claims.
- Be practical, plain language. Do not mention JSON or schema.
- Output JSON only — no extra text.
`.trim();
}

// --- NEW: buildShortDescPrompt ---
// Strict-JSON prompt for L5 shortDescription (1–3 short sentences).
export function buildShortDescPrompt({ emotionKey, intensity, triggers, bodyMind, evidenceTags }) {
  const ek = String(emotionKey || 'unknown');
  const it = Number.isFinite(intensity) ? Number(intensity) : null;

  const trig = Array.isArray(triggers) && triggers.length ? triggers.slice(0, 8) : [];
  const bm   = Array.isArray(bodyMind) && bodyMind.length ? bodyMind.slice(0, 8) : [];
  const tags = Array.isArray(evidenceTags) && evidenceTags.length ? evidenceTags.slice(0, 12) : [];

  return `
You are a reflection summarizer helping a person understand their current state.
Return ONLY JSON:

{
  "shortDescription": "Write 2–3 short sentences directly to the user (you/your). 1) Acknowledge what they’re feeling now based on their selections (${ek}, intensity ${it ?? 'n/a'}). 2) Offer a gentle reflection on what that might mean or how it fits their recent pattern. 3) Close with a kind, realistic note or suggestion that feels supportive, not prescriptive. No lists. No emojis."
}

Context:
- dominantEmotion: ${ek}
- intensity: ${it ?? '(none)'}
- topTriggers: ${trig.join(', ') || '(none)'}
- bodyMindSignals: ${bm.join(', ') || '(none)'}
- evidenceTags: ${tags.join(', ') || '(none)'}

Tone & Style (MANDATORY):
- Speak in second person (you/your). Never say “the user”.
- Acknowledge emotions with empathy and realism. Avoid over-positivity.
- Use verbs like “you’re noticing”, “you seem”, “you’ve been feeling”, “you’re starting to”.
- Keep it factual but human. Show understanding, not analysis.
- Do NOT restate inputs word-for-word; summarize the meaning behind them.
- No speculation about external causes unless obvious in context.
- End with one calm, non-intrusive suggestion (optional).
- Max ~300 characters total.
- Output valid JSON only (no backticks, no extra text).
`.trim();
}
