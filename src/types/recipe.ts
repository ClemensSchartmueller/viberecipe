/**
 * Structured ingredient with quantity, unit, and food name.
 * Used for parsed/normalized recipe data.
 */
export interface RecipeIngredient {
    food: string;
    unit?: string;
    quantity?: number | string;
    note?: string;
}

/**
 * Recipe instruction step.
 * Can be a simple string or an object with text property.
 */
export interface RecipeInstruction {
    text?: string;
    instruction?: string;
}

/**
 * Main recipe interface following schema.org/Recipe structure.
 * This is the format used throughout the application for recipe data.
 */
export interface Recipe {
    /** Recipe title */
    name: string;

    /** Brief description of the dish */
    description?: string;

    /** Source URL if scraped from web */
    url?: string;

    /** Image URL (string after normalization) */
    image?: string | null;

    /** Prep time in ISO 8601 duration format (e.g., "PT30M") */
    prepTime?: string;

    /** Cook time in ISO 8601 duration format */
    cookTime?: string;

    /** Total time in ISO 8601 duration format */
    totalTime?: string;

    /** Number of servings or yield description */
    recipeYield?: string | number;

    /** List of ingredients (strings or structured objects) */
    recipeIngredient?: (string | RecipeIngredient)[];

    /** Cooking instructions */
    recipeInstructions?: (string | RecipeInstruction)[];

    /** Alternative field for instructions (legacy compatibility) */
    instruction?: string | RecipeInstruction[];

    /** Schema.org type indicator */
    '@type'?: 'Recipe';

    /** Schema.org context */
    '@context'?: string;
}

/**
 * Request body for the extract API route.
 */
export interface ExtractRequestBody {
    content: string;
    type: 'url' | 'text';
}

/**
 * Options passed to the extract handler.
 */
export interface ExtractOptions {
    useTandoorImport?: boolean;
}
