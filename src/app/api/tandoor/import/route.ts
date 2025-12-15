import { NextResponse } from "next/server";
import { TandoorClient, refineTandoorSteps } from "@/lib/tandoor-client";
import { createErrorResponse, logApi, logApiError } from "@/lib/api-helpers";

const LOG_PREFIX = "Tandoor Import";

interface ImportRequestBody {
    url: string;
}

/**
 * POST /api/tandoor/import
 * 
 * Imports a recipe directly into Tandoor using its native URL parser.
 * This is a two-step process:
 * 1. Parse the URL using Tandoor's recipe-from-source endpoint
 * 2. Create the recipe using the parsed data
 * 3. Upload the image if available
 */
export async function POST(req: Request): Promise<NextResponse> {
    try {
        const tandoorUrl = req.headers.get("x-tandoor-url");
        const token = req.headers.get("x-tandoor-token");

        if (!tandoorUrl || !token) {
            return createErrorResponse("Missing Tandoor configuration", 401);
        }

        const body: ImportRequestBody = await req.json();
        const { url } = body;

        if (!url) {
            return createErrorResponse("Missing URL to import", 400);
        }

        const client = new TandoorClient({ baseUrl: tandoorUrl, token });

        logApi(LOG_PREFIX, `Importing from URL: ${url}`);

        // Step 1: Parse the recipe URL
        const parseResult = await client.parseRecipeFromUrl(url);

        if (!parseResult.data?.recipe_json) {
            // Handle specific error cases
            if (parseResult.status === 500) {
                return createErrorResponse(
                    "Tandoor failed to import this URL directly.",
                    502,
                    "The Tandoor server returned an internal error (500). This often means its internal scraper couldn't parse the website. Please try unchecking 'Use Tandoor Importer' to use VibeRecipe's AI extraction instead."
                );
            }

            if (!parseResult.data) {
                logApiError(LOG_PREFIX, `Parse Error ${parseResult.status}`, parseResult.error);
                return createErrorResponse("Tandoor Import Failed", parseResult.status, parseResult.error);
            }

            return createErrorResponse("No recipe data found in Tandoor response", 422);
        }

        const recipeJson = parseResult.data.recipe_json;
        logApi(LOG_PREFIX, `Parsed successfully: "${recipeJson.name}"`);

        // Refine steps if needed (split single giant steps)
        if (recipeJson.steps) {
            recipeJson.steps = refineTandoorSteps(recipeJson.steps);
        }

        // Step 2: Create the recipe
        const createResult = await client.createRecipe(recipeJson);

        if (!createResult.data) {
            logApiError(LOG_PREFIX, `Creation failed: ${createResult.status}`, createResult.error);
            return NextResponse.json({
                error: "Import parsed but failed to save.",
                details: createResult.error,
                parsed: parseResult.data
            }, { status: createResult.status });
        }

        logApi(LOG_PREFIX, `Recipe created with ID: ${createResult.data.id}`);

        // Step 3: Upload image if available
        if (recipeJson.image && createResult.data.id) {
            await client.uploadImageFromUrl(createResult.data.id, recipeJson.image);
        }

        return NextResponse.json(createResult.data, { status: 201 });

    } catch (error) {
        logApiError(LOG_PREFIX, "Proxy Error", error);
        return createErrorResponse("Failed to connect to Tandoor", 500);
    }
}
