# Plan: Tandoor MCP Code Review & Refactoring

## TL;DR

The codebase is functional but has significant maintainability issues: tool handlers are duplicated inline in `index.ts` (300+ lines of repetitive code), missing implementation files (`units.ts`, `recipes.ts`), no caching for entity lookups, and inconsistent patterns. This plan restructures the code into a modular, extensible architecture with proper separation of concerns, centralized error handling, and improved test organization.

---

## Steps

### Phase 1: Establish Core Infrastructure (Foundation)

**1.1. Create constants module** (`src/constants.ts`)
- Extract error codes: `INVALID_PAYLOAD`, `MISSING_ENTITIES`, `ENTITY_ALREADY_EXISTS`, `API_SCHEMA_MISMATCH`, `AUTH_FAILED`, `DUPLICATE_RECIPE`, `UNEXPECTED_ERROR`
- Extract default values: `DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 100`, `ENTITY_FETCH_PAGE_SIZE = 100`
- Extract HTTP status codes: `HTTP_CONFLICT = 409`
- *Rationale: Centralizes magic values, makes code self-documenting*

**1.2. Create error handling utilities** (`src/utils/errors.ts`)
- Create `TandoorMcpError` class extending `McpError` with structured error codes
- Create `handleApiError(error, entityType?, entityName?)` function that:
  - Detects 409 conflict → returns `entity_already_exists` error
  - Detects 4xx/5xx → returns appropriate error with details
  - Wraps unknown errors → returns `unexpected_error`
- Create `createEntityExistsError(entityType, entityName)` for consistent 409 handling
- *Rationale: Eliminates 50+ lines of duplicated error handling code across tools*

**1.3. Create response utilities** (`src/utils/response.ts`)
- Create `createJsonResponse(data)` → returns `{ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }`
- *Rationale: Standardizes MCP tool response format, reduces boilerplate*

---

### Phase 2: Restructure Tool Handlers (Modularization)

**2.1. Adopt factory pattern for tool handlers**
- Extend `keywords.ts` pattern to all entity types
- Create `src/tools/foods.ts` with `createFoodToolHandlers(client)` returning `{ listAll, search, create }`
- Create `src/tools/units.ts` with `createUnitToolHandlers(client)` returning `{ listAll, search, create }`
- Update `src/tools/keywords.ts` to use new error handling utilities
- *Each handler file should:*
  - Import error utilities from `src/utils/errors.ts`
  - Import response utility from `src/utils/response.ts`
  - Export factory function that accepts `TandoorApiClient`
  - Return object with named handler functions

**2.2. Create recipe tools module** (`src/tools/recipes.ts`)
- Create `createRecipeToolHandlers(client, importer)` returning `{ search, get }`
- Move `searchRecipesTool` and `getRecipeTool` handlers from `index.ts`
- Use centralized error handling

**2.3. Refactor `src/tools/import.ts`**
- Use constants for error codes
- Add parallel fetching for entity maps (Promise.all for foods/units/keywords)
- Add optional caching layer (in-memory Map with TTL, disabled by default)
- Improve error messages with more context

**2.4. Slim down `src/index.ts`**
- Remove all inline tool handler implementations
- Import handler factories from tool modules
- Keep only:
  - Server initialization
  - Environment validation
  - Zod schema definitions (or move to `src/schemas.ts`)
  - Tool registration (wiring handlers to server)
  - Server startup
- Target: <150 lines

---

### Phase 3: Improve Type Safety & Validation

