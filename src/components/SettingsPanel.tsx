'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, X } from 'lucide-react';

export function SettingsPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [geminiKey, setGeminiKey] = useState('');
    const [tandoorUrl, setTandoorUrl] = useState('');
    const [tandoorToken, setTandoorToken] = useState('');

    useEffect(() => {
        const savedGemini = localStorage.getItem('GEMINI_API_KEY');
        const savedUrl = localStorage.getItem('TANDOOR_BASE_URL');
        const savedToken = localStorage.getItem('TANDOOR_API_TOKEN');
        if (savedGemini) setGeminiKey(savedGemini);
        if (savedUrl) setTandoorUrl(savedUrl);
        if (savedToken) setTandoorToken(savedToken);
    }, []);

    const handleSave = () => {
        localStorage.setItem('GEMINI_API_KEY', geminiKey);
        localStorage.setItem('TANDOOR_BASE_URL', tandoorUrl);
        localStorage.setItem('TANDOOR_API_TOKEN', tandoorToken);
        setIsOpen(false);
        // You might want to trigger a toast here
        alert("Settings saved!");
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-all backdrop-blur-sm"
                title="Settings"
            >
                <Settings className="w-6 h-6" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Settings</h2>
                            <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Gemini API Key</label>
                                <input
                                    type="password"
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                                <p className="text-xs text-neutral-500">Required for recipe extraction (Free Tier).</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Tandoor Base URL</label>
                                <input
                                    type="url"
                                    value={tandoorUrl}
                                    onChange={(e) => setTandoorUrl(e.target.value)}
                                    placeholder="https://recipes.example.com"
                                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Tandoor API Token</label>
                                <input
                                    type="password"
                                    value={tandoorToken}
                                    onChange={(e) => setTandoorToken(e.target.value)}
                                    placeholder="Token..."
                                    className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl font-medium hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Settings
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
