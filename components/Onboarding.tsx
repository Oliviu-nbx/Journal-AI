
import React, { useState } from 'react';
import { ChevronRight, Check, X, Mic, Plus, User, Cpu, Server, Laptop, Copy, AlertTriangle, Image, Search, Ban, ArrowLeft } from 'lucide-react';
import { UserProfile, AIConfig, AIProvider, ThemeColor } from '../types';

interface OnboardingProps {
  onComplete: (profile: UserProfile, config: AIConfig) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  
  // Profile Data
  const [name, setName] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [struggles, setStruggles] = useState<string[]>([]);
  const [referralSource, setReferralSource] = useState('');
  const [occupation, setOccupation] = useState('');
  const [faith, setFaith] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [genderIdentity, setGenderIdentity] = useState('');
  const [theme, setTheme] = useState<ThemeColor>('Sky');

  // AI Config
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');

  const steps = [
    { id: 'welcome', title: "Welcome" },
    { id: 'name', title: "Name" },
    { id: 'goal', title: "Goal" },
    { id: 'struggles', title: "Struggles" },
    { id: 'occupation', title: "Occupation" },
    { id: 'faith', title: "Faith" },
    { id: 'relationship', title: "Relationship" },
    { id: 'age', title: "Age" },
    { id: 'identity', title: "Identity" },
    { id: 'source', title: "Source" },
    { id: 'theme', title: "Theme" },
    { id: 'ai', title: "Intelligence" },
    { id: 'local-setup', title: "Local Setup" }, // Conditional
    { id: 'features', title: "Tour" }
  ];

  const handleNext = () => {
    // Validation
    if (step === 1 && !name.trim()) return;
    
    // Skip local setup if gemini selected
    if (steps[step].id === 'ai' && provider === 'gemini') {
        // Find index of 'features'
        const featuresIndex = steps.findIndex(s => s.id === 'features');
        setStep(featuresIndex); 
        return;
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      const profile: UserProfile = {
          name,
          onboardedAt: new Date().toISOString(),
          primaryGoal,
          struggles,
          referralSource,
          occupation,
          faith,
          relationshipStatus,
          ageRange,
          genderIdentity,
          theme
      };
      
      onComplete(
          profile,
          { provider, ollamaBaseUrl: ollamaUrl, ollamaModel: 'deepseek-r1:7b' }
      );
    }
  };
  
  const handleBack = () => {
      if (step > 0) setStep(step - 1);
  };

  const SelectionOption = ({ label, selected, onClick, multi = false }: any) => (
      <div 
        onClick={onClick}
        className={`p-4 mb-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${selected ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-gray-200'}`}
      >
          <span className="font-medium">{label}</span>
          {selected && <Check className="w-5 h-5" />}
      </div>
  );

  const ThemeOption = ({ color, label, value }: { color: string, label: string, value: ThemeColor }) => (
      <div 
         onClick={() => setTheme(value)}
         className={`aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all border-2 ${theme === value ? 'border-white scale-105 shadow-xl' : 'border-transparent opacity-70 hover:opacity-100'}`}
         style={{ backgroundColor: color }}
      >
         {theme === value && <Check className="text-white w-8 h-8 drop-shadow-md" />}
         <span className={`text-xs font-bold mt-2 ${theme === value ? 'text-white' : 'text-transparent'}`}>{label}</span>
      </div>
  );