**3.1. Strengthen types in `src/types.ts`**
- Remove `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments
- Replace `any` with `unknown` or specific types where possible
- Create branded types for IDs: `FoodId`, `UnitId`, `KeywordId`, `RecipeId` (type aliases for clarity)
- Add strict types for error responses

**3.2. Create schema module** (`src/schemas.ts`)
- Move all Zod schemas from `index.ts` to dedicated file
- Export schemas for reuse in tests
- Add JSDoc comments for each schema explaining the field
- *Rationale: Schemas are reusable, tests can import them for validation*

---

### Phase 4: Enhance Testing Structure

**4.1. Create test utilities** (`src/test-utils/`)
- Create `mocks.ts` with:
  - `createMockClient()` - returns mock TandoorApiClient with all methods
  - `createMockImporter()` - returns mock RecipeImporter
  - `createMockRecipe()` - returns valid SchemaOrgRecipe fixture
- Create `helpers.ts` with:
  - `parseToolResponse(response)` - extracts JSON from MCP response
  - `expectMcpError(errorCode)` - custom Jest matcher for McpError

**4.2. Reorganize test files**
- Keep tests co-located with source (current pattern is good)
- Update all tests to use shared mocks
- Add integration test file: `src/integration.test.ts` (optional, for real API testing)

**4.3. Improve test coverage**
- Add tests for error handling utilities
- Add tests for response utilities
- Add edge case tests for ingredient parsing (fractions, ranges like "1-2 cups")

---

### Phase 5: Performance & Reliability

**5.1. Add entity caching** (optional enhancement)
- Create `src/utils/cache.ts` with simple in-memory TTL cache
- Modify `RecipeImporter.buildEntityMaps()` to:
  - Check cache first
  - Fetch only if cache miss or expired
  - Default TTL: 5 minutes
- *Rationale: Avoids re-fetching 1000+ foods on every import*

**5.2. Add request retry logic** (optional enhancement)
- Create axios retry interceptor in `TandoorApiClient`
- Retry on 5xx errors and network timeouts
- Exponential backoff: 1s, 2s, 4s (max 3 retries)

---

### Phase 6: Documentation & Developer Experience

**6.1. Add JSDoc comments**
- Document all public functions in utils/
- Document all tool handlers
- Document TandoorApiClient methods

**6.2. Create ARCHITECTURE.md**
- Document the module structure
- Explain the factory pattern for tool handlers
- Document how to add a new tool

---

## Relevant Files

### Files to Create
- `src/constants.ts` — Error codes, default values, HTTP constants
- `src/utils/errors.ts` — Centralized error handling
- `src/utils/response.ts` — MCP response helpers
- `src/tools/foods.ts` — Food tool handlers (factory pattern)
- `src/tools/units.ts` — Unit tool handlers (factory pattern)
- `src/tools/recipes.ts` — Recipe search/get handlers
- `src/schemas.ts` — Zod input validation schemas
- `src/test-utils/mocks.ts` — Shared test mocks
- `src/test-utils/helpers.ts` — Test helper functions

### Files to Modify
- `src/index.ts` — Remove inline handlers, import from modules (target <150 lines)
- `src/tools/import.ts` — Use constants, add parallel fetching, optional caching
- `src/tools/keywords.ts` — Use centralized error handling
- `src/types.ts` — Remove `any` types, add branded ID types
- `src/api/client.ts` — Add optional retry logic
- All test files — Use shared mocks, improve coverage

### Files to Delete
- None (all existing files have value)

---

## Verification

1. **Build verification**: `npm run build` completes without errors
2. **Test verification**: `npm test` passes with >80% coverage
3. **Lint verification**: `npm run lint` passes without warnings
4. **Functional verification**: Manual test of each MCP tool using MCP inspector or test client
5. **Code size verification**: `src/index.ts` is under 150 lines
6. **Pattern verification**: All tool handlers use factory pattern and centralized error handling

---

## Decisions

- **Factory pattern over classes**: Using factory functions (`createXxxToolHandlers`) instead of classes for simplicity and functional style consistency
- **Co-located tests**: Keep test files next to source files (Jest convention, easier navigation)
- **Optional caching**: Caching is valuable but adds complexity; make it opt-in via constructor option
- **Zod over manual validation**: Keep Zod for input validation (MCP SDK integration, type safety)
- **No breaking changes**: All refactoring maintains the same MCP tool interface

---

## Further Considerations

1. **Logging strategy**: Should we add structured logging (pino/winston) for debugging? Recommend: Add optional logger parameter to client/importer constructors, default to console.

2. **Image upload retry**: Currently image upload failure is logged but not retried. Recommend: Add 1 retry for image upload with exponential backoff.

3. **Duplicate recipe detection**: Spec mentions checking for duplicates, but current implementation only searches by name. Recommend: Add optional `check_duplicates` parameter to import that searches by name + source_url before creating.
