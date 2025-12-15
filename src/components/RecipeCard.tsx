'use client';

import { Copy, UploadCloud, Check, Loader2, AlertCircle, RotateCcw, Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { STORAGE_KEYS, API_ROUTES } from '@/lib/constants';
import type { Recipe, RecipeIngredient, RecipeInstruction } from '@/types/recipe';

/**
 * Props for the RecipeCard component.
 */
interface RecipeCardProps {
    /** Recipe data to display */
    recipe: Recipe;
    /** Callback to retry extraction with the same input */
    onRetry?: () => void;
    /** Callback to reset and extract a new recipe */
    onReset?: () => void;
    /** Whether retry is in progress */
    isRetrying?: boolean;
}

type ImageStatus = 'loading' | 'loaded' | 'error';

/**
 * Formats an ingredient for display.
 * Handles both string and structured ingredient formats.
 */
function formatIngredient(ingredient: string | RecipeIngredient): string {
    if (typeof ingredient === 'string') {
        return ingredient;
    }

    const parts = [
        ingredient.quantity,
        ingredient.unit,
        ingredient.food
    ].filter(Boolean);

    return parts.join(' ');
}

/**
 * Formats an instruction for display.
 */
function formatInstruction(instruction: string | RecipeInstruction): string {
    if (typeof instruction === 'string') {
        return instruction;
    }
    return instruction.text || instruction.instruction || '';
}

/**
 * Gets Tandoor settings from localStorage.
 */
function getTandoorSettings(): { url: string; token: string } | null {
    const url = localStorage.getItem(STORAGE_KEYS.TANDOOR_BASE_URL);
    const token = localStorage.getItem(STORAGE_KEYS.TANDOOR_API_TOKEN);

    if (!url || !token) return null;
    return { url, token };
}

/**
 * Displays an extracted recipe with options to copy or send to Tandoor.
 */
export function RecipeCard({ recipe, onRetry, onReset, isRetrying = false }: RecipeCardProps) {
    const [copied, setCopied] = useState(false);
    const [imageStatus, setImageStatus] = useState<ImageStatus>('loading');
    const [isSending, setIsSending] = useState(false);

    /**
     * Copies the recipe JSON to clipboard.
     */
    const handleCopy = async () => {
        await navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    /**
     * Sends the recipe to Tandoor.
     */
    const handleSendToTandoor = async () => {
        const settings = getTandoorSettings();

        if (!settings) {
            alert("Please configure Tandoor settings first");
            return;
        }

        setIsSending(true);

        try {
            const payload = {
                name: recipe.name,
                description: recipe.description || "Imported via VibeRecipe",
                steps: getInstructions().map((inst) => ({
                    instruction: formatInstruction(inst)
                })),
                ingredients: recipe.recipeIngredient || [],
                url: recipe.url,
                image: recipe.image,
                prepTime: recipe.prepTime,
                cookTime: recipe.cookTime,
                recipeYield: recipe.recipeYield,
                internal: true
            };

            const res = await fetch(API_ROUTES.TANDOOR, {
                method: 'POST',
                headers: {
                    'x-tandoor-url': settings.url,
                    'x-tandoor-token': settings.token,
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
        } catch {
            alert("Network error sending to Tandoor.");
        } finally {
            setIsSending(false);
        }
    };

    /**
     * Gets instructions array from recipe (handles legacy format).
     */
    const getInstructions = (): (string | RecipeInstruction)[] => {
        const instructions = recipe.recipeInstructions || recipe.instruction || [];
        return Array.isArray(instructions) ? instructions : [instructions];
    };

    const instructions = getInstructions();
    const hasInstructions = instructions.length > 0 && instructions[0];

    return (
        <div className="w-full max-w-3xl mx-auto rounded-3xl bg-white dark:bg-neutral-900 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-700">
            {/* Hero Image Section */}
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={recipe.image}
                        alt={recipe.name}
                        className={cn(
                            "w-full h-full object-cover transition-opacity duration-500",
                            imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
                        )}
                        onLoad={() => setImageStatus('loaded')}
                        onError={() => setImageStatus('error')}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        No Image
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 p-8 text-white pointer-events-none">
                    <h2 className="text-3xl font-bold mb-2">{recipe.name}</h2>
                    <p className="opacity-90 line-clamp-2">{recipe.description}</p>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-8 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <StatCard label="Make Time" value={recipe.totalTime || recipe.cookTime} />
                    <StatCard label="Yield" value={recipe.recipeYield} />
                </div>

                {/* Recipe Details Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Ingredients */}
                    <div>
                        <h3 className="text-xl font-bold mb-4">Ingredients</h3>
                        <ul className="space-y-2">
                            {recipe.recipeIngredient?.map((ing, i) => (
                                <li key={i} className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300">
                                    <div className="min-w-1.5 h-1.5 mt-2 rounded-full bg-blue-500" />
                                    <span>{formatIngredient(ing)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Instructions */}
                    <div>
                        <h3 className="text-xl font-bold mb-4">Instructions</h3>
                        <div className="space-y-4">
                            {hasInstructions ? (
                                instructions.map((inst, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="font-bold text-neutral-400 font-mono">
                                            {(i + 1).toString().padStart(2, '0')}
                                        </div>
                                        <p className="text-neutral-700 dark:text-neutral-300">
                                            {formatInstruction(inst)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-neutral-500 italic">No instructions found.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row gap-4">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            disabled={isRetrying}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 font-medium transition-colors",
                                isRetrying
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                            )}
                        >
                            {isRetrying ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RotateCcw className="w-4 h-4" />
                            )}
                            {isRetrying ? "Retrying..." : "Retry"}
                        </button>
                    )}
                    {onReset && (
                        <button
                            onClick={onReset}
                            disabled={isRetrying}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 font-medium transition-colors",
                                isRetrying
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                            )}
                        >
                            <Plus className="w-4 h-4" />
                            New Recipe
                        </button>
                    )}
                    <button
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied JSON" : "Copy JSON"}
                    </button>
                    <button
                        onClick={handleSendToTandoor}
                        disabled={isSending}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium transition-opacity",
                            isSending ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
                        )}
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <UploadCloud className="w-4 h-4" />
                        )}
                        {isSending ? "Sending..." : "Send to Tandoor"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * A simple stat card for displaying recipe metadata.
 */
function StatCard({ label, value }: { label: string; value?: string | number }) {
    return (
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800">
            <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">
                {label}
            </div>
            <div className="text-lg font-semibold">
                {value || '—'}
            </div>
        </div>
    );
}
