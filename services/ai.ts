
import { connectLiveSession as connectGeminiLive, createChatSession as createGeminiChat, synthesizeJournalEntry as synthesizeGemini, generateSpeech as generateGeminiSpeech, editJournalImage as editGeminiImage, getGroundedContext as getGeminiGrounding } from './gemini';
import { connectOllamaLiveSession, ollamaChat, ollamaSynthesizeEntry } from './ollama';
import { AIConfig, Persona, VoiceName, Goal, Task, ChatMessage } from '../types';

/**
 * UNIFIED AI SERVICE
 * Handles routing to either Gemini API or Local Ollama based on config.
 */

// 1. LIVE SESSION
export const connectLiveSession = async (
  config: AIConfig,
  onAudioData: (buffer: AudioBuffer) => void,
  onTranscription: (user: string, model: string) => void,
  onError: (error: any) => void,
  sessionConfig: {
    persona: Persona;
    voiceName: VoiceName;
    userContext: string;
    goalsContext: string;
    tasksContext: string;
  }
) => {
  if (config.provider === 'ollama') {
    return connectOllamaLiveSession(config, onAudioData, onTranscription, onError, sessionConfig);
  } else {
    return connectGeminiLive(onAudioData, onTranscription, onError, sessionConfig);
  }
};

// 2. TEXT CHAT
export const sendMessage = async (
    config: AIConfig, 
    messages: ChatMessage[],
    sessionConfig: {
        persona: Persona;
        userContext: string;
        goalsContext: string;
        tasksContext: string;
    }
): Promise<string> => {
    if (config.provider === 'ollama') {
        const systemPrompt = `Persona: ${sessionConfig.persona}. Context: ${sessionConfig.userContext}. Goals: ${sessionConfig.goalsContext}. Tasks: ${sessionConfig.tasksContext}`;
        return await ollamaChat(config, messages, systemPrompt);
    } else {
        // For Gemini, we are creating a new chat instance every time in this stateless facade wrapper? 
        // No, TextSession.tsx handles state. We just need a way to interface or we refactor TextSession.
        // To minimize refactoring, TextSession expects a Chat object. 
        // We will adapt TextSession to call this simple function instead of holding a Gemini Chat object.
        throw new Error("Use createChatSession for Gemini"); 
    }
};

// Adapter for Chat Object (to keep TextSession compatible)
export const createUnifiedChatSession = (
    config: AIConfig, 
    sessionConfig: {
        persona: Persona;
        userContext: string;
        goalsContext: string;
        tasksContext: string;
    }
) => {
    if (config.provider === 'gemini') {
        const chat = createGeminiChat(sessionConfig);
        return {
            sendMessage: async (msg: string) => {
                const res = await chat.sendMessage({ message: msg });
                return res.text;
            }
        };
    } else {
        let history: ChatMessage[] = [];
        const systemPrompt = `System: You are a journaling assistant. Persona: ${sessionConfig.persona}\nContext:${sessionConfig.userContext}\nGoals:${sessionConfig.goalsContext}`;
        
        return {
            sendMessage: async (msg: string) => {
                history.push({ role: 'user', text: msg, timestamp: Date.now() });
                const response = await ollamaChat(config, history, systemPrompt);
                history.push({ role: 'model', text: response, timestamp: Date.now() });
                return response;
            }
        };
    }
};


// 3. SYNTHESIS
export const synthesizeJournalEntry = async (
  config: AIConfig,
  transcript: string, 
  currentGoals: Goal[], 
  currentTasks: Task[]
) => {
  if (config.provider === 'ollama') {
    return ollamaSynthesizeEntry(config, transcript, currentGoals, currentTasks);
  } else {
    return synthesizeGemini(transcript, currentGoals, currentTasks);
  }
};

// 4. SPEECH GEN (TTS)
export const generateSpeech = async (config: AIConfig, text: string): Promise<AudioBuffer | null> => {
   if (config.provider === 'ollama') {
       // Using Web Speech API for playback doesn't return a buffer we can visualize easily in the same way.
       // We'll return null and let the component handle "no buffer" or just trigger window.speechSynthesis
       const utterance = new SpeechSynthesisUtterance(text);
       window.speechSynthesis.speak(utterance);
       return null; 
   } else {
       return generateGeminiSpeech(text);
   }
};

// 5. IMAGE EDITING (Gemini Only)
export const editImage = async (config: AIConfig, base64: string, prompt: string) => {
    if (config.provider === 'ollama') {
        throw new Error("Image editing not supported locally.");
    }
    return editGeminiImage(base64, prompt);
};

// 6. GROUNDING (Gemini Only)
export const getGrounding = async (config: AIConfig, query: string) => {
    if (config.provider === 'ollama') {
        return null; // Local models don't have search grounding usually
    }
    return getGeminiGrounding(query);
};
