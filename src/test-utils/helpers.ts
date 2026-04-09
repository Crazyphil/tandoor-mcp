/**
 * Test helpers for Tandoor MCP Server
 *
 * Provides utility functions for testing MCP responses and errors.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ErrorCodeType } from '../constants';

/**
 * Extract JSON from an MCP tool response
 *
 * @param response - The MCP response object
 * @returns The parsed JSON data
 */
export function parseToolResponse<T>(response: { content: { type: 'text'; text: string }[] }): T {
  return JSON.parse(response.content[0].text) as T;
}

/**
 * Check if an error is an McpError with a specific error code
 *
 * @param error - The error to check
 * @param errorCode - The MCP error code to match
 * @returns true if the error matches
 */
export function isMcpError(error: unknown, errorCode: ErrorCode): boolean {
  return error instanceof McpError && error.code === errorCode;
}

/**
 * Check if an MCP error response contains a specific error_code in its message
 *
 * @param error - The error to check
 * @param errorCode - The error code to look for in the message
 * @returns true if the message contains the error code
 */
export function hasErrorCode(error: unknown, errorCode: ErrorCodeType): boolean {
  if (!(error instanceof McpError)) return false;
  try {
    const parsed = JSON.parse(error.message);
    return parsed.error_code === errorCode;
  } catch {
    return false;
  }
}

/**
 * Extract error details from an McpError message
 *
 * @param error - The McpError
 * @returns The parsed error details, or null if parsing fails
 */
export function getErrorDetails(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof McpError)) return null;
  try {
    const parsed = JSON.parse(error.message);
    return parsed.details || null;
  } catch {
    return null;
  }
}

/**
 * Custom Jest matcher types for McpError
 *
 * Usage in tests:
 * ```typescript
 * expect(error).toBeMcpError(ErrorCode.InvalidParams);
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CustomMatchers<R = unknown> {
  toBeMcpError(expectedCode: ErrorCode): R;
  toHaveErrorCode(expectedCode: string): R;
}

// Extend Jest matchers (must be called in test setup)
export function setupCustomMatchers(): void {
  expect.extend({
    toBeMcpError(received: unknown, expectedCode: ErrorCode): { message: () => string; pass: boolean } {
      const pass = received instanceof McpError && received.code === expectedCode;
      return {
        message: (): string =>
          pass
            ? `Expected not to be McpError with code ${expectedCode}`
            : `Expected McpError with code ${expectedCode}, but got ${received}`,
        pass
      };
    },

    toHaveErrorCode(received: unknown, expectedCode: string): { message: () => string; pass: boolean } {
      let pass = false;
      let actualCode = 'not found';

      if (received instanceof McpError) {
        try {
          const parsed = JSON.parse(received.message);
          actualCode = parsed.error_code || 'not found';
          pass = parsed.error_code === expectedCode;
        } catch {
          actualCode = 'failed to parse';
        }
      }

      return {
        message: (): string =>
          pass
            ? `Expected not to have error code ${expectedCode}`
            : `Expected error code ${expectedCode}, but got ${actualCode}`,
        pass
      };
    }
  });
}
