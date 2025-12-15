import { NextResponse } from 'next/server';

/**
 * Creates a standardized JSON error response.
 * 
 * @param message - User-facing error message
 * @param status - HTTP status code
 * @param details - Optional additional details for debugging
 * @returns NextResponse with error JSON
 */
export function createErrorResponse(
    message: string,
    status: number,
    details?: string | object
): NextResponse {
    const body: { error: string; details?: string | object } = { error: message };

    if (details !== undefined) {
        body.details = details;
    }

    return NextResponse.json(body, { status });
}

/**
 * Validates that required headers are present in a request.
 * 
 * @param req - The incoming request
 * @param headerNames - Array of required header names
 * @returns Object with extracted headers or error response
 */
export function validateRequiredHeaders(
    req: Request,
    headerNames: string[]
): { headers: Record<string, string>; error?: never } | { headers?: never; error: NextResponse } {
    const headers: Record<string, string> = {};

    for (const name of headerNames) {
        const value = req.headers.get(name);
        if (!value) {
            return {
                error: createErrorResponse(
                    `Missing required header: ${name}`,
                    401
                )
            };
        }
        headers[name] = value;
    }

    return { headers };
}

/**
 * Safely parses JSON from a request body.
 * 
 * @param req - The incoming request
 * @returns Parsed JSON or error response
 */
export async function safeParseJson<T = unknown>(
    req: Request
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
    try {
        const data = await req.json() as T;
        return { data };
    } catch {
        return {
            error: createErrorResponse('Invalid JSON body', 400)
        };
    }
}

/**
 * Logs a message with a consistent prefix for API routes.
 * 
 * @param prefix - Route identifier (e.g., "Tandoor Import")
 * @param message - Log message
 * @param data - Optional data to log
 */
export function logApi(prefix: string, message: string, data?: unknown): void {
    const formatted = `[${prefix}] ${message}`;
    if (data !== undefined) {
        console.log(formatted, data);
    } else {
        console.log(formatted);
    }
}

/**
 * Logs an error with a consistent prefix for API routes.
 */
export function logApiError(prefix: string, message: string, error?: unknown): void {
    console.error(`[${prefix}] ${message}`, error ?? '');
}
