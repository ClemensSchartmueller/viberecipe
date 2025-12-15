import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes with proper precedence handling.
 * Combines clsx for conditional classes with tailwind-merge for deduplication.
 * 
 * @example
 * cn("px-2 py-1", condition && "bg-blue-500", "px-4")
 * // Returns "py-1 px-4 bg-blue-500" (px-4 overrides px-2)
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/**
 * Parses an ISO 8601 duration string (e.g., "PT1H30M") to minutes.
 * 
 * @param isoDuration - Duration string in PT#H#M format
 * @returns Total duration in minutes
 * 
 * @example
 * parseDuration("PT1H30M") // Returns 90
 * parseDuration("PT45M")   // Returns 45
 */
export function parseDuration(isoDuration: string | undefined): number {
    if (!isoDuration) return 0;

    const durationRegex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
    const match = isoDuration.match(durationRegex);

    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);

    return (hours * 60) + minutes;
}

/**
 * Parses a recipe yield/servings value into a structured format.
 * Handles both numeric and string inputs (e.g., "4 servings", "6-8 portions").
 * 
 * @param yieldValue - The yield value from recipe data
 * @returns Object with numeric amount and original text
 * 
 * @example
 * parseServings("4 servings") // Returns { amount: 4, text: "4 servings" }
 * parseServings(6)            // Returns { amount: 6, text: "" }
 */
export function parseServings(yieldValue: string | number | undefined): { amount: number; text: string } {
    if (!yieldValue) return { amount: 1, text: '' };
    if (typeof yieldValue === 'number') return { amount: yieldValue, text: '' };

    const match = yieldValue.match(/(\d+)/);
    const amount = match ? parseInt(match[1], 10) : 1;
    const text = yieldValue.trim();

    return { amount, text };
}

/**
 * Cleans an authentication token by removing any existing scheme prefix.
 * Handles both "Bearer" and "Token" prefixes.
 * 
 * @param token - The raw token string (may include prefix)
 * @returns Clean token without scheme prefix
 */
export function cleanAuthToken(token: string): string {
    return token.replace(/^(Bearer|Token)\s+/i, '').trim();
}
