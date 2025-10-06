import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '@env';

// Warn if API key is missing or too short
if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 20) {
  console.warn('[⚠️ WARNING] OPENAI_API_KEY is missing or too short. Check your .env file and restart Expo.');
}

// Creates a singleton OpenAI client instance with API key from env
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  // НЕ используем dangerouslyAllowBrowser в проде
});

// без логирования ключа
console.log('[✅ OpenAI] OpenAI client initialized');

export default openai;