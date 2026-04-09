/**
 * Tandoor MCP Server - Entry point
 *
 * This file initializes the MCP server and registers all tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from 'zod/v4';
import { TandoorApiClient } from './api/client';
import { RecipeImporter } from './tools/import';
import { SchemaOrgRecipe, ImportResult } from './types';

// Initialize Tandoor client from environment variables
const baseUrl = process.env.TANDOOR_BASE_URL;
const token = process.env.TANDOOR_API_TOKEN;

if (!baseUrl || !token) {
  console.error("Missing required environment variables: TANDOOR_BASE_URL and TANDOOR_API_TOKEN");
  process.exit(1);
}

const client = new TandoorApiClient({ baseUrl, token });
const importer = new RecipeImporter(client);

const recipeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  recipeIngredient: z.array(z.string()),
  recipeInstructions: z.array(z.string()),
  recipeYield: z.union([z.string(), z.number()]).optional(),
  servings: z.number().optional(),
  prepTime: z.string().optional(),
  cookTime: z.string().optional(),
  totalTime: z.string().optional(),
  image: z.union([z.string(), z.array(z.string())]).optional(),
  keywords: z.array(z.string()).optional(),
  recipeCategory: z.string().optional(),
  recipeCuisine: z.union([z.string(), z.array(z.string())]).optional(),
  sourceUrl: z.string().optional(),
  author: z.object({
    '@type': z.string().optional(),
    name: z.string().optional()
  }).optional(),
  datePublished: z.string().optional(),
  nutrition: z.record(z.string(), z.any()).optional()
});

const tools = [
  {
    name: "import_recipe_from_json",
    title: "Import recipe from JSON",
    description: "Import a recipe from schema.org JSON format into Tandoor. The recipe must be a complete structured JSON object with mandatory fields: name, recipeIngredient, recipeInstructions. All referenced foods, units, and keywords must already exist in Tandoor.",
    inputSchema: {
      recipe: recipeSchema
    }
  }
];

export const listToolsHandler = async (): Promise<{ tools: typeof tools }> => ({
  tools
});

const importRecipeTool = async (args: { recipe?: SchemaOrgRecipe }, _extra: unknown): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;
  const recipe = args.recipe;
  if (!recipe) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Missing required argument: recipe"
    );
  }

  try {
    const result: ImportResult = await importer.importRecipeFromJson(recipe);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Import failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

interface CallToolRequest {
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export const callToolHandler = async (request: CallToolRequest): Promise<{ content: { type: 'text'; text: string }[] }> => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "import_recipe_from_json":
      return importRecipeTool(args as { recipe?: SchemaOrgRecipe }, undefined);

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
  }
};

// Create MCP server
export const server = new McpServer(
  {
    name: "tandoor-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool registration
server.registerTool(
  tools[0].name,
  {
    title: tools[0].title,
    description: tools[0].description,
    inputSchema: tools[0].inputSchema
  },
  importRecipeTool
);

// Start the server
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tandoor MCP server running on stdio");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
