/**
 * Food tool handlers for Tandoor MCP Server
 *
 * Tools for listing, searching, and creating foods in Tandoor.
 *
 * This module uses the factory pattern to create handler functions
 * that are pre-bound to a TandoorApiClient instance.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TandoorApiClient } from '../api/client';
import { handleApiError, createEntityExistsError, isAxiosError, isEntityExistsError } from '../utils/errors';
import { createJsonResponse } from '../utils/response';
import { HTTP_CONFLICT } from '../constants';

/**
 * Handler function type for MCP tools
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler<T = any> = (args: T, extra: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>;

/**
 * Food tool handlers interface
 */
interface FoodToolHandlers {
  listAll: ToolHandler<{ page?: number; page_size?: number }>;
  search: ToolHandler<{ query: string }>;
  create: ToolHandler<{ name: string; plural_name?: string; url?: string }>;
}

/**
 * Create food tool handlers bound to a TandoorApiClient instance
 *
 * @param client - The TandoorApiClient to use for API calls
 * @returns Object containing listAll, search, and create handler functions
 */
export function createFoodToolHandlers(client: TandoorApiClient): FoodToolHandlers {
  /**
   * List all foods with pagination
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const listAll = async (
    args: { page?: number; page_size?: number },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { page = 1, page_size = 20 } = args;

    try {
      const result = await client.listAllFoods(page, page_size);
      return createJsonResponse(result);
    } catch (error) {
      throw handleApiError(error, 'food');
    }
  };

  /**
   * Search for foods by query string
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
      const result = await client.searchFood(query);
      return createJsonResponse(result);
    } catch (error) {
      throw handleApiError(error, 'food');
    }
  };

  /**
   * Create a new food in Tandoor
   *
   * Per MCP spec: First checks if food already exists by name (case-insensitive).
   * If it exists, returns entity_already_exists error with the existing entity info.
   * If not, creates the new food.
   */
  const create = async (
    args: { name: string; plural_name?: string; url?: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { name, plural_name, url } = args;

    if (!name || name.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing required argument: name"
      );
    }

    try {
      // Per spec: MUST check for existence first by searching
      const existingFoods = await client.searchFood(name);
      const normalizedName = name.trim().toLowerCase();
      const existingFood = existingFoods.find(
        f => f.name.toLowerCase() === normalizedName
      );

      if (existingFood) {
        // Entity already exists - return error with existing entity info
        throw createEntityExistsError('food', name, existingFood.id);
      }

      // Entity doesn't exist - create it
      const result = await client.createFood(name, plural_name, url);
      return createJsonResponse(result);
    } catch (error) {
      // If it's already an entity_already_exists error, re-throw it directly
      if (isEntityExistsError(error)) {
        throw error;
      }
      // Handle 409 Conflict if Tandoor returns it in the future
      if (isAxiosError(error) && error.response?.status === HTTP_CONFLICT) {
        throw createEntityExistsError('food', name);
      }
      throw handleApiError(error, 'food', name);
    }
  };

  return {
    listAll,
    search,
    create
  };
}
