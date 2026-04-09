# Tandoor MCP Server

An MCP (Model Context Protocol) server for importing recipes into Tandoor Recipes automatically from structured JSON objects.

## Overview

This server implements tools to help AI agents import recipes into Tandoor Recipes by:
1. Converting schema.org Recipe JSON to Tandoor-compatible format
2. Validating and normalizing recipe data
3. Managing food, unit, and keyword entities
4. Handling recipe uploads with image attachments

## Project Structure

```
tandoor-mcp/
├── src/
│   ├── api/
│   │   └── client.ts              # Tandoor API client
│   ├── tools/
│   │   ├── import.ts              # Recipe importer tool (Tool A)
│   │   └── import.test.ts         # Import tool tests
│   ├── utils/
│   │   ├── normalize.ts           # Schema conversion utilities
│   │   ├── normalize.test.ts      # Normalization tests
│   │   └── schema-conversion.test.ts
│   ├── types.ts                   # TypeScript type definitions
│   └── index.ts                   # MCP server entry point
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .gitignore
├── mcp-spec.md                    # Formal MCP specification
└── README.md                       # This file
```

## Implemented Tools

### Tool A: `import_recipe_from_json` ✅

**Status**: Implemented with full tests

Imports a recipe from schema.org Recipe JSON format into Tandoor.

**Input**: 
```typescript
interface SchemaOrgRecipe {
  name: string;                    // Required: Recipe name
  recipeIngredient: string[];      // Required: List of ingredients
  recipeInstructions: string[];    // Required: List of instructions
  description?: string;             // Optional: Recipe description
  servings?: number;               // Optional: Number of servings
  recipeYield?: string | number;   // Optional: Alternative to servings
  sourceUrl?: string;              // Optional: Recipe source URL
  image?: string | string[];       // Optional: Image URL(s)
  keywords?: string[];             // Optional: Recipe tags
  recipeCuisine?: string | string[]; // Optional: Cuisine type(s)
  recipeCategory?: string;         // Optional: Recipe category
  prepTime?: string;               // Optional: ISO 8601 duration
  cookTime?: string;               // Optional: ISO 8601 duration
  totalTime?: string;              // Optional: ISO 8601 duration
  nutrition?: object;              // Optional: Nutrition facts
  [key: string]: any;              // Other schema.org fields
}
```

**Output**:
```typescript
{
  recipe_id: number;               // Tandoor recipe ID
  recipe_url: string;              // URL to recipe in Tandoor
  import_status: 'success' | 'error';
  mapping_notes: {
    image_status?: 'uploaded' | 'failed' | 'not_provided';
    field_transformations: string[];  // List of applied transformations
    ignored_fields: string[];         // Fields that were ignored
    warnings: string[];               // Any warnings during import
    error_code?: string;              // Error code if failed
    error_details?: any;              // Detailed error information
  }
}
```

**Process**:
1. Validates recipe has required fields (name, ingredients, instructions)
2. Fetches all foods, units, and keywords from Tandoor
3. Converts schema.org format to Tandoor format
4. Validates all entities exist in Tandoor
5. Creates recipe via POST to Tandoor API
6. Optionally uploads recipe image
7. Returns detailed result with transformation notes

**Error Handling**:
- `invalid_payload`: Missing or invalid required fields
- `missing_entities`: Referenced food/unit/keyword doesn't exist in Tandoor
- `api_schema_mismatch`: Tandoor API rejected the recipe payload
- `unexpected_error`: Unexpected runtime error

## Setup and Installation

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint
```

## Development

### Building

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

### Testing

```bash
npm test
```

Runs all test suites including:
- **normalize.test.ts** - Tests for schema normalization utilities
- **schema-conversion.test.ts** - Tests for schema.org to Tandoor conversion
- **import.test.ts** - Tests for the recipe importer tool

Coverage includes:
- ✅ Recipe validation
- ✅ ISO 8601 duration parsing
- ✅ Ingredient amount/unit parsing
- ✅ Instruction parsing
- ✅ Schema.org to Tandoor conversion
- ✅ Entity mapping
- ✅ Error handling
- ✅ Keyword mapping

### Code Quality

```bash
npm run lint
```

Checks code style and quality issues.

## Configuration

### Tandoor Connection

Create a `.env` file or pass configuration to `TandoorApiClient`:

```typescript
import { TandoorApiClient } from './src/api/client';

