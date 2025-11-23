export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface Example {
  original: string;
  translation: string;
}

export interface DictionaryEntry {
  id: string;
  term: string;
  definition: string;
  examples: Example[];
  explanation: string;
  imageUrl?: string;
  sourceLang: Language;
  targetLang: Language;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum AppView {
  SETUP = 'SETUP',
  HOME = 'HOME',
  RESULT = 'RESULT',
  NOTEBOOK = 'NOTEBOOK',
  FLASHCARDS = 'FLASHCARDS',
  STORY = 'STORY'
}

export interface StoryResult {
  story: string;
  translation: string;
}
