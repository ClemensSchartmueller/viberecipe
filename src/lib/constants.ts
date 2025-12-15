/**
 * localStorage keys for persisted settings.
 * Use these constants instead of hardcoded strings.
 */
export const STORAGE_KEYS = {
    GEMINI_API_KEY: 'GEMINI_API_KEY',
    TANDOOR_BASE_URL: 'TANDOOR_BASE_URL',
    TANDOOR_API_TOKEN: 'TANDOOR_API_TOKEN',
} as const;

/**
 * Internal API route paths.
 */
export const API_ROUTES = {
    EXTRACT: '/api/extract',
    TANDOOR: '/api/tandoor',
    TANDOOR_IMPORT: '/api/tandoor/import',
} as const;

/**
 * Supported authentication schemes for Tandoor API.
 */
export const AUTH_SCHEMES = {
    TOKEN: 'Token',
    BEARER: 'Bearer',
} as const;

/**
 * User-Agent string for server-side fetching.
 * Mimics a standard browser to avoid bot detection.
 */
export const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

/**
 * Default description for imported recipes.
 */
export const DEFAULT_RECIPE_DESCRIPTION = 'Imported via VibeRecipe';

/**
 * Pollinations.ai base URL for image generation.
 */
export const POLLINATIONS_BASE_URL = 'https://pollinations.ai/p';
