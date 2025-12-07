
import React, { useState } from 'react';
import { JournalEntry, Goal, Task, AIConfig } from '../types';
import { synthesizeJournalEntry, editImage, getGrounding, generateSpeech } from '../services/ai';
import { Image as ImageIcon, Sparkles, Wand2, Search, CheckSquare, Play, Pause, Lock, AlertCircle } from 'lucide-react';

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
      // Pass existing items to let AI check for completion
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
    
    const newGoals: Goal[] = generatedGoals.map((g, i) => ({
       id: `g-${Date.now()}-${i}`,
       text: g.text,
       type: g.type,
       isCompleted: false,
       createdAt: new Date().toISOString()
    }));

    const newTasks: Task[] = generatedTasks.map((t, i) => ({
      id: `t-${Date.now()}-${i}`,
      text: t.text,
      type: t.type,
      isCompleted: false,
      createdAt: new Date().toISOString()
    }));

    onSave(entry, newGoals, newTasks, completedGoalIds, completedTaskIds, recordedAudio);
  };

  if (isSynthesizing) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="relative w-24 h-24 mb-6">
           <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-pulse"></div>
           <div className="absolute inset-0 rounded-full border-t-4 border-cyan-400 animate-spin"></div>
           <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
        <h3 className="text-2xl font-serif text-gray-900 dark:text-white mb-2">Reflecting...</h3>
        <p className="text-gray-500 dark:text-gray-400">Analyzing completion & synthesizing thoughts.</p>
      </div>
    );
  }

  if (step === 'review' && structuredEntry) {
    return (
      <div className="max-w-2xl mx-auto glass-panel p-8 rounded-3xl border border-white/20 dark:border-white/5 animate-in slide-in-from-right-8 duration-500">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-500/20">
              {structuredEntry.mood || 'Reflective'}
            </span>
            <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">{structuredEntry.title}</h2>
          </div>
          {audioUrl && (
             <button 
               onClick={togglePlayback}
               className="p-3 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors"
             >
               {isPlayingRecorded ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
               <audio id="recorded-playback" src={audioUrl} className="hidden" />
             </button>
          )}
        </div>

        {/* Image */}
        {imageData && (
          <div className="mb-8 rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/10">
            <img src={`data:image/jpeg;base64,${imageData}`} className="w-full h-auto object-cover" />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg prose-indigo dark:prose-invert max-w-none font-serif leading-loose mb-8">
          {structuredEntry.content}
        </div>
        
        {/* Completion Report */}
        {(completedGoalIds.length > 0 || completedTaskIds.length > 0) && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-500/20 rounded-xl p-5 mb-8">
                <h4 className="text-sm font-bold text-green-700 dark:text-green-500 uppercase tracking-wide mb-3 flex items-center">
                    <CheckSquare className="w-4 h-4 mr-2"/> Detected Completions
                </h4>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p>Great job! I've marked {completedGoalIds.length} goals and {completedTaskIds.length} tasks as complete based on our conversation.</p>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Goals */}
          {generatedGoals.length > 0 && (
             <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5">
                <h4 className="text-sm font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wide mb-3 flex items-center">
                   <Sparkles className="w-4 h-4 mr-2"/> Suggested Goals
                </h4>
                <ul className="space-y-2">
                   {generatedGoals.map((g, i) => (
                      <li key={i} className="flex items-start text-sm">
                         <span className={`inline-block w-2 h-2 rounded-full mt-1.5 mr-3 flex-shrink-0 ${g.type === 'Daily' ? 'bg-blue-500' : g.type === 'Weekly' ? 'bg-green-500' : 'bg-purple-500'}`}></span>
                         <span className="text-gray-700 dark:text-gray-300">
                            {g.text}
                         </span>
                      </li>
                   ))}
                </ul>
             </div>
          )}

          {/* Tasks */}
          {generatedTasks.length > 0 && (
             <div className="bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-5">
                <h4 className="text-sm font-bold text-cyan-700 dark:text-cyan-500 uppercase tracking-wide mb-3 flex items-center">
                   <CheckSquare className="w-4 h-4 mr-2"/> Suggested Tasks
                </h4>
                <ul className="space-y-2">
                   {generatedTasks.map((t, i) => (
                      <li key={i} className="flex items-start text-sm">
                         <span className={`inline-block w-2 h-2 rounded-full mt-1.5 mr-3 flex-shrink-0 ${t.type === 'Daily' ? 'bg-orange-500' : t.type === 'Weekly' ? 'bg-yellow-500' : 'bg-lime-500'}`}></span>
                         <span className="text-gray-700 dark:text-gray-300">
                            {t.text}
                         </span>
                      </li>
                   ))}
                </ul>
             </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          {structuredEntry.tags?.map(tag => (
            <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg text-xs border border-transparent dark:border-white/5">#{tag}</span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-white/10">
          <button onClick={() => setStep('draft')} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Edit</button>
          <button 
            onClick={handleFinalSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 font-medium"
          >
            Save Entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-6">Compose Entry</h2>
      
      <div className="glass-panel p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 mb-6 bg-white dark:bg-slate-900">
        <textarea
          className="w-full h-80 p-6 text-lg bg-transparent border-0 focus:ring-0 resize-none font-serif placeholder-gray-300 dark:placeholder-gray-600 text-gray-800 dark:text-gray-200 leading-relaxed"
          placeholder="What's on your mind today?"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
        <div className="flex items-center justify-between px-4 pb-4 border-t border-gray-100 dark:border-white/5 pt-3">
           <button 
             onClick={handleGroundingSearch}
             disabled={isLocal}
             className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${isLocal ? 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20'}`}
           >
             {isLocal ? <Lock className="w-3 h-3 mr-1.5"/> : <Search className="w-3 h-3 mr-1.5" />}
             Check Facts {isLocal && '(Gemini Only)'}
           </button>
           <span className="text-xs text-gray-400 font-mono">{rawText.length} chars</span>
        </div>
      </div>

      <div className={`glass-panel p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 mb-6 ${isLocal ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center">
            {isLocal ? <Lock className="w-4 h-4 mr-2" /> : <ImageIcon className="w-5 h-5 mr-2" />} 
            Attachment {isLocal && <span className="text-xs font-normal text-red-500 ml-2">(Cloud Only)</span>}
          </h3>
          <label className={`cursor-pointer text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium ${isLocal ? 'cursor-not-allowed text-gray-400' : ''}`}>
            Upload Photo
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isLocal} />
          </label>
        </div>

        {imageData && (
          <div className="flex flex-col md:flex-row gap-6">
             <div className="w-full md:w-1/2 rounded-xl overflow-hidden bg-black/5 border border-black/5 dark:border-white/10">
                <img src={`data:image/jpeg;base64,${imageData}`} className="w-full h-auto" alt="Preview" />
             </div>
             <div className="w-full md:w-1/2 flex flex-col justify-center space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{isLocal ? 'Image Editing Disabled' : 'Gemini Magic Editor'}</p>
                <div className="flex gap-2">
                   <input 
                      type="text" 
                      placeholder="e.g., Make it cyberpunk style"
                      className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      disabled={isLocal}
                   />
                   <button 
                      onClick={handleImageEdit}
                      disabled={isEditingImage || !imagePrompt || isLocal}
                      className="bg-indigo-600 text-white p-3 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                   >
                     {isEditingImage ? <Sparkles className="w-5 h-5 animate-pulse"/> : <Wand2 className="w-5 h-5"/>}
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pb-20 md:pb-0">
        <button onClick={onCancel} className="text-gray-500 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white">Discard</button>
        <button 
          onClick={handleSynthesize}
          className="flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full text-lg font-bold shadow-lg shadow-indigo-600/30 hover:scale-105 transition-transform"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Synthesize Entry
        </button>
      </div>
    </div>
  );
};

export default ComposeEntry;
