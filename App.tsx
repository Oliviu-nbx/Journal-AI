
import React, { useState, useEffect } from 'react';
import { ViewMode, JournalEntry, Goal, Task, UserStats, Badge, Persona, VoiceName } from './types';
import LiveSession from './components/LiveSession';
import TextSession from './components/TextSession';
import InterviewSetup from './components/InterviewSetup';
import ComposeEntry from './components/ComposeEntry';
import { Mic, BookOpen, Volume2, Plus, Calendar, Target, CheckSquare, Square, Moon, Sun, ArrowLeft, Trophy, Flame, Zap, Award, Star, Lock } from 'lucide-react';
import { generateSpeech } from './services/gemini';

// Initial dummy data
const DUMMY_ENTRIES: JournalEntry[] = [
  {
    id: '1',
    date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    title: 'New Beginnings',
    content: 'Today I started the new project. It feels daunting but exciting. I talked to the team about the architecture. I am worried I might procrastinate on the documentation part like I usually do.',
    summary: 'Project kickoff reflection. Worried about procrastination.',
    tags: ['work', 'reflection', 'anxiety'],
    mood: 'Excited'
  }
];

const DUMMY_GOALS: Goal[] = [
  {
    id: 'g1',
    text: 'Finish the API documentation',
    type: 'Weekly',
    isCompleted: false,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'g2',
    text: 'Drink 2L of water',
    type: 'Daily',
    isCompleted: true,
    createdAt: new Date().toISOString()
  }
];

const DUMMY_TASKS: Task[] = [
  {
    id: 't1',
    text: 'Email the design team',
    type: 'Daily',
    isCompleted: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 't2',
    text: 'Review pull requests',
    type: 'Daily',
    isCompleted: false,
    createdAt: new Date().toISOString()
  }
];

const AVAILABLE_BADGES: Badge[] = [
  { id: 'b1', name: 'First Ink', description: 'Create your first journal entry', icon: 'PenTool' },
  { id: 'b2', name: 'Task Master', description: 'Complete 5 tasks', icon: 'CheckCircle' },
  { id: 'b3', name: 'Goal Crusher', description: 'Complete 3 goals', icon: 'Target' },
  { id: 'b4', name: 'Streak Starter', description: 'Achieve a 3-day streak', icon: 'Flame' },
  { id: 'b5', name: 'Voice of Reason', description: 'Complete 3 voice sessions', icon: 'Mic' }
];

const INITIAL_STATS: UserStats = {
  xp: 120,
  level: 1,
  currentStreak: 1,
  lastActiveDate: new Date().toISOString(),
  totalEntries: 1,
  goalsCompleted: 1,
  tasksCompleted: 0,
  badges: [] // Start with no badges unlocked for demo logic
};

