/**
 * Zod schema definitions for Tandoor MCP Server
 *
 * Centralizes all input validation schemas for MCP tools.
 * These schemas define the expected structure of tool inputs
 * and provide runtime validation.
 */

import * as z from 'zod/v4';

// ============================================================================
// Recipe Schema (Schema.org Recipe format)
// ============================================================================

/**
 * Schema.org Recipe author object
 */
export const authorSchema = z.object({
  '@type': z.string().optional(),
  name: z.string().optional()
});

/**
 * Schema.org Recipe nutrition object
 * Allows additional fields beyond the standard ones
 */
export const nutritionSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Schema.org Recipe schema for import
 * This is the main recipe structure from schema.org/Recipe
 */
export const recipeSchema = z.object({
  /** Recipe name/title */
  name: z.string(),

  /** Recipe description */
  description: z.string().optional(),

  /** List of ingredients as strings (e.g., "2 cups flour") */
  recipeIngredient: z.array(z.string()),

  /** Cooking instructions as strings or structured objects */
  recipeInstructions: z.array(z.string()),

  /** Recipe yield (e.g., "4 servings") */
  recipeYield: z.union([z.string(), z.number()]).optional(),

  /** Number of servings */
  servings: z.number().optional(),

  /** Preparation time (ISO 8601 duration format, e.g., "PT30M") */
  prepTime: z.string().optional(),

  /** Cooking time (ISO 8601 duration format) */
  cookTime: z.string().optional(),

  /** Total time (ISO 8601 duration format) */
  totalTime: z.string().optional(),

  /** Recipe image URL(s) */
  image: z.union([z.string(), z.array(z.string())]).optional(),

  /** Keywords/tags for the recipe */
  keywords: z.array(z.string()).optional(),

  /** Recipe category (e.g., "Dinner", "Dessert") */
  recipeCategory: z.string().optional(),

  /** Recipe cuisine (e.g., "Italian", "Mexican") */
  recipeCuisine: z.union([z.string(), z.array(z.string())]).optional(),

  /** Original source URL */
  sourceUrl: z.string().optional(),

  /** Recipe author */
  author: authorSchema.optional(),

  /** Publication date (ISO 8601 format) */
  datePublished: z.string().optional(),

  /** Nutritional information */
  nutrition: nutritionSchema
});

// ============================================================================
// Tool Input Schemas
// ============================================================================

/**
 * Input schema for import_recipe_from_json tool
 */
export const importRecipeInputSchema = z.object({
  recipe: recipeSchema
});

/**
 * Pagination parameters shared by list tools
 */
export const paginationSchema = z.object({
  /** Page number (1-based) */
  page: z.number().int().min(1).optional(),

  /** Number of items per page (max 100) */
  page_size: z.number().int().min(1).max(100).optional()
});

/**
 * Input schema for list_all_foods tool
 */
export const listAllFoodsInputSchema = paginationSchema;

/**
 * Input schema for search_food tool
 */
export const searchFoodInputSchema = z.object({
  /** Search query string */
  query: z.string().min(1)
});

/**
 * Input schema for create_food tool
 */
export const createFoodInputSchema = z.object({
  /** Food name */
  name: z.string().min(1),

  /** Plural form of the food name (optional) */
  plural_name: z.string().optional()
});

/**
 * Input schema for list_all_units tool
 */
export const listAllUnitsInputSchema = paginationSchema;

/**
 * Input schema for search_unit tool
 */
export const searchUnitInputSchema = z.object({
  /** Search query string */
  query: z.string().min(1)
});

/**
 * Input schema for create_unit tool
 */
export const createUnitInputSchema = z.object({
  /** Unit name (e.g., "cup", "grams") */
  name: z.string().min(1)
});

/**
 * Input schema for list_all_keywords tool
 */
export const listAllKeywordsInputSchema = paginationSchema;

/**
 * Input schema for search_keyword tool
 */
export const searchKeywordInputSchema = z.object({
  /** Search query string */
  query: z.string().min(1)
});

/**
 * Input schema for create_keyword tool
 */
export const createKeywordInputSchema = z.object({
  /** Keyword name */
  name: z.string().min(1)
});

/**
 * Input schema for search_recipes tool
 */
export const searchRecipesInputSchema = z.object({
  /** Free-text search query */
  query: z.string().optional(),

  /** Filter by food IDs (must be IDs, not names) */
  foods: z.array(z.number()).optional(),

  /** Filter by keyword IDs (must be IDs, not names) */
  keywords: z.array(z.number()).optional(),

  /** Filter by recipe book IDs */
  books: z.array(z.number()).optional(),

  /** Filter by creator user ID */
  createdby: z.number().optional(),

  /** Minimum rating (0-5) */
  rating_gte: z.number().min(0).max(5).optional(),

  /** Maximum rating (0-5) */
  rating_lte: z.number().min(0).max(5).optional(),

  /** Minimum times cooked */
  timescooked_gte: z.number().int().min(0).optional(),

  /** Maximum times cooked */
  timescooked_lte: z.number().int().min(0).optional(),

  /** Minimum creation date (ISO 8601) */
  createdon_gte: z.string().optional(),

  /** Maximum creation date (ISO 8601) */
  createdon_lte: z.string().optional(),

  /** Sort order for results */
  sort_order: z.enum([
    "score",
    "-score",
    "name",
    "-name",
    "created",
    "-created",
    "rating",
    "-rating"
  ]).optional(),

  /** Page number (1-based) */
  page: z.number().int().min(1).optional(),

  /** Number of items per page (max 100) */
  page_size: z.number().int().min(1).max(100).optional()
});

/**
 * Input schema for get_recipe tool
 */
export const getRecipeInputSchema = z.object({
  /** Recipe ID to retrieve */
  recipe_id: z.number().int().min(1)
});
