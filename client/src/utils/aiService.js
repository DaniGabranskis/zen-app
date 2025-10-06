import openai from '../utils/openaiClient';
import buildPrompt from '../utils/promptBuilder';
import { normalizeAiResult } from '../utils/aiSchema';
import { withBackoff, withTimeout } from '../utils/aiBackoff';
import { generateLocalAdvice } from '../utils/localAdvice';

function safeParse(text) {
  try { return JSON.parse(text); }
  catch {
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s !== -1 && e !== -1 && e > s) {
      try { return JSON.parse(text.slice(s, e + 1)); } catch {}
    }
    return null;
  }
}

export async function generateInsight(answers) {
  const online = async () => {
    const prompt = buildPrompt({ answers });
    const req = async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: [
            'You are a concise, kind, trauma-informed reflection coach.',
            'English, CEFR B2, neutral. No medical claims. Only JSON.',
            'Total length <= ~900 chars.'
          ].join(' ') },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });
      const raw = completion.choices?.[0]?.message?.content?.trim() || '';
      const parsed = safeParse(raw);
      if (!parsed) throw new Error('AI returned non-JSON');
      return normalizeAiResult(parsed);
    };
    return withTimeout(withBackoff(req, { retries: 2, baseMs: 700 }), 14000);
  };

  try {
    const result = await online();
    return { result, source: 'ai' };
  } catch (e) {
    console.warn('[AI fallback]', e?.message || e);
    const local = generateLocalAdvice(answers);
    return { result: normalizeAiResult(local), source: 'local' };
  }
}
