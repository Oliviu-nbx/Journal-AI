
import React, { useEffect, useRef, useState } from 'react';
import { connectLiveSession } from '../services/gemini';
import { JournalEntry, Persona, VoiceName, Goal, Task } from '../types';

interface LiveSessionProps {
  entries: JournalEntry[]; 
  goals: Goal[];
  tasks: Task[];
  persona: Persona;
  voiceName: VoiceName;
  onSessionEnd: (transcript: string, audioBlob?: Blob) => void;
  onCancel: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ entries, goals, tasks, persona, voiceName, onSessionEnd, onCancel }) => {
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

      try {
        // Setup MediaRecorder for user's input stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorderRef.current.start();

        const session = await connectLiveSession(
          (audioBuffer) => {
             // Simulate volume for visualizer
             let sum = 0;
             const data = audioBuffer.getChannelData(0);
             for(let i=0; i<data.length; i+=100) sum += Math.abs(data[i]);
             const avg = sum / (data.length/100);
             setVolume(Math.min(avg * 50, 100)); // Amplify a bit
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
          {
            persona: persona,
            voiceName: voiceName,
            userContext: contextSummary || "No previous journal entries found.",
            goalsContext: goalContext,
            tasksContext: taskContext
          }
        );
        sessionRef.current = session;
        setStatus('active');
      } catch (e) {
        setStatus('error');
      }
    };
    start();
    return () => { 
      active = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
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
      onSessionEnd(transcript); // Fallback if recorder failed
    }
  };

  // 2. Futuristic Orb Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let rotation = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      // Dynamic color based on Persona
      let colorRGB = '99, 102, 241'; // Indigo (Nice)
      if (persona === 'Motivational') colorRGB = '245, 158, 11'; // Amber
      if (persona === 'Rude') colorRGB = '239, 68, 68'; // Red

      // Base radius
      const baseR = 60;
      const dynamicR = baseR + (volume * 1.5);

      // Glow
      const gradient = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, dynamicR * 1.5);
      gradient.addColorStop(0, `rgba(${colorRGB}, 0.8)`);
      gradient.addColorStop(0.5, `rgba(${colorRGB}, 0.2)`);
      gradient.addColorStop(1, `rgba(${colorRGB}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Core
      ctx.beginPath();
      ctx.arc(cx, cy, baseR + (volume * 0.2), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${colorRGB}, 0.9)`;
      ctx.fill();

      // Orbital Rings
      rotation += 0.01 + (volume * 0.001);
      
      ctx.strokeStyle = `rgba(${colorRGB}, 0.4)`;
      ctx.lineWidth = 2;
      
      // Ring 1
      ctx.beginPath();
      ctx.ellipse(cx, cy, dynamicR, dynamicR * 0.4, rotation, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 2
      ctx.beginPath();
      ctx.ellipse(cx, cy, dynamicR * 0.8, dynamicR * 1.2, -rotation * 1.5, 0, Math.PI * 2);
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [volume, persona]);

  // ACTIVE SESSION UI
  return (
    <div className="flex flex-col items-center justify-center h-full relative animate-in fade-in zoom-in duration-500">
      <div className="absolute top-0 w-full flex justify-between items-center p-4">
         <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-xs font-mono text-white/80">LIVE // {persona.toUpperCase()}</span>
         </div>
      </div>

      <div className="relative w-full max-w-sm aspect-square flex items-center justify-center mb-8">
        <canvas ref={canvasRef} width={400} height={400} className="w-full h-full" />
      </div>

      <div className="w-full max-w-md bg-black/5 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-black/5 dark:border-white/5 p-4 mb-8 min-h-[100px] max-h-[150px] overflow-y-auto">
         <p className="text-xs font-mono text-gray-400 mb-2 uppercase">Real-time Transcript</p>
         <p className="text-sm text-gray-700 dark:text-gray-200 font-medium whitespace-pre-wrap leading-relaxed">
            {transcript.split('\n').slice(-4).join('\n') || (status === 'connecting' ? "Establishing link..." : "Listening...")}
         </p>
      </div>

      <div className="flex gap-4 w-full max-w-sm">
        <button 
          onClick={onCancel}
          className="flex-1 py-4 rounded-2xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={handleStop}
          className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold shadow-lg shadow-red-500/30 hover:scale-[1.02] transition-transform"
        >
          End Session
        </button>
      </div>
    </div>
  );
};

export default LiveSession;
