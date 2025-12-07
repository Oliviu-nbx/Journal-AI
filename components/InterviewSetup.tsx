
import React, { useState } from 'react';
import { Persona, VoiceName } from '../types';
import { User, Volume2, ArrowRight, MessageSquare, Mic } from 'lucide-react';

interface InterviewSetupProps {
  onStart: (mode: 'TEXT' | 'VOICE', persona: Persona, voice: VoiceName) => void;
  onCancel: () => void;
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({ onStart, onCancel }) => {
  const [selectedMode, setSelectedMode] = useState<'TEXT' | 'VOICE'>('VOICE');
  const [selectedPersona, setSelectedPersona] = useState<Persona>('Nice');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Puck');

  return (
       <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-2xl mx-auto justify-center">
          <div className="glass-panel p-8 rounded-3xl shadow-2xl w-full border border-white/20 dark:border-white/5">
             <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
                <User className="w-8 h-8 text-white" />
             </div>
             <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white text-center mb-2">Configure Companion</h2>
             <p className="text-gray-500 dark:text-gray-400 text-center mb-8 text-sm">Customize your interview experience.</p>

             {/* Mode Selection */}
             <div className="mb-8">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Interview Mode</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setSelectedMode('VOICE')}
                        className={`py-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                           selectedMode === 'VOICE' 
                           ? 'bg-indigo-600 text-white shadow-lg' 
                           : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <Mic className="w-4 h-4" /> Voice Call
                    </button>
                    <button
                        onClick={() => setSelectedMode('TEXT')}
                        className={`py-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                           selectedMode === 'TEXT' 
                           ? 'bg-indigo-600 text-white shadow-lg' 
                           : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" /> Text Chat
                    </button>
                </div>
             </div>

             {/* Tone */}
             <div className="mb-8">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Personality</label>
                <div className="grid grid-cols-3 gap-3">
                   {(['Nice', 'Motivational', 'Rude'] as Persona[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedPersona(p)}
                        className={`py-4 rounded-xl text-sm font-medium transition-all relative overflow-hidden group ${
                           selectedPersona === p 
                           ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900' 
                           : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {p}
                      </button>
                   ))}
                </div>
             </div>

             {/* Voice (Only if Voice Mode) */}
             <div className={`mb-10 transition-all duration-300 ${selectedMode === 'TEXT' ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Voice Model</label>
                <div className="grid grid-cols-5 gap-2">
                   {(['Puck', 'Kore', 'Fenrir', 'Charon', 'Zephyr'] as VoiceName[]).map((v) => (
                      <button
                        key={v}
                        onClick={() => setSelectedVoice(v)}
                        className={`py-3 rounded-lg text-[10px] font-bold uppercase transition-all flex flex-col items-center ${
                           selectedVoice === v 
                           ? 'bg-cyan-600 text-white shadow-lg' 
                           : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <Volume2 className="w-4 h-4 mb-1" />
                        {v}
                      </button>
                   ))}
                </div>
             </div>

             <div className="flex gap-4">
                <button onClick={onCancel} className="flex-1 py-4 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                   Cancel
                </button>
                <button 
                  onClick={() => onStart(selectedMode, selectedPersona, selectedVoice)}
                  className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl shadow-lg shadow-indigo-600/30 font-bold flex items-center justify-center hover:scale-[1.02] transition-transform"
                >
                   Initialize {selectedMode === 'VOICE' ? 'Call' : 'Chat'} <ArrowRight className="w-5 h-5 ml-2" />
                </button>
             </div>
          </div>
       </div>
  );
};

export default InterviewSetup;
