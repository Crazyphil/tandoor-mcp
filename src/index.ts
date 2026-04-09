/**
 * Tandoor MCP Server - Entry point
 * 
 * This file initializes the MCP server and registers all tools
 */

import { TandoorApiClient } from './api/client';
import { RecipeImporter } from './tools/import';
import { SchemaOrgRecipe, ImportResult } from './types';

// For now, this is a placeholder
// The actual MCP server implementation would be added here
// This demonstrates the tool usage

export { TandoorApiClient } from './api/client';
export { RecipeImporter } from './tools/import';
export * from './types';

/**
 * Initialize the MCP server with Tandoor credentials
 */
export function initializeTandoorMCP(
  baseUrl: string,
  token: string
): {
  client: TandoorApiClient;
  importer: RecipeImporter;
  tools: { import_recipe_from_json: (recipe: SchemaOrgRecipe) => Promise<ImportResult> };
} {
  const client = new TandoorApiClient({ baseUrl, token });
  const importer = new RecipeImporter(client);

  return {
    client,
    importer,
    tools: {
      import_recipe_from_json: (recipe) => importer.importRecipeFromJson(recipe)
    }
  };
}

// Example usage (not executed):
// const mcp = initializeTandoorMCP('https://app.tandoor.dev', 'your-token-here');
// const result = await mcp.tools.import_recipe_from_json({
//   name: 'Pasta Carbonara',
//   recipeIngredient: ['400g spaghetti', '200g guanciale', '100g pecorino'],
//   recipeInstructions: ['Cook pasta...', 'Prepare sauce...']
// });
