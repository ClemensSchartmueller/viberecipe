import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const apiKey = req.headers.get("x-gemini-api-key");
        if (!apiKey) {
            return NextResponse.json({ error: "Missing Gemini API Key" }, { status: 401 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const contentType = req.headers.get("content-type");
        let promptParts: any[] = [];
        let sourceUrl = "";

        if (contentType?.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file") as File;
            if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

            const bytes = await file.arrayBuffer();
            const base64Data = Buffer.from(bytes).toString("base64");

            promptParts = [
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type,
                    },
                },
            ];
        } else {
            const body = await req.json();
            const { content, type } = body;

            let textToAnalyze = content;
            if (type === 'url') {
                sourceUrl = content;
                try {
                    const response = await fetch(content, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });
                    const html = await response.text();
                    const $ = cheerio.load(html);
                    $('script').remove();
                    $('style').remove();
                    $('nav').remove();
                    $('footer').remove();
                    textToAnalyze = $('body').text().replace(/\s+/g, ' ').trim(); // Basic clean
                } catch (e) {
                    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 400 });
                }
            }
            promptParts = [textToAnalyze];
        }

        const systemPrompt = `
      You are a recipe extraction machine. 
      Extract the recipe from the provided content.
      Output strictly valid JSON-LD format adhering to schema.org/Recipe.
      
      RULES:
      1. Convert all units to valid Metric System (grams, ml, Celsius).
      2. If missing, infer resonable values or omit.
      3. For images, describe the dish as the description.
      4. Output ONLY the raw JSON string. Do not use markdown blocks (\`\`\`json).
      5. If the input is NOT a recipe, return { "error": "Not a recipe" }.
    `;

        // We pass system prompt as the first text part effectively or use systemInstruction if available 
        // but mixing text and images + system prompt in 'generateContent' argument list is standard for simple use.
        // Better to use systemInstruction from model config if supported, but simple prompt prepending works reliably.

        const result = await model.generateContent([systemPrompt, ...promptParts]);
        const response = await result.response;
        const text = response.text();

        // specific cleanup for Gemini 2.5 Flash which can be chatty
        const cleanJson = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .replace(/^[\s\S]*?\{/, '{') // Find first {
            .replace(/\}[^}]*$/, '}')    // Find last }
            .trim();

        try {
            const json = JSON.parse(cleanJson);
            // Inject source URL if we have it
            if (sourceUrl && !json.url) {
                json.url = sourceUrl;
            }

            // Normalize Image
            if (json.image) {
                if (typeof json.image === 'string') {
                    // Already a string, good.
                } else if (Array.isArray(json.image)) {
                    // Take first image
                    const first = json.image[0];
                    if (typeof first === 'string') json.image = first;
                    else if (typeof first === 'object' && first.url) json.image = first.url;
                    else json.image = null;
                } else if (typeof json.image === 'object') {
                    // Schema.org ImageObject
                    if (json.image.url) json.image = json.image.url;
                    else json.image = null;
                }

                // Validate it looks like a URL
                if (typeof json.image === 'string') {
                    if (!json.image.startsWith('http')) {
                         json.image = null;
                    } else {
                        // Check if the URL is actually reachable
                        try {
                            const check = await fetch(json.image, { 
                                method: 'HEAD',
                                signal: AbortSignal.timeout(2000) // 2s timeout
                            });
                            if (!check.ok) json.image = null;
                        } catch (e) {
                            json.image = null;
                        }
                    }
                }
            }

            // Pollinations.ai Fallback
            if (!json.image || (typeof json.image === 'string' && json.image.length === 0)) {
                const ingredients = Array.isArray(json.recipeIngredient) ? json.recipeIngredient.slice(0, 3).join(", ") : "";
                const prompt = encodeURIComponent(`Professional food photography of ${json.name || 'delicious food'}, ${ingredients}, high quality, lush lighting`);
                json.image = `https://pollinations.ai/p/${prompt}?model=flux&width=1024&height=1024`;
            }
            return NextResponse.json(json);
        } catch (e) {
            console.error("JSON Parse Error", text);
            return NextResponse.json({ error: "Failed to parse API response", raw: text }, { status: 500 });
        }

    } catch (error) {
        console.error("Gemini Extraction Error:", error);
        return NextResponse.json({
            error: "Extraction failed",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
