
import React, { useState, useEffect } from 'react';
import { Cloud, Save, AlertTriangle, CheckCircle, LogOut } from 'lucide-react';
import { initGoogleDrive, signInToDrive, signOutFromDrive } from '../services/googleDrive';

const Settings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [clientId, setClientId] = useState(localStorage.getItem('reflectai_gdrive_client_id') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('reflectai_gdrive_api_key') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have a token (rough check)
    if ((window as any).gapi && (window as any).gapi.client && (window as any).gapi.client.getToken()) {
        setIsConnected(true);
    }
  }, []);

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
        // Also set a flag for the app to know sync is enabled
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

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-6">Settings</h2>

      <div className="glass-panel p-8 rounded-3xl border border-white/20 dark:border-white/5">
         <div className="flex items-center mb-6">
            <div className={`p-3 rounded-full mr-4 ${isConnected ? 'bg-green-100 dark:bg-green-500/20 text-green-600' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600'}`}>
                <Cloud className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Google Drive Backup</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Save entries and audio to the cloud to avoid local storage limits.</p>
            </div>
         </div>

         {isConnected ? (
             <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-6 text-center">
                 <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                 <h4 className="text-lg font-bold text-green-700 dark:text-green-500 mb-2">Cloud Sync Active</h4>
                 <p className="text-gray-600 dark:text-gray-300 mb-6">Your journal entries and audio are being synced to the 'ReflectAI_Data' folder in your Google Drive.</p>
                 <button 
                    onClick={handleDisconnect}
                    className="px-6 py-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors flex items-center mx-auto"
                 >
                    <LogOut className="w-4 h-4 mr-2" /> Disconnect Drive
                 </button>
             </div>
         ) : (
             <div className="space-y-4">
                 <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mr-3 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                        To enable sync, you need a Google Cloud Project with the <strong>Google Drive API</strong> enabled. 
                        Provide your OAuth Client ID and API Key below. This runs entirely in your browser.
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
                    {isLoading ? "Connecting..." : "Connect to Google Drive"}
                 </button>
             </div>
         )}
      </div>
    </div>
  );
};

export default Settings;