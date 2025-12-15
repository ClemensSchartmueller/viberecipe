import { cleanAuthToken } from './utils';
import { AUTH_SCHEMES } from './constants';
import type {
    AuthScheme,
    TandoorConfig,
    TandoorRecipePayload,
    TandoorRecipeResponse,
    TandoorParseResponse,
    TandoorParsedRecipe
} from '@/types/tandoor';

/**
 * Client for interacting with the Tandoor Recipes API.
 * Handles authentication scheme fallback and common operations.
 */
export class TandoorClient {
    private baseUrl: string;
    private token: string;
    private authScheme: AuthScheme = AUTH_SCHEMES.TOKEN;

    constructor(config: TandoorConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.token = cleanAuthToken(config.token);
    }

    /**
     * Gets the authorization header value.
     */
    private getAuthHeader(): string {
        return `${this.authScheme} ${this.token}`;
    }

    /**
     * Builds a full URL for a Tandoor API endpoint.
     */
    private buildUrl(path: string): string {
        return new URL(path, this.baseUrl).toString();
    }

    /**
     * Makes a request with automatic auth scheme fallback.
     * If Token auth fails with 401/403, retries with Bearer.
     */
    private async fetchWithAuthFallback(
        url: string,
        options: RequestInit
    ): Promise<{ response: Response; authScheme: AuthScheme }> {
        const makeRequest = (scheme: AuthScheme) => {
            return fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `${scheme} ${this.token}`,
                },
            });
        };

        // Try Token first
        let response = await makeRequest(AUTH_SCHEMES.TOKEN);

        if (response.status === 401 || response.status === 403) {
            // Fallback to Bearer
            console.log('[TandoorClient] Token auth failed, retrying with Bearer...');
            this.authScheme = AUTH_SCHEMES.BEARER;
            response = await makeRequest(AUTH_SCHEMES.BEARER);
        } else {
            this.authScheme = AUTH_SCHEMES.TOKEN;
        }

        return { response, authScheme: this.authScheme };
    }

    /**
     * Parses a recipe from a URL using Tandoor's recipe-from-source endpoint.
     * 
     * @param url - The recipe URL to parse
     * @returns Parsed recipe data or null if parsing failed
     */
    async parseRecipeFromUrl(url: string): Promise<{
        data: TandoorParseResponse | null;
        error?: string;
        status: number;
    }> {
        const targetUrl = this.buildUrl('/api/recipe-from-source/');

        const { response } = await this.fetchWithAuthFallback(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': this.baseUrl,
                'Referer': this.buildUrl('/data/import/url'),
                'Accept': 'application/json, text/plain, */*',
            },
            body: JSON.stringify({
                url: url,
                data: ''
            }),
        });

        if (response.ok) {
            const data = await response.json() as TandoorParseResponse;
            return { data, status: response.status };
        }

        const errorText = await response.text();
        return {
            data: null,
            error: errorText,
            status: response.status
        };
    }

    /**
     * Creates a new recipe in Tandoor.
     * 
     * @param recipe - The recipe payload to create
     * @returns Created recipe data or error
     */
    async createRecipe(recipe: TandoorRecipePayload | TandoorParsedRecipe): Promise<{
        data: TandoorRecipeResponse | null;
        error?: string;
        status: number;
    }> {
        const targetUrl = this.buildUrl('/api/recipe/');

        const { response } = await this.fetchWithAuthFallback(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(recipe),
        });

        if (response.ok || response.status === 201) {
            const data = await response.json() as TandoorRecipeResponse;
            return { data, status: response.status };
        }

        const errorText = await response.text();
        return {
            data: null,
            error: errorText,
            status: response.status
        };
    }

    /**
     * Uploads an image for a recipe.
     * 
     * @param recipeId - The recipe ID to attach the image to
     * @param imageUrl - URL of the image to fetch and upload
     * @returns Success status
     */
    async uploadImageFromUrl(recipeId: number, imageUrl: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            console.log(`[TandoorClient] Fetching image from ${imageUrl}`);
            const imageResponse = await fetch(imageUrl);

            if (!imageResponse.ok) {
                return { success: false, error: 'Failed to fetch image' };
            }

            const imageBlob = await imageResponse.blob();
            const formData = new FormData();
            formData.append('image', imageBlob, 'recipe_image.jpg');

            const uploadUrl = this.buildUrl(`/api/recipe/${recipeId}/image/`);
            console.log(`[TandoorClient] Uploading image to ${uploadUrl}`);

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': this.getAuthHeader(),
                },
                body: formData,
            });

            if (uploadResponse.ok) {
                console.log('[TandoorClient] Image uploaded successfully');
                return { success: true };
            }

            const errorText = await uploadResponse.text();
            console.error('[TandoorClient] Image upload failed:', errorText);
            return { success: false, error: errorText };
        } catch (error) {
            console.error('[TandoorClient] Image upload error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

/**
 * Splits a single large step with newlines into multiple steps.
 * This is a refinement for recipes parsed by Tandoor that come as one giant step.
 * 
 * @param steps - Array of recipe steps
 * @returns Refined array with potentially more granular steps
 */
export function refineTandoorSteps<T extends { instruction?: string; ingredients?: unknown[]; show_ingredients_table?: boolean }>(
    steps: T[]
): T[] {
    if (!steps || steps.length !== 1) {
        return steps;
    }

    const singleStep = steps[0];
    if (!singleStep.instruction || !singleStep.instruction.includes('\n')) {
        return steps;
    }

    console.log('[TandoorClient] Refining: Splitting single step into multiple steps...');

    const lines = singleStep.instruction
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

    if (lines.length <= 1) {
        return steps;
    }

    return lines.map((line: string, index: number) => ({
        ...singleStep,
        instruction: line,
        // Keep ingredients attached to the first step only
        ingredients: index === 0 ? singleStep.ingredients : [],
        show_ingredients_table: index === 0 ? (singleStep.show_ingredients_table ?? true) : false
    } as T));
}
