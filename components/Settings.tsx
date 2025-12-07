
import React, { useState, useEffect } from 'react';
import { Cloud, Save, AlertTriangle, CheckCircle, LogOut, Smartphone, ArrowLeft, Trash2, Cpu, Server, User, Heart, Briefcase, Zap } from 'lucide-react';
import { initGoogleDrive, signInToDrive, signOutFromDrive, syncDataToDrive, uploadAudioToDrive, fetchDataFromDrive, deleteAllRemoteData, downloadAudioFromDrive } from '../services/googleDrive';
import { canChangeStorage, getTimeUntilChange, setStorageMode, clearLocalData, saveImportedData, saveAudioBlob, loadLocalData, getAudioBlob } from '../services/storage';
import { JournalEntry, Goal, Task, UserStats, AIConfig, AIProvider, UserProfile } from '../types';

interface SettingsProps {
    onBack: () => void;
    currentConfig: AIConfig;
    onUpdateConfig: (config: AIConfig) => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack, currentConfig, onUpdateConfig }) => {
  const [clientId, setClientId] = useState(localStorage.getItem('reflectai_gdrive_client_id') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('reflectai_gdrive_api_key') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AI Settings
  const [aiProvider, setAiProvider] = useState<AIProvider>(currentConfig.provider);
  const [ollamaUrl, setOllamaUrl] = useState(currentConfig.ollamaBaseUrl || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(currentConfig.ollamaModel || 'deepseek-r1:7b');

  // Profile Settings
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [storageMode, setLocalStorageMode] = useState<'local' | 'cloud'>(
    (localStorage.getItem('reflectai_storage_mode') as 'local' | 'cloud') || 'local'
  );
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  useEffect(() => {
    if ((window as any).gapi && (window as any).gapi.client && (window as any).gapi.client.getToken()) {
        setIsConnected(true);
    }
    const savedProfile = localStorage.getItem('reflectai_profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));
  }, []);

  const handleSaveAIConfig = () => {
      onUpdateConfig({
          provider: aiProvider,
          ollamaBaseUrl: ollamaUrl,
          ollamaModel: ollamaModel
      });
      alert("AI Configuration Saved");
  };
  
  const handleSaveProfile = () => {
      if (profile) {
          localStorage.setItem('reflectai_profile', JSON.stringify(profile));
          alert("Profile Updated");
      }
  };

  const handleConnect = async () => {
    if (!clientId || !apiKey) {
        setError("Please enter both Client ID and API Key.");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
        localStorage.setItem('reflectai_gdrive_client_id', clientId);
        localStorage.setItem('reflectai_gdrive_api_key', apiKey);
        
        await initGoogleDrive(clientId, apiKey);
        await signInToDrive();
        setIsConnected(true);
        localStorage.setItem('reflectai_cloud_sync_enabled', 'true');
    } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to connect to Google Drive. Check your credentials.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
      signOutFromDrive();
      setIsConnected(false);
      localStorage.removeItem('reflectai_cloud_sync_enabled');
  };

  // --- MIGRATION LOGIC ---

  const handleSwitchToCloud = async () => {
      if(migrationStatus) return;

      if(!canChangeStorage()) {
          alert(`You can only change storage once every 24 hours. Try again in ${getTimeUntilChange()}.`);
          return;
      }
      if(!isConnected) {
          alert("Please connect to Google Drive first.");
          return;
      }
      if(!confirm("Switching to Google Cloud Storage. \n\n1. All your local data will be uploaded to Drive. \n2. You will be asked if you want to delete local data to save space. \n\nContinue?")) return;

      setMigrationStatus("Uploading data...");
      try {
          const data = loadLocalData();
          if(data.entries) {
             await syncDataToDrive({ entries: data.entries, goals: data.goals, tasks: data.tasks, stats: data.stats });
             
             // Upload Audio
             for(const entry of data.entries) {
                 if(entry.audioId) {
                     const blob = await getAudioBlob(entry.audioId);
                     if(blob) await uploadAudioToDrive(entry.audioId, blob);
                 }
             }
          }
          
          setStorageMode('cloud');
          setLocalStorageMode('cloud');
          setMigrationStatus(null);
          
          if(confirm("Migration Complete! \n\nDo you want to delete the data from this device to free up space? (It is safe on Google Drive).")) {
              clearLocalData();
              alert("Local data cleared. App will now load from Cloud.");
              window.location.reload(); 
          } else {
              alert("Switched to Cloud Mode. Local data preserved as backup.");
          }

      } catch (e) {
          console.error(e);
          alert("Migration failed. Please check console.");
          setMigrationStatus(null);
      }
  };

  const handleSwitchToLocal = async () => {
      if(migrationStatus) return;

      if(!canChangeStorage()) {
          alert(`You can only change storage once every 24 hours. Try again in ${getTimeUntilChange()}.`);
          return;
      }
      if(!isConnected) {
          alert("Please connect to Google Drive to download your data.");
          return;
      }
      if(!confirm("Switching to Device Storage. \n\n1. All data will be downloaded from Drive. \n2. You will be asked if you want to delete the Cloud backup. \n\nContinue?")) return;

      setMigrationStatus("Downloading data...");
      try {
          const data = await fetchDataFromDrive();
          if(data) {
              saveImportedData(data);
              // Download Audio (This is tricky as we need to find all audio files, simplified here to just known entries)
              if(data.entries) {
                  for(const entry of (data.entries as JournalEntry[])) {
                      if(entry.audioId) {
                          setMigrationStatus(`Downloading audio for ${entry.title}...`);
                          const blob = await downloadAudioFromDrive(entry.audioId);
                          if(blob) await saveAudioBlob(entry.audioId, blob);
                      }
                  }
              }
          }

          setStorageMode('local');
          setLocalStorageMode('local');
          setMigrationStatus(null);

          if(confirm("Migration Complete! \n\nDo you want to delete the backup from Google Drive?")) {
              await deleteAllRemoteData();
              alert("Cloud data deleted. You are now fully local.");
          } else {
              alert("Switched to Device Mode. Cloud backup preserved.");
          }

      } catch (e) {
          console.error(e);
          alert("Migration failed. Please check console.");
          setMigrationStatus(null);
      }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-20">
      <div className="flex items-center mb-6">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
              <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white">Settings</h2>
      </div>

      {/* Profile Settings */}
      {profile && (
        <div className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-white/5 mb-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-pink-500" /> Personal Profile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                   <label className="text-xs font-bold uppercase text-gray-500">Display Name</label>
                   <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full mt-1 p-2 rounded bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm" />
               </div>
               <div>
                   <label className="text-xs font-bold uppercase text-gray-500">Primary Occupation</label>
                   <input type="text" value={profile.occupation || ''} onChange={(e) => setProfile({...profile, occupation: e.target.value})} className="w-full mt-1 p-2 rounded bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm" />
               </div>
               <div>
                   <label className="text-xs font-bold uppercase text-gray-500">Goal</label>
                   <input type="text" value={profile.primaryGoal || ''} onChange={(e) => setProfile({...profile, primaryGoal: e.target.value})} className="w-full mt-1 p-2 rounded bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm" />
               </div>
               <div>
                   <label className="text-xs font-bold uppercase text-gray-500">Faith / Spirituality</label>
                   <input type="text" value={profile.faith || ''} onChange={(e) => setProfile({...profile, faith: e.target.value})} className="w-full mt-1 p-2 rounded bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm" />
               </div>
            </div>
            <button 
                onClick={handleSaveProfile}
                className="w-full py-2 bg-pink-600 text-white rounded-lg font-bold mt-4 hover:bg-pink-700"
            >
                Update Profile
            </button>
        </div>
      )}

      {/* AI Intelligence Settings */}
      <div className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-white/5 mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Cpu className="w-5 h-5 mr-2 text-indigo-500" /> Artificial Intelligence
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
              <button 
                onClick={() => setAiProvider('gemini')}
                className={`p-4 rounded-xl border-2 text-left ${aiProvider === 'gemini' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-white/10'}`}
              >
                  <div className="font-bold text-gray-900 dark:text-white mb-1">Google Gemini</div>
                  <div className="text-xs text-gray-500">Cloud-based. Best quality.</div>
              </button>
              <button 
                onClick={() => setAiProvider('ollama')}
                className={`p-4 rounded-xl border-2 text-left ${aiProvider === 'ollama' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-gray-200 dark:border-white/10'}`}
              >
                  <div className="font-bold text-gray-900 dark:text-white mb-1">Ollama (Local)</div>
                  <div className="text-xs text-gray-500">Runs locally. Privacy focused.</div>
              </button>
          </div>

          {aiProvider === 'ollama' && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <div>
                      <label className="text-xs font-bold uppercase text-gray-500">Base URL</label>
                      <input 
                        type="text" 
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        className="w-full mt-1 p-2 rounded bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm"
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold uppercase text-gray-500">Model Name</label>
                      <input 
                        type="text" 
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        className="w-full mt-1 p-2 rounded bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm"
                        placeholder="e.g. deepseek-r1:7b"
                      />
                  </div>
              </div>
          )}

          <button 
            onClick={handleSaveAIConfig}
            className="w-full py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-lg font-bold mt-4"
          >
              Save AI Configuration
          </button>
      </div>

      {/* Storage Switcher */}
      {isConnected && (
      <div className="mb-8 glass-panel p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Save className="w-5 h-5 mr-2" /> Primary Storage Location
          </h3>
          
          <div className="flex gap-4 mb-6">
              <div 
                 onClick={() => !migrationStatus && storageMode === 'cloud' && handleSwitchToLocal()}
                 className={`flex-1 p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                   storageMode === 'local' 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20' 
                    : `border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 ${migrationStatus ? 'opacity-50 cursor-not-allowed' : 'opacity-60 hover:opacity-100 cursor-pointer'}`
                 }`}
              >
                  <Smartphone className={`w-8 h-8 mb-2 ${storageMode === 'local' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                  <p className="font-bold text-gray-900 dark:text-white">Device</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fastest. Data stays on this device.</p>
                  {storageMode === 'local' && <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-indigo-500" />}
              </div>

              <div 
                 onClick={() => !migrationStatus && storageMode === 'local' && handleSwitchToCloud()}
                 className={`flex-1 p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                   storageMode === 'cloud' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20' 
                    : `border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 ${migrationStatus ? 'opacity-50 cursor-not-allowed' : 'opacity-60 hover:opacity-100 cursor-pointer'}`
                 }`}
              >
                  <Cloud className={`w-8 h-8 mb-2 ${storageMode === 'cloud' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                  <p className="font-bold text-gray-900 dark:text-white">Google Cloud</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Accessible everywhere. Slower load.</p>
                  {storageMode === 'cloud' && <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-blue-500" />}
              </div>
          </div>

          {migrationStatus && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-3 rounded-lg text-sm flex items-center animate-pulse">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                  {migrationStatus}
              </div>
          )}

          {!canChangeStorage() && (
             <p className="text-xs text-center text-red-500 mt-2">
                 Storage change locked. Next change available in: {getTimeUntilChange()}
             </p>
          )}
      </div>
      )}

      {/* Connection Panel */}
      <div className="glass-panel p-8 rounded-3xl border border-white/20 dark:border-white/5">
         <div className="flex items-center mb-6">
            <div className={`p-3 rounded-full mr-4 ${isConnected ? 'bg-green-100 dark:bg-green-500/20 text-green-600' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600'}`}>
                <Cloud className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Drive Connection</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your connection to Google Drive.</p>
            </div>
         </div>

         {isConnected ? (
             <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-6 text-center">
                 <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                 <h4 className="text-lg font-bold text-green-700 dark:text-green-500 mb-2">Connected</h4>
                 <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {storageMode === 'cloud' 
                      ? "Your app is currently running directly from the Cloud." 
                      : "Sync is active. Your local data is being backed up."}
                 </p>
                 <button 
                    onClick={handleDisconnect}
                    className="px-6 py-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors flex items-center mx-auto"
                 >
                    <LogOut className="w-4 h-4 mr-2" /> Disconnect
                 </button>
             </div>
         ) : (
             <div className="space-y-4">
                 <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mr-3 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                        To enable cloud storage or backup, provide your Google Cloud Project credentials. 
                        Requires <strong>Google Drive API</strong> enabled.
                    </p>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">OAuth Client ID</label>
                    <input 
                        type="text" 
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="123456-abcde.apps.googleusercontent.com"
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">API Key</label>
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                    />
                 </div>

                 {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                 <button 
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center disabled:opacity-50"
                 >
                    {isLoading ? "Connecting..." : "Connect"}
                 </button>
             </div>
         )}
      </div>
    </div>
  );
};

export default Settings;
