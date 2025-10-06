import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '@env';

// Purpose: Initialize OpenAI client using API key from .env.
// Why: Single, safe place to create the client (no key leaks).
if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 20) {
  console.warn('[OpenAI] Missing or short OPENAI_API_KEY. Check your .env and restart Expo.');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY, // used by the SDK to authorize requests
  // IMPORTANT: do not use dangerouslyAllowBrowser in production
});

console.log('[OpenAI] Client initialized'); // never print the key

export default openai;