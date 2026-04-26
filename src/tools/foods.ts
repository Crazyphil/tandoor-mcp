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
import { handleApiError, createEntityExistsError, isEntityExistsError } from '../utils/errors';
import { createJsonResponse } from '../utils/response';

/**
 * Handler function type for MCP tools
 */
type ToolHandler<T = Record<string, unknown>> = (args: T, extra: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>;

/**
 * Food tool handlers interface
 */
interface FoodToolHandlers {
  listAll: ToolHandler<{ page?: number; page_size?: number }>;
  search: ToolHandler<{ query: string }>;
  create: ToolHandler<{ name: string; plural_name?: string }>;
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
  const listAll = async (
    args: { page?: number; page_size?: number },
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
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { query } = args;

    if (!query || query.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing required argument: query'
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
    args: { name: string; plural_name?: string },
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { name, plural_name } = args;

    if (!name || name.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing required argument: name'
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
      const result = await client.createFood(name, plural_name);
      return createJsonResponse(result);
    } catch (error) {
      // If it's already an entity_already_exists error, re-throw it directly
      if (isEntityExistsError(error)) {
        throw error;
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
