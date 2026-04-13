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
  '@type': z.string().optional().describe("Schema.org type, typically 'Person' or 'Organization'"),
  name: z.string().optional().describe("Author name")
});

/**
 * Schema.org Recipe instruction object (HowToStep)
 * Supports per-step ingredients as a non-standard extension.
 */
export const recipeInstructionSchema = z.object({
  '@type': z.string().optional().describe("Schema.org type, typically 'HowToStep'"),
  name: z.string().optional().describe("Step name or title (optional), for user-friendly structuring of the recipe"),
  text: z.string().describe("The instruction text for this step. Supports Markdown formatting."),
  /** Non-standard extension: per-step ingredient definitions */
  recipeIngredient: z.union([z.array(z.string()), z.string()]).optional()
    .describe("Ingredients specific to this step (non-standard extension). Can be a single string or array of strings in the same format as the global recipeIngredients.")
});

/**
 * Schema.org Recipe nutrition object
 * Allows additional fields beyond the standard ones
 */
export const nutritionSchema = z.record(z.string(), z.unknown())
  .optional()
  .describe("Nutritional information as key-value pairs (e.g., calories, fatContent, proteinContent)");

/**
 * Schema.org Recipe schema for import
 * This is the main recipe structure from schema.org/Recipe
 */
export const recipeSchema = z.object({
  name: z.string().describe("Recipe name/title (required)"),

  description: z.string().optional().describe("Short recipe description, max 512 characters"),

  recipeIngredient: z.array(z.string())
    .describe("List of ingredients of the whole recipe as strings (e.g., '2 cups flour', '1 onion, chopped', 'salt'). Format: [amount] [unit] [food name][, optional note]. Allows amount- and unit-less ingredients. Prefer using recipeInstructions.recipeIngredient for per-step ingredients when possible for better organization."),

  recipeInstructions: z.array(z.union([z.string(), recipeInstructionSchema]))
    .describe("Cooking instructions as strings or structured HowToStep objects. Supports per-step ingredients via recipeIngredient property on HowToStep objects."),

  recipeYield: z.union([z.string(), z.number()]).optional()
    .describe("Recipe yield (e.g., '4 slices', '1 loaf'). Use servings attribute for generic number-only servings."),

  servings: z.number().optional().describe("Number of (generic) servings the recipe makes. Use recipeYield attribute when you want to specify a more specific kind of yield."),

  prepTime: z.string().optional().describe("Preparation time in ISO 8601 duration format (e.g., 'PT30M' for 30 minutes)"),

  cookTime: z.string().optional().describe("Cooking time in ISO 8601 duration format (e.g., 'PT1H' for 1 hour)"),

  totalTime: z.string().optional().describe("Total time in ISO 8601 duration format"),

  image: z.union([z.string(), z.array(z.string())]).optional()
    .describe("Recipe image URL(s) - single URL or array of URLs"),

  keywords: z.array(z.string()).optional()
    .describe("Keywords/tags for the recipe (e.g., ['vegetarian', 'quick']). Must exist in Tandoor before use."),

  recipeCategory: z.string().optional().describe("Recipe category (e.g., 'Dinner', 'Dessert')"),

  recipeCuisine: z.union([z.string(), z.array(z.string())]).optional()
    .describe("Recipe cuisine (e.g., 'Italian', 'Mexican') - single value or array"),

  sourceUrl: z.string().optional().describe("Original source URL where the recipe was found"),

  author: authorSchema.optional().describe("Recipe author information"),

  datePublished: z.string().optional().describe("Publication date in ISO 8601 format"),

  nutrition: nutritionSchema
});

// ============================================================================
// Tool Input Schemas
// ============================================================================

/**
 * Input schema for import_recipe_from_json tool
 */
export const importRecipeInputSchema = z.object({
  recipe: recipeSchema.describe("Complete schema.org/Recipe object to import into Tandoor. All referenced foods, units, and keywords must already exist in Tandoor.")
});

/**
 * Pagination parameters shared by list tools
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).optional()
    .describe("Page number (1-based, default: 1)"),

  page_size: z.number().int().min(1).max(100).optional()
    .describe("Number of items per page (1-100, default: 20)")
});

/**
 * Input schema for list_all_foods tool
 */
export const listAllFoodsInputSchema = paginationSchema;

/**
 * Input schema for search_food tool
 */
export const searchFoodInputSchema = z.object({
  query: z.string().min(1).describe("Search query string to find foods (e.g., 'onion', 'tomatoes'). Queries are fuzzy, i.e. 'onion' will match 'red onion', 'yellow onions', etc.")
});

