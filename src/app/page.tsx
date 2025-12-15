'use client';

import { MagicPasteInput } from "@/components/MagicPasteInput";
import { SettingsPanel } from "@/components/SettingsPanel";
import { RecipeCard } from "@/components/RecipeCard";
import { useState } from "react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);

  const handleExtract = async (content: string | File, options?: { useTandoorImport?: boolean }) => {
    setIsLoading(true);
    setRecipe(null);

    // Common Prep: Check API Keys
    const apiKey = localStorage.getItem('GEMINI_API_KEY');

    // If Tandoor Direct Import is requested
    if (options?.useTandoorImport && typeof content === 'string' && content.startsWith('http')) {
      const tandoorUrl = localStorage.getItem('TANDOOR_BASE_URL');
      const tandoorToken = localStorage.getItem('TANDOOR_API_TOKEN');

      if (!tandoorUrl || !tandoorToken) {
        alert("Please set Tandoor URL and Token in Settings for direct import!");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/tandoor/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tandoor-url': tandoorUrl,
            'x-tandoor-token': tandoorToken
          },
          body: JSON.stringify({ url: content })
        });

        if (res.ok) {
          const data = await res.json();
          alert(`Successfully imported "${data.name || 'Recipe'}" to Tandoor!`);
          // Optionally we could show it, but user asked to just forward it.
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
      return;
    }

    // Default: Gemini Extraction
    if (!apiKey) {
      alert("Please set your Gemini API Key in Settings first!");
      setIsLoading(false);
      return;
    }

    try {
      let body: any;
      let headers: HeadersInit = {
        'x-gemini-api-key': apiKey,
      };

      if (content instanceof File) {
        const formData = new FormData();
        formData.append('file', content);
        body = formData;
        // Don't set Content-Type for FormData, browser does it
      } else {
        body = JSON.stringify({
          content: content,
          type: content.startsWith('http') ? 'url' : 'text'
        });
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch('/api/extract', {
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

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100 font-sans">
      <SettingsPanel />

      <div className="w-full max-w-3xl flex flex-col gap-12 pt-12 md:pt-20 pb-20">
        <header className="text-center space-y-4 animate-in fade-in slide-in-from-top-10 duration-700">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent transform hover:scale-105 transition-transform cursor-default">
            VibeRecipe
          </h1>
          <p className="text-xl md:text-2xl text-neutral-500 dark:text-neutral-400 font-light">
            Transform chaos into delicious structure.
          </p>
        </header>

        <section className="w-full space-y-12">
          {!recipe && (
            <div className="animate-in fade-in duration-500">
              <MagicPasteInput onSubmit={handleExtract} isLoading={isLoading} />
            </div>
          )}

          {recipe && (
            <RecipeCard recipe={recipe} />
          )}

          {recipe && (
            <div className="text-center">
              <button
                onClick={() => setRecipe(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm transition-colors"
              >
                Extract another recipe
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
