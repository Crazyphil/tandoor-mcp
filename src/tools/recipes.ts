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
 * 
 * All filter parameters supported by the Tandoor API are available.
 * See Tandoor API documentation for parameter descriptions.
 */
interface RecipeToolHandlers {
  search: ToolHandler<{
    // Query and basic filters
    query?: string;
    
    // Food filters (ID arrays)
    foods?: number[];
    foods_or?: number[];
    foods_and?: number[];
    foods_or_not?: number[];
    foods_and_not?: number[];
    
    // Keyword filters (ID arrays)
    keywords?: number[];
    keywords_or?: number[];
    keywords_and?: number[];
    keywords_or_not?: number[];
    keywords_and_not?: number[];
    
    // Book filters
    books?: number[];
    
    // User filter
    createdby?: number;
    
    // Rating filters
    rating?: number;
    rating_gte?: number;
    rating_lte?: number;
    
    // Times cooked filters
    timescooked?: number;
    timescooked_gte?: number;
    timescooked_lte?: number;
    
    // Date filters
    createdon_gte?: string;
    createdon_lte?: string;
    lastcooked_gte?: string;
    lastcooked_lte?: string;
    
    // Sorting - use Tandoor's sort_order format
    sort_order?: 'score' | '-score' | 'name' | '-name' | 'created_at' | '-created_at' | 
                  'lastcooked' | '-lastcooked' | 'rating' | '-rating' | 'times_cooked' | 
                  '-times_cooked' | 'lastviewed' | '-lastviewed' | string;
    
    // Boolean flags
    new?: boolean;
    makenow?: boolean;
    include_children?: boolean;
    
    // Pagination
    page?: number;
    page_size?: number;
    
    // Recent recipes
    num_recent?: number;
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
   * 
   * All parameters are passed directly to the Tandoor API.
   * See Tandoor documentation for parameter details.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const search = async (
    args: {
      query?: string;
      foods?: number[];
      foods_or?: number[];
      foods_and?: number[];
      foods_or_not?: number[];
      foods_and_not?: number[];
      keywords?: number[];
      keywords_or?: number[];
      keywords_and?: number[];
      keywords_or_not?: number[];
      keywords_and_not?: number[];
      books?: number[];
      createdby?: number;
      rating?: number;
      rating_gte?: number;
      rating_lte?: number;
      timescooked?: number;
      timescooked_gte?: number;
      timescooked_lte?: number;
      createdon_gte?: string;
      createdon_lte?: string;
      lastcooked_gte?: string;
      lastcooked_lte?: string;
      sort_order?: 'score' | '-score' | 'name' | '-name' | 'created_at' | '-created_at' | 
                    'lastcooked' | '-lastcooked' | 'rating' | '-rating' | 'times_cooked' | 
                    '-times_cooked' | 'lastviewed' | '-lastviewed' | string;
      new?: boolean;
      makenow?: boolean;
      include_children?: boolean;
      page?: number;
      page_size?: number;
      num_recent?: number;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    try {
      const result = await client.searchRecipes({
        query: args.query,
        foods: args.foods,
        foods_or: args.foods_or,
        foods_and: args.foods_and,
        foods_or_not: args.foods_or_not,
        foods_and_not: args.foods_and_not,
        keywords: args.keywords,
        keywords_or: args.keywords_or,
        keywords_and: args.keywords_and,
        keywords_or_not: args.keywords_or_not,
        keywords_and_not: args.keywords_and_not,
        books: args.books,
        createdby: args.createdby,
        rating: args.rating,
        rating_gte: args.rating_gte,
        rating_lte: args.rating_lte,
        timescooked: args.timescooked,
        timescooked_gte: args.timescooked_gte,
        timescooked_lte: args.timescooked_lte,
        createdon_gte: args.createdon_gte,
        createdon_lte: args.createdon_lte,
        lastcooked_gte: args.lastcooked_gte,
        lastcooked_lte: args.lastcooked_lte,
        sort_order: args.sort_order,
        new: args.new,
        makenow: args.makenow,
        include_children: args.include_children,
        page: args.page ?? 1,
        page_size: args.page_size ?? 20,
        num_recent: args.num_recent
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
