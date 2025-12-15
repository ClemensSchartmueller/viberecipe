'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MagicPasteInputProps {
    onSubmit: (content: string | File, options?: { useTandoorImport?: boolean }) => void;
    isLoading?: boolean;
}

export function MagicPasteInput({ onSubmit, isLoading = false }: MagicPasteInputProps) {
    const [inputVal, setInputVal] = useState('');
    const [isDragActive, setIsDragActive] = useState(false);
    const [pastedImage, setPastedImage] = useState<File | null>(null);
    const [isTandoorImport, setIsTandoorImport] = useState(true);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                setPastedImage(file);
                onSubmit(file);
            }
        }
    }, [onSubmit]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        if (e.clipboardData.files && e.clipboardData.files[0]) {
            const file = e.clipboardData.files[0];
            if (file.type.startsWith('image/')) {
                e.preventDefault();
                setPastedImage(file);
                onSubmit(file);
            }
        }
    }, [onSubmit]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (inputVal.trim()) {
                onSubmit(inputVal, { useTandoorImport: isTandoorImport });
            }
        }
    };

    const clearImage = () => {
        setPastedImage(null);
        setInputVal('');
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                className={cn(
                    "relative group rounded-2xl border-2 transition-all duration-300 ease-out overflow-hidden",
                    isDragActive ? "border-blue-500 bg-blue-50/10 scale-[1.02]" : "border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 hover:border-neutral-300 dark:hover:border-neutral-700",
                    isLoading && "opacity-50 pointer-events-none grayscale"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative p-6 flex flex-col gap-4">
                    {pastedImage ? (
                        <div className="relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 aspect-video flex items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                            <img
                                src={URL.createObjectURL(pastedImage)}
                                alt="Pasted preview"
                                className="max-h-full max-w-full object-contain"
                            />
                            <button
                                onClick={clearImage}
                                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                            >
                                Let's try something else
                            </button>
                        </div>
                    ) : (
                        <textarea
                            ref={textareaRef}
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            onPaste={handlePaste}
                            onKeyDown={handleKeyDown}
                            placeholder="Paste a recipe URL, text, or drop a screenshot..."
                            className="w-full bg-transparent border-none outline-none resize-none text-lg placeholder:text-neutral-400 min-h-[120px]"
                        />
                    )}

                    <div className="flex items-center justify-between text-sm text-neutral-400">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <LinkIcon className="w-4 h-4" />
                                <span>URL</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4" />
                                <span>Image</span>
                            </div>
                        </div>

                        <button
                            onClick={() => inputVal.trim() && onSubmit(inputVal, { useTandoorImport: isTandoorImport })}
                            disabled={!inputVal.trim() && !pastedImage}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300",
                                (inputVal.trim() || pastedImage)
                                    ? "bg-neutral-900 dark:bg-white text-white dark:text-black hover:scale-105 shadow-lg active:scale-95"
                                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            <span>{isTandoorImport ? 'Import' : 'Extract'}</span>
                        </button>
                    </div>

                    {/* Tandoor Direct Import Option */}
                    {inputVal.trim().startsWith('http') && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                            <input
                                type="checkbox"
                                id="useTandoor"
                                checked={isTandoorImport}
                                onChange={(e) => setIsTandoorImport(e.target.checked)}
                                className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="useTandoor" className="text-sm text-neutral-600 dark:text-neutral-400 select-none cursor-pointer">
                                Use Tandoor Importer (Direct Import)
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
