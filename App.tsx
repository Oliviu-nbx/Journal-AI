import React, { useState, useEffect } from 'react';
import { ViewMode, JournalEntry, Goal, Task, UserStats, Badge, Persona, VoiceName, UserProfile, AIConfig, ThemeColor } from './types';
import LiveSession from './components/LiveSession';
import TextSession from './components/TextSession';
import InterviewSetup from './components/InterviewSetup';
import ComposeEntry from './components/ComposeEntry';
import Onboarding from './components/Onboarding';
import CalendarView from './components/CalendarView';
import MoodChart from './components/MoodChart';
import Settings from './components/Settings';
import { saveLocalData, loadLocalData, saveAudioBlob, getAudioBlob, setOnboardingComplete, setStorageMode } from './services/storage';
import { syncDataToDrive, uploadAudioToDrive, initGoogleDrive, signInToDrive, fetchDataFromDrive, downloadAudioFromDrive } from './services/googleDrive';
import { Mic, BookOpen, Volume2, Plus, Calendar, Target, CheckSquare, Square, Moon, Sun, ArrowLeft, Trophy, Flame, Zap, Award, Star, Lock, Grid, List, Settings as SettingsIcon, Cloud, HardDrive, Check, ArrowRight, Loader2, User } from 'lucide-react';
import { generateSpeech } from './services/ai';

// ... (DUMMY_ENTRIES, DUMMY_GOALS, DUMMY_TASKS, AVAILABLE_BADGES, INITIAL_STATS, DEFAULT_AI_CONFIG remain unchanged)
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
  }
];

