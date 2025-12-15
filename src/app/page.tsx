'use client';

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { MagicPasteInput } from "@/components/MagicPasteInput";
import { SettingsPanel } from "@/components/SettingsPanel";
import { RecipeCard } from "@/components/RecipeCard";
import { STORAGE_KEYS, API_ROUTES } from "@/lib/constants";
import type { Recipe } from "@/types/recipe";

/**
 * Options for extraction/import.
 */
interface ExtractOptions {
  useTandoorImport?: boolean;
}

/**
 * Stored input for retry functionality.
 */
interface LastInput {
  content: string | File;
  options?: ExtractOptions;
}

/**
 * Main page component for VibeRecipe.
 * Handles recipe extraction from various sources and displays results.
 */
export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const lastInputRef = useRef<LastInput | null>(null);

  /**
   * Handles content submission for extraction or import.
   * 
   * @param content - URL, text, or File to extract from
   * @param options - Extraction options (e.g., useTandoorImport)
   */
  const handleExtract = useCallback(async (content: string | File, options?: ExtractOptions) => {
    // Store input for potential retry
    lastInputRef.current = { content, options };

    setIsLoading(true);
    setRecipe(null);

    // If Tandoor Direct Import is requested for URLs
    if (options?.useTandoorImport && typeof content === 'string' && content.startsWith('http')) {
      await handleTandoorImport(content);
      return;
    }



    // Default: Gemini Extraction
    await handleGeminiExtraction(content);
  }, []);

  /**
   * Handles direct import to Tandoor using their native parser.
   */
  const handleTandoorImport = async (url: string) => {
    const tandoorUrl = localStorage.getItem(STORAGE_KEYS.TANDOOR_BASE_URL);
    const tandoorToken = localStorage.getItem(STORAGE_KEYS.TANDOOR_API_TOKEN);

    if (!tandoorUrl || !tandoorToken) {
      alert("Please set Tandoor URL and Token in Settings for direct import!");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(API_ROUTES.TANDOOR_IMPORT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tandoor-url': tandoorUrl,
          'x-tandoor-token': tandoorToken
        },
        body: JSON.stringify({ url })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Successfully imported "${data.name || 'Recipe'}" to Tandoor!`);
      } else {
        const err = await res.json();
        throw new Error(err.details || err.error || "Tandoor import failed");
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles extraction using Gemini AI.
   */
  const handleGeminiExtraction = async (content: string | File) => {
    const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);

    if (!apiKey) {
      alert("Please set your Gemini API Key in Settings first!");
      setIsLoading(false);
      return;
    }

    try {
      const { body, headers } = buildExtractRequest(content, apiKey);

      const res = await fetch(API_ROUTES.EXTRACT, {
        method: 'POST',
        headers,
        body
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Extraction failed');
      }

      setRecipe(data);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Builds the request body and headers for the extract API.
   */
  const buildExtractRequest = (content: string | File, apiKey: string): {
    body: FormData | string;
    headers: HeadersInit;
  } => {
    const headers: HeadersInit = {
      'x-gemini-api-key': apiKey,
    };

    if (content instanceof File) {
      const formData = new FormData();
      formData.append('file', content);
      return { body: formData, headers };
    }

    headers['Content-Type'] = 'application/json';
    return {
      body: JSON.stringify({
        content,
        type: content.startsWith('http') ? 'url' : 'text'
      }),
      headers
    };
  };

  /**
   * Retries extraction with the last input.
   */
  const handleRetry = () => {
    if (lastInputRef.current) {
      handleExtract(lastInputRef.current.content, lastInputRef.current.options);
    }
  };

  /**
   * Resets state to extract another recipe.
   */
  const handleReset = () => {
    setRecipe(null);
    lastInputRef.current = null;
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 font-sans">
      <SettingsPanel />

      <div className="w-full max-w-3xl flex flex-col gap-12 pt-12 md:pt-20 pb-20">
        {/* Hero Header */}
        <header className="text-center space-y-4 animate-in fade-in slide-in-from-top-10 duration-700 flex flex-col items-center">
          <div className="relative w-24 h-24 md:w-32 md:h-32 mb-2 transform hover:scale-105 transition-transform duration-500">
            <Image
              src="/logo.svg"
              alt="VibeRecipe Logo"
              fill
              className="object-contain dark:invert"
              priority
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-neutral-900 dark:text-white cursor-default">
            VibeRecipe
          </h1>
          <p className="text-xl md:text-2xl text-neutral-500 dark:text-neutral-400 font-light">
            Transform chaos into delicious structure.
          </p>
        </header>

        {/* Main Content */}
        <section className="w-full space-y-12">
          {!recipe && (
            <div className="animate-in fade-in duration-500">
              <MagicPasteInput onSubmit={handleExtract} isLoading={isLoading} />
            </div>
          )}

          {recipe && (
            <RecipeCard
              recipe={recipe}
              onRetry={handleRetry}
              onReset={handleReset}
              isRetrying={isLoading}
            />
          )}
        </section>
      </div>
    </main>
  );
}
