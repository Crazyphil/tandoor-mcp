/**
 * Response utilities for Tandoor MCP Server
 *
 * Standardizes MCP tool response formatting and reduces boilerplate.
 */

/**
 * Standard MCP tool response with JSON content
 *
 * @param data - The data to serialize as JSON in the response
 * @returns MCP tool response object with properly formatted content
 */
export function createJsonResponse<T>(data: T): { content: { type: 'text'; text: string }[] } {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
  };
}

/**
 * MCP tool response with plain text content
 *
 * @param text - The text content for the response
 * @returns MCP tool response object with text content
 */
export function createTextResponse(text: string): { content: { type: 'text'; text: string }[] } {
  return {
    content: [{ type: 'text' as const, text }]
  };
}

/**
 * MCP tool response with error information
 *
 * @param errorCode - Error code string
 * @param message - Error message
 * @param details - Optional additional error details
 * @returns MCP tool response object with structured error
 */
export function createErrorResponse(
  errorCode: string,
  message: string,
  details?: Record<string, unknown>
): { content: { type: 'text'; text: string }[] } {
  return createJsonResponse({
    error_code: errorCode,
    message,
    details
  });
}
