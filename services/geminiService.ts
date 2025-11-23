import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DictionaryEntry, Language, StoryResult } from "../types";
import { SYSTEM_INSTRUCTION_DICTIONARY, SYSTEM_INSTRUCTION_STORY } from "../constants";

// ----------------------------------------------------
// 💥 关键修复区域：将 AI 实例和 Key 设为可变
// ----------------------------------------------------
let ai: GoogleGenAI | null = null;
let currentApiKey: string | null = null;

// 公共函数：用于在 App.tsx 中设置 API Key
export const setApiKey = (apiKey: string) => {
    if (apiKey && apiKey !== currentApiKey) {
        currentApiKey = apiKey;
        ai = new GoogleGenAI({ apiKey });
        console.log("Gemini AI instance initialized successfully.");
    }
};

// 在进行任何 API 调用之前，确保 AI 实例存在
const getAiInstance = (): GoogleGenAI => {
    if (!ai) {
        // 如果 Key 尚未设置，使用一个假 Key 初始化，以防崩溃
        // 但警告用户需要真实的 Key
        const dummyKey = 'dummy-key-required';
        ai = new GoogleGenAI({ apiKey: dummyKey });
        console.warn("API Key not set. Using dummy key. All external API calls will fail until a valid key is provided.");
    }
    return ai;
};
// ----------------------------------------------------

export const lookupTerm = async (
    term: string,
    sourceLang: Language,
    targetLang: Language
): Promise<Partial<DictionaryEntry>> => {
    const aiInstance = getAiInstance();
    // 如果 Key 仍然是假的，直接返回错误，不发送请求
    if (currentApiKey === null || currentApiKey === 'dummy-key-required') {
        throw new Error("API Key is required to perform lookups. Please enter your key.");
    }
    
    try {
        const prompt = `Analyze the term "${term}".
        Target Language: ${targetLang.name}.
        User's Mother Tongue: ${sourceLang.name}.
        
        Return a JSON object with:
        - definition: Natural explanation in ${sourceLang.name}.
        - examples: Array of 2 objects {original, translation}.
        - explanation: A fun, casual usage guide in ${sourceLang.name}.
        `;

        const response = await aiInstance.models.generateContent({
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

// ... 其他导出函数 (generateVisualization, generateAudio, generateStory, chatWithBuddy) 
//     也需要使用 aiInstance 变量，而不是直接使用 ai。

export const generateVisualization = async (term: string, targetLang: string): Promise<string | undefined> => {
    const aiInstance = getAiInstance();
     if (currentApiKey === null || currentApiKey === 'dummy-key-required') return undefined;
    try {
        const prompt = `A simple, bright, clean vector-style illustration representing the concept of "${term}" in the context of the language ${targetLang}. No text in the image. Vibrant colors.`;
        
        const response = await aiInstance.models.generateContent({
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
    const aiInstance = getAiInstance();
     if (currentApiKey === null || currentApiKey === 'dummy-key-required') return null;
    try {
        const response = await aiInstance.models.generateContent({
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
            // 注意：API 返回 PCM 16bit 音频，需要前端进行 WAV 转换，这里简化为 mp3 mime type，实际可能需要处理
            return `data:audio/mp3;base64,${base64Audio}`; 
        }
        return null;
    } catch (error) {
        console.error("TTS error:", error);
        return null;
    }
};

export const generateStory = async (words: string[], sourceLang: string, targetLang: string): Promise<StoryResult> => {
    const aiInstance = getAiInstance();
     if (currentApiKey === null || currentApiKey === 'dummy-key-required') {
         throw new Error("API Key is required to generate stories. Please enter your key.");
     }
    try {
        const prompt = `Create a story using these words: ${words.join(', ')}.
        Target Language: ${targetLang}.
        Translation Language: ${sourceLang}.
        `;

        const response = await aiInstance.models.generateContent({
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
    const aiInstance = getAiInstance();
     if (currentApiKey === null || currentApiKey === 'dummy-key-required') {
         return "Sorry, I can't chat without a valid API Key. Please provide one first.";
     }
    try {
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

        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents
        });

        return response.text;
    } catch (error) {
        console.error("Chat error:", error);
        return "Sorry, I got a bit confused. Try asking again!";
    }
}
