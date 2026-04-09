# Tandoor MCP Server

An MCP (Model Context Protocol) server for importing recipes into Tandoor Recipes automatically from structured JSON objects.

## Prerequisites

- Node.js 16+
- npm or yarn
- A running [Tandoor Recipes](https://github.com/TandoorRecipes/recipes) instance
- A Tandoor API token (get it from your Tandoor account API settings)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/tandoor-mcp.git
cd tandoor-mcp

# Install dependencies
npm install

# Build the server
npm run build
```

## Configuration

The MCP server requires the following environment variables:

| Variable | Description |
|----------|-------------|
| `TANDOOR_BASE_URL` | The base URL of your Tandoor instance (e.g., `https://app.tandoor.dev`) |
| `TANDOOR_API_TOKEN` | Your Tandoor API token (found in Tandoor [API settings](https://app.tandoor.dev/settings/api)) |

You can set these in your environment or create a `.env` file:

```bash
TANDOOR_BASE_URL=https://app.tandoor.dev
TANDOOR_API_TOKEN=your-api-token-here
```

## MCP Server Configuration

To use this server, add it to your MCP client configuration. Below are examples for common clients.

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "tandoor": {
      "command": "node",
      "args": ["/path/to/tandoor-mcp/dist/index.js"],
      "env": {
        "TANDOOR_BASE_URL": "https://app.tandoor.dev",
        "TANDOOR_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

### Cursor

Add to your Cursor settings (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "tandoor": {
      "command": "node",
      "args": ["/path/to/tandoor-mcp/dist/index.js"],
      "env": {
        "TANDOOR_BASE_URL": "https://app.tandoor.dev",
        "TANDOOR_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

### Other MCP Clients

The server is started with Node.js and accepts the following arguments:

```bash
node dist/index.js
```

Set the environment variables `TANDOOR_BASE_URL` and `TANDOOR_API_TOKEN` before starting.

## Available Tools

### `import_recipe_from_json`

Imports a recipe from schema.org Recipe JSON format into Tandoor.

**Input**: A JSON object with the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Recipe name |
| `recipeIngredient` | Yes | List of ingredients (e.g., `["200g flour", "3 eggs"]`) |
| `recipeInstructions` | Yes | List of instructions (e.g., `["Mix ingredients", "Bake at 180°C"]`) |
| `description` | No | Recipe description |
| `servings` | No | Number of servings |
| `sourceUrl` | No | Original recipe URL |
| `image` | No | Image URL |
| `keywords` | No | List of tags |
| `prepTime` | No | Prep time in ISO 8601 duration (e.g., `PT15M`) |
| `cookTime` | No | Cook time in ISO 8601 duration (e.g., `PT30M`) |

**Output**: An object with:
- `recipe_id`: The created recipe's ID
- `recipe_url`: URL to the recipe in Tandoor
- `import_status`: Either `"success"` or `"error"`
- `mapping_notes`: Details about field transformations, warnings, and any errors

**Example**:

```json
{
  "name": "Chocolate Cake",
  "recipeIngredient": [
    "200g flour",
    "100g cocoa powder",
    "4 eggs",
    "200g sugar"
  ],
  "recipeInstructions": [
    "Preheat oven to 180°C",
    "Mix dry ingredients",
    "Add eggs and mix well",
    "Bake for 30 minutes"
  ],
  "servings": 8,
  "prepTime": "PT15M",
  "cookTime": "PT30M"
}
```

## Planned Tools

- `list_all_foods` / `search_food` / `create_food`
- `list_all_units` / `search_unit` / `create_unit`
- `list_all_keywords` / `search_keyword` / `create_keyword`
- `search_recipes` / `get_recipe`

See [mcp-spec.md](./mcp-spec.md) for the complete specification.

## Troubleshooting

### Authentication errors

Make sure your API token is valid and has the necessary permissions in Tandoor.

### Ingredient/keyword not found

The importer will warn you if referenced ingredients, units, or keywords don't exist in Tandoor. You can either create them in Tandoor first, or use only ingredients and units that already exist.

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint
```

## License

[GNU LGPLv3](./COPYING.LESSER)
