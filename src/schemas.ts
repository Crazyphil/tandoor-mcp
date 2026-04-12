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
 * Schema.org Recipe instruction object (HowToStep)
 * Supports per-step ingredients as a non-standard extension.
 */
export const recipeInstructionSchema = z.object({
  '@type': z.string().optional(),
  name: z.string().optional(),
  text: z.string(),
  url: z.string().optional(),
  image: z.any().optional(),
  /** Non-standard extension: per-step ingredient definitions */
  recipeIngredient: z.union([z.array(z.string()), z.string()]).optional()
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

  /** Cooking instructions as strings or structured HowToStep objects */
  recipeInstructions: z.array(z.union([z.string(), recipeInstructionSchema])),

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
  plural_name: z.string().optional(),

  /** URL to external food information (optional) */
  url: z.string().optional()
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
  name: z.string().min(1),

  /** Plural form of the unit (optional) */
  plural_name: z.string().optional(),

  /** Description of the unit (optional) */
  description: z.string().optional()
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
 * 
 * Simplified filter parameters for practical agent use cases.
 * See Tandoor API documentation for underlying parameter details.
 */
export const searchRecipesInputSchema = z.object({
  /** Free-text search query for recipe name */
  query: z.string().optional(),

  // Food filters - use search_food() to find IDs
  /** Food IDs to include (OR - recipe must contain at least one) */
  foods: z.array(z.number()).optional(),
  /** Food IDs to include (AND - recipe must contain all) */
  foods_and: z.array(z.number()).optional(),
  /** Food IDs to exclude (OR - recipe must not contain any) */
  foods_not: z.array(z.number()).optional(),

  // Keyword filters - use search_keyword() to find IDs
  /** Keyword IDs to include (OR - recipe must have at least one) */
  keywords: z.array(z.number()).optional(),
  /** Keyword IDs to include (AND - recipe must have all) */
  keywords_and: z.array(z.number()).optional(),
  /** Keyword IDs to exclude (OR - recipe must not have any) */
  keywords_not: z.array(z.number()).optional(),

  // Rating filters
  /** Minimum rating 0-5 (e.g., 4 for 4 stars and above) */
  rating_gte: z.number().min(0).max(5).optional(),

  // Times cooked filters
  /** Minimum times cooked (e.g., 5 for recipes cooked at least 5 times) */
  timescooked_gte: z.number().int().min(0).optional(),

  // Boolean flags
  /** Only show recipes that can be made with stocked/on-hand ingredients */
  all_ingredients_stocked: z.boolean().optional(),

  /** Sort order for results. Use prefix - for descending order */
  sort_order: z.enum([
    "score",
    "-score",
    "name",
    "-name",
    "created_at",
    "-created_at",
    "lastcooked",
    "-lastcooked",
    "rating",
    "-rating",
    "times_cooked",
    "-times_cooked",
    "lastviewed",
    "-lastviewed"
  ]).optional(),

  // Pagination
  /** Page number (1-based, default: 1) */
  page: z.number().int().min(1).optional(),
  /** Number of items per page (1-100, default: 20) */
  page_size: z.number().int().min(1).max(100).optional()
});

/**
 * Input schema for get_recipe tool
 */
export const getRecipeInputSchema = z.object({
  /** Recipe ID to retrieve */
  recipe_id: z.number().int().min(1)
});
