/**
 * Error handling utilities for Tandoor MCP Server
 *
 * Provides centralized error handling, consistent error formatting,
 * and utilities for converting API errors to MCP errors.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  ENTITY_ALREADY_EXISTS,
  MISSING_ENTITIES,
  API_SCHEMA_MISMATCH,
  UNEXPECTED_ERROR,
  HTTP_CONFLICT,
  HTTP_UNAUTHORIZED
} from '../constants';

/**
 * Custom error class for Tandoor MCP with structured error codes
 */
export class TandoorMcpError extends McpError {
  public readonly errorCode: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    errorCode: string,
    message: string,
    details?: Record<string, unknown>,
    mcpErrorCode: ErrorCode = ErrorCode.InternalError
  ) {
    super(mcpErrorCode, message);
    this.errorCode = errorCode;
    this.details = details;
  }
}

/**
 * Extract HTTP status code from an Axios-like error object
 */
function extractHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number; data?: unknown } };
    return axiosError.response?.status;
  }
  return undefined;
}

/**
 * Extract error details from an Axios-like error object
 */
function extractErrorDetails(error: unknown): unknown {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number; data?: unknown }; message?: string };
    return axiosError.response?.data ?? axiosError.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Handle API errors and convert them to appropriate MCP errors
 *
 * @param error - The error from the API call
 * @param entityType - Optional entity type for context (e.g., 'food', 'unit', 'keyword')
 * @param entityName - Optional entity name for context
 * @returns McpError with appropriate error code and message
 */
export function handleApiError(
  error: unknown,
  entityType?: string,
  entityName?: string
): McpError {
  const status = extractHttpStatus(error);
  const details = extractErrorDetails(error);

  // Handle 409 Conflict - entity already exists
  if (status === HTTP_CONFLICT && entityType && entityName) {
    return createEntityExistsError(entityType, entityName);
  }

  // Handle 401 Unauthorized
  if (status === HTTP_UNAUTHORIZED) {
    return new McpError(
      ErrorCode.InvalidRequest,
      JSON.stringify({
        error_code: 'auth_failed',
        details: { message: 'Authentication failed. Check your API token.' }
      })
    );
  }

  // Handle other 4xx/5xx errors
  if (status && status >= 400) {
    return new McpError(
      ErrorCode.InternalError,
      JSON.stringify({
        error_code: API_SCHEMA_MISMATCH,
        details: {
          http_status: status,
          message: details
        }
      })
    );
  }

  // Handle unknown errors
  const message = error instanceof Error ? error.message : String(error);
  return new McpError(
    ErrorCode.InternalError,
    JSON.stringify({
      error_code: UNEXPECTED_ERROR,
      details: { message }
    })
  );
}

/**
 * Create a consistent "entity already exists" error for 409 Conflict responses
 *
 * @param entityType - Type of entity (e.g., 'food', 'unit', 'keyword')
 * @param entityName - Name of the entity that already exists
 * @returns McpError with structured error details and suggestions
 */
export function createEntityExistsError(
  entityType: string,
  entityName: string
): McpError {
  const searchTool = `search_${entityType}`;
  const listTool = `list_all_${entityType}s`;

  return new McpError(
    ErrorCode.InvalidParams,
    JSON.stringify({
      error_code: ENTITY_ALREADY_EXISTS,
      details: {
        entity_type: entityType,
        entity_name: entityName
      },
      suggestions: [
        `${capitalize(entityType)} '${entityName}' already exists in database`,
        `Use ${searchTool}() or ${listTool}() to verify existence before calling create_${entityType}()`,
        'If you need to use this entity, reference its existing ID'
      ]
    })
  );
}

/**
 * Create a "missing entities" error for recipe import validation failures
 *
 * @param missing - Array of missing entity descriptions
 * @returns McpError with structured error details
 */
export function createMissingEntitiesError(missing: string[]): McpError {
  return new McpError(
    ErrorCode.InvalidParams,
    JSON.stringify({
      error_code: MISSING_ENTITIES,
      details: { missing },
      suggestions: [
        'Create missing foods using create_food()',
        'Create missing units using create_unit()',
        'Create missing keywords using create_keyword()',
        'Use list_all_* tools to check existing entities'
      ]
    })
  );
}

/**
 * Capitalize the first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Type guard to check if an error is an Axios-like error with response
 */
export function isAxiosError(error: unknown): error is { response?: { status?: number; data?: unknown } } {
  return error !== null &&
    typeof error === 'object' &&
    'response' in error;
}