/**
 * Input schema for create_food tool
 */
export const createFoodInputSchema = z.object({
  name: z.string().min(1).describe("Food name (e.g., 'onion', 'all-purpose flour')"),

  plural_name: z.string().optional().describe("Plural form of the food name (e.g., 'onions', 'eggs')"),

  url: z.string().optional().describe("URL to external food information (optional)")
});

/**
 * Input schema for list_all_units tool
 */
export const listAllUnitsInputSchema = paginationSchema;

/**
 * Input schema for search_unit tool
 */
export const searchUnitInputSchema = z.object({
  query: z.string().min(1).describe("Search query string to find units (e.g., 'cup', 'grams', 'tablespoon'). Queries are fuzzy, i.e. 'cup' will match 'cup', 'cups', 'dry cup', etc.")
});

/**
 * Input schema for create_unit tool
 */
export const createUnitInputSchema = z.object({
  name: z.string().min(1).describe("Unit name (e.g., 'cup', 'gram', 'tablespoon')"),

  plural_name: z.string().optional().describe("Plural form of the unit (e.g., 'cups', 'grams', 'tablespoons')"),

  description: z.string().optional().describe("Description of the unit (optional)")
});

/**
 * Input schema for list_all_keywords tool
 */
export const listAllKeywordsInputSchema = paginationSchema;

/**
 * Input schema for search_keyword tool
 */
export const searchKeywordInputSchema = z.object({
  query: z.string().min(1).describe("Search query string to find keywords (e.g., 'Italian', 'vegetarian', 'quick'). Queries are fuzzy, i.e. 'italian' will match 'Italian', 'italian food', etc.")
});

/**
 * Input schema for create_keyword tool
 */
export const createKeywordInputSchema = z.object({
  name: z.string().min(1).describe("Keyword name (e.g., 'Italian', 'vegetarian', 'dinner')")
});

/**
 * Input schema for search_recipes tool
 * 
 * Simplified filter parameters for practical agent use cases.
 * See Tandoor API documentation for underlying parameter details.
 */
export const searchRecipesInputSchema = z.object({
  query: z.string().optional().describe("Free-text search query for recipe name or description. Queries are fuzzy, i.e. 'chicken soup' will match 'Best Chicken Soup', 'Spicy Chicken Soup', etc."),

  // Food filters - use search_food() to find IDs
  foods: z.array(z.number()).optional()
    .describe("Food IDs to include (OR - recipe must contain at least one). Use search_food() to find IDs."),
  foods_and: z.array(z.number()).optional()
    .describe("Food IDs to include (AND - recipe must contain ALL of these). Use search_food() to find IDs."),
  foods_not: z.array(z.number()).optional()
    .describe("Food IDs to exclude (OR - recipe must NOT contain any). Use search_food() to find IDs."),

  // Keyword filters - use search_keyword() to find IDs
  keywords: z.array(z.number()).optional()
    .describe("Keyword IDs to include (OR - recipe must have at least one). Use search_keyword() to find IDs."),
  keywords_and: z.array(z.number()).optional()
    .describe("Keyword IDs to include (AND - recipe must have ALL of these). Use search_keyword() to find IDs."),
  keywords_not: z.array(z.number()).optional()
    .describe("Keyword IDs to exclude (OR - recipe must NOT have any). Use search_keyword() to find IDs."),

  // Rating filters
  rating_gte: z.number().min(0).max(5).optional()
    .describe("Minimum rating 0-5 (e.g., 4 for 4 stars and above)"),

  // Times cooked filters
  timescooked_gte: z.number().int().min(0).optional()
    .describe("Minimum times cooked (e.g., 5 for recipes cooked at least 5 times)"),

  // Boolean flags
  all_ingredients_stocked: z.boolean().optional()
    .describe("Only show recipes that can be made with stocked/on-hand ingredients"),

  // Sort order
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
  ]).optional()
    .describe("Sort order for results. Use prefix '-' for descending order (e.g., '-rating' for highest rated first)"),

  // Pagination
  page: z.number().int().min(1).optional()
    .describe("Page number (1-based, default: 1)"),
  page_size: z.number().int().min(1).max(100).optional()
    .describe("Number of items per page (1-100, default: 20)")
});

/**
 * Input schema for get_recipe tool
 */
export const getRecipeInputSchema = z.object({
  recipe_id: z.number().int().min(1).describe("Recipe ID to retrieve (positive integer)")
});
