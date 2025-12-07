
import React, { useState } from 'react';
import { ChevronRight, Check, X, Mic, Plus, Trophy } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to ReflectAI",
      desc: "Your intelligent companion for journaling, goal tracking, and self-reflection.",
      icon: <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-3xl mb-6 shadow-xl animate-pulse"></div>
    },
    {
      title: "Voice Interviews",
      desc: "Click the 'Interview' button to talk with your AI companion. It will interview you about your day, goals, and tasks.",
      icon: <Mic className="w-16 h-16 text-indigo-500 mb-6" />
    },
    {
      title: "Smart Synthesis",
      desc: "After talking, the AI writes the journal entry for you. It even checks off your goals automatically based on what you say!",
      icon: <Plus className="w-16 h-16 text-cyan-500 mb-6" />
    },
    {
      title: "Gamification",
      desc: "Earn XP, unlock badges, and maintain streaks by journaling daily. Check your stats in the Profile tab.",
      icon: <Trophy className="w-16 h-16 text-yellow-500 mb-6" />
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-white/10 relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

         <div className="relative z-10 flex flex-col items-center text-center">
            {steps[step].icon}
            
            <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-3">
              {steps[step].title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
              {steps[step].desc}
            </p>

            <div className="flex justify-between items-center w-full">
               <div className="flex gap-2">
                 {steps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-indigo-600 w-6' : 'bg-gray-300 dark:bg-white/20'}`} 
                    />
                 ))}
               </div>

               <button 
                 onClick={handleNext}
                 className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all hover:scale-105"
               >
                 {step === steps.length - 1 ? "Get Started" : "Next"} 
                 {step === steps.length - 1 ? <Check className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
               </button>
            </div>
         </div>

         <button onClick={onComplete} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
         </button>
      </div>
    </div>
  );
};

export default Onboarding;