const DUMMY_TASKS: Task[] = [
  {
    id: 't1',
    text: 'Email the design team',
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
  goalsCompleted: 0,
  tasksCompleted: 0,
  badges: [] 
};

const DEFAULT_AI_CONFIG: AIConfig = {
    provider: 'gemini',
};

const App: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>(ViewMode.LIST);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_STATS);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [theme, setTheme] = useState<ThemeColor>('Sky');

  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCloudPrompt, setShowCloudPrompt] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  
  // Interview Config State
  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const [liveAudioBlob, setLiveAudioBlob] = useState<Blob | undefined>(undefined);
  const [activePersona, setActivePersona] = useState<Persona>('Nice');
  const [activeVoice, setActiveVoice] = useState<VoiceName>('Puck');

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [xpNotification, setXpNotification] = useState<{amount: number, message: string} | null>(null);

  // ... (Effect hooks for Load Data, Save Data, Dark Mode, Profile Sync, Onboarding handling, Gamification logic, Streak logic - unchanged from previous version)
  useEffect(() => {
    const initApp = async () => {
        const localData = loadLocalData();
        const savedProfile = localStorage.getItem('reflectai_profile');
        if(savedProfile) {
            const parsedProfile = JSON.parse(savedProfile);
            setUserProfile(parsedProfile);
            if(parsedProfile.theme) setTheme(parsedProfile.theme);
        }
        const savedConfig = localStorage.getItem('reflectai_ai_config');
        if(savedConfig) setAiConfig(JSON.parse(savedConfig));

        if (localData.storageMode === 'cloud') {
             const clientId = localStorage.getItem('reflectai_gdrive_client_id');
             const apiKey = localStorage.getItem('reflectai_gdrive_api_key');
             if (clientId && apiKey) {
                 try {
                     await initGoogleDrive(clientId, apiKey);
                     await signInToDrive();
                     const cloudData = await fetchDataFromDrive();
                     if (cloudData) {
                         setEntries(cloudData.entries || []);
                         setGoals(cloudData.goals || []);
                         setTasks(cloudData.tasks || []);
                         setUserStats(cloudData.stats || INITIAL_STATS);
                         saveLocalData(cloudData.entries, cloudData.goals, cloudData.tasks, cloudData.stats || INITIAL_STATS);
                     } else {
                         setEntries(localData.entries || []);
                         setGoals(localData.goals || []);
                         setTasks(localData.tasks || []);
                         setUserStats(localData.stats || INITIAL_STATS);
                     }
                 } catch (e) {
                     setEntries(localData.entries || []);
                     setGoals(localData.goals || []);
                     setTasks(localData.tasks || []);
                     setUserStats(localData.stats || INITIAL_STATS);
                 }
             }
        } else {
            if (localData.entries) {
                setEntries(localData.entries);
                setGoals(localData.goals || []);
                setTasks(localData.tasks || []);
                setUserStats(localData.stats || INITIAL_STATS);
            } else {
                setEntries(DUMMY_ENTRIES);
                setGoals(DUMMY_GOALS);
                setTasks(DUMMY_TASKS);
                setUserStats(INITIAL_STATS);
                setShowOnboarding(true);
            }
        }

        if (!savedProfile || !localData.onboardingDone) {
            setShowOnboarding(true);
        } else if (localData.onboardingDone && !localStorage.getItem('reflectai_cloud_sync_enabled') && !localStorage.getItem('reflectai_cloud_prompt_dismissed')) {
             setShowCloudPrompt(true);
        }
        setAppLoading(false);
    };
    initApp();
  }, []);

  useEffect(() => {
    if (appLoading) return;
    if (entries.length > 0) {
      saveLocalData(entries, goals, tasks, userStats);
      const isCloudMode = localStorage.getItem('reflectai_storage_mode') === 'cloud';
      const isSyncEnabled = localStorage.getItem('reflectai_cloud_sync_enabled') === 'true';
      if (isCloudMode || isSyncEnabled) {
         syncDataToDrive({ entries, goals, tasks, stats: userStats });
      }
    }
  }, [entries, goals, tasks, userStats, appLoading]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);
  
  useEffect(() => {
      if(mode !== ViewMode.SETTINGS) {
         const savedProfile = localStorage.getItem('reflectai_profile');
         if(savedProfile) {
             const p = JSON.parse(savedProfile);
             setUserProfile(p);
             if(p.theme) setTheme(p.theme);
         }
      }
  }, [mode]);

  const handleOnboardingComplete = (profile: UserProfile, config: AIConfig) => {
      setUserProfile(profile);
      setAiConfig(config);
      if(profile.theme) setTheme(profile.theme);
      localStorage.setItem('reflectai_profile', JSON.stringify(profile));
      localStorage.setItem('reflectai_ai_config', JSON.stringify(config));
      setOnboardingComplete();
      setShowOnboarding(false);
      setShowCloudPrompt(true);
  };

  const handleUpdateConfig = (config: AIConfig) => {
      setAiConfig(config);
      localStorage.setItem('reflectai_ai_config', JSON.stringify(config));
  };

  const awardXP = (amount: number, message: string) => {
    setXpNotification({ amount, message });
    setTimeout(() => setXpNotification(null), 3000);
    setUserStats(prev => {
      const newXp = prev.xp + amount;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
      return { ...prev, xp: newXp, level: newLevel };
    });
    checkAchievements();
  };

  const checkAchievements = () => {
    setUserStats(prev => {
      const newBadges = [...prev.badges];
      const unlockedIds = new Set(newBadges.map(b => b.id));
      const tryUnlock = (badge: Badge, condition: boolean) => {
        if (!unlockedIds.has(badge.id) && condition) newBadges.push({ ...badge, unlockedAt: new Date().toISOString() });
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

  const handleSaveEntry = async (entry: JournalEntry, newGoals: Goal[], newTasks: Task[], completedGoalIds: string[], completedTaskIds: string[], audioBlob?: Blob) => {
    if (audioBlob) {
       const audioId = `audio-${entry.id}`;
       await saveAudioBlob(audioId, audioBlob);
       entry.audioId = audioId;
       const isCloudMode = localStorage.getItem('reflectai_storage_mode') === 'cloud';
       const isSyncEnabled = localStorage.getItem('reflectai_cloud_sync_enabled') === 'true';
       if (isCloudMode || isSyncEnabled) uploadAudioToDrive(audioId, audioBlob);
    }

    setEntries(prev => [entry, ...prev]);
    setGoals(prev => [...newGoals, ...prev]); 
    setTasks(prev => [...newTasks, ...prev]);
    
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
    setLiveAudioBlob(undefined);
    checkAchievements();
  };

  const handleSessionEnd = (transcript: string, audioBlob?: Blob) => {
    updateStreak();
    awardXP(30, "Session Completed");
    setLiveTranscript(transcript);
    setLiveAudioBlob(audioBlob);
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

  const handleReadAloud = async (text: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      const buffer = await generateSpeech(aiConfig, text);
      if (buffer) {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.onended = () => setIsPlayingAudio(false);
          source.start();
      } else {
          setTimeout(() => setIsPlayingAudio(false), 2000);
      }
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

  const playEntryRecording = async (audioId: string) => {
    if (isPlayingAudio) return;
    try {
        const isCloudMode = localStorage.getItem('reflectai_storage_mode') === 'cloud';
        let blob = await getAudioBlob(audioId);
        if (!blob && isCloudMode) {
             const clientId = localStorage.getItem('reflectai_gdrive_client_id');
             const apiKey = localStorage.getItem('reflectai_gdrive_api_key');
             if(clientId && apiKey) {
                 await initGoogleDrive(clientId, apiKey);
                 await signInToDrive();
                 blob = await downloadAudioFromDrive(audioId);
             }
        }
        if (blob) {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            setIsPlayingAudio(true);
            audio.play();
            audio.onended = () => setIsPlayingAudio(false);
        } else {
            alert("Audio recording not found locally or on drive.");
        }
    } catch (e) {
        console.error(e);
        alert("Error playing audio.");
    }
  };

  // Helper for mobile bottom nav active state
  const isActive = (v: ViewMode) => mode === v;

  if (appLoading) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <p className="text-gray-500 font-mono">Loading your journal...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-gray-50 dark:bg-slate-950 transition-colors duration-300 relative">
      
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px] animate-blob"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
          <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

      {/* Cloud Sync Modal */}
      {showCloudPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl border border-white/10 text-center animate-scale-in">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
                      <HardDrive className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-2">Storage Preference</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                      Choose where you want to keep your journal data. You can change this later in Settings.
                  </p>
                  
                  <div className="space-y-3">
                      <button 
                         onClick={() => { setShowCloudPrompt(false); setMode(ViewMode.SETTINGS); }}
                         className="w-full flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all group btn-press"
                      >
                          <div className="flex items-center text-left">
                              <div className="p-2.5 bg-blue-500 text-white rounded-xl mr-4 shadow-md shadow-blue-500/20">
                                  <Cloud className="w-5 h-5" />
                              </div>
                              <div>
                                  <span className="block font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Google Cloud</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Secure backup & sync</span>
                              </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </button>

                      <button 
                         onClick={() => { setShowCloudPrompt(false); setStorageMode('local'); localStorage.setItem('reflectai_cloud_prompt_dismissed', 'true'); }}
                         className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all group btn-press"
                      >
                          <div className="flex items-center text-left">
                              <div className="p-2.5 bg-gray-500 text-white rounded-xl mr-4 shadow-md">
                                  <HardDrive className="w-5 h-5" />
                              </div>
                              <div>
                                  <span className="block font-bold text-gray-900 dark:text-white">Device Only</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Local storage, private & offline</span>
                              </div>
                          </div>
                          <Check className="w-5 h-5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* XP Toast */}
      {xpNotification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
           <div className="bg-yellow-400/90 backdrop-blur-sm text-yellow-900 px-6 py-3 rounded-full font-bold shadow-lg shadow-yellow-400/20 flex items-center border border-yellow-500/30">
             <Zap className="w-5 h-5 mr-2 fill-current" />
             +{xpNotification.amount} XP: {xpNotification.message}
           </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="h-auto md:h-20 pt-safe px-4 md:px-8 flex items-center justify-between glass-panel z-20 sticky top-0 flex-shrink-0 transition-all duration-300">
        <div className="flex items-center w-full justify-between py-3">
           <div className="flex items-center">
              {mode !== ViewMode.LIST && mode !== ViewMode.CALENDAR && (
                  <button onClick={() => setMode(ViewMode.LIST)} className="mr-3 p-2 rounded-full bg-gray-100/50 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 backdrop-blur-md btn-press">
                    <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                  </button>
              )}
              
              {/* Profile / Greeting Mobile */}
              <div className="flex items-center" onClick={() => setMode(ViewMode.PROFILE)}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm mr-3 shadow-lg border-2 border-white/20">
                      {userProfile?.name.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col">
                      <span className="font-serif font-bold text-base tracking-tight text-gray-900 dark:text-white leading-none">
                        {mode === ViewMode.ENTRY_DETAIL ? 'Entry' : 'ReflectAI'}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-tight mt-0.5">Level {userStats.level}</span>
                  </div>
              </div>
           </div>

           <div className="flex items-center gap-3">
              {/* Streak Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 rounded-full border border-orange-500/20">
                 <Flame className={`w-4 h-4 ${userStats.currentStreak > 0 ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} />
                 <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{userStats.currentStreak}</span>
              </div>
              
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-full bg-gray-100/50 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all btn-press backdrop-blur-md"
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
           </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Desktop Sidebar (Hidden on Mobile) */}
        <aside className="hidden md:flex w-72 flex-col border-r border-gray-200 dark:border-white/5 glass-panel h-full z-20">
           <nav className="flex-1 p-6 space-y-2">
             <button onClick={() => setMode(ViewMode.LIST)} className={`w-full flex items-center p-4 rounded-2xl transition-all ${isActive(ViewMode.LIST) ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                <BookOpen className="w-5 h-5 mr-3" /> <span className="font-medium">Journal</span>
             </button>
             <button onClick={() => setMode(ViewMode.GOALS)} className={`w-full flex items-center p-4 rounded-2xl transition-all ${isActive(ViewMode.GOALS) ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                <Target className="w-5 h-5 mr-3" /> <span className="font-medium">Goals</span>
             </button>
             <button onClick={() => setMode(ViewMode.TASKS)} className={`w-full flex items-center p-4 rounded-2xl transition-all ${isActive(ViewMode.TASKS) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                <CheckSquare className="w-5 h-5 mr-3" /> <span className="font-medium">Tasks</span>
             </button>
             <button onClick={() => setMode(ViewMode.PROFILE)} className={`w-full flex items-center p-4 rounded-2xl transition-all ${isActive(ViewMode.PROFILE) ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                <Trophy className="w-5 h-5 mr-3" /> <span className="font-medium">Profile</span>
             </button>
             <button onClick={() => setMode(ViewMode.SETTINGS)} className={`w-full flex items-center p-4 rounded-2xl transition-all ${isActive(ViewMode.SETTINGS) ? 'bg-slate-700 text-white shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                <SettingsIcon className="w-5 h-5 mr-3" /> <span className="font-medium">Settings</span>
             </button>
           </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-32 md:pb-8 relative scroll-smooth no-scrollbar">
           
           {/* View Transitions Logic (Simplified) */}
           <div className="animate-slide-up w-full h-full max-w-5xl mx-auto">
               
               {mode === ViewMode.INTERVIEW_SETUP && (
                   <InterviewSetup onStart={startInterview} onCancel={() => setMode(ViewMode.LIST)} aiConfig={aiConfig} />
               )}

               {mode === ViewMode.SETTINGS && (
                   <Settings onBack={() => setMode(ViewMode.LIST)} currentConfig={aiConfig} onUpdateConfig={handleUpdateConfig} />
               )}

               {mode === ViewMode.LIVE_SESSION && (
                 <div className="h-full flex flex-col justify-center max-w-2xl mx-auto">
                   <LiveSession 
                     entries={entries} goals={goals} tasks={tasks} persona={activePersona} voiceName={activeVoice}
                     aiConfig={aiConfig} userProfile={userProfile} onSessionEnd={handleSessionEnd} onCancel={() => setMode(ViewMode.LIST)}
                   />
                 </div>
               )}

               {mode === ViewMode.TEXT_SESSION && (
                   <div className="h-full flex flex-col justify-center max-w-2xl mx-auto">
                     <TextSession
                       entries={entries} goals={goals} tasks={tasks} persona={activePersona} aiConfig={aiConfig}
                       userProfile={userProfile} onSessionEnd={handleSessionEnd} onCancel={() => setMode(ViewMode.LIST)}
                     />
                   </div>
               )}

               {mode === ViewMode.COMPOSE && (
                 <ComposeEntry 
                   initialTranscript={liveTranscript || ''} recordedAudio={liveAudioBlob} currentGoals={goals} currentTasks={tasks}
                   aiConfig={aiConfig} onSave={handleSaveEntry} onCancel={() => setMode(ViewMode.LIST)}
                 />
               )}

               {mode === ViewMode.PROFILE && (
                 <div className="max-w-2xl mx-auto">
                   <div className="glass-panel p-8 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/20 mb-6 text-center">
                         <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 mx-auto mb-4 flex items-center justify-center shadow-xl border-4 border-white/10 text-3xl text-white font-bold">
                             {userProfile?.name.charAt(0)}
                         </div>
                         <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white mb-1">{userProfile?.name}</h2>
                         <p className="text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-widest text-xs mb-6">Master Journaler</p>
                         
                         <div className="relative h-3 bg-gray-200 dark:bg-black/30 rounded-full overflow-hidden mb-2 max-w-xs mx-auto">
                            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" style={{ width: `${getXpProgress()}%` }}></div>
                         </div>
                         <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-xs mx-auto">
                            <span>{userStats.xp} XP</span>
                            <span>Level {userStats.level}</span>
                         </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center">
                            <BookOpen className="w-6 h-6 text-blue-500 mb-2" />
                            <span className="text-xl font-bold text-gray-900 dark:text-white">{userStats.totalEntries}</span>
                            <span className="text-[10px] uppercase text-gray-500 font-bold">Entries</span>
                        </div>
                        <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center">
                            <CheckSquare className="w-6 h-6 text-emerald-500 mb-2" />
                            <span className="text-xl font-bold text-gray-900 dark:text-white">{userStats.tasksCompleted}</span>
                            <span className="text-[10px] uppercase text-gray-500 font-bold">Tasks</span>
                        </div>
                   </div>

                   <div className="mb-8"><MoodChart entries={entries} /></div>

                   <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center"><Award className="w-5 h-5 mr-2" /> Badges</h3>
                   <div className="grid grid-cols-3 gap-3">
                     {AVAILABLE_BADGES.map(badge => {
                       const isUnlocked = userStats.badges.some(b => b.id === badge.id);
                       return (
                         <div key={badge.id} className={`glass-panel p-4 rounded-2xl flex flex-col items-center text-center transition-all ${isUnlocked ? 'border-indigo-500/30 bg-indigo-500/5' : 'opacity-40 grayscale'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${isUnlocked ? 'bg-gradient-to-br from-indigo-400 to-purple-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-white/10 text-gray-400'}`}>
                               {badge.icon === 'Flame' ? <Flame className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-[10px] leading-tight">{badge.name}</h4>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}

               {mode === ViewMode.GOALS && (
                 <div className="max-w-2xl mx-auto space-y-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white ml-2">Aspirations</h2>
                    {['Daily', 'Weekly', 'Monthly'].map((type) => {
                         const typeGoals = goals.filter(g => g.type === type);
                         const colors = type === 'Daily' ? 'border-blue-500/30 text-blue-500' : type === 'Weekly' ? 'border-green-500/30 text-green-500' : 'border-purple-500/30 text-purple-500';
                         return (
                           <div key={type} className={`glass-panel p-6 rounded-3xl border ${colors.split(' ')[0]} bg-gradient-to-br from-${colors.split(' ')[1]}/5 to-transparent`}>
                              <h3 className={`font-bold text-sm uppercase tracking-widest mb-4 flex items-center ${colors.split(' ')[1]}`}>
                                 <Target className="w-4 h-4 mr-2" /> {type} Goals
                              </h3>
                              <div className="space-y-3">
                                 {typeGoals.map(goal => (
                                    <div key={goal.id} className="flex items-start">
                                       <button onClick={handleManualCheckAttempt} className={`mt-1 mr-3 ${goal.isCompleted ? 'text-indigo-500' : 'text-gray-400'}`}>
                                          {goal.isCompleted ? <CheckSquare className="w-5 h-5"/> : <Lock className="w-4 h-4"/>}
                                       </button>
                                       <span className={`text-sm ${goal.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{goal.text}</span>
                                    </div>
                                 ))}
                                 {typeGoals.length === 0 && <p className="text-xs text-gray-400 italic">No active goals.</p>}
                              </div>
                           </div>
                         );
                    })}
                 </div>
               )}

               {mode === ViewMode.TASKS && (
                 <div className="max-w-2xl mx-auto space-y-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white ml-2">Action Items</h2>
                    {['Daily', 'Weekly', 'Monthly'].map((type) => {
                         const typeTasks = tasks.filter(t => t.type === type);
                         const colors = type === 'Daily' ? 'border-orange-500/30 text-orange-500' : type === 'Weekly' ? 'border-yellow-500/30 text-yellow-500' : 'border-lime-500/30 text-lime-500';
                         return (
                           <div key={type} className={`glass-panel p-6 rounded-3xl border ${colors.split(' ')[0]}`}>
                              <h3 className={`font-bold text-sm uppercase tracking-widest mb-4 flex items-center ${colors.split(' ')[1]}`}>
                                 <CheckSquare className="w-4 h-4 mr-2" /> {type} Tasks
                              </h3>
                              <div className="space-y-3">
                                 {typeTasks.map(task => (
                                    <div key={task.id} className="flex items-start">
                                       <button onClick={handleManualCheckAttempt} className={`mt-1 mr-3 ${task.isCompleted ? 'text-indigo-500' : 'text-gray-400'}`}>
                                          {task.isCompleted ? <CheckSquare className="w-5 h-5"/> : <Lock className="w-4 h-4"/>}
                                       </button>
                                       <span className={`text-sm ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{task.text}</span>
                                    </div>
                                 ))}
                                 {typeTasks.length === 0 && <p className="text-xs text-gray-400 italic">No active tasks.</p>}
                              </div>
                           </div>
                         );
                    })}
                 </div>
               )}

               {mode === ViewMode.CALENDAR && (
                 <div className="max-w-2xl mx-auto">
                   <div className="mb-6 flex justify-between items-center px-2">
                     <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">Timeline</h2>
                     <button onClick={() => setMode(ViewMode.LIST)} className="p-2 rounded-full bg-gray-100 dark:bg-white/5"><List className="w-5 h-5" /></button>
                   </div>
                   <CalendarView entries={entries} onSelectDate={(id) => { const entry = entries.find(e => e.id === id); if(entry) { setCurrentEntry(entry); setMode(ViewMode.ENTRY_DETAIL); } }} />
                 </div>
               )}

               {mode === ViewMode.LIST && (
                 <div className="max-w-2xl mx-auto">
                   <div className="mb-6 flex justify-between items-center px-2">
                     <div>
                       <h2 className="text-xl font-bold text-gray-900 dark:text-white font-serif">{getGreeting()}</h2>
                       <p className="text-gray-500 dark:text-gray-400 text-sm">Ready to reflect?</p>
                     </div>
                     <button onClick={() => setMode(ViewMode.CALENDAR)} className="p-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 btn-press transition-all"><Calendar className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
                   </div>

                   {/* Main Actions Grid */}
                   <div className="grid grid-cols-2 gap-3 mb-8">
                      <button 
                        onClick={() => setMode(ViewMode.INTERVIEW_SETUP)}
                        className="p-6 rounded-[2rem] bg-gradient-to-bl from-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-600/30 flex flex-col justify-between h-40 btn-press relative overflow-hidden"
                      >
                         <div className="absolute top-0 right-0 p-4 opacity-20"><Mic className="w-16 h-16" /></div>
                         <div className="p-2 bg-white/20 w-fit rounded-full backdrop-blur-md"><Mic className="w-5 h-5" /></div>
                         <div>
                            <span className="block font-bold text-lg">Interview</span>
                            <span className="text-xs opacity-80">Talk to AI Companion</span>
                         </div>
                      </button>
                      
                      <button 
                        onClick={() => { setLiveTranscript(null); setLiveAudioBlob(undefined); setMode(ViewMode.COMPOSE); }}
                        className="p-6 rounded-[2rem] glass-panel border-white/20 dark:border-white/10 flex flex-col justify-between h-40 btn-press relative overflow-hidden"
                      >
                         <div className="absolute top-0 right-0 p-4 opacity-5"><BookOpen className="w-16 h-16" /></div>
                         <div className="p-2 bg-gray-900/5 dark:bg-white/10 w-fit rounded-full backdrop-blur-md text-gray-900 dark:text-white"><Plus className="w-5 h-5" /></div>
                         <div>
                            <span className="block font-bold text-lg text-gray-900 dark:text-white">Write</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Manual Entry</span>
                         </div>
                      </button>
                   </div>

                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">Recent Entries</h3>
                   <div className="space-y-4 pb-20">
                     {entries.length === 0 && (
                       <div className="text-center py-10 opacity-50">
                          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-gray-500">No entries yet.</p>
                       </div>
                     )}
                     {entries.map((entry, i) => (
                       <div 
                          key={entry.id}
                          onClick={() => { setCurrentEntry(entry); setMode(ViewMode.ENTRY_DETAIL); }}
                          className="glass-panel rounded-3xl p-5 cursor-pointer active:scale-[0.98] transition-all border border-white/40 dark:border-white/5 animate-slide-up"
                          style={{ animationDelay: `${i * 0.05}s` }}
                       >
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(entry.date).toLocaleDateString()}</span>
                            {entry.mood && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">{entry.mood}</span>}
                         </div>
                         <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight">{entry.title}</h3>
                         <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed opacity-90">{entry.content}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {mode === ViewMode.ENTRY_DETAIL && currentEntry && (
                 <div className="max-w-2xl mx-auto glass-panel rounded-t-[2.5rem] min-h-screen border-t border-white/20 dark:border-white/5 shadow-2xl animate-slide-up -mt-4 pt-8 pb-32">
                   <div className="px-6 md:px-10">
                      <div className="flex justify-between items-center mb-6">
                         <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{new Date(currentEntry.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                         <div className="flex gap-2">
                           {currentEntry.audioId && (
                              <button onClick={() => playEntryRecording(currentEntry.audioId!)} className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                 <Mic className="w-4 h-4" />
                              </button>
                           )}
                           <button onClick={() => handleReadAloud(currentEntry.content)} className={`p-2.5 rounded-full ${isPlayingAudio ? 'bg-indigo-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-white/10'}`}>
                             <Volume2 className="w-4 h-4" />
                           </button>
                         </div>
                      </div>
                      
                      <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white mb-6 leading-tight">{currentEntry.title}</h1>
                      
                      {currentEntry.imageUrl && (
                        <div className="rounded-2xl overflow-hidden mb-8 shadow-lg">
                          <img src={currentEntry.imageUrl} alt="Entry" className="w-full h-auto object-cover" />
                        </div>
                      )}

                      <div className="prose prose-indigo dark:prose-invert max-w-none font-serif text-base leading-loose opacity-90">
                        {currentEntry.content}
                      </div>
                   </div>
                 </div>
               )}
           </div>
        </main>
      </div>

      {/* Modern Floating Dock Navigation */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-full shadow-2xl flex justify-between items-center px-2 z-50">
        <button onClick={() => setMode(ViewMode.LIST)} className={`flex-1 flex flex-col items-center justify-center h-full rounded-full transition-all ${isActive(ViewMode.LIST) || isActive(ViewMode.COMPOSE) || isActive(ViewMode.ENTRY_DETAIL) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
          <div className={`p-1.5 rounded-full transition-all ${isActive(ViewMode.LIST) || isActive(ViewMode.COMPOSE) || isActive(ViewMode.ENTRY_DETAIL) ? 'bg-indigo-100 dark:bg-indigo-500/20 transform -translate-y-1' : ''}`}>
             <BookOpen className="w-5 h-5" />
          </div>
        </button>
        <button onClick={() => setMode(ViewMode.GOALS)} className={`flex-1 flex flex-col items-center justify-center h-full rounded-full transition-all ${isActive(ViewMode.GOALS) ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-400'}`}>
           <div className={`p-1.5 rounded-full transition-all ${isActive(ViewMode.GOALS) ? 'bg-cyan-100 dark:bg-cyan-500/20 transform -translate-y-1' : ''}`}>
             <Target className="w-5 h-5" />
           </div>
        </button>
        
        {/* Center Action Button (Floating) */}
        <div className="relative -top-6">
           <button 
             onClick={() => setMode(ViewMode.INTERVIEW_SETUP)}
             className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/40 flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all border-4 border-gray-50 dark:border-slate-950"
           >
              <Mic className="w-6 h-6" />
           </button>
        </div>

        <button onClick={() => setMode(ViewMode.TASKS)} className={`flex-1 flex flex-col items-center justify-center h-full rounded-full transition-all ${isActive(ViewMode.TASKS) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
           <div className={`p-1.5 rounded-full transition-all ${isActive(ViewMode.TASKS) ? 'bg-emerald-100 dark:bg-emerald-500/20 transform -translate-y-1' : ''}`}>
             <CheckSquare className="w-5 h-5" />
           </div>
        </button>
        <button onClick={() => setMode(ViewMode.SETTINGS)} className={`flex-1 flex flex-col items-center justify-center h-full rounded-full transition-all ${isActive(ViewMode.SETTINGS) ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
           <div className={`p-1.5 rounded-full transition-all ${isActive(ViewMode.SETTINGS) ? 'bg-gray-100 dark:bg-white/10 transform -translate-y-1' : ''}`}>
             <SettingsIcon className="w-5 h-5" />
           </div>
        </button>
      </nav>
    </div>
  );
};

export default App;