const client = new TandoorApiClient({
  baseUrl: 'https://app.tandoor.dev',
  token: 'your-api-token'
});
```

Get your API token from Tandoor's settings page.

## Usage Example

```typescript
import { TandoorApiClient } from './src/api/client';
import { RecipeImporter } from './src/tools/import';

const client = new TandoorApiClient({
  baseUrl: 'https://app.tandoor.dev',
  token: 'your-token'
});

const importer = new RecipeImporter(client);

const recipe = {
  name: 'Pasta Carbonara',
  description: 'Classic Italian pasta with eggs and bacon',
  recipeIngredient: [
    '400g spaghetti',
    '200g bacon',
    '4 eggs',
    '100g pecorino romano'
  ],
  recipeInstructions: [
    'Bring a large pot of salted water to boil',
    'Add pasta and cook until al dente',
    'While pasta cooks, fry bacon until crispy',
    'Beat eggs with grated cheese',
    'Drain pasta and toss with hot bacon',
    'Add egg mixture and toss quickly to avoid scrambling'
  ],
  servings: 4,
  sourceUrl: 'https://example.com/carbonara',
  keywords: ['Italian', 'Pasta', 'Quick']
};

const result = await importer.importRecipeFromJson(recipe);

if (result.import_status === 'success') {
  console.log(`Recipe imported! ID: ${result.recipe_id}`);
  console.log(`URL: ${result.recipe_url}`);
  console.log(`Transformations: ${result.mapping_notes.field_transformations}`);
} else {
  console.error('Import failed:', result.mapping_notes.error_details);
  console.error('Warnings:', result.mapping_notes.warnings);
}
```

## Planned Tools

- **Tool B**: list_all_foods
- **Tool C**: search_food
- **Tool D**: create_food
- **Tool E**: list_all_units
- **Tool F**: search_unit
- **Tool G**: create_unit
- **Tool H**: list_all_keywords
- **Tool I**: search_keyword
- **Tool J**: create_keyword
- **Tool K**: search_recipes
- **Tool L**: get_recipe

See [mcp-spec.md](./mcp-spec.md) for complete specification.

## Error Handling

The tool provides detailed error information to help agents understand what went wrong:

### Validation Errors
```json
{
  "import_status": "error",
  "mapping_notes": {
    "error_code": "invalid_payload",
    "error_details": {
      "field": "recipeIngredient",
      "issue": "Missing or empty ingredient list"
    }
  }
}
```

### Missing Entities
```json
{
  "import_status": "error",
  "mapping_notes": {
    "error_code": "missing_entities",
    "error_details": {
      "missing": [
        "Food 'unique ingredient' not found in Tandoor"
      ]
    },
    "warnings": ["Food 'unique ingredient' not found..."]
  }
}
```

### API Errors
```json
{
  "import_status": "error",
  "mapping_notes": {
    "error_code": "api_schema_mismatch",
    "error_details": {
      "detail": "Invalid recipe data"
    }
  }
}
```

## Architecture

### API Client (`src/api/client.ts`)
- Handles all HTTP communication with Tandoor
- Manages authentication via token
- Provides methods for CRUD operations on foods, units, keywords, and recipes

### Normalizer (`src/utils/normalize.ts`)
- Converts schema.org Recipe format to Tandoor API format
- Parses ISO 8601 durations (PT1H30M → 90 minutes)
- Extracts amounts and units from ingredient strings
- Maps keywords and categories to existing Tandoor entities

### Importer Tool (`src/tools/import.ts`)
- Orchestrates the import process
- Validates recipes
- Builds entity lookup maps
- Handles errors gracefully
- Manages image uploads

## Testing Strategy

### Unit Tests
- Validation logic
- Parsing functions (duration, amounts, instructions)
- Entity mapping
- Field transformation

### Integration Tests
- Full import workflow with mocked API
- Error scenarios
- Entity resolution
- Image handling

### Test Coverage
All core business logic is covered. Mock tests ensure handlers work correctly without hitting a real Tandoor instance.

Run with:
```bash
npm test -- --coverage
```

## Contributing

1. Ensure all tests pass: `npm test`
2. Lint your code: `npm run lint`
3. Build the project: `npm run build`
4. Follow the TypeScript conventions in the codebase

## License

[GNU LGPLv3](./COPYING.LESSER)

## API Documentation Reference

For the complete MCP specification and all planned tools, see [mcp-spec.md](./mcp-spec.md)

This project implements the Tandoor MCP Server specification for automated recipe importing.