const App: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>(ViewMode.LIST);
  const [entries, setEntries] = useState<JournalEntry[]>(DUMMY_ENTRIES);
  const [goals, setGoals] = useState<Goal[]>(DUMMY_GOALS);
  const [tasks, setTasks] = useState<Task[]>(DUMMY_TASKS);
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_STATS);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  
  // Interview Config State
  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<Persona>('Nice');
  const [activeVoice, setActiveVoice] = useState<VoiceName>('Puck');

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [xpNotification, setXpNotification] = useState<{amount: number, message: string} | null>(null);

  // Initialize Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Gamification Logic
  const awardXP = (amount: number, message: string) => {
    setXpNotification({ amount, message });
    setTimeout(() => setXpNotification(null), 3000);

    setUserStats(prev => {
      const newXp = prev.xp + amount;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1; // Simple progression curve
      return { ...prev, xp: newXp, level: newLevel };
    });
    
    checkAchievements();
  };

  const checkAchievements = () => {
    setUserStats(prev => {
      const newBadges = [...prev.badges];
      const unlockedIds = new Set(newBadges.map(b => b.id));

      const tryUnlock = (badge: Badge, condition: boolean) => {
        if (!unlockedIds.has(badge.id) && condition) {
          newBadges.push({ ...badge, unlockedAt: new Date().toISOString() });
          // Could trigger a badge popup here
        }
      };

      tryUnlock(AVAILABLE_BADGES[0], prev.totalEntries >= 1);
      tryUnlock(AVAILABLE_BADGES[1], prev.tasksCompleted >= 5);
      tryUnlock(AVAILABLE_BADGES[2], prev.goalsCompleted >= 3);
      tryUnlock(AVAILABLE_BADGES[3], prev.currentStreak >= 3);

      return { ...prev, badges: newBadges };
    });
  };

  const updateStreak = () => {
    const today = new Date().toDateString();
    const lastActive = new Date(userStats.lastActiveDate).toDateString();
    
    if (today !== lastActive) {
      const diffTime = Math.abs(new Date(today).getTime() - new Date(lastActive).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      setUserStats(prev => ({
        ...prev,
        lastActiveDate: new Date().toISOString(),
        currentStreak: diffDays === 1 ? prev.currentStreak + 1 : 1
      }));
    }
  };

  // Handle saving a new entry and processing completion
  const handleSaveEntry = (entry: JournalEntry, newGoals: Goal[], newTasks: Task[], completedGoalIds: string[], completedTaskIds: string[]) => {
    setEntries([entry, ...entries]);
    setGoals([...newGoals, ...goals]); 
    setTasks([...newTasks, ...tasks]);
    
    // Process Completions
    let completedGCount = 0;
    let completedTCount = 0;

    if (completedGoalIds.length > 0) {
        setGoals(prev => prev.map(g => {
            if (completedGoalIds.includes(g.id) && !g.isCompleted) {
                completedGCount++;
                return { ...g, isCompleted: true };
            }
            return g;
        }));
    }

    if (completedTaskIds.length > 0) {
        setTasks(prev => prev.map(t => {
            if (completedTaskIds.includes(t.id) && !t.isCompleted) {
                completedTCount++;
                return { ...t, isCompleted: true };
            }
            return t;
        }));
    }

    // Award XP
    updateStreak();
    setUserStats(prev => ({ 
        ...prev, 
        totalEntries: prev.totalEntries + 1,
        goalsCompleted: prev.goalsCompleted + completedGCount,
        tasksCompleted: prev.tasksCompleted + completedTCount
    }));

    if (completedGCount > 0) awardXP(50 * completedGCount, `${completedGCount} Goal(s) Achieved!`);
    if (completedTCount > 0) awardXP(20 * completedTCount, `${completedTCount} Task(s) Completed!`);
    awardXP(50, "Journal Entry Saved");
    
    setMode(ViewMode.LIST);
    setLiveTranscript(null);
    checkAchievements();
  };

  // Handle ending a live/chat session
  const handleSessionEnd = (transcript: string) => {
    updateStreak();
    awardXP(30, "Session Completed");
    setLiveTranscript(transcript);
    setMode(ViewMode.COMPOSE);
  };

  const startInterview = (modeType: 'TEXT' | 'VOICE', persona: Persona, voice: VoiceName) => {
      setActivePersona(persona);
      setActiveVoice(voice);
      if (modeType === 'VOICE') setMode(ViewMode.LIVE_SESSION);
      else setMode(ViewMode.TEXT_SESSION);
  };

  const handleManualCheckAttempt = () => {
      alert("Completions are managed by your AI Companion based on your conversations. Start an interview to update your progress!");
  };

  // Handle TTS
  const handleReadAloud = async (text: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      const buffer = await generateSpeech(text);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlayingAudio(false);
      source.start();
    } catch (e) {
      console.error(e);
      setIsPlayingAudio(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getXpProgress = () => {
    const currentLevelBaseXp = Math.pow(userStats.level - 1, 2) * 100;
    const nextLevelBaseXp = Math.pow(userStats.level, 2) * 100;
    const progress = ((userStats.xp - currentLevelBaseXp) / (nextLevelBaseXp - currentLevelBaseXp)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* XP Notification Toast */}
      {xpNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
           <div className="bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full font-bold shadow-lg shadow-yellow-400/20 flex items-center">
             <Zap className="w-5 h-5 mr-2 fill-current" />
             +{xpNotification.amount} XP: {xpNotification.message}
           </div>
        </div>
      )}

      {/* Top Bar (Mobile & Desktop) */}
      <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-gray-200 dark:border-white/10 glass-panel z-20 sticky top-0 flex-shrink-0">
        <div className="flex items-center">
           {mode !== ViewMode.LIST ? (
              <button onClick={() => setMode(ViewMode.LIST)} className="mr-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10">
                 <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              </button>
           ) : (
              <div className="bg-gradient-to-br from-indigo-500 to-cyan-500 p-2 rounded-lg mr-3 shadow-lg shadow-indigo-500/20 hidden md:block">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
           )}
           <span className="font-serif font-bold text-lg md:text-xl tracking-tight text-gray-900 dark:text-white mr-4">
             {mode === ViewMode.ENTRY_DETAIL ? 'Entry' : 'ReflectAI'}
           </span>

           {/* GAMIFICATION HUD */}
           <div 
             className="flex items-center gap-3 bg-gray-100 dark:bg-white/5 rounded-full px-3 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
             onClick={() => setMode(ViewMode.PROFILE)}
           >
              {/* Level */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                 <svg className="w-full h-full -rotate-90">
                    <circle cx="16" cy="16" r="14" className="stroke-gray-300 dark:stroke-white/10 fill-none" strokeWidth="3" />
                    <circle 
                      cx="16" cy="16" r="14" 
                      className="stroke-indigo-500 fill-none transition-all duration-1000 ease-out" 
                      strokeWidth="3" 
                      strokeDasharray="88" 
                      strokeDashoffset={88 - (88 * getXpProgress() / 100)} 
                      strokeLinecap="round"
                    />
                 </svg>
                 <span className="absolute text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{userStats.level}</span>
              </div>
              
              {/* Streak */}
              <div className="flex items-center gap-1">
                 <Flame className={`w-4 h-4 ${userStats.currentStreak > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} />
                 <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{userStats.currentStreak}</span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={() => setDarkMode(!darkMode)}
             className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
           >
             {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
           </button>
           
           {/* Desktop Actions */}
           <div className="hidden md:flex gap-3">
              {mode === ViewMode.LIST && (
                <>
                  <button 
                    onClick={() => setMode(ViewMode.INTERVIEW_SETUP)}
                    className="flex items-center px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full hover:opacity-90 transition-all shadow-lg font-medium text-sm"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Interview
                  </button>
                  <button 
                    onClick={() => { setLiveTranscript(null); setMode(ViewMode.COMPOSE); }}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 font-medium text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Entry
                  </button>
                </>
              )}
           </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-gray-200 dark:border-white/5 glass-panel h-full">
           <nav className="flex-1 p-4 space-y-2">
             <button 
                onClick={() => setMode(ViewMode.LIST)}
                className={`w-full flex items-center p-3 rounded-xl transition-all ${mode === ViewMode.LIST || mode === ViewMode.ENTRY_DETAIL || mode === ViewMode.COMPOSE ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-500/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
             >
                <Calendar className="w-5 h-5 mr-3" />
                <span className="font-medium">Journal</span>
             </button>
             <button 
                onClick={() => setMode(ViewMode.GOALS)}
                className={`w-full flex items-center p-3 rounded-xl transition-all ${mode === ViewMode.GOALS ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 ring-1 ring-cyan-500/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
             >
                <Target className="w-5 h-5 mr-3" />
                <span className="font-medium">Goals</span>
             </button>
             <button 
                onClick={() => setMode(ViewMode.TASKS)}
                className={`w-full flex items-center p-3 rounded-xl transition-all ${mode === ViewMode.TASKS ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
             >
                <CheckSquare className="w-5 h-5 mr-3" />
                <span className="font-medium">Task List</span>
             </button>
             <button 
                onClick={() => setMode(ViewMode.PROFILE)}
                className={`w-full flex items-center p-3 rounded-xl transition-all ${mode === ViewMode.PROFILE ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
             >
                <Trophy className="w-5 h-5 mr-3" />
                <span className="font-medium">Profile</span>
             </button>
           </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8 relative scroll-smooth">
           {/* Background Decoration */}
           <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/5 to-transparent dark:from-indigo-500/10 pointer-events-none -z-10" />

           {/* Dynamic Views */}
           {mode === ViewMode.INTERVIEW_SETUP && (
               <InterviewSetup onStart={startInterview} onCancel={() => setMode(ViewMode.LIST)} />
           )}

           {mode === ViewMode.LIVE_SESSION && (
             <div className="h-full flex flex-col justify-center max-w-2xl mx-auto">
               <LiveSession 
                 entries={entries}
                 goals={goals}
                 tasks={tasks}
                 persona={activePersona}
                 voiceName={activeVoice}
                 onSessionEnd={handleSessionEnd}
                 onCancel={() => setMode(ViewMode.LIST)}
               />
             </div>
           )}

           {mode === ViewMode.TEXT_SESSION && (
               <div className="h-full flex flex-col justify-center max-w-2xl mx-auto">
                 <TextSession
                   entries={entries}
                   goals={goals}
                   tasks={tasks}
                   persona={activePersona}
                   onSessionEnd={handleSessionEnd}
                   onCancel={() => setMode(ViewMode.LIST)}
                 />
               </div>
           )}

           {mode === ViewMode.COMPOSE && (
             <ComposeEntry 
               initialTranscript={liveTranscript || ''}
               currentGoals={goals}
               currentTasks={tasks}
               onSave={handleSaveEntry}
               onCancel={() => setMode(ViewMode.LIST)}
             />
           )}

           {mode === ViewMode.PROFILE && (
             <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Hero Card */}
                  <div className="md:col-span-2 glass-panel p-8 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                     <div className="flex items-center justify-between mb-6">
                       <div>
                         <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">Level {userStats.level}</h2>
                         <p className="text-gray-500 dark:text-gray-400">Master Journaler</p>
                       </div>
                       <Trophy className="w-16 h-16 text-yellow-500 drop-shadow-lg" />
                     </div>
                     
                     <div className="relative h-4 bg-gray-200 dark:bg-black/20 rounded-full overflow-hidden mb-2">
                        <div 
                           className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                           style={{ width: `${getXpProgress()}%` }}
                        ></div>
                     </div>
                     <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        <span>{userStats.xp} XP</span>
                        <span>{Math.pow(userStats.level, 2) * 100} XP Next</span>
                     </div>
                  </div>

                  {/* Streak Card */}
                  <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
                     <Flame className="w-16 h-16 text-orange-500 fill-orange-500 animate-pulse mb-4" />
                     <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{userStats.currentStreak}</h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Day Streak</p>
                  </div>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Entries', value: userStats.totalEntries, icon: BookOpen, color: 'text-blue-500' },
                    { label: 'Tasks', value: userStats.tasksCompleted, icon: CheckSquare, color: 'text-green-500' },
                    { label: 'Goals', value: userStats.goalsCompleted, icon: Target, color: 'text-purple-500' },
                    { label: 'Badges', value: userStats.badges.length, icon: Award, color: 'text-yellow-500' },
                  ].map((stat, i) => (
                    <div key={i} className="glass-panel p-4 rounded-2xl flex items-center space-x-4">
                       <div className={`p-3 rounded-xl bg-gray-100 dark:bg-white/5 ${stat.color}`}>
                          <stat.icon className="w-6 h-6" />
                       </div>
                       <div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">{stat.label}</p>
                       </div>
                    </div>
                  ))}
               </div>

               {/* Badges Section */}
               <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                 <Award className="w-5 h-5 mr-2" /> Achievements
               </h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {AVAILABLE_BADGES.map(badge => {
                   const isUnlocked = userStats.badges.some(b => b.id === badge.id);
                   return (
                     <div key={badge.id} className={`glass-panel p-6 rounded-2xl flex flex-col items-center text-center transition-all ${isUnlocked ? 'border-indigo-500/30 bg-indigo-500/5' : 'opacity-50 grayscale'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isUnlocked ? 'bg-gradient-to-br from-indigo-400 to-purple-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-white/10 text-gray-400'}`}>
                           {badge.icon === 'Flame' ? <Flame className="w-6 h-6" /> : 
                            badge.icon === 'Target' ? <Target className="w-6 h-6" /> :
                            badge.icon === 'CheckCircle' ? <CheckSquare className="w-6 h-6" /> :
                            badge.icon === 'Mic' ? <Mic className="w-6 h-6" /> :
                            <Star className="w-6 h-6" />}
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{badge.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{badge.description}</p>
                        {isUnlocked && <span className="mt-3 text-[10px] font-bold text-indigo-500 uppercase">Unlocked</span>}
                     </div>
                   );
                 })}
               </div>
             </div>
           )}

           {mode === ViewMode.GOALS && (
             <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold mb-6 text-gray-900 dark:text-white">Your Aspirations</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {['Daily', 'Weekly', 'Monthly'].map((type) => {
                     const typeGoals = goals.filter(g => g.type === type);
                     const colorClass = type === 'Daily' ? 'blue' : type === 'Weekly' ? 'green' : 'purple';
                     const borderColor = type === 'Daily' ? 'border-blue-500/30' : type === 'Weekly' ? 'border-green-500/30' : 'border-purple-500/30';
                     const bgGradient = type === 'Daily' ? 'from-blue-500/5' : type === 'Weekly' ? 'from-green-500/5' : 'from-purple-500/5';
                     
                     return (
                       <div key={type} className={`glass-panel p-6 rounded-2xl border ${borderColor} bg-gradient-to-b ${bgGradient} to-transparent`}>
                          <h3 className={`font-bold text-lg mb-4 flex items-center text-${colorClass}-600 dark:text-${colorClass}-400`}>
                             <span className={`w-2 h-2 bg-${colorClass}-500 rounded-full mr-2 shadow-[0_0_10px_currentColor]`}></span> {type} Goals
                          </h3>
                          <div className="space-y-3">
                             {typeGoals.map(goal => (
                                <div key={goal.id} className="flex items-start group">
                                   <button 
                                      onClick={handleManualCheckAttempt}
                                      className={`mt-1 mr-3 transition-colors ${goal.isCompleted ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-600 hover:text-red-500'}`}
                                   >
                                      {goal.isCompleted ? <CheckSquare className="w-5 h-5"/> : <Lock className="w-4 h-4"/>}
                                   </button>
                                   <span className={`text-sm md:text-base transition-all ${goal.isCompleted ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'}`}>{goal.text}</span>
                                </div>
                             ))}
                             {typeGoals.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-600 italic">No goals yet.</p>}
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>
           )}

           {mode === ViewMode.TASKS && (
             <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold mb-6 text-gray-900 dark:text-white">Actionable Tasks</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {['Daily', 'Weekly', 'Monthly'].map((type) => {
                     const typeTasks = tasks.filter(t => t.type === type);
                     const colorClass = type === 'Daily' ? 'orange' : type === 'Weekly' ? 'yellow' : 'lime';
                     const borderClass = type === 'Daily' ? 'border-orange-500/30' : type === 'Weekly' ? 'border-yellow-500/30' : 'border-lime-500/30';
                     const bgClass = type === 'Daily' ? 'from-orange-500/5' : type === 'Weekly' ? 'from-yellow-500/5' : 'from-lime-500/5';
                     const textClass = type === 'Daily' ? 'text-orange-600 dark:text-orange-400' : type === 'Weekly' ? 'text-yellow-600 dark:text-yellow-400' : 'text-lime-600 dark:text-lime-400';
                     const dotClass = type === 'Daily' ? 'bg-orange-500' : type === 'Weekly' ? 'bg-yellow-500' : 'bg-lime-500';

                     return (
                       <div key={type} className={`glass-panel p-6 rounded-2xl border ${borderClass} bg-gradient-to-b ${bgClass} to-transparent`}>
                          <h3 className={`font-bold text-lg mb-4 flex items-center ${textClass}`}>
                             <span className={`w-2 h-2 ${dotClass} rounded-full mr-2 shadow-[0_0_10px_currentColor]`}></span> {type} Tasks
                          </h3>
                          <div className="space-y-3">
                             {typeTasks.map(task => (
                                <div key={task.id} className="flex items-start group">
                                   <button 
                                      onClick={handleManualCheckAttempt}
                                      className={`mt-1 mr-3 transition-colors ${task.isCompleted ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-600 hover:text-red-500'}`}
                                   >
                                      {task.isCompleted ? <CheckSquare className="w-5 h-5"/> : <Lock className="w-4 h-4"/>}
                                   </button>
                                   <span className={`text-sm md:text-base transition-all ${task.isCompleted ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'}`}>{task.text}</span>
                                </div>
                             ))}
                             {typeTasks.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-600 italic">No tasks yet.</p>}
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>
           )}

           {mode === ViewMode.LIST && (
             <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
               <div className="mb-8">
                 <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">{getGreeting()}, User.</h2>
                 <p className="text-gray-500 dark:text-gray-400 mt-1">Ready to reflect on your journey?</p>
               </div>

               {/* Mobile Action Buttons */}
               <div className="flex md:hidden gap-3 mb-8">
                  <button 
                    onClick={() => setMode(ViewMode.INTERVIEW_SETUP)}
                    className="flex-1 flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                  >
                    <Mic className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold uppercase tracking-wide">Interview</span>
                  </button>
                  <button 
                    onClick={() => { setLiveTranscript(null); setMode(ViewMode.COMPOSE); }}
                    className="flex-1 flex flex-col items-center justify-center p-4 rounded-2xl glass-panel border border-indigo-500/30 text-indigo-600 dark:text-indigo-300"
                  >
                    <Plus className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold uppercase tracking-wide">Write</span>
                  </button>
               </div>

               <div className="space-y-6">
                 {entries.map(entry => (
                   <div 
                      key={entry.id}
                      onClick={() => { setCurrentEntry(entry); setMode(ViewMode.ENTRY_DETAIL); }}
                      className="glass-panel rounded-2xl p-6 cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 transition-all group border border-transparent hover:border-indigo-500/20"
                   >
                     <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">{entry.title}</h3>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">{new Date(entry.date).toLocaleDateString()}</p>
                        </div>
                        {entry.mood && (
                          <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-500/20">{entry.mood}</span>
                        )}
                     </div>
                     
                     <p className="text-gray-600 dark:text-gray-300 line-clamp-3 font-serif leading-relaxed text-sm md:text-base">
                       {entry.content}
                     </p>

                     <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        {entry.tags.map(tag => (
                          <span key={tag} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">#{tag}</span>
                        ))}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {mode === ViewMode.ENTRY_DETAIL && currentEntry && (
             <div className="max-w-2xl mx-auto glass-panel rounded-3xl overflow-hidden border border-white/20 dark:border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
               <div className="p-6 md:p-10">
                  <div className="flex justify-between items-center mb-6">
                     <span className="text-sm font-mono text-indigo-500 dark:text-indigo-400">{new Date(currentEntry.date).toLocaleDateString()}</span>
                     <button 
                        onClick={() => handleReadAloud(currentEntry.content)}
                        className={`p-2 rounded-full transition-all ${isPlayingAudio ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}
                     >
                       <Volume2 className="w-5 h-5" />
                     </button>
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-white mb-8 leading-tight">{currentEntry.title}</h1>
                  
                  {currentEntry.imageUrl && (
                    <div className="rounded-2xl overflow-hidden mb-8 shadow-lg ring-1 ring-white/10">
                      <img src={currentEntry.imageUrl} alt="Entry" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  <div className="prose prose-lg prose-indigo dark:prose-invert max-w-none font-serif leading-loose">
                    {currentEntry.content}
                  </div>

                  {currentEntry.groundingData && currentEntry.groundingData.length > 0 && (
                     <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/10">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Sources</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {currentEntry.groundingData.map((g, i) => (
                             <a key={i} href={g.webUrl || g.mapUrl} target="_blank" rel="noreferrer" className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors group">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full mr-3 group-hover:scale-125 transition-transform" />
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{g.title || g.webUrl || g.mapUrl}</span>
                             </a>
                          ))}
                        </div>
                     </div>
                  )}
               </div>
             </div>
           )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-white/5 flex justify-around items-center px-2 z-30 fixed bottom-0 w-full pb-safe">
        <button 
          onClick={() => setMode(ViewMode.LIST)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${mode === ViewMode.LIST || mode === ViewMode.ENTRY_DETAIL || mode === ViewMode.COMPOSE || mode === ViewMode.LIVE_SESSION ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-medium">Journal</span>
        </button>
        <button 
          onClick={() => setMode(ViewMode.GOALS)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${mode === ViewMode.GOALS ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-400 dark:text-gray-500'}`}
        >
          <Target className="w-6 h-6" />
          <span className="text-[10px] font-medium">Goals</span>
        </button>
        <button 
          onClick={() => setMode(ViewMode.TASKS)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${mode === ViewMode.TASKS ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}
        >
          <CheckSquare className="w-6 h-6" />
          <span className="text-[10px] font-medium">Tasks</span>
        </button>
        <button 
          onClick={() => setMode(ViewMode.PROFILE)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${mode === ViewMode.PROFILE ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}
        >
          <Trophy className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
