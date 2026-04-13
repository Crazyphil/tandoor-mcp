/**
 * Tool Definitions
 *
 * Centralized tool definitions for the Tandoor MCP server.
 * This module contains all tool metadata (name, title, description, schemas).
 */

import type { z } from 'zod';
import {
  importRecipeInputSchema,
  listAllFoodsInputSchema,
  searchFoodInputSchema,
  createFoodInputSchema,
  listAllUnitsInputSchema,
  searchUnitInputSchema,
  createUnitInputSchema,
  listAllKeywordsInputSchema,
  searchKeywordInputSchema,
  createKeywordInputSchema,
  searchRecipesInputSchema,
  getRecipeInputSchema
} from '../schemas';

/** Tool definition structure */
export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodTypeAny;
}

/** All available tools in the Tandoor MCP server */
export const tools: ToolDefinition[] = [
  // Tools are also available via toolsByName for direct name-based access

  {
    name: 'import_recipe_from_json',
    title: 'Import recipe from JSON',
    description: 'Import a recipe from schema.org JSON format into Tandoor. The recipe must be a complete structured JSON object with mandatory fields: name, recipeIngredient, recipeInstructions. All referenced foods, units, and keywords must already exist in Tandoor. Plural forms of foods and units (as defined on the object itself) are acceptable as well, if it aids readability. NOTE: For per-step ingredients (preferred to per-recipe ingredients for readability), use the non-standard extension "recipeIngredient" property on individual HowToStep objects to define ingredients for each step separately.',
    inputSchema: importRecipeInputSchema
  },
  {
    name: 'list_all_foods',
    title: 'List all foods',
    description: 'Get a paginated list of all foods in Tandoor. Use this to build a local reference map of available foods for recipe import.',
    inputSchema: listAllFoodsInputSchema
  },
  {
    name: 'search_food',
    title: 'Search foods',
    description: 'Search for foods in Tandoor by name. Use this to find specific foods by query string (e.g., "onion", "tomatoes"). Returns matching foods with their IDs, names, plural forms, and substitutes.',
    inputSchema: searchFoodInputSchema
  },
  {
    name: 'create_food',
    title: 'Create food',
    description: 'Create a new food in Tandoor. Note: You must check if the food already exists using search_food() or list_all_foods() before creating. If the food already exists, an error will be returned.',
    inputSchema: createFoodInputSchema
  },
  {
    name: 'list_all_units',
    title: 'List all units',
    description: 'Get a paginated list of all measurement units in Tandoor. Use this to build a local reference map of available units for recipe import.',
    inputSchema: listAllUnitsInputSchema
  },
  {
    name: 'search_unit',
    title: 'Search units',
    description: 'Search for measurement units in Tandoor by name. Use this to find specific units by query string (e.g., "cup", "grams"). Returns matching units with their IDs and names.',
    inputSchema: searchUnitInputSchema
  },
  {
    name: 'create_unit',
    title: 'Create unit',
    description: 'Create a new measurement unit in Tandoor. Note: You must check if the unit already exists using search_unit() or list_all_units() before creating. If the unit already exists, an error will be returned.',
    inputSchema: createUnitInputSchema
  },
  {
    name: 'list_all_keywords',
    title: 'List all keywords',
    description: 'Get a paginated list of all keywords in Tandoor. Use this to build a local reference map of available keywords for recipe import.',
    inputSchema: listAllKeywordsInputSchema
  },
  {
    name: 'search_keyword',
    title: 'Search keywords',
    description: 'Search for keywords in Tandoor by name. Use this to find specific keywords by query string (e.g., "Italian", "vegetarian"). Returns matching keywords with their IDs and names.',
    inputSchema: searchKeywordInputSchema
  },
  {
    name: 'create_keyword',
    title: 'Create keyword',
    description: 'Create a new keyword in Tandoor. Note: You must check if the keyword already exists using search_keyword() or list_all_keywords() before creating. If the keyword already exists, an error will be returned.',
    inputSchema: createKeywordInputSchema
  },
  {
    name: 'search_recipes',
    title: 'Search recipes',
    description: 'Search for recipes in Tandoor with optional filters. This tool only accepts IDs for food/keyword filtering (not names). Agents must resolve names to IDs using search_food() and search_keyword() before calling this tool. Returns paginated results.',
    inputSchema: searchRecipesInputSchema
  },
  {
    name: 'get_recipe',
    title: 'Get recipe',
    description: 'Get full recipe details by ID. Returns the complete recipe in schema.org/Recipe format for consistency with import. Use this to verify imports or inspect recipe content.',
    inputSchema: getRecipeInputSchema
  }
];

/** Map of tools by name for direct access by tool name */
export const toolsByName = Object.fromEntries(
  tools.map(t => [t.name, t])
) as Record<string, ToolDefinition>;

/** List all tools handler for server.test.ts */
export const listToolsHandler = async (): Promise<{ tools: typeof tools }> => ({
  tools: [...tools]
});
