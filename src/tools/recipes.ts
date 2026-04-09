/**
 * Recipe tool handlers for Tandoor MCP Server
 *
 * Tools for searching and retrieving recipes from Tandoor.
 *
 * This module uses the factory pattern to create handler functions
 * that are pre-bound to a TandoorApiClient instance.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TandoorApiClient } from '../api/client';
import { handleApiError } from '../utils/errors';
import { createJsonResponse } from '../utils/response';

/**
 * Handler function type for MCP tools
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler<T = any> = (args: T, extra: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>;

/**
 * Recipe tool handlers interface
 */
interface RecipeToolHandlers {
  search: ToolHandler<{
    query?: string;
    foods?: number[];
    keywords?: number[];
    books?: number[];
    createdby?: number;
    rating_gte?: number;
    rating_lte?: number;
    timescooked_gte?: number;
    timescooked_lte?: number;
    lastcooked_gte?: string;
    lastcooked_lte?: string;
    sortby?: string;
    sortdirection?: string;
    page?: number;
    page_size?: number;
  }>;
  get: ToolHandler<{ recipe_id: number }>;
}

/**
 * Create recipe tool handlers bound to a TandoorApiClient instance
 *
 * @param client - The TandoorApiClient to use for API calls
 * @returns Object containing search and get handler functions
 */
export function createRecipeToolHandlers(client: TandoorApiClient): RecipeToolHandlers {
  /**
   * Search recipes with optional filters
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const search = async (
    args: {
      query?: string;
      foods?: number[];
      keywords?: number[];
      books?: number[];
      createdby?: number;
      rating_gte?: number;
      rating_lte?: number;
      timescooked_gte?: number;
      timescooked_lte?: number;
      createdon_gte?: string;
      createdon_lte?: string;
      sort_order?: string;
      page?: number;
      page_size?: number;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    try {
      const result = await client.searchRecipes({
        query: args.query,
        foods: args.foods,
        keywords: args.keywords,
        books: args.books,
        createdby: args.createdby,
        rating_gte: args.rating_gte,
        rating_lte: args.rating_lte,
        timescooked_gte: args.timescooked_gte,
        timescooked_lte: args.timescooked_lte,
        createdon_gte: args.createdon_gte,
        createdon_lte: args.createdon_lte,
        sort_order: args.sort_order,
        page: args.page ?? 1,
        page_size: args.page_size ?? 20
      });
      return createJsonResponse(result);
    } catch (error) {
      throw handleApiError(error, 'recipe');
    }
  };

  /**
   * Get a single recipe by ID
   */
  const get = async (
    args: { recipe_id: number },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    if (!args.recipe_id || args.recipe_id < 1) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing or invalid required argument: recipe_id"
      );
    }

    try {
      const result = await client.getRecipe(args.recipe_id);
      return createJsonResponse(result);
    } catch (error) {
      throw handleApiError(error, 'recipe');
    }
  };

  return {
    search,
    get
  };
}
