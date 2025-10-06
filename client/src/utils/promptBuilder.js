// Purpose: Build an instruction that forces a strict JSON response.
// Why: Reduce chances of non-JSON output and improve content quality.
module.exports = function buildPrompt({ answers }) {
  const formatted = (answers || [])
    .map((a) => {
      const q = String(a.questionId || '').slice(0, 80);        // keep short
      const ans = String(a.answerText || '').slice(0, 400);      // keep short
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
};