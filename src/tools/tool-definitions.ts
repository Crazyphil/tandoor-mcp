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
    description: 'Import a recipe from schema.org JSON format into Tandoor. All referenced foods, units, and keywords must already exist. Use search/create tools for these before importing.',
    inputSchema: importRecipeInputSchema
  },
  {
    name: 'list_all_foods',
    title: 'List all foods',
    description: 'Get a paginated list of all foods in Tandoor. Useful for building a local reference map.',
    inputSchema: listAllFoodsInputSchema
  },
  {
    name: 'search_food',
    title: 'Search foods',
    description: 'Search for foods in Tandoor by name. Returns matching foods with IDs, names, plural forms, and substitutes.',
    inputSchema: searchFoodInputSchema
  },
  {
    name: 'create_food',
    title: 'Create food',
    description: 'Create a new food in Tandoor. Check for existence first - returns an error if the food already exists.',
    inputSchema: createFoodInputSchema
  },
  {
    name: 'list_all_units',
    title: 'List all units',
    description: 'Get a paginated list of all measurement units in Tandoor. Useful for building a local reference map.',
    inputSchema: listAllUnitsInputSchema
  },
  {
    name: 'search_unit',
    title: 'Search units',
    description: 'Search for measurement units in Tandoor by name. Returns matching units with IDs and names.',
    inputSchema: searchUnitInputSchema
  },
  {
    name: 'create_unit',
    title: 'Create unit',
    description: 'Create a new measurement unit in Tandoor. Check for existence first - returns an error if the unit already exists.',
    inputSchema: createUnitInputSchema
  },
  {
    name: 'list_all_keywords',
    title: 'List all keywords',
    description: 'Get a paginated list of all keywords in Tandoor. Useful for building a local reference map.',
    inputSchema: listAllKeywordsInputSchema
  },
  {
    name: 'search_keyword',
    title: 'Search keywords',
    description: 'Search for keywords in Tandoor by name. Returns matching keywords with IDs and names.',
    inputSchema: searchKeywordInputSchema
  },
  {
    name: 'create_keyword',
    title: 'Create keyword',
    description: 'Create a new keyword in Tandoor. Check for existence first - returns an error if the keyword already exists.',
    inputSchema: createKeywordInputSchema
  },
  {
    name: 'search_recipes',
    title: 'Search recipes',
    description: 'Search for recipes in Tandoor with optional filters. Requires food/keyword IDs (not names) - resolve names to IDs first using search tools.',
    inputSchema: searchRecipesInputSchema
  },
  {
    name: 'get_recipe',
    title: 'Get recipe',
    description: 'Get full recipe details by ID. Returns the recipe in schema.org/Recipe format.',
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
