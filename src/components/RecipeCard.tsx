'use client';

import { Copy, UploadCloud, Check, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface RecipeCardProps {
    recipe: any;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
    const [copied, setCopied] = useState(false);
    const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendToTandoor = async () => {
        const url = localStorage.getItem('TANDOOR_BASE_URL');
        const token = localStorage.getItem('TANDOOR_API_TOKEN');

        if (!url || !token) {
            alert("Please configure Tandoor settings first");
            return;
        }

        // Basic Best-Effort Mapping for Tandoor API
        const instructions = recipe.recipeInstructions || recipe.instruction || [];

        const payload = {
            name: recipe.name,
            description: recipe.description || "Imported via VibeRecipe",
            steps: Array.isArray(instructions)
                ? instructions.map((s: any) => ({ instruction: s.text || s }))
                : [{ instruction: instructions }],
            ingredients: recipe.recipeIngredient || [],
            url: recipe.url,
            image: recipe.image,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            recipeYield: recipe.recipeYield,
            internal: true
        };

        try {
            const res = await fetch('/api/tandoor', {
                method: 'POST',
                headers: {
                    'x-tandoor-url': url,
                    'x-tandoor-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Successfully created recipe in Tandoor!");
            } else {
                const err = await res.json();
                alert(`Failed to send: ${err.details || 'Unknown error'}`);
            }
        } catch (e) {
            alert("Network error sending to Tandoor.");
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto rounded-3xl bg-white dark:bg-neutral-900 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="relative h-64 md:h-80 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                {/* Loading Spinner */}
                {imageStatus === 'loading' && recipe.image && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                )}

                {/* Error State */}
                {imageStatus === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 z-20 bg-neutral-100 dark:bg-neutral-800">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-sm">Image generation failed</span>
                    </div>
                )}

                {/* Image */}
                {recipe.image ? (
                    <img
                        src={recipe.image}
                        alt={recipe.name}
                        className={`w-full h-full object-cover transition-opacity duration-500 ${imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setImageStatus('loaded')}
                        onError={() => setImageStatus('error')}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        No Image
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-8 text-white pointer-events-none">
                    <h2 className="text-3xl font-bold mb-2">{recipe.name}</h2>
                    <p className="opacity-90 line-clamp-2">{recipe.description}</p>
                </div>
            </div>

            <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800">
                        <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Make Time</div>
                        <div className="text-lg font-semibold">{recipe.totalTime || recipe.cookTime || '—'}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800">
                        <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Yield</div>
                        <div className="text-lg font-semibold">{recipe.recipeYield || '—'}</div>
                    </div>
                    {/* Add more stats */}
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4">Ingredients</h3>
                        <ul className="space-y-2">
                            {recipe.recipeIngredient?.map((ing: any, i: number) => {
                                const text = typeof ing === 'string' ? ing : (ing.text || `${ing.quantity || ''} ${ing.unit || ''} ${ing.food || ''}`);
                                return (
                                    <li key={i} className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300">
                                        <div className="min-w-1.5 h-1.5 mt-2 rounded-full bg-blue-500" />
                                        <span>{text}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-4">Instructions</h3>
                        <div className="space-y-4">
                            {(() => {
                                const instructions = recipe.recipeInstructions || recipe.instruction || [];
                                const list = Array.isArray(instructions) ? instructions : [instructions];

                                if (list.length === 0 || (list.length === 1 && !list[0])) {
                                    return <p className="text-neutral-500 italic">No instructions found.</p>;
                                }

                                return list.map((inst: any, i: number) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="font-bold text-neutral-400 font-mono">{(i + 1).toString().padStart(2, '0')}</div>
                                        <p className="text-neutral-700 dark:text-neutral-300">{inst.text || inst}</p>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row gap-4">
                    <button
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied JSON" : "Copy JSON"}
                    </button>
                    <button
                        onClick={handleSendToTandoor}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
                    >
                        <UploadCloud className="w-4 h-4" />
                        Send to Tandoor
                    </button>
                </div>
            </div>
        </div>
    );
}
