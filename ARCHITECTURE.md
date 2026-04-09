# Tandoor MCP Server Architecture

## Overview

This document describes the architecture of the Tandoor MCP Server, a Model Context Protocol (MCP) server that enables AI agents to interact with Tandoor recipe management software.

## Project Structure

```
src/
├── index.ts                    # Server entry point (~140 lines)
├── schemas.ts                  # Centralized Zod validation schemas
├── constants.ts                # Error codes, HTTP status, defaults
├── types.ts                    # TypeScript type definitions
├── api/
│   └── client.ts               # Axios-based Tandoor API client
├── utils/
│   ├── errors.ts               # Error handling utilities
│   ├── response.ts             # MCP response formatters
│   ├── normalize.ts            # Recipe payload normalization
│   └── schema-conversion.ts    # Schema.org to Tandoor conversion
├── tools/
│   ├── import.ts               # Recipe import functionality
│   ├── foods.ts                # Food tool handlers (factory pattern)
│   ├── units.ts                # Unit tool handlers (factory pattern)
│   ├── keywords.ts             # Keyword tool handlers (factory pattern)
│   ├── recipes.ts              # Recipe tool handlers (factory pattern)
│   └── tool-definitions.ts     # Tool metadata and list handler
└── test-utils/
    ├── mocks.ts                # Test fixtures and mock client
    └── helpers.ts              # Test helper functions
```

## Design Patterns

### Factory Pattern for Tool Handlers

All entity tool handlers use a factory pattern for consistent initialization and dependency injection:

```typescript
// Example: foods.ts
export function createFoodToolHandlers(client: TandoorApiClient) {
  return {
    listAll: async (args, extra) => { /* ... */ },
    search: async (args, extra) => { /* ... */ },
    create: async (args, extra) => { /* ... */ },
  };
}
```

This pattern:
- Ensures consistent error handling across all tools
- Allows dependency injection of the API client
- Makes testing easier with mock clients
- Reduces boilerplate code

### Centralized Error Handling

All API errors are handled consistently via `src/utils/errors.ts`:

```typescript
export async function handleApiError<T>(
  operation: () => Promise<T>,
  entityType: EntityType,
  operationType: 'list' | 'search' | 'create',
  args: Record<string, unknown>
): Promise<T | MCPResponse>
```

Benefits:
- Consistent error messages across all tools
- Proper handling of HTTP 409 (Conflict) for duplicate entities
- Structured error codes for client handling
- Automatic retry logic for transient failures

### Centralized Response Formatting

All tool responses use standardized formatters from `src/utils/response.ts`:

```typescript
createJsonResponse(data)    // JSON-serialized content
createTextResponse(text)    // Plain text content
createErrorResponse(code, message, details)  // Error responses
```

## Tool Organization

### Entity Tools

Each entity (foods, units, keywords) follows the same pattern:

| Tool | Purpose |
|------|---------|
| `list_all_{entity}s` | Paginated listing with local caching support |
| `search_{entity}` | Query-based search with exact/partial matching |
| `create_{entity}` | Creation with duplicate checking |

### Recipe Tools

| Tool | Purpose |
|------|---------|
| `import_recipe_from_json` | Schema.org → Tandoor conversion and import |
| `search_recipes` | Search with food/keyword ID filtering |
| `get_recipe` | Retrieve full recipe by ID |

## API Client Design

The `TandoorApiClient` (`src/api/client.ts`) provides:

- Axios-based HTTP client with automatic auth header injection
- Type-safe wrappers for all Tandoor API endpoints
- Consistent error propagation
- Configurable base URL and authentication

## Recipe Import Flow

```
Schema.org Recipe JSON
        ↓
validateRecipePayload() - Basic structure validation
        ↓
buildEntityMaps() - Fetch all foods/units/keywords in parallel
        ↓
convertSchemaOrgToTandoor() - Transform to Tandoor format
        ↓
validateEntitiesExist() - Verify all referenced entities exist
        ↓
createRecipe() - POST to Tandoor API
        ↓
Upload image (if provided)
        ↓
Return ImportResult with mapping notes
```

## Error Codes

Defined in `src/constants.ts`:

| Code | Meaning |
|------|---------|
| `INVALID_PAYLOAD` | Recipe JSON validation failed |
| `MISSING_ENTITIES` | Referenced food/unit/keyword doesn't exist |
| `ENTITY_ALREADY_EXISTS` | Duplicate entity creation attempted |
| `API_SCHEMA_MISMATCH` | Tandoor API rejected the payload |
| `UNEXPECTED_ERROR` | Unhandled exception |

## Testing Strategy

### Unit Tests

Each tool module has corresponding `.test.ts` file testing:
- Factory function behavior
- Individual handler logic
- Error handling paths

### Test Utilities

- `test-utils/mocks.ts` - Mock client factory, test fixtures
- `test-utils/helpers.ts` - Response parsing helpers

### Server Tests

`server.test.ts` validates:
- Tool registration completeness
- Tool metadata structure
- Schema validation

## Performance Optimizations

1. **Parallel Entity Fetching**: `buildEntityMaps()` uses `Promise.all()` to fetch foods, units, and keywords concurrently
2. **Pagination Support**: All list operations support configurable page size
3. **Caching Ready**: Entity maps designed to support future memoization

## Type Safety

- Zod schemas for runtime validation
- TypeScript strict mode enabled
- MCP SDK types for server/tool interfaces
- Custom types for Tandoor API entities in `types.ts`
