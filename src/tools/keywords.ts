/**
 * Keyword tool handlers for Tandoor MCP Server
 *
 * Tools for listing, searching, and creating keywords in Tandoor.
 *
 * This module uses the factory pattern to create handler functions
 * that are pre-bound to a TandoorApiClient instance.
 */

import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { TandoorApiClient } from "../api/client";
import { handleApiError, createEntityExistsError, isAxiosError } from "../utils/errors";
import { createJsonResponse } from "../utils/response";
import { HTTP_CONFLICT } from "../constants";

/**
 * Handler function type for MCP tools
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler<T = any> = (args: T, extra: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>;

/**
 * Keyword tool handlers interface
 */
interface KeywordToolHandlers {
  listAll: ToolHandler<{ page?: number; page_size?: number }>;
  search: ToolHandler<{ query: string }>;
  create: ToolHandler<{ name: string }>;
}

/**
 * Create keyword tool handlers bound to a TandoorApiClient instance
 *
 * @param client - The TandoorApiClient to use for API calls
 * @returns Object containing listAll, search, and create handler functions
 */
export function createKeywordToolHandlers(client: TandoorApiClient): KeywordToolHandlers {
  /**
   * List all keywords with pagination
   */
  const listAll = async (
    args: { page?: number; page_size?: number },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { page = 1, page_size = 20 } = args;

    try {
      const result = await client.listAllKeywords(page, page_size);
      return createJsonResponse(result);
    } catch (error) {
      throw handleApiError(error, 'keyword');
    }
  };

  /**
   * Search for keywords by query string
   */
  const search = async (
    args: { query: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { query } = args;

    if (!query || query.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing required argument: query"
      );
    }

    try {
      const result = await client.searchKeyword(query);
      return createJsonResponse(result);
    } catch (error) {
      throw handleApiError(error, 'keyword');
    }
  };

  /**
   * Create a new keyword in Tandoor
   *
   * Per MCP spec: First checks if keyword already exists by name (case-insensitive).
   * If it exists, returns entity_already_exists error with the existing entity info.
   * If not, creates the new keyword.
   */
  const create = async (
    args: { name: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { name } = args;

    if (!name || name.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing required argument: name"
      );
    }

    try {
      // Per spec: MUST check for existence first by searching
      const existingKeywords = await client.searchKeyword(name);
      const normalizedName = name.trim().toLowerCase();
      const existingKeyword = existingKeywords.find(
        k => k.name.toLowerCase() === normalizedName
      );

      if (existingKeyword) {
        // Entity already exists - return error with existing entity info
        throw createEntityExistsError('keyword', name, existingKeyword.id);
      }

      // Entity doesn't exist - create it
      const result = await client.createKeyword(name);
      return createJsonResponse(result);
    } catch (error) {
      // If it's already an entity_already_exists error, re-throw it directly
      if (error instanceof McpError) {
        const errorMessage = error.message;
        try {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error_code === 'entity_already_exists') {
            throw error;
          }
        } catch {
          // Not JSON or no error_code, continue with normal handling
        }
      }
      // Handle 409 Conflict if Tandoor returns it in the future
      if (isAxiosError(error) && error.response?.status === HTTP_CONFLICT) {
        throw createEntityExistsError('keyword', name);
      }
      throw handleApiError(error, 'keyword', name);
    }
  };

  return {
    listAll,
    search,
    create
  };
}

// Keep old names for backward compatibility during transition
/** @deprecated Use createKeywordToolHandlers instead */
export const createKeywordToolHandlersOld = createKeywordToolHandlers;
