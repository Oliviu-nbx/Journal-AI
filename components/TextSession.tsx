
import React, { useState, useEffect, useRef } from 'react';
import { Chat, GenerateContentResponse } from "@google/genai";
import { createChatSession } from '../services/gemini';
import { JournalEntry, Goal, Task, Persona, ChatMessage } from '../types';
import { Send, User, Bot, X } from 'lucide-react';

interface TextSessionProps {
  entries: JournalEntry[]; 
  goals: Goal[];
  tasks: Task[];
  persona: Persona;
  onSessionEnd: (transcript: string) => void;
  onCancel: () => void;
}

const TextSession: React.FC<TextSessionProps> = ({ entries, goals, tasks, persona, onSessionEnd, onCancel }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Chat
  useEffect(() => {
    const contextSummary = entries.slice(0, 5).map(e => 
        `[Date: ${e.date.split('T')[0]}] Summary: ${e.summary} | Tags: ${e.tags.join(', ')}`
      ).join('\n');

    const activeGoals = goals.filter(g => !g.isCompleted);
    const goalContext = activeGoals.length > 0 
      ? activeGoals.map(g => `- [${g.type}] ${g.text}`).join('\n')
      : "No active goals currently.";
    
    const activeTasks = tasks.filter(t => !t.isCompleted);
    const taskContext = activeTasks.length > 0
      ? activeTasks.map(t => `- [${t.type}] ${t.text}`).join('\n')
      : "No active tasks currently.";

    const chat = createChatSession({
        persona,
        userContext: contextSummary,
        goalsContext: goalContext,
        tasksContext: taskContext
    });
    chatRef.current = chat;

    // Initial greeting
    const startConversation = async () => {
        setIsLoading(true);
        try {
            const response = await chat.sendMessage({ message: "Start the interview now." });
            setMessages([{ role: 'model', text: response.text || "Hello! Ready to reflect?", timestamp: Date.now() }]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    startConversation();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !chatRef.current) return;
    
    const userMsg = inputText;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: Date.now() }]);
    setIsLoading(true);

    try {
        const response: GenerateContentResponse = await chatRef.current.sendMessage({ message: userMsg });
        setMessages(prev => [...prev, { role: 'model', text: response.text || "...", timestamp: Date.now() }]);
    } catch (e) {
        console.error(e);
        setMessages(prev => [...prev, { role: 'system', text: "Error communicating with AI.", timestamp: Date.now() }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  }

  const handleEndSession = () => {
    const fullTranscript = messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
    onSessionEnd(fullTranscript);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto glass-panel rounded-2xl overflow-hidden border border-white/20 dark:border-white/5 shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-4 bg-gray-100/50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-indigo-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="font-bold text-gray-700 dark:text-gray-200">ReflectAI <span className="text-xs font-normal opacity-70">({persona})</span></span>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
            </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-black/20">
            {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-2`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-cyan-600'}`}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-white/5'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                     <div className="flex items-center gap-2 ml-10">
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                         <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                     </div>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-white/10">
            <div className="flex gap-2">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer..."
                  className="flex-1 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-gray-900 dark:text-white"
                />
                <button 
                  onClick={handleSend}
                  disabled={!inputText.trim() || isLoading}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
            <div className="mt-2 flex justify-center">
                <button onClick={handleEndSession} className="text-xs font-bold text-red-500 hover:text-red-600 dark:text-red-400 uppercase tracking-widest">
                    End Interview
                </button>
            </div>
        </div>
    </div>
  );
};

export default TextSession;
