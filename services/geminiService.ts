import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DictionaryEntry, Language, StoryResult } from "../types";
import { SYSTEM_INSTRUCTION_DICTIONARY, SYSTEM_INSTRUCTION_STORY } from "../constants";
// 替换掉文件中 import 语句之后的所有初始化代码
// 确保 VITE_GEMINI_API_KEY 是全局变量或由 App.tsx 注入
const apiKey = (window as any).VITE_GEMINI_API_KEY || 'dummy-key'; 

// 这里不再使用 process.env，以适应浏览器环境
if (apiKey === 'dummy-key') {
    // ⚠️ 警告：如果 App.tsx 没有设置 VITE_GEMINI_API_KEY，这里仍会使用 dummy-key
    console.warn("Using dummy key. Please ensure VITE_GEMINI_API_KEY is set in App component.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });
export const lookupTerm = async (
  term: string,
  sourceLang: Language,
  targetLang: Language
): Promise<Partial<DictionaryEntry>> => {
  try {
    const prompt = `Analyze the term "${term}".
    Target Language: ${targetLang.name}.
    User's Mother Tongue: ${sourceLang.name}.
    
    Return a JSON object with:
    - definition: Natural explanation in ${sourceLang.name}.
    - examples: Array of 2 objects {original, translation}.
    - explanation: A fun, casual usage guide in ${sourceLang.name}.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_DICTIONARY,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            definition: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  translation: { type: Type.STRING }
                }
              }
            },
            explanation: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text response from Gemini");

    return JSON.parse(text);
  } catch (error) {
    console.error("Lookup error:", error);
    throw error;
  }
};

export const generateVisualization = async (term: string, targetLang: string): Promise<string | undefined> => {
  try {
    const prompt = `A simple, bright, clean vector-style illustration representing the concept of "${term}" in the context of the language ${targetLang}. No text in the image. Vibrant colors.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Image gen error:", error);
    return undefined;
  }
};

export const generateAudio = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/mp3;base64,${base64Audio}`;
    }
    return null;
  } catch (error) {
    console.error("TTS error:", error);
    return null;
  }
};

export const generateStory = async (words: string[], sourceLang: string, targetLang: string): Promise<StoryResult> => {
  try {
    const prompt = `Create a story using these words: ${words.join(', ')}.
    Target Language: ${targetLang}.
    Translation Language: ${sourceLang}.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_STORY,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                story: { type: Type.STRING },
                translation: { type: Type.STRING }
            }
        }
      }
    });
    
    const text = response.text;
    if(!text) throw new Error("No story generated");
    return JSON.parse(text);

  } catch (error) {
    console.error("Story gen error:", error);
    throw error;
  }
};

export const chatWithBuddy = async (history: any[], newMessage: string, contextTerm: string) => {
    try {
        // We use a simple generateContent for chat turn to keep it stateless in this simplified service, 
        // but ideally we'd maintain a Chat session. Here we just append context to prompt for simplicity 
        // or pass the full history as contents.
        
        // Construct the chat history for the API
        const contents = history.map(h => ({
            role: h.role,
            parts: [{ text: h.text }]
        }));

        // Add context if it's the start or just remind the model
        const systemContext = `Current context: discussing the word "${contextTerm}". Keep answers short and helpful.`;
        
        // Add user message
        contents.push({
            role: 'user',
            parts: [{ text: `${systemContext}\n\n${newMessage}` }]
        });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents
        });

        return response.text;
    } catch (error) {
        console.error("Chat error:", error);
        return "Sorry, I got a bit confused. Try asking again!";
    }
}
