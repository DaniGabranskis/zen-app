import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '@env';

// Warn if API key is missing or too short
if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 20) {
  console.warn('[⚠️ WARNING] OPENAI_API_KEY is missing or too short. Check your .env file and restart Expo.');
}

// Creates a singleton OpenAI client instance with API key from env
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

console.log('[✅ OpenAI] Initialized with API key:', OPENAI_API_KEY.slice(0, 5) + '...');

export default openai;