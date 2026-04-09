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

// Tool schema definitions (ZodRawShape format for MCP SDK)
const importRecipeInputSchema = z.object({
  recipe: recipeSchema
});

const listAllFoodsInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  page_size: z.number().int().min(1).max(100).optional()
});

const searchFoodInputSchema = z.object({
  query: z.string().min(1)
});

const createFoodInputSchema = z.object({
  name: z.string().min(1),
  plural_name: z.string().optional()
});

const listAllUnitsInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  page_size: z.number().int().min(1).max(100).optional()
});

const searchUnitInputSchema = z.object({
  query: z.string().min(1)
});

const createUnitInputSchema = z.object({
  name: z.string().min(1)
});

const listAllKeywordsInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  page_size: z.number().int().min(1).max(100).optional()
});

const searchKeywordInputSchema = z.object({
  query: z.string().min(1)
});

const createKeywordInputSchema = z.object({
  name: z.string().min(1)
});

const searchRecipesInputSchema = z.object({
  query: z.string().optional(),
  foods: z.array(z.number()).optional(),
  keywords: z.array(z.number()).optional(),
  books: z.array(z.number()).optional(),
  createdby: z.number().optional(),
  rating_gte: z.number().min(0).max(5).optional(),
  rating_lte: z.number().min(0).max(5).optional(),
  timescooked_gte: z.number().int().min(0).optional(),
  timescooked_lte: z.number().int().min(0).optional(),
  createdon_gte: z.string().optional(),
  createdon_lte: z.string().optional(),
  sort_order: z.enum(["score", "-score", "name", "-name", "created", "-created", "rating", "-rating"]).optional(),
  page: z.number().int().min(1).optional(),
  page_size: z.number().int().min(1).max(100).optional()
});

const getRecipeInputSchema = z.object({
  recipe_id: z.number().int().min(1)
});

const tools = [
  {
    name: "import_recipe_from_json",
    title: "Import recipe from JSON",
    description: "Import a recipe from schema.org JSON format into Tandoor. The recipe must be a complete structured JSON object with mandatory fields: name, recipeIngredient, recipeInstructions. All referenced foods, units, and keywords must already exist in Tandoor.",
    inputSchema: importRecipeInputSchema
  },
  {
    name: "list_all_foods",
    title: "List all foods",
    description: "Get a paginated list of all foods in Tandoor. Use this to build a local reference map of available foods for recipe import.",
    inputSchema: listAllFoodsInputSchema
  },
  {
    name: "search_food",
    title: "Search foods",
    description: "Search for foods in Tandoor by name. Use this to find specific foods by query string (e.g., 'onion', 'tomatoes'). Returns matching foods with their IDs, names, plural forms, and substitutes.",
    inputSchema: searchFoodInputSchema
  },
  {
    name: "create_food",
    title: "Create food",
    description: "Create a new food in Tandoor. Note: You must check if the food already exists using search_food() or list_all_foods() before creating. If the food already exists, an error will be returned.",
    inputSchema: createFoodInputSchema
  },
  {
    name: "list_all_units",
    title: "List all units",
    description: "Get a paginated list of all measurement units in Tandoor. Use this to build a local reference map of available units for recipe import.",
    inputSchema: listAllUnitsInputSchema
  },
  {
    name: "search_unit",
    title: "Search units",
    description: "Search for measurement units in Tandoor by name. Use this to find specific units by query string (e.g., 'cup', 'grams'). Returns matching units with their IDs and names.",
    inputSchema: searchUnitInputSchema
  },
  {
    name: "create_unit",
    title: "Create unit",
    description: "Create a new measurement unit in Tandoor. Note: You must check if the unit already exists using search_unit() or list_all_units() before creating. If the unit already exists, an error will be returned.",
    inputSchema: createUnitInputSchema
  },
  {
    name: "list_all_keywords",
    title: "List all keywords",
    description: "Get a paginated list of all keywords in Tandoor. Use this to build a local reference map of available keywords for recipe import.",
    inputSchema: listAllKeywordsInputSchema
  },
  {
    name: "search_keyword",
    title: "Search keywords",
    description: "Search for keywords in Tandoor by name. Use this to find specific keywords by query string (e.g., 'Italian', 'vegetarian'). Returns matching keywords with their IDs and names.",
    inputSchema: searchKeywordInputSchema
  },
  {
    name: "create_keyword",
    title: "Create keyword",
    description: "Create a new keyword in Tandoor. Note: You must check if the keyword already exists using search_keyword() or list_all_keywords() before creating. If the keyword already exists, an error will be returned.",
    inputSchema: createKeywordInputSchema
  },
  {
    name: "search_recipes",
    title: "Search recipes",
    description: "Search for recipes in Tandoor with optional filters. This tool only accepts IDs for food/keyword filtering (not names). Agents must resolve names to IDs using search_food() and search_keyword() before calling this tool. Returns paginated results.",
    inputSchema: searchRecipesInputSchema
  },
  {
    name: "get_recipe",
    title: "Get recipe",
    description: "Get full recipe details by ID. Returns the complete recipe in schema.org/Recipe format for consistency with import. Use this to verify imports or inspect recipe content.",
    inputSchema: getRecipeInputSchema
  }
];

