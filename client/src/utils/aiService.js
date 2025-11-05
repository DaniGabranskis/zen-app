// src/services/aiService.js
import openai from './openaiClient';
import { buildShortDescPrompt } from './promptBuilder';

// --- tiny helpers ---
function withTimeout(promise, ms = 16000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

function safeParseJson(text) {
  try { return JSON.parse(text); }
  catch {
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s !== -1 && e !== -1 && e > s) {
      try { return JSON.parse(text.slice(s, e + 1)); } catch {}
    }
    return null;
  }
}

// --- NEW: L5 short description ---
/**
 * generateShortDescription(payload)
 * payload = { emotionKey, intensity, triggers:[], bodyMind:[], evidenceTags:[] }
 * returns: { result: { shortDescription }, source: 'ai' | 'local' }
 */
export async function generateShortDescription(payload = {}) {
  const {
    emotionKey = '',
    intensity = null,
    triggers = [],
    bodyMind = [],
    evidenceTags = [],
  } = payload;

  const prompt = buildShortDescPrompt({ emotionKey, intensity, triggers, bodyMind, evidenceTags });

  const online = async () => {
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You produce JSON only. Address the user as "you". Use facts they selected; no hedging (no might/may/could). No speculation. Concise (<=220 chars). Neutral, kind, practical.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 220,
      }),
      16000
    );

    const raw = completion?.choices?.[0]?.message?.content?.trim() || '';
    const parsed = safeParseJson(raw);
    if (!parsed || typeof parsed.shortDescription !== 'string') {
      throw new Error('invalid JSON shortDescription');
    }
    return { shortDescription: parsed.shortDescription.trim().slice(0, 400) };
  };

  try {
    const result = await online();
    return { result, source: 'ai' };
  } catch (e) {
    console.warn('[AI shortDescription fallback]', e?.message || e);
    // offline/local fallback (простая сборка из входа, чтобы не оставить пустым поле)
    const parts = [];
    if (emotionKey) parts.push(`State leans toward “${emotionKey}”.`);
    if (Number.isFinite(intensity)) parts.push(`Intensity about ${intensity}/10.`);
    const pieces = [];
    if (triggers?.length) pieces.push(`triggers: ${triggers.slice(0,3).join(', ')}`);
    if (bodyMind?.length) pieces.push(`signals: ${bodyMind.slice(0,3).join(', ')}`);
    if (pieces.length) parts.push(`Based on ${pieces.join('; ')}.`);
    const shortDescription = (parts.join(' ') || 'We summarized your inputs briefly.').slice(0, 400);
    return { result: { shortDescription }, source: 'local' };
  }
}
