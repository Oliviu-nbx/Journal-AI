
import { Persona, VoiceName, Goal, Task, AIConfig, ChatMessage } from '../types';

// Helper to construct the system prompt
const getSystemPrompt = (persona: Persona, userContext: string, goalsContext: string, tasksContext: string) => `
You are an intelligent AI journaling companion.
Current Persona: ${persona}
User Context: ${userContext}
Goals: ${goalsContext}
Tasks: ${tasksContext}

Instructions:
1. Interview the user about their day.
2. Check on their goals/tasks.
3. Be conversational. Keep responses concise (under 2-3 sentences) as this is a spoken conversation.
`;

export const ollamaChat = async (
  config: AIConfig,
  messages: ChatMessage[],
  systemInstruction?: string
) => {
  const model = config.ollamaModel || 'deepseek-r1:7b'; // default fallback
  const url = `${config.ollamaBaseUrl || 'http://localhost:11434'}/api/chat`;

  const ollamaMessages = [
    { role: 'system', content: systemInstruction || '' },
    ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.text }))
  ];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: ollamaMessages,
        stream: false
      })
    });

    if (!response.ok) throw new Error('Ollama API request failed');
    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error("Ollama Chat Error:", error);
    throw error;
  }
};

/**
 * Simulates the "Live Session" using Browser Speech Recognition (STT) and Speech Synthesis (TTS)
 * connected to Ollama for the intelligence.
 */
export const connectOllamaLiveSession = (
  config: AIConfig,
  onAudioData: (buffer: AudioBuffer) => void, // Used to visualize TTS
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
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError(new Error("Browser does not support Speech Recognition."));
    return { close: () => {} };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  const systemInstruction = getSystemPrompt(
    sessionConfig.persona,
    sessionConfig.userContext,
    sessionConfig.goalsContext,
    sessionConfig.tasksContext
  );

  let conversationHistory: ChatMessage[] = [];
  let isListening = false;
  let isTalking = false;

  // Audio Context for visualizer
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  gainNode.gain.value = 0; // Start silent
  oscillator.start();

  // Helper to "speak" text
  const speak = (text: string) => {
    isTalking = true;
    recognition.stop(); // Stop listening while talking to avoid self-loop

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Simulate visualizer
    const visualizerInterval = setInterval(() => {
        // Create a dummy buffer to trigger visualizer in parent
        const buffer = audioCtx.createBuffer(1, 128, 24000);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() - 0.5) * 0.5; // Random noise for visualizer
        }
        onAudioData(buffer);
    }, 50);

    utterance.onend = () => {
      clearInterval(visualizerInterval);
      isTalking = false;
      try { recognition.start(); } catch(e) {} // Resume listening
    };
    
    window.speechSynthesis.speak(utterance);
  };

  recognition.onresult = async (event: any) => {
    const lastResultIdx = event.results.length - 1;
    const userText = event.results[lastResultIdx][0].transcript;
    
    if (!userText.trim()) return;

    // Add to history
    conversationHistory.push({ role: 'user', text: userText, timestamp: Date.now() });

    try {
      // Get AI Response
      const aiResponse = await ollamaChat(config, conversationHistory, systemInstruction);
      
      conversationHistory.push({ role: 'model', text: aiResponse, timestamp: Date.now() });
      onTranscription(userText, aiResponse);
      speak(aiResponse);

    } catch (e) {
      onError(e);
      speak("I'm having trouble connecting to my local brain.");
    }
  };

  recognition.onerror = (event: any) => {
    console.error("Speech Recognition Error", event.error);
    if(event.error === 'not-allowed') onError(new Error("Microphone permission denied"));
  };

  // Start
  try {
    recognition.start();
    isListening = true;
    // Initial greeting
    setTimeout(() => {
        const initialGreeting = "Hello! I'm ready to listen.";
        conversationHistory.push({role: 'model', text: initialGreeting, timestamp: Date.now()});
        onTranscription("", initialGreeting);
        speak(initialGreeting);
    }, 500);
  } catch(e) {
    onError(e);
  }

  return {
    close: () => {
      recognition.stop();
      window.speechSynthesis.cancel();
      oscillator.stop();
      audioCtx.close();
    }
  };
};

export const ollamaSynthesizeEntry = async (
    config: AIConfig,
    transcript: string,
    currentGoals: Goal[],
    currentTasks: Task[]
) => {
    const prompt = `
      You are an expert journalist.
      Transcript of conversation:
      ${transcript}

      Current Goals: ${JSON.stringify(currentGoals)}
      Current Tasks: ${JSON.stringify(currentTasks)}

      Task: 
      1. Write a journal entry based on the transcript (first person).
      2. Identify completed goals/tasks IDs.
      3. Suggest new goals/tasks.
      4. Return ONLY JSON format.
      
      JSON Schema:
      {
        "title": "string",
        "content": "string",
        "summary": "string",
        "mood": "string",
        "tags": ["string"],
        "completedGoalIds": ["string"],
        "completedTaskIds": ["string"],
        "generatedGoals": [{"text": "string", "type": "Daily"|"Weekly"|"Monthly"}],
        "generatedTasks": [{"text": "string", "type": "Daily"|"Weekly"|"Monthly"}]
      }
    `;
    
    // Deepseek-r1 works well with "Think before you answer" which is implicit in the model, 
    // but we need to ensure valid JSON output.
    try {
        const rawResponse = await ollamaChat(config, [{ role: 'user', text: prompt, timestamp: Date.now() }]);
        
        // Basic extraction of JSON block if the model chats around it
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(rawResponse);
    } catch (e) {
        console.error("Ollama Synthesis Error", e);
        throw e;
    }
};