  const renderContent = () => {
      const stepId = steps[step].id;

      switch(stepId) {
          case 'welcome':
            return (
                <div className="text-center pt-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-3xl mx-auto mb-8 shadow-xl animate-pulse flex items-center justify-center">
                        <span className="text-4xl">👋</span>
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white mb-4">Hi! Welcome to Rosebud.</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed">
                        I'm your personal AI journal. I'm here to help you reflect, grow, and understand yourself better.
                    </p>
                </div>
            );
          case 'name':
             return (
                 <div className="text-center pt-10">
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">What should I call you?</h2>
                     <input 
                       type="text" 
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       placeholder="Enter your name"
                       className="w-full text-center text-2xl p-6 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
                       autoFocus
                     />
                 </div>
             );
          case 'goal':
             return (
                 <div>
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">What brings you to Rosebud?</h2>
                     <div className="space-y-1">
                         {['Chronicle my daily life', 'Unlock insights about myself', 'Spark my creativity', 'Process my emotions', 'Set and achieve my goals'].map(opt => (
                             <SelectionOption key={opt} label={opt} selected={primaryGoal === opt} onClick={() => setPrimaryGoal(opt)} />
                         ))}
                     </div>
                 </div>
             );
          case 'struggles':
             return (
                 <div>
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Have you been struggling with anything lately?</h2>
                     <p className="text-gray-500 text-sm text-center mb-6">Select all that apply</p>
                     <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                         {['Loneliness', 'Depression', 'Sleep', 'Grief', 'Anger', 'Anxiety', 'ADHD', 'Stress', 'Burnout', 'Relationships'].map(opt => (
                             <SelectionOption 
                                key={opt} 
                                label={opt} 
                                selected={struggles.includes(opt)} 
                                onClick={() => {
                                    if(struggles.includes(opt)) setStruggles(struggles.filter(s => s !== opt));
                                    else setStruggles([...struggles, opt]);
                                }} 
                             />
                         ))}
                     </div>
                 </div>
             );
          case 'occupation':
             return (
                 <div>
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">What is your primary occupation?</h2>
                     <div className="space-y-1">
                         {['Student', 'Professional', 'Therapist / Coach', 'Homemaker', 'Retired', 'Unemployed', 'Other'].map(opt => (
                             <SelectionOption key={opt} label={opt} selected={occupation === opt} onClick={() => setOccupation(opt)} />
                         ))}
                     </div>
                 </div>
             );
          case 'faith':
             return (
                 <div>
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">What is your faith or spiritual practice?</h2>
                     <div className="space-y-1">
                         {['Buddhist', 'Christian', 'Hindu', 'Jewish', 'Muslim', 'Spiritual, but not religious', 'Agnostic / Atheist', 'Other'].map(opt => (
                             <SelectionOption key={opt} label={opt} selected={faith === opt} onClick={() => setFaith(opt)} />
                         ))}
                     </div>
                 </div>
             );
          case 'relationship':
             return (
                 <div>
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">What's your relationship status?</h2>
                     <div className="space-y-1">
                         {['Single', 'In a relationship', 'Married', 'Divorced', 'Widowed', 'It\'s complicated'].map(opt => (
                             <SelectionOption key={opt} label={opt} selected={relationshipStatus === opt} onClick={() => setRelationshipStatus(opt)} />
                         ))}
                     </div>
                 </div>
             );
          case 'age':
             return (
                 <div>
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">How many years young are you?</h2>
                     <div className="space-y-1">
                         {['Under 18', '18-24', '25-34', '35-44', '45-54', '55+'].map(opt => (
                             <SelectionOption key={opt} label={opt} selected={ageRange === opt} onClick={() => setAgeRange(opt)} />
                         ))}
                     </div>
                 </div>
             );
          case 'identity':
             return (
                 <div>
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">How do you identify?</h2>
                     <div className="space-y-1">
                         {['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'].map(opt => (
                             <SelectionOption key={opt} label={opt} selected={genderIdentity === opt} onClick={() => setGenderIdentity(opt)} />
                         ))}
                     </div>
                 </div>
             );
          case 'source':
             return (
                 <div>
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">How did you hear about Rosebud?</h2>
                     <div className="space-y-1">
                         {['TikTok', 'Instagram', 'Therapist or coach', 'Search engine', 'Friend or family', 'Social media', 'Blog or news', 'Other'].map(opt => (
                             <SelectionOption key={opt} label={opt} selected={referralSource === opt} onClick={() => setReferralSource(opt)} />
                         ))}
                     </div>
                 </div>
             );
          case 'theme':
              return (
                  <div className="text-center">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Choose your theme</h2>
                      <p className="text-gray-500 mb-8">Pick a color, any color.</p>
                      <div className="grid grid-cols-3 gap-4">
                          <ThemeOption color="#64748b" label="Neutral" value="Neutral" />
                          <ThemeOption color="#10b981" label="Emerald" value="Emerald" />
                          <ThemeOption color="#0ea5e9" label="Sky" value="Sky" />
                          <ThemeOption color="#f43f5e" label="Rose" value="Rose" />
                          <ThemeOption color="#f59e0b" label="Amber" value="Amber" />
                          <ThemeOption color="#8b5cf6" label="Amethyst" value="Amethyst" />
                      </div>
                  </div>
              );
          case 'ai':
             return (
                 <div className="text-center">
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Choose AI Engine</h2>
                     <div className="space-y-4">
                         <div 
                           onClick={() => setProvider('gemini')}
                           className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center text-left ${provider === 'gemini' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                         >
                             <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-lg mr-4">
                                 <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                             </div>
                             <div className="flex-1">
                                 <h3 className="font-bold text-gray-900 dark:text-white">Google Gemini (Cloud)</h3>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">Fastest. Voice Mode. Image Editing. Grounding.</p>
                             </div>
                             {provider === 'gemini' && <Check className="ml-auto w-5 h-5 text-indigo-500" />}
                         </div>

                         <div 
                           onClick={() => setProvider('ollama')}
                           className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col ${provider === 'ollama' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                         >
                             <div className="flex items-center text-left w-full">
                                <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-lg mr-4">
                                    <Laptop className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white">Ollama (Local)</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Private. Runs on device. Text Chat Only.</p>
                                </div>
                                {provider === 'ollama' && <Check className="ml-auto w-5 h-5 text-orange-500" />}
                             </div>
                             
                             {provider === 'ollama' && (
                                 <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-500/20 text-left">
                                     <p className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center mb-2">
                                         <AlertTriangle className="w-3 h-3 mr-1" /> Limitations
                                     </p>
                                     <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                         <li className="flex items-center"><X className="w-3 h-3 mr-1 text-red-400" /> No Voice Interview Mode</li>
                                         <li className="flex items-center"><X className="w-3 h-3 mr-1 text-red-400" /> No Image Analysis/Editing</li>
                                         <li className="flex items-center"><X className="w-3 h-3 mr-1 text-red-400" /> No Search Grounding</li>
                                     </ul>
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>
             );
          case 'local-setup':
             return (
                 <div className="text-center">
                      <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                         <Cpu className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                     </div>
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Local Setup Required</h2>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                         To allow the browser to talk to Ollama, you must enable CORS. Run this command in your terminal:
                     </p>
                     
                     <div className="bg-gray-900 text-gray-300 p-4 rounded-xl text-xs font-mono text-left mb-6 relative group">
                         <code>OLLAMA_ORIGINS="*" ollama serve</code>
                         <button 
                            onClick={() => navigator.clipboard.writeText('OLLAMA_ORIGINS="*" ollama serve')}
                            className="absolute top-2 right-2 p-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
                            title="Copy"
                         >
                             <Copy className="w-3 h-3 text-white" />
                         </button>
                     </div>

                     <div className="text-left">
                         <label className="text-xs font-bold uppercase text-gray-500">Ollama URL</label>
                         <input 
                            type="text" 
                            value={ollamaUrl}
                            onChange={(e) => setOllamaUrl(e.target.value)}
                            className="w-full mt-1 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm"
                         />
                     </div>
                 </div>
             );
          case 'features':
             return (
                 <div className="text-center space-y-6">
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white">You're all set!</h2>
                     <div className="grid grid-cols-2 gap-4">
                         <div className={`p-4 rounded-xl border ${provider === 'ollama' ? 'bg-gray-100 dark:bg-white/5 border-transparent opacity-50' : 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20'}`}>
                             {provider === 'ollama' ? <Ban className="w-8 h-8 text-gray-400 mx-auto mb-2" /> : <Mic className="w-8 h-8 text-indigo-500 mx-auto mb-2" />}
                             <p className="text-xs font-bold">Voice Interview</p>
                             {provider === 'ollama' && <p className="text-[10px] text-red-500 mt-1">Unavailable</p>}
                         </div>
                         <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                             <Plus className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
                             <p className="text-xs font-bold">Smart Synthesis</p>
                         </div>
                         <div className={`p-4 rounded-xl border ${provider === 'ollama' ? 'bg-gray-100 dark:bg-white/5 border-transparent opacity-50' : 'bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20'}`}>
                             {provider === 'ollama' ? <Ban className="w-8 h-8 text-gray-400 mx-auto mb-2" /> : <Image className="w-8 h-8 text-purple-500 mx-auto mb-2" />}
                             <p className="text-xs font-bold">Image Magic</p>
                             {provider === 'ollama' && <p className="text-[10px] text-red-500 mt-1">Unavailable</p>}
                         </div>
                          <div className={`p-4 rounded-xl border ${provider === 'ollama' ? 'bg-gray-100 dark:bg-white/5 border-transparent opacity-50' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20'}`}>
                             {provider === 'ollama' ? <Ban className="w-8 h-8 text-gray-400 mx-auto mb-2" /> : <Search className="w-8 h-8 text-blue-500 mx-auto mb-2" />}
                             <p className="text-xs font-bold">Web Grounding</p>
                             {provider === 'ollama' && <p className="text-[10px] text-red-500 mt-1">Unavailable</p>}
                         </div>
                     </div>
                 </div>
             );
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-0 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full md:max-w-md h-full md:h-auto md:rounded-3xl p-6 md:p-8 shadow-2xl border-0 md:border border-gray-200 dark:border-white/10 relative overflow-hidden flex flex-col">
         {/* Progress Bar */}
         <div className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }}></div>

         {/* Header */}
         <div className="flex justify-between items-center mb-4">
            {step > 0 && (
                <button onClick={handleBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
            )}
            <div className="flex-1"></div>
         </div>

         {/* Content */}
         <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="animate-in fade-in slide-in-from-right-4 duration-300" key={step}>
                {renderContent()}
            </div>
         </div>

         {/* Footer */}
         <div className="mt-6 flex justify-end pt-4 border-t border-gray-100 dark:border-white/5">
            <button 
                 onClick={handleNext}
                 disabled={step === 1 && !name.trim()}
                 className="w-full flex items-center justify-center px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
               >
                 {step === steps.length - 1 ? "Start Journaling" : "Continue"} 
                 {step === steps.length - 1 ? <Check className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
            </button>
         </div>
      </div>
    </div>
  );
};

export default Onboarding;
