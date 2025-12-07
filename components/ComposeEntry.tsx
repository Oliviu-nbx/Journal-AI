import React, { useState } from 'react';
import { JournalEntry, Goal, Task, AIConfig } from '../types';
import { synthesizeJournalEntry, editImage, getGrounding, generateSpeech } from '../services/ai';
import { Image as ImageIcon, Sparkles, Wand2, Search, CheckSquare, Play, Pause, Lock, AlertCircle, ArrowLeft, Save } from 'lucide-react';

interface ComposeEntryProps {
  initialTranscript?: string;
  recordedAudio?: Blob;
  currentGoals: Goal[];
  currentTasks: Task[];
  aiConfig: AIConfig;
  onSave: (entry: JournalEntry, newGoals: Goal[], newTasks: Task[], completedGoalIds: string[], completedTaskIds: string[], audioBlob?: Blob) => void;
  onCancel: () => void;
}

const ComposeEntry: React.FC<ComposeEntryProps> = ({ initialTranscript, recordedAudio, currentGoals, currentTasks, aiConfig, onSave, onCancel }) => {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [step, setStep] = useState<'draft' | 'review'>(initialTranscript ? 'review' : 'draft');
  const isLocal = aiConfig.provider === 'ollama';
  
  const [rawText, setRawText] = useState(initialTranscript || '');
  const [imageData, setImageData] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [groundingInfo, setGroundingInfo] = useState<any>(null);

  const [structuredEntry, setStructuredEntry] = useState<Partial<JournalEntry> | null>(null);
  const [generatedGoals, setGeneratedGoals] = useState<any[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [completedGoalIds, setCompletedGoalIds] = useState<string[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(recordedAudio ? URL.createObjectURL(recordedAudio) : null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageData((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    }
  };

  const handleImageEdit = async () => {
    if (!imageData || !imagePrompt) return;
    if (isLocal) {
        alert("Image editing is only available with Gemini.");
        return;
    }
    setIsEditingImage(true);
    try {
      const newImageBase64 = await editImage(aiConfig, imageData, imagePrompt);
      if (newImageBase64) {
        setImageData(newImageBase64);
        setImagePrompt('');
      }
    } catch (e) {
      alert("Failed to edit image");
    } finally {
      setIsEditingImage(false);
    }
  };

  const handleGroundingSearch = async () => {
     if(!rawText) return;
     if (isLocal) {
        alert("Search Grounding is only available with Gemini.");
        return;
    }
     try {
       const result = await getGrounding(aiConfig, rawText.slice(0, 100));
       setGroundingInfo(result);
     } catch(e) {
       console.error(e);
     }
  };

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    try {
      const data = await synthesizeJournalEntry(aiConfig, rawText, currentGoals, currentTasks);
      setStructuredEntry(data);
      setGeneratedGoals(data.generatedGoals || []);
      setGeneratedTasks(data.generatedTasks || []);
      setCompletedGoalIds(data.completedGoalIds || []);
      setCompletedTaskIds(data.completedTaskIds || []);
      setStep('review');
    } catch (e) {
      console.error(e);
      alert("Synthesis failed. Check if your AI service is reachable.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    const audio = document.getElementById('recorded-playback') as HTMLAudioElement;
    if (!audio) return;
    
    if (isPlayingRecorded) {
      audio.pause();
      setIsPlayingRecorded(false);
    } else {
      audio.play();
      setIsPlayingRecorded(true);
      audio.onended = () => setIsPlayingRecorded(false);
    }
  };

  const handleFinalSave = () => {
    if (!structuredEntry) return;
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: structuredEntry.title || 'Untitled Entry',
      content: structuredEntry.content || rawText,
      summary: structuredEntry.summary || '',
      tags: structuredEntry.tags || [],
      mood: structuredEntry.mood,
      imageUrl: imageData ? `data:image/jpeg;base64,${imageData}` : undefined,
      groundingData: groundingInfo?.chunks?.map((c: any) => ({
         webUrl: c.web?.uri,
         title: c.web?.title,
         mapUrl: c.maps?.uri
      }))
    };
    
    const newGoals: Goal[] = generatedGoals.map((g, i) => ({ id: `g-${Date.now()}-${i}`, text: g.text, type: g.type, isCompleted: false, createdAt: new Date().toISOString() }));
    const newTasks: Task[] = generatedTasks.map((t, i) => ({ id: `t-${Date.now()}-${i}`, text: t.text, type: t.type, isCompleted: false, createdAt: new Date().toISOString() }));

    onSave(entry, newGoals, newTasks, completedGoalIds, completedTaskIds, recordedAudio);
  };

  if (isSynthesizing) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-pulse">
        <Sparkles className="w-16 h-16 text-indigo-500 mb-6 animate-spin" />
        <h3 className="text-2xl font-serif text-gray-900 dark:text-white mb-2">Reflecting...</h3>
        <p className="text-gray-500 dark:text-gray-400">Thinking deeply about your day.</p>
      </div>
    );
  }

  if (step === 'review' && structuredEntry) {
    return (
      <div className="max-w-2xl mx-auto glass-panel p-6 md:p-8 rounded-[2rem] border border-white/20 dark:border-white/5 animate-slide-up pb-32">
        <div className="mb-6 flex justify-between items-start">
          <div className="flex-1">
            <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border border-indigo-500/20">
              {structuredEntry.mood || 'Reflective'}
            </span>
            <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white leading-tight">{structuredEntry.title}</h2>
          </div>
        </div>

        {imageData && (
          <div className="mb-6 rounded-2xl overflow-hidden shadow-lg">
            <img src={`data:image/jpeg;base64,${imageData}`} className="w-full h-auto object-cover" />
          </div>
        )}

        <div className="prose prose-indigo dark:prose-invert max-w-none font-serif text-base leading-loose mb-8">
          {structuredEntry.content}
        </div>
        
        {/* Goals & Tasks Cards */}
        <div className="space-y-4 mb-8">
          {(completedGoalIds.length > 0 || completedTaskIds.length > 0) && (
             <div className="bg-green-50 dark:bg-green-500/10 p-4 rounded-xl border border-green-200 dark:border-green-500/20">
                <h4 className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2 flex items-center"><CheckSquare className="w-3 h-3 mr-2"/> Detected Progress</h4>
                <p className="text-sm text-green-900 dark:text-green-100">Found {completedGoalIds.length + completedTaskIds.length} completed items.</p>
             </div>
          )}
          
          {generatedGoals.length > 0 && (
             <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2 flex items-center"><Sparkles className="w-3 h-3 mr-2"/> Suggested Goals</h4>
                <ul className="space-y-1">
                   {generatedGoals.map((g, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300">• {g.text}</li>)}
                </ul>
             </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 w-full p-4 glass-panel border-t border-white/10 flex gap-3 z-20 md:static md:bg-transparent md:border-0 md:p-0">
          <button onClick={() => setStep('draft')} className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-bold">Edit</button>
          <button onClick={handleFinalSave} className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg">Save Entry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col animate-fade-in">
      <div className="flex justify-between items-center mb-6 px-2">
         <button onClick={onCancel} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 dark:hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
         <h2 className="text-lg font-bold text-gray-900 dark:text-white">Compose</h2>
         <div className="w-8"></div>
      </div>
      
      <div className="flex-1 glass-panel p-1 rounded-[2rem] shadow-sm border border-gray-200 dark:border-white/10 mb-4 bg-white dark:bg-slate-900/50 flex flex-col">
        <textarea
          className="flex-1 w-full p-6 text-lg bg-transparent border-0 focus:ring-0 resize-none font-serif placeholder-gray-300 dark:placeholder-gray-600 text-gray-800 dark:text-gray-200 leading-relaxed"
          placeholder="What's on your mind today?"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
        <div className="flex items-center justify-between px-4 pb-4 pt-2">
           <button 
             onClick={handleGroundingSearch}
             disabled={isLocal}
             className={`flex items-center text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors ${isLocal ? 'bg-gray-100 dark:bg-white/5 text-gray-400 opacity-50' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'}`}
           >
             {isLocal ? <Lock className="w-3 h-3 mr-1.5"/> : <Search className="w-3 h-3 mr-1.5" />}
             Check Facts
           </button>
           <label className={`cursor-pointer flex items-center text-[10px] font-bold px-3 py-1.5 rounded-full ${isLocal ? 'text-gray-400 bg-gray-100 dark:bg-white/5 opacity-50' : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'}`}>
              {isLocal ? <Lock className="w-3 h-3 mr-1.5"/> : <ImageIcon className="w-3 h-3 mr-1.5" />}
              Add Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isLocal} />
           </label>
        </div>
      </div>

      {imageData && !isLocal && (
        <div className="mb-20 glass-panel p-4 rounded-2xl flex gap-3 items-center">
            <img src={`data:image/jpeg;base64,${imageData}`} className="w-16 h-16 rounded-lg object-cover bg-black/20" />
            <input 
                type="text" 
                placeholder="Magic Editor Prompt..."
                className="flex-1 bg-transparent border-b border-gray-200 dark:border-white/10 py-2 text-sm focus:outline-none"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
            />
            <button onClick={handleImageEdit} disabled={isEditingImage || !imagePrompt} className="p-2 bg-indigo-600 rounded-lg text-white">
                <Wand2 className="w-4 h-4" />
            </button>
        </div>
      )}

      <div className="fixed bottom-6 left-4 right-4 z-30 md:static md:p-0 md:mt-4">
        <button 
          onClick={handleSynthesize}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[2rem] text-lg font-bold shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Synthesize Entry
        </button>
      </div>
    </div>
  );
};

export default ComposeEntry;