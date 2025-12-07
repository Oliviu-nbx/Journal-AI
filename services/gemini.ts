
import { GoogleGenAI, Modality, LiveServerMessage, Type, Chat } from "@google/genai";
import { createPcmBlob, decodeBase64, decodeAudioData } from "./audioUtils";
import { Persona, VoiceName, Goal, Task } from "../types";

// Initialize AI Client
// Note: In a real app, API Key should be dynamic or env var. 
// For now, assuming process.env.API_KEY is available or injected.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const getSystemInstruction = (
  persona: Persona,
  userContext: string,
  goalsContext: string,
  tasksContext: string
) => `
    You are an intelligent AI journaling companion.
    
    Current Persona Setting: ${persona}
    
    User History (Previous Entries):
    ${userContext}

    Active User Goals (Aspirations):
    ${goalsContext}

    Pending User Tasks (To-Do List):
    ${tasksContext}

    Instructions:
    1. Start the conversation by greeting the user.
    2. Your goal is to interview the user about their day AND check in on their progress.
    3. **Check-in**:
       - Ask about specific pending tasks for 'Daily' (Today/Tomorrow).
       - Ask about progress on 'Weekly' goals.
       - If they failed a task/goal, ask why.
    
    4. **Planning**:
       - If the user mentions new things they need to do, confirm: "Should I add that to your task list for tomorrow?"

    Personality Guidelines:
    - If Persona is 'Nice': Be warm. If they missed a task, say "It happens, let's reschedule."
    - If Persona is 'Motivational': If they missed a task, say "Focus! We need to get this done."
    - If Persona is 'Rude': If they missed a task, say "Another missed deadline? Disappointing."

    Keep your responses concise and conversational.
`;

/**
 * 1. LIVE API INTERACTION
 */
export const connectLiveSession = async (
  onAudioData: (buffer: AudioBuffer) => void,
  onTranscription: (user: string, model: string) => void,
  onError: (error: any) => void,
  config: {
    persona: Persona;
    voiceName: VoiceName;
    userContext: string;
    goalsContext: string;
    tasksContext: string;
  }
) => {
  const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  
  let nextStartTime = 0;
  let currentInputTranscription = '';
  let currentOutputTranscription = '';

  const systemInstruction = getSystemInstruction(config.persona, config.userContext, config.goalsContext, config.tasksContext);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log("Live Session Connected");
          const source = inputAudioContext.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
          };
          
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle Transcriptions
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription += message.serverContent.outputTranscription.text;
          } else if (message.serverContent?.inputTranscription) {
            currentInputTranscription += message.serverContent.inputTranscription.text;
          }

          if (message.serverContent?.turnComplete) {
            onTranscription(currentInputTranscription, currentOutputTranscription);
            currentInputTranscription = '';
            currentOutputTranscription = '';
          }

          // Handle Audio Output
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            const audioBuffer = await decodeAudioData(
              decodeBase64(base64Audio),
              outputAudioContext
            );
            
            onAudioData(audioBuffer);

            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            source.start(nextStartTime);
            nextStartTime += audioBuffer.duration;
          }
        },
        onclose: () => {
          console.log("Live Session Closed");
          stream.getTracks().forEach(track => track.stop());
          inputAudioContext.close();
          outputAudioContext.close();
        },
        onerror: (err) => {
          console.error("Live Session Error", err);
          onError(err);
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } }
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: systemInstruction,
      }
    });

    return sessionPromise;

  } catch (e) {
    onError(e);
    throw e;
  }
};

/**
 * 2. TEXT CHAT SESSION
 */
export const createChatSession = (config: {
  persona: Persona;
  userContext: string;
  goalsContext: string;
  tasksContext: string;
}): Chat => {
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: getSystemInstruction(config.persona, config.userContext, config.goalsContext, config.tasksContext),
    }
  });
};


/**
 * 3. JOURNAL SYNTHESIS (THINKING MODE)
 */
export const synthesizeJournalEntry = async (
  conversationTranscript: string, 
  currentGoals: Goal[], 
  currentTasks: Task[]
): Promise<any> => {
  try {
    const activeGoals = currentGoals.filter(g => !g.isCompleted);
    const activeTasks = currentTasks.filter(t => !t.isCompleted);

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Here is a transcript of a conversation between a user and their AI journal assistant. 
      
      Current Active Goals (IDs provided):
      ${JSON.stringify(activeGoals.map(g => ({ id: g.id, text: g.text })))}

      Current Active Tasks (IDs provided):
      ${JSON.stringify(activeTasks.map(t => ({ id: t.id, text: t.text })))}
      
      Tasks:
      1. Synthesize this into a beautiful, reflective journal entry written in the first person (as the user).
      2. Extract a title, tags, and a mood.
      3. **Goal/Task Verification**: Analyze the transcript. Did the user confirm they completed any of the active goals or tasks listed above? If yes, include their IDs in the response.
      4. **New Generation**: Identify NEW aspirations (Goals) or to-dos (Tasks).
      
      Transcript:
      ${conversationTranscript}`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            summary: { type: Type.STRING },
            mood: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            completedGoalIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            completedTaskIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            generatedGoals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['Daily', 'Weekly', 'Monthly'] }
                }
              }
            },
            generatedTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['Daily', 'Weekly', 'Monthly'] }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Synthesis error:", error);
    throw error;
  }
};

/**
 * 4. IMAGE EDITING
 */
export const editJournalImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          { text: prompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    return null;
  } catch (error) {
    console.error("Image edit error:", error);
    throw error;
  }
};

/**
 * 5. TTS READBACK
 */
export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
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
  if (!base64Audio) throw new Error("No audio generated");

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  return await decodeAudioData(decodeBase64(base64Audio), audioCtx);
};


/**
 * 6. GROUNDING SEARCH
 */
export const getGroundedContext = async (query: string) => {
   const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find relevant information for this journal context: ${query}`,
      config: {
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
      },
   });
   
   return {
     text: response.text,
     chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
   };
};
