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
type ToolHandler<T = Record<string, unknown>> = (args: T, extra: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>;

/**
 * Recipe tool handlers interface
 * 
 * Simplified filter parameters for practical agent use cases.
 */
interface RecipeToolHandlers {
  search: ToolHandler<{
    // Query and basic filters
    query?: string;
    
    // Food filters (ID arrays) - use search_food() to find IDs
    foods?: number[];
    foods_and?: number[];
    foods_not?: number[];
    
    // Keyword filters (ID arrays) - use search_keyword() to find IDs
    keywords?: number[];
    keywords_and?: number[];
    keywords_not?: number[];
    
    // Rating filters
    rating_gte?: number;
    
    // Times cooked filters
    timescooked_gte?: number;
    
    // Boolean flags
    all_ingredients_stocked?: boolean;
    
    // Sorting - use Tandoor's sort_order format
    sort_order?: 'score' | '-score' | 'name' | '-name' | 'created_at' | '-created_at' | 
                  'lastcooked' | '-lastcooked' | 'rating' | '-rating' | 'times_cooked' | 
                  '-times_cooked' | 'lastviewed' | '-lastviewed' | string;
    
    // Pagination
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
   * Search recipes with simplified filters
   * 
   * Maps simplified agent-friendly parameters to Tandoor API parameters.
   */
  const search = async (
    args: {
      query?: string;
      foods?: number[];
      foods_and?: number[];
      foods_not?: number[];
      keywords?: number[];
      keywords_and?: number[];
      keywords_not?: number[];
      rating_gte?: number;
      timescooked_gte?: number;
      sort_order?: 'score' | '-score' | 'name' | '-name' | 'created_at' | '-created_at' | 
                    'lastcooked' | '-lastcooked' | 'rating' | '-rating' | 'times_cooked' | 
                    '-times_cooked' | 'lastviewed' | '-lastviewed' | string;
      all_ingredients_stocked?: boolean;
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
        foods_and: args.foods_and,
        foods_or_not: args.foods_not,  // Map simplified 'not' to 'or_not'
        keywords: args.keywords,
        keywords_and: args.keywords_and,
        keywords_or_not: args.keywords_not,  // Map simplified 'not' to 'or_not'
        rating_gte: args.rating_gte,
        timescooked_gte: args.timescooked_gte,
        sort_order: args.sort_order,
        makenow: args.all_ingredients_stocked,  // Map renamed parameter
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
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    if (!args.recipe_id || args.recipe_id < 1) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing or invalid required argument: recipe_id'
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
