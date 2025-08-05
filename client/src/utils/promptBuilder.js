/**
 * Returns prompt string for OpenAI based on answers array.
 * Answers: [{questionId, answerText}]
 * Result is a formatted reflection prompt for the AI.
 */
module.exports = function buildPrompt({ answers }) {
  const formatted = answers
    .map((a, i) => `Q: ${a.questionId}\nA: ${a.answerText}`)
    .join('\n\n');

  return `
The user completed a structured emotional reflection. Here are their answers:

${formatted}

Now return a valid JSON object like this:
{
  "insight": "One thoughtful paragraph about the user's inner state",
  "tips": ["Practical tip 1", "Helpful tip 2"],
  "encouragement": "One kind sentence to close the reflection"
}

Be clear, concise, kind and practical. Respond only with valid JSON.
`;
};