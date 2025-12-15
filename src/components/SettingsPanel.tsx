'use client';

import { useState } from 'react';
import { Settings, Save, X } from 'lucide-react';
import { STORAGE_KEYS } from '@/lib/constants';

/**
 * A modal panel for configuring API keys and settings.
 * Settings are persisted in localStorage.
 */
export function SettingsPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [geminiKey, setGeminiKey] = useState(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || '';
    });
    const [tandoorUrl, setTandoorUrl] = useState(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem(STORAGE_KEYS.TANDOOR_BASE_URL) || '';
    });
    const [tandoorToken, setTandoorToken] = useState(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem(STORAGE_KEYS.TANDOOR_API_TOKEN) || '';
    });

    /**
     * Saves settings to localStorage.
     */
    const handleSave = () => {
        localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, geminiKey);
        localStorage.setItem(STORAGE_KEYS.TANDOOR_BASE_URL, tandoorUrl);
        localStorage.setItem(STORAGE_KEYS.TANDOOR_API_TOKEN, tandoorToken);
        setIsOpen(false);
        alert("Settings saved!");
    };

    /**
     * Closes the modal without saving.
     */
    const handleClose = () => setIsOpen(false);

    return (
        <>
            {/* Settings Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-all backdrop-blur-sm"
                title="Settings"
                aria-label="Open settings"
            >
                <Settings className="w-6 h-6" />
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={handleClose}
                >
                    {/* Modal Content */}
                    <div
                        className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                                Settings
                            </h2>
                            <button
                                onClick={handleClose}
                                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                                aria-label="Close settings"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <SettingsField
                                label="Gemini API Key"
                                type="password"
                                value={geminiKey}
                                onChange={setGeminiKey}
                                placeholder="AIzaSy..."
                                hint="Required for recipe extraction (Free Tier)."
                            />

                            <SettingsField
                                label="Tandoor Base URL"
                                type="url"
                                value={tandoorUrl}
                                onChange={setTandoorUrl}
                                placeholder="https://recipes.example.com"
                            />

                            <SettingsField
                                label="Tandoor API Token"
                                type="password"
                                value={tandoorToken}
                                onChange={setTandoorToken}
                                placeholder="Token..."
                            />
                        </div>

                        {/* Save Button */}
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

/**
 * Props for the SettingsField component.
 */
interface SettingsFieldProps {
    label: string;
    type: 'text' | 'password' | 'url';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    hint?: string;
}

/**
 * A reusable form field for settings.
 */
function SettingsField({ label, type, value, onChange, placeholder, hint }: SettingsFieldProps) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            {hint && (
                <p className="text-xs text-neutral-500">{hint}</p>
            )}
        </div>
    );
}
