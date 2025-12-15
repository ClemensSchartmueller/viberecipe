import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { createErrorResponse, logApi, logApiError } from "@/lib/api-helpers";
import { DEFAULT_USER_AGENT, POLLINATIONS_BASE_URL } from "@/lib/constants";
import type { Recipe } from "@/types/recipe";

const LOG_PREFIX = "Extract";

/**
 * System prompt for Gemini to extract recipe data as JSON-LD.
 */
const EXTRACTION_PROMPT = `
You are a recipe extraction machine. 
Extract the recipe from the provided content.
Output strictly valid JSON-LD format adhering to schema.org/Recipe.

RULES:
1. Convert all units to valid Metric System (grams, ml, Celsius).
2. If missing, infer reasonable values or omit.
3. For images, describe the dish as the description.
4. Output ONLY the raw JSON string. Do not use markdown blocks (\`\`\`json).
5. If the input is NOT a recipe, return { "error": "Not a recipe" }.
`;

/**
 * Fetches and cleans HTML content from a URL.
 * 
 * @param url - URL to fetch
 * @returns Cleaned text content from the page body
 */
async function fetchUrlContent(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: { 'User-Agent': DEFAULT_USER_AGENT }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove non-content elements
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();

    // Extract and clean body text
    return $('body').text().replace(/\s+/g, ' ').trim();
}

/**
 * Cleans Gemini response text to extract valid JSON.
 * Handles common issues like markdown code blocks and extra text.
 * 
 * @param text - Raw response text from Gemini
 * @returns Cleaned JSON string
 */
function cleanJsonResponse(text: string): string {
    return text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/^[\s\S]*?\{/, '{') // Find first {
        .replace(/\}[^}]*$/, '}')    // Find last }
        .trim();
}

/**
 * Normalizes the image field from various formats to a single URL string.
 * Handles arrays, ImageObjects, and validates the URL is accessible.
 * 
 * @param image - Raw image value from recipe data
 * @returns Normalized image URL or null
 */
async function normalizeImage(image: unknown): Promise<string | null> {
    if (!image) return null;

    let imageUrl: string | null = null;

    if (typeof image === 'string') {
        imageUrl = image;
    } else if (Array.isArray(image)) {
        const first = image[0];
        if (typeof first === 'string') {
            imageUrl = first;
        } else if (typeof first === 'object' && first?.url) {
            imageUrl = first.url;
        }
    } else if (typeof image === 'object' && (image as { url?: string }).url) {
        imageUrl = (image as { url: string }).url;
    }

    // Validate it looks like a URL and is reachable
    if (imageUrl && imageUrl.startsWith('http')) {
        try {
            const check = await fetch(imageUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(2000)
            });
            if (check.ok) return imageUrl;
        } catch {
            // Image not accessible
        }
    }

    return null;
}

/**
 * Generates a fallback image URL using Pollinations.ai.
 * 
 * @param recipe - Recipe data to generate prompt from
 * @returns Pollinations.ai image URL
 */
function generateFallbackImageUrl(recipe: Recipe): string {
    const ingredients = Array.isArray(recipe.recipeIngredient)
        ? recipe.recipeIngredient.slice(0, 3).join(", ")
        : "";

    const prompt = encodeURIComponent(
        `Professional food photography of ${recipe.name || 'delicious food'}, ${ingredients}, high quality, lush lighting`
    );

    return `${POLLINATIONS_BASE_URL}/${prompt}?model=flux&width=1024&height=1024`;
}

/**
 * POST /api/extract
 * 
 * Extracts recipe data from various input types using Gemini AI.
 * Supports URL scraping, text content, and image uploads.
 */
export async function POST(req: Request): Promise<NextResponse> {
    try {
        const apiKey = req.headers.get("x-gemini-api-key");
        if (!apiKey) {
            return createErrorResponse("Missing Gemini API Key", 401);
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const contentType = req.headers.get("content-type");
        let promptParts: (string | { inlineData: { data: string; mimeType: string } })[] = [];
        let sourceUrl = "";

        // Handle multipart form data (image uploads)
        if (contentType?.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file") as File;

            if (!file) {
                return createErrorResponse("No file provided", 400);
            }

            const bytes = await file.arrayBuffer();
            const base64Data = Buffer.from(bytes).toString("base64");

            promptParts = [{
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            }];
        } else {
            // Handle JSON body (URL or text content)
            const body = await req.json();
            const { content, type } = body;

            let textToAnalyze = content;

            if (type === 'url') {
                sourceUrl = content;
                try {
                    textToAnalyze = await fetchUrlContent(content);
                } catch {
                    return createErrorResponse("Failed to fetch URL", 400);
                }
            }

            promptParts = [textToAnalyze];
        }

        // Call Gemini for extraction
        const result = await model.generateContent([EXTRACTION_PROMPT, ...promptParts]);
        const response = await result.response;
        const text = response.text();

        // Parse and normalize the response
        const cleanJson = cleanJsonResponse(text);

        try {
            const recipe: Recipe = JSON.parse(cleanJson);

            // Inject source URL if available
            if (sourceUrl && !recipe.url) {
                recipe.url = sourceUrl;
            }

            // Normalize image field
            recipe.image = await normalizeImage(recipe.image);

            // Generate fallback image if needed
            if (!recipe.image) {
                recipe.image = generateFallbackImageUrl(recipe);
            }

            logApi(LOG_PREFIX, `Extracted recipe: ${recipe.name}`);
            return NextResponse.json(recipe);
        } catch {
            logApiError(LOG_PREFIX, "JSON Parse Error", text);
            return createErrorResponse("Failed to parse API response", 500, text);
        }

    } catch (error) {
        logApiError(LOG_PREFIX, "Extraction Error", error);
        return createErrorResponse(
            "Extraction failed",
            500,
            error instanceof Error ? error.message : String(error)
        );
    }
}
