/**
 * Authentication scheme types supported by Tandoor API.
 */
export type AuthScheme = 'Token' | 'Bearer';

/**
 * Tandoor-formatted ingredient for API requests.
 */
export interface TandoorIngredient {
    food: { name: string };
    unit: { name: string } | null;
    amount: number;
    note: string;
}

/**
 * Tandoor-formatted recipe step.
 */
export interface TandoorStep {
    instruction: string;
    ingredients: TandoorIngredient[];
    show_ingredients_table?: boolean;
}

/**
 * Payload structure for creating a recipe in Tandoor.
 */
export interface TandoorRecipePayload {
    name: string;
    description: string;
    steps: TandoorStep[];
    source_url?: string;
    working_time: number;
    waiting_time: number;
    servings: number;
    servings_text: string;
    internal: boolean;
}

/**
 * Response from Tandoor after creating a recipe.
 */
export interface TandoorRecipeResponse {
    id: number;
    name: string;
    [key: string]: unknown;
}

/**
 * Response from Tandoor's recipe-from-source parsing endpoint.
 */
export interface TandoorParseResponse {
    recipe_json?: TandoorParsedRecipe;
    [key: string]: unknown;
}

/**
 * Parsed recipe data returned from Tandoor's importer.
 */
export interface TandoorParsedRecipe {
    name: string;
    image?: string;
    steps?: TandoorStep[];
    [key: string]: unknown;
}

/**
 * Configuration for connecting to a Tandoor instance.
 */
export interface TandoorConfig {
    baseUrl: string;
    token: string;
}

/**
 * Headers required for Tandoor API proxy requests.
 */
export interface TandoorProxyHeaders {
    'x-tandoor-url': string;
    'x-tandoor-token': string;
}
