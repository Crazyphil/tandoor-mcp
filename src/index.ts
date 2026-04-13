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
import { tools, toolsByName } from './tools/tool-definitions';

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
  toolsByName.import_recipe_from_json.name,
  {
    title: toolsByName.import_recipe_from_json.title,
    description: toolsByName.import_recipe_from_json.description,
    inputSchema: toolsByName.import_recipe_from_json.inputSchema
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
  toolsByName.list_all_foods.name,
  {
    title: toolsByName.list_all_foods.title,
    description: toolsByName.list_all_foods.description,
    inputSchema: toolsByName.list_all_foods.inputSchema
  },
  (args: unknown, extra: unknown) => foodHandlers.listAll(args as { page?: number; page_size?: number }, extra)
);
server.registerTool(
  toolsByName.search_food.name,
  {
    title: toolsByName.search_food.title,
    description: toolsByName.search_food.description,
    inputSchema: toolsByName.search_food.inputSchema
  },
  (args: unknown, extra: unknown) => foodHandlers.search(args as { query: string }, extra)
);
server.registerTool(
  toolsByName.create_food.name,
  {
    title: toolsByName.create_food.title,
    description: toolsByName.create_food.description,
    inputSchema: toolsByName.create_food.inputSchema
  },
  (args: unknown, extra: unknown) => foodHandlers.create(args as { name: string; plural_name?: string }, extra)
);

// Unit tools
server.registerTool(
  toolsByName.list_all_units.name,
  {
    title: toolsByName.list_all_units.title,
    description: toolsByName.list_all_units.description,
    inputSchema: toolsByName.list_all_units.inputSchema
  },
  (args: unknown, extra: unknown) => unitHandlers.listAll(args as { page?: number; page_size?: number }, extra)
);
server.registerTool(
  toolsByName.search_unit.name,
  {
    title: toolsByName.search_unit.title,
    description: toolsByName.search_unit.description,
    inputSchema: toolsByName.search_unit.inputSchema
  },
  (args: unknown, extra: unknown) => unitHandlers.search(args as { query: string }, extra)
);
server.registerTool(
  toolsByName.create_unit.name,
  {
    title: toolsByName.create_unit.title,
    description: toolsByName.create_unit.description,
    inputSchema: toolsByName.create_unit.inputSchema
  },
  (args: unknown, extra: unknown) => unitHandlers.create(args as { name: string }, extra)
);

// Keyword tools
server.registerTool(
  toolsByName.list_all_keywords.name,
  {
    title: toolsByName.list_all_keywords.title,
    description: toolsByName.list_all_keywords.description,
    inputSchema: toolsByName.list_all_keywords.inputSchema
  },
  (args: unknown, extra: unknown) => keywordHandlers.listAll(args as { page?: number; page_size?: number }, extra)
);
server.registerTool(
  toolsByName.search_keyword.name,
  {
    title: toolsByName.search_keyword.title,
    description: toolsByName.search_keyword.description,
    inputSchema: toolsByName.search_keyword.inputSchema
  },
  (args: unknown, extra: unknown) => keywordHandlers.search(args as { query: string }, extra)
);
server.registerTool(
  toolsByName.create_keyword.name,
  {
    title: toolsByName.create_keyword.title,
    description: toolsByName.create_keyword.description,
    inputSchema: toolsByName.create_keyword.inputSchema
  },
  (args: unknown, extra: unknown) => keywordHandlers.create(args as { name: string }, extra)
);

// Recipe tools
server.registerTool(
  toolsByName.search_recipes.name,
  {
    title: toolsByName.search_recipes.title,
    description: toolsByName.search_recipes.description,
    inputSchema: toolsByName.search_recipes.inputSchema
  },
  (args: unknown, extra: unknown) => recipeHandlers.search(args as { query?: string; foods?: number[]; keywords?: number[]; page?: number; page_size?: number; }, extra)
);
server.registerTool(
  toolsByName.get_recipe.name,
  {
    title: toolsByName.get_recipe.title,
    description: toolsByName.get_recipe.description,
    inputSchema: toolsByName.get_recipe.inputSchema
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
