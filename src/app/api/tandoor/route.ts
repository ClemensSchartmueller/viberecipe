import { NextResponse } from "next/server";
import { TandoorClient } from "@/lib/tandoor-client";
import { createErrorResponse, logApi, logApiError } from "@/lib/api-helpers";
import { parseDuration, parseServings } from "@/lib/utils";
import { DEFAULT_RECIPE_DESCRIPTION } from "@/lib/constants";
import type { TandoorIngredient, TandoorStep, TandoorRecipePayload } from "@/types/tandoor";

const LOG_PREFIX = "Tandoor";

interface RecipePayload {
    name: string;
    description?: string;
    steps?: Array<{ instruction?: string; text?: string }>;
    ingredients?: Array<string | { food: string; unit?: string; quantity?: string | number }>;
    url?: string;
    image?: string;
    prepTime?: string;
    cookTime?: string;
    recipeYield?: string | number;
}

/**
 * Maps recipe ingredients to Tandoor's ingredient format.
 * 
 * @param ingredients - Array of ingredient strings or objects
 * @returns Array of Tandoor-formatted ingredients
 */
function mapIngredients(ingredients: RecipePayload['ingredients']): TandoorIngredient[] {
    if (!Array.isArray(ingredients)) return [];

    return ingredients.map((ing): TandoorIngredient => {
        if (typeof ing === 'string') {
            return {
                food: { name: ing },
                unit: null,
                amount: 0,
                note: ""
            };
        }

        return {
            food: { name: ing.food },
            unit: ing.unit ? { name: ing.unit } : null,
            amount: parseFloat(String(ing.quantity)) || 0,
            note: ""
        };
    });
}

/**
 * Maps recipe steps to Tandoor's step format.
 * Attaches all ingredients to the first step.
 * 
 * @param steps - Array of instruction steps
 * @param ingredients - Mapped ingredients to attach
 * @returns Array of Tandoor-formatted steps
 */
function mapSteps(
    steps: RecipePayload['steps'],
    ingredients: TandoorIngredient[]
): TandoorStep[] {
    if (!Array.isArray(steps) || steps.length === 0) {
        // Create dummy step for ingredients if no steps provided
        if (ingredients.length > 0) {
            return [{
                instruction: "Prepare ingredients",
                ingredients: ingredients
            }];
        }
        return [];
    }

    return steps.map((step, index): TandoorStep => ({
        instruction: step.instruction || step.text || JSON.stringify(step),
        // Attach all ingredients to first step
        ingredients: index === 0 ? ingredients : []
    }));
}

/**
 * Builds the Tandoor recipe payload from request data.
 */
function buildTandoorPayload(data: RecipePayload): TandoorRecipePayload {
    const mappedIngredients = mapIngredients(data.ingredients);
    const mappedSteps = mapSteps(data.steps, mappedIngredients);

    const workingTime = parseDuration(data.prepTime);
    const waitingTime = parseDuration(data.cookTime);
    const { amount: servings, text: servingsText } = parseServings(data.recipeYield);

    return {
        name: data.name,
        description: data.description || DEFAULT_RECIPE_DESCRIPTION,
        steps: mappedSteps,
        source_url: data.url,
        working_time: workingTime,
        waiting_time: waitingTime,
        servings: servings,
        servings_text: servingsText,
        internal: true
    };
}

/**
 * POST /api/tandoor
 * 
 * Creates a recipe in Tandoor from extracted recipe data.
 * Handles authentication, recipe creation, and image upload.
 */
export async function POST(req: Request): Promise<NextResponse> {
    try {
        const tandoorUrl = req.headers.get("x-tandoor-url");
        const token = req.headers.get("x-tandoor-token");

        if (!tandoorUrl || !token) {
            return createErrorResponse("Missing Tandoor configuration", 401);
        }

        const client = new TandoorClient({ baseUrl: tandoorUrl, token });
        const payload: RecipePayload = await req.json();

        logApi(LOG_PREFIX, `Creating recipe: ${payload.name}`);

        const tandoorPayload = buildTandoorPayload(payload);

        // Create recipe
        const { data: createdRecipe, error, status } = await client.createRecipe(tandoorPayload);

        if (!createdRecipe) {
            logApiError(LOG_PREFIX, `Creation failed: ${status}`, error);
            return createErrorResponse("Tandoor API Error", status, error);
        }

        logApi(LOG_PREFIX, `Recipe created with ID: ${createdRecipe.id}`);

        // Upload image if available
        if (payload.image && createdRecipe.id) {
            await client.uploadImageFromUrl(createdRecipe.id, payload.image);
        }

        return NextResponse.json(createdRecipe, { status: 201 });

    } catch (error) {
        logApiError(LOG_PREFIX, "Proxy Error", error);
        return createErrorResponse("Failed to send to Tandoor", 500);
    }
}
