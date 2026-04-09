/**
 * Tandoor MCP Server - Entry point
 *
 * This file initializes the MCP server, sets up clients,
 * registers all tools, and starts the server.
 *
 * Tool handlers are defined in separate modules under src/tools/
 * to maintain separation of concerns and keep this file focused
 * on server initialization and registration.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TandoorApiClient } from './api/client';
import { RecipeImporter } from './tools/import';
import type { SchemaOrgRecipe } from './types';
import type { ToolDefinition } from './tools/tool-definitions';

// Import tool handler factories
import { createFoodToolHandlers } from './tools/foods';
import { createUnitToolHandlers } from './tools/units';
import { createKeywordToolHandlers } from './tools/keywords';
import { createRecipeToolHandlers } from './tools/recipes';
import { tools } from './tools/tool-definitions';

// Environment validation
const baseUrl = process.env.TANDOOR_BASE_URL;
const token = process.env.TANDOOR_API_TOKEN;

if (!baseUrl || !token) {
  console.error('Missing required environment variables: TANDOOR_BASE_URL and TANDOOR_API_TOKEN');
  process.exit(1);
}

// Client initialization
const client = new TandoorApiClient({ baseUrl, token });
const importer = new RecipeImporter(client);

// Initialize tool handlers
const foodHandlers = createFoodToolHandlers(client);
const unitHandlers = createUnitToolHandlers(client);
const keywordHandlers = createKeywordToolHandlers(client);
const recipeHandlers = createRecipeToolHandlers(client);

// ============================================================================
// MCP Server Initialization
// ============================================================================

export const server = new McpServer(
  {
    name: 'tandoor-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// Tool Registration
// ============================================================================
// Import recipe from JSON
server.registerTool(
  'import_recipe_from_json',
  {
    title: 'Import recipe from JSON',
    description: 'Import a recipe from schema.org JSON format into Tandoor. The recipe must be a complete structured JSON object with mandatory fields: name, recipeIngredient, recipeInstructions. All referenced foods, units, and keywords must already exist in Tandoor.',
    inputSchema: tools[0].inputSchema
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (args: unknown, _extra: unknown): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { recipe } = args as { recipe: SchemaOrgRecipe };
    const result = await importer.importRecipeFromJson(recipe);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
    };
  }
);

// Food tools
server.registerTool(
  'list_all_foods',
  {
    title: 'List all foods',
    description: 'Get a paginated list of all foods in Tandoor. Use this to build a local reference map of available foods for recipe import.',
    inputSchema: tools[1].inputSchema
  },
  (args: unknown, extra: unknown) => foodHandlers.listAll(args as { page?: number; page_size?: number }, extra)
);
server.registerTool(
  'search_food',
  {
    title: 'Search foods',
    description: 'Search for foods in Tandoor by name. Use this to find specific foods by query string (e.g., "onion", "tomatoes"). Returns matching foods with their IDs, names, plural forms, and substitutes.',
    inputSchema: tools[2].inputSchema
  },
  (args: unknown, extra: unknown) => foodHandlers.search(args as { query: string }, extra)
);
server.registerTool(
  'create_food',
  {
    title: 'Create food',
    description: 'Create a new food in Tandoor. Note: You must check if the food already exists using search_food() or list_all_foods() before creating. If the food already exists, an error will be returned.',
    inputSchema: tools[3].inputSchema
  },
  (args: unknown, extra: unknown) => foodHandlers.create(args as { name: string; plural_name?: string }, extra)
);

// Unit tools
server.registerTool(
  'list_all_units',
  {
    title: 'List all units',
    description: 'Get a paginated list of all measurement units in Tandoor. Use this to build a local reference map of available units for recipe import.',
    inputSchema: tools[4].inputSchema
  },
  (args: unknown, extra: unknown) => unitHandlers.listAll(args as { page?: number; page_size?: number }, extra)
);
server.registerTool(
  'search_unit',
  {
    title: 'Search units',
    description: 'Search for measurement units in Tandoor by name. Use this to find specific units by query string (e.g., "cup", "grams"). Returns matching units with their IDs and names.',
    inputSchema: tools[5].inputSchema
  },
  (args: unknown, extra: unknown) => unitHandlers.search(args as { query: string }, extra)
);
server.registerTool(
  'create_unit',
  {
    title: 'Create unit',
    description: 'Create a new measurement unit in Tandoor. Note: You must check if the unit already exists using search_unit() or list_all_units() before creating. If the unit already exists, an error will be returned.',
    inputSchema: tools[6].inputSchema
  },
  (args: unknown, extra: unknown) => unitHandlers.create(args as { name: string }, extra)
);

// Keyword tools
server.registerTool(
  'list_all_keywords',
  {
    title: 'List all keywords',
    description: 'Get a paginated list of all keywords in Tandoor. Use this to build a local reference map of available keywords for recipe import.',
    inputSchema: tools[7].inputSchema
  },
  (args: unknown, extra: unknown) => keywordHandlers.listAll(args as { page?: number; page_size?: number }, extra)
);
server.registerTool(
  'search_keyword',
  {
    title: 'Search keywords',
    description: 'Search for keywords in Tandoor by name. Use this to find specific keywords by query string (e.g., "Italian", "vegetarian"). Returns matching keywords with their IDs and names.',
    inputSchema: tools[8].inputSchema
  },
  (args: unknown, extra: unknown) => keywordHandlers.search(args as { query: string }, extra)
);
server.registerTool(
  'create_keyword',
  {
    title: 'Create keyword',
    description: 'Create a new keyword in Tandoor. Note: You must check if the keyword already exists using search_keyword() or list_all_keywords() before creating. If the keyword already exists, an error will be returned.',
    inputSchema: tools[9].inputSchema
  },
  (args: unknown, extra: unknown) => keywordHandlers.create(args as { name: string }, extra)
);

// Recipe tools
server.registerTool(
  'search_recipes',
  {
    title: 'Search recipes',
    description: 'Search for recipes in Tandoor with optional filters. This tool only accepts IDs for food/keyword filtering (not names). Agents must resolve names to IDs using search_food() and search_keyword() before calling this tool. Returns paginated results.',
    inputSchema: tools[10].inputSchema
  },
  (args: unknown, extra: unknown) => recipeHandlers.search(args as { query?: string; foods?: number[]; keywords?: number[]; page?: number; page_size?: number; }, extra)
);
server.registerTool(
  'get_recipe',
  {
    title: 'Get recipe',
    description: 'Get full recipe details by ID. Returns the complete recipe in schema.org/Recipe format for consistency with import. Use this to verify imports or inspect recipe content.',
    inputSchema: tools[11].inputSchema
  },
  (args: unknown, extra: unknown) => recipeHandlers.get(args as { recipe_id: number }, extra)
);

// ============================================================================
// List Tools Handler
// ============================================================================

export const listToolsHandler = async (): Promise<{ tools: ToolDefinition[] }> => ({
  tools: [...tools]
});

// ============================================================================
// Server Startup
// ============================================================================

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Tandoor MCP server running on stdio');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
