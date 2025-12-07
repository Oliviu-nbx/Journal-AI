import React, { useEffect, useRef, useState } from 'react';
import { connectLiveSession } from '../services/ai';
import { JournalEntry, Persona, VoiceName, Goal, Task, AIConfig, UserProfile } from '../types';
import { X, MicOff, PhoneOff } from 'lucide-react';

interface LiveSessionProps {
  entries: JournalEntry[]; 
  goals: Goal[];
  tasks: Task[];
  persona: Persona;
  voiceName: VoiceName;
  aiConfig: AIConfig;
  userProfile: UserProfile | null;
  onSessionEnd: (transcript: string, audioBlob?: Blob) => void;
  onCancel: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ entries, goals, tasks, persona, voiceName, aiConfig, userProfile, onSessionEnd, onCancel }) => {
  const [status, setStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [transcript, setTranscript] = useState<string>('');
  const [volume, setVolume] = useState<number>(0);
  const sessionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 1. Session Logic
  useEffect(() => {
    let active = true;
    const start = async () => {
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
      
      const userName = userProfile?.name || "User";
      let profileContext = `User Name: ${userName}\n`;
      if (userProfile) {
          if (userProfile.occupation) profileContext += `Occupation: ${userProfile.occupation}\n`;
          if (userProfile.ageRange) profileContext += `Age Group: ${userProfile.ageRange}\n`;
          if (userProfile.relationshipStatus) profileContext += `Relationship Status: ${userProfile.relationshipStatus}\n`;
          if (userProfile.faith) profileContext += `Faith/Spirituality: ${userProfile.faith}\n`;
          if (userProfile.primaryGoal) profileContext += `Primary Goal in Journaling: ${userProfile.primaryGoal}\n`;
          if (userProfile.struggles && userProfile.struggles.length > 0) profileContext += `Current Struggles: ${userProfile.struggles.join(', ')}\n`;
      }
      const finalUserContext = `${profileContext}\nRecent Journal History:\n${contextSummary}`;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.start();

        const session = await connectLiveSession(
          aiConfig,
          (audioBuffer) => {
             let sum = 0;
             const data = audioBuffer.getChannelData(0);
             const sampleStep = Math.floor(data.length / 50);
             for(let i=0; i<data.length; i+=sampleStep) sum += Math.abs(data[i]);
             const avg = sum / (data.length / sampleStep);
             setVolume(Math.min(avg * 50, 100));
             setTimeout(() => setVolume(v => v * 0.8), 100);
          },
          (userText, modelText) => {
            if (!active) return;
            setTranscript(prev => prev + `\nUser: ${userText}\nAI: ${modelText}`);
          },
          (err) => {
            console.error(err);
            setStatus('error');
          },
          { persona, voiceName, userContext: finalUserContext, goalsContext: goalContext, tasksContext: taskContext }
        );
        sessionRef.current = session;
        setStatus('active');
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    };
    start();
    return () => { 
      active = false;
      if (sessionRef.current && sessionRef.current.close) sessionRef.current.close();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    };
  }, []);

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onSessionEnd(transcript, audioBlob);
      };
    } else {
      onSessionEnd(transcript);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;
    let rotation = 0;

    const draw = () => {
      // Resize logic to keep sharp on high DPI
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, rect.width, rect.height);
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      
      let colorRGB = '99, 102, 241';
      if (persona === 'Motivational') colorRGB = '245, 158, 11';
      if (persona === 'Rude') colorRGB = '239, 68, 68';

      const baseR = Math.min(rect.width, rect.height) * 0.25; 
      const dynamicR = baseR + (volume * 1.5);

      const gradient = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, dynamicR * 1.5);
      gradient.addColorStop(0, `rgba(${colorRGB}, 0.6)`);
      gradient.addColorStop(1, `rgba(${colorRGB}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.beginPath();
      ctx.arc(cx, cy, baseR + (volume * 0.3), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${colorRGB}, 0.9)`;
      ctx.fill();

      rotation += 0.01 + (volume * 0.001);
      ctx.strokeStyle = `rgba(${colorRGB}, 0.5)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, dynamicR, dynamicR * 0.4, rotation, 0, Math.PI * 2);
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [volume, persona]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between pb-10 pt-safe animate-fade-in">
      <div className="w-full flex justify-between items-center px-6 mt-4">
         <button onClick={onCancel} className="p-3 bg-white/10 rounded-full backdrop-blur-md">
             <X className="w-6 h-6 text-white" />
         </button>
         <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
            <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></span>
            <span className="text-xs font-bold text-white tracking-widest uppercase">Live // {aiConfig.provider}</span>
         </div>
         <div className="w-12"></div> {/* Spacer */}
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-center relative">
        <div className="w-full h-[60vh]">
             <canvas ref={canvasRef} className="w-full h-full" />
        </div>
        <div className="absolute bottom-10 w-full px-8 text-center">
             <p className="text-white/70 text-lg font-serif animate-pulse">
                {status === 'connecting' ? 'Establishing link...' : 'Listening...'}
             </p>
        </div>
      </div>

      <div className="w-full px-8 mb-safe">
        <button 
          onClick={handleStop}
          className="w-full py-5 rounded-[2rem] bg-red-500 text-white font-bold text-lg shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
        >
          <PhoneOff className="w-6 h-6 mr-3" />
          End Session
        </button>
      </div>
    </div>
  );
};

export default LiveSession;