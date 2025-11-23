import { Language } from './types';

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese (Mandarin)', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
];

export const SYSTEM_INSTRUCTION_DICTIONARY = `
You are "LingoPop", a fun, energetic, and savvy language learning buddy. 
Your goal is to explain words or phrases in a way that sticks, avoiding dry textbook definitions.
When a user provides a term:
1. Give a natural explanation in their mother tongue.
2. Provide 2 clear example sentences in the target language with mother tongue translations.
3. Write a "Fun Explanation" that feels like a friend chatting. Include cultural nuances, slang usage, specific vibe/tone (formal/casual), or synonyms/false friends. Keep this part punchy and interesting.
`;

export const SYSTEM_INSTRUCTION_STORY = `
You are a creative storyteller. 
Create a short, coherent, and amusing story using ALL the provided vocabulary words. 
The story should be in the Target Language. 
Also provide a full translation in the Source Language.
Keep it under 200 words.
`;