export const listToolsHandler = async (): Promise<{ tools: typeof tools }> => ({
  tools: [
    tools[0],
    tools[1],
    tools[2],
    tools[3],
    tools[4],
    tools[5],
    tools[6],
    tools[7],
    tools[8],
    tools[9],
    tools[10],
    tools[11]
  ]
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

const listAllFoodsTool = async (args: { page?: number; page_size?: number }, _extra: unknown): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;
  const { page = 1, page_size = 20 } = args;

  try {
    const result = await client.listAllFoods(page, page_size);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list foods: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const searchFoodTool = async (args: { query: string }, _extra: unknown): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;
  const { query } = args;

  if (!query || query.trim() === '') {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Missing required argument: query"
    );
  }

  try {
    const result = await client.searchFood(query);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to search foods: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const createFoodTool = async (args: { name: string; plural_name?: string }, _extra: unknown): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;
  const { name, plural_name } = args;

  if (!name || name.trim() === '') {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Missing required argument: name"
    );
  }

  try {
    const result = await client.createFood(name, plural_name);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    // Check if it's an "already exists" error (409 Conflict)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: unknown } };
      if (axiosError.response?.status === 409) {
        throw new McpError(
          ErrorCode.InvalidParams,
          JSON.stringify({
            error_code: "entity_already_exists",
            details: {
              entity_type: "food",
              entity_name: name
            },
            suggestions: [
              `Food '${name}' already exists in database`,
              "Use search_food() or list_all_foods() to verify existence before calling create_food()",
              "If you need to use this entity, reference its existing ID"
            ]
          })
        );
      }
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to create food: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const listAllUnitsTool = async (args: { page?: number; page_size?: number }, _extra: unknown): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;
  const { page = 1, page_size = 20 } = args;

  try {
    const result = await client.listAllUnits(page, page_size);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list units: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const searchUnitTool = async (args: { query: string }, _extra: unknown): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;
  const { query } = args;

  if (!query || query.trim() === '') {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Missing required argument: query"
    );
  }

  try {
    const result = await client.searchUnit(query);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to search units: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const createUnitTool = async (args: { name: string }, _extra: unknown): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;
  const { name } = args;

  if (!name || name.trim() === '') {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Missing required argument: name"
    );
  }

  try {
    const result = await client.createUnit(name);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    // Check if it's an "already exists" error (409 Conflict)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: unknown } };
      if (axiosError.response?.status === 409) {
        throw new McpError(
          ErrorCode.InvalidParams,
          JSON.stringify({
            error_code: "entity_already_exists",
            details: {
              entity_type: "unit",
              entity_name: name
            },
            suggestions: [
              `Unit '${name}' already exists in database`,
              "Use search_unit() or list_all_units() to verify existence before calling create_unit()",
              "If you need to use this entity, reference its existing ID"
            ]
          })
        );
      }
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to create unit: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const listAllKeywordsTool = async (
  args: { page?: number; page_size?: number },
  _extra: unknown
): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;
  const { page = 1, page_size = 20 } = args;

  try {
    const result = await client.listAllKeywords(page, page_size);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list keywords: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const searchKeywordTool = async (
  args: { query: string },
  _extra: unknown
): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;
  const { query } = args;

  if (!query || query.trim() === '') {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Missing required argument: query"
    );
  }

  try {
    const result = await client.searchKeyword(query);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to search keywords: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const createKeywordTool = async (
  args: { name: string },
  _extra: unknown
): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;
  const { name } = args;

  if (!name || name.trim() === '') {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Missing required argument: name"
    );
  }

  try {
    const result = await client.createKeyword(name);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    // Check if it's an "already exists" error (409 Conflict)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: unknown } };
      if (axiosError.response?.status === 409) {
        throw new McpError(
          ErrorCode.InvalidParams,
          JSON.stringify({
            error_code: "entity_already_exists",
            details: {
              entity_type: "keyword",
              entity_name: name
            },
            suggestions: [
              `Keyword '${name}' already exists in database`,
              "Use search_keyword() or list_all_keywords() to verify existence before calling create_keyword()",
              "If you need to use this entity, reference its existing ID"
            ]
          })
        );
      }
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to create keyword: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const searchRecipesTool = async (
  args: {
    query?: string;
    foods?: number[];
    keywords?: number[];
    books?: number[];
    createdby?: number;
    rating_gte?: number;
    rating_lte?: number;
    timescooked_gte?: number;
    timescooked_lte?: number;
    createdon_gte?: string;
    createdon_lte?: string;
    sort_order?: string;
    page?: number;
    page_size?: number;
  },
  _extra: unknown
): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;

  try {
    const result = await client.searchRecipes({
      query: args.query,
      foods: args.foods,
      keywords: args.keywords,
      books: args.books,
      createdby: args.createdby,
      rating_gte: args.rating_gte,
      rating_lte: args.rating_lte,
      timescooked_gte: args.timescooked_gte,
      timescooked_lte: args.timescooked_lte,
      createdon_gte: args.createdon_gte,
      createdon_lte: args.createdon_lte,
      sort_order: args.sort_order,
      page: args.page ?? 1,
      page_size: args.page_size ?? 20
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to search recipes: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const getRecipeTool = async (
  args: { recipe_id: number },
  _extra: unknown
): Promise<{ content: { type: 'text'; text: string }[] }> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void _extra;

  if (!args.recipe_id || args.recipe_id < 1) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Missing or invalid required argument: recipe_id"
    );
  }

  try {
    const result = await client.getRecipe(args.recipe_id);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get recipe: ${error instanceof Error ? error.message : String(error)}`
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
    case "list_all_foods":
      return listAllFoodsTool(args as { page?: number; page_size?: number }, undefined);
    case "search_food":
      return searchFoodTool(args as { query: string }, undefined);
    case "create_food":
      return createFoodTool(args as { name: string; plural_name?: string }, undefined);
    case "list_all_units":
      return listAllUnitsTool(args as { page?: number; page_size?: number }, undefined);
    case "search_unit":
      return searchUnitTool(args as { query: string }, undefined);
    case "create_unit":
      return createUnitTool(args as { name: string }, undefined);
    case "list_all_keywords":
      return listAllKeywordsTool(args as { page?: number; page_size?: number }, undefined);
    case "search_keyword":
      return searchKeywordTool(args as { query: string }, undefined);
    case "create_keyword":
      return createKeywordTool(args as { name: string }, undefined);
    case "search_recipes":
      return searchRecipesTool(args as {
        query?: string;
        foods?: number[];
        keywords?: number[];
        books?: number[];
        createdby?: number;
        rating_gte?: number;
        rating_lte?: number;
        timescooked_gte?: number;
        timescooked_lte?: number;
        createdon_gte?: string;
        createdon_lte?: string;
        sort_order?: string;
        page?: number;
        page_size?: number;
      }, undefined);
    case "get_recipe":
      return getRecipeTool(args as { recipe_id: number }, undefined);

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

server.registerTool(
  tools[1].name,
  {
    title: tools[1].title,
    description: tools[1].description,
    inputSchema: tools[1].inputSchema
  },
  listAllFoodsTool
);

server.registerTool(
  tools[2].name,
  {
    title: tools[2].title,
    description: tools[2].description,
    inputSchema: tools[2].inputSchema
  },
  searchFoodTool
);

server.registerTool(
  tools[3].name,
  {
    title: tools[3].title,
    description: tools[3].description,
    inputSchema: tools[3].inputSchema
  },
  createFoodTool
);

server.registerTool(
  tools[4].name,
  {
    title: tools[4].title,
    description: tools[4].description,
    inputSchema: tools[4].inputSchema
  },
  listAllUnitsTool
);

server.registerTool(
  tools[5].name,
  {
    title: tools[5].title,
    description: tools[5].description,
    inputSchema: tools[5].inputSchema
  },
  searchUnitTool
);

server.registerTool(
  tools[6].name,
  {
    title: tools[6].title,
    description: tools[6].description,
    inputSchema: tools[6].inputSchema
  },
  createUnitTool
);

server.registerTool(
  tools[7].name,
  {
    title: tools[7].title,
    description: tools[7].description,
    inputSchema: tools[7].inputSchema
  },
  listAllKeywordsTool
);

server.registerTool(
  tools[8].name,
  {
    title: tools[8].title,
    description: tools[8].description,
    inputSchema: tools[8].inputSchema
  },
  searchKeywordTool
);

server.registerTool(
  tools[9].name,
  {
    title: tools[9].title,
    description: tools[9].description,
    inputSchema: tools[9].inputSchema
  },
  createKeywordTool
);

server.registerTool(
  tools[10].name,
  {
    title: tools[10].title,
    description: tools[10].description,
    inputSchema: tools[10].inputSchema
  },
  searchRecipesTool
);

server.registerTool(
  tools[11].name,
  {
    title: tools[11].title,
    description: tools[11].description,
    inputSchema: tools[11].inputSchema
  },
  getRecipeTool
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
