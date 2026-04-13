# Tandoor MCP Server Specification

## 1. Goal

Enable AI agents to import recipes into Tandoor automatically by providing a validated structured JSON object (preferably schema.org/Recipe compatible) instead of free text URLs or partially formatted input.

The agent must call the MCP tool with a finalized JSON object including the recipe fields: name, description, ingredients, instructions, servings, timings, source_url, image, keywords, nutrition etc.

The MCP server maps and normalizes that object to Tandoor REST API model and calls Tandoor endpoints.

## 2. Underlying API (source of truth)
Base URL: `/api/`
Auth: token query or header (e.g., `Authorization: Token <token>`)

### Core endpoints
- `POST /api/recipe/`: create recipe with nested `steps` + `ingredients`.
- `PUT /api/recipe/{id}/image/`: attach image to recipe
- `GET /api/recipe/` + filters: search for existing duplicates
- `GET /api/food/`, `POST /api/food/` to resolve foods to canonical objects
- `GET /api/unit/`, `POST /api/unit/` to resolve unit objects
- `GET /api/keyword/`, `POST /api/keyword/` to resolve keyword objects
- `GET /api/recipe-import/` etc for optional import history

### Data models
- `Recipe`: id, name, description, source_url, internal flag, servings, keywords, steps, properties, ...
- `Step`: id, name, instruction, time, order, ingredients
- `Ingredient`: amount, food, unit, note, order, is_header, no_amount

## 3. MCP toolset (agent-facing operations)

### Tool A: `import_recipe_from_json(recipe_json)` (required)
- Input: complete structured recipe JSON object (strict schema.org/Recipe style, no URL-only or plain text bodies allowed).
- Mandatory fields (as a minimum):
  - `name`, `recipeIngredient`, `recipeInstructions`
  - `servings` / `recipeYield` (if available)
  - `sourceUrl` (recommended)
- Optional fields with direct mapping:
  - `description` → `Recipe.description`
  - `image` → `Recipe.image` (via separate upload endpoint)
  - `prepTime`, `cookTime`, `totalTime` → `Step.time` (aggregated or distributed)
  - `keywords` → `Recipe.keywords` (must exist in Tandoor beforehand)
- Optional fields with transformation or ignored:
  - `recipeCategory`, `recipeCuisine` → mapped to `keywords` if provided; ensure these exist or create them
  - `nutrition` → stored as `Recipe.nutrition` object (Tandoor JSON field)
  - `author`, `datePublished`, `url` → stored in `Recipe.source_url` or metadata (if supported)
  - Other schema.org fields (e.g., `estimatedCost`, `aggregateRating`) → ignored; agent will be notified in response

- **Ingredient Format**: The `recipeIngredient` array must contain strings formatted as `[amount] [unit] [food name][, optional note]`, where:
  - `amount` is a number (integer or decimal)
  - `unit` is optional and must match existing Tandoor units
  - `food name` must match existing Tandoor foods
  - `note` is optional preparation or additional information, separated by a comma
  - Examples: `"1 onion, chopped"`, `"2 cups tomatoes"`, `"salt"`, `"20g pecorino romano, grated"`
  - Ingredients without amounts or units are supported (e.g., `"salt"` or `"pepper, white"`)
  - **Plural Support**: Both singular and plural forms are accepted for units and foods (e.g., `"2 cups onions"` where `cup`→`cups`, `onion`→`onions`). The original text is preserved in `original_text` field for reference, so agents should use natural plural forms for better readability.

- Behavior:
  1. Validate that payload is well-formed JSON and meets the expected recipe structure (return a structured validation error if not).
  2. Normalize keys (schema.org → Tandoor): `recipeIngredient` → `ingredients`; `recipeInstructions` → `steps`.
  3. Parse and normalize each ingredient item into `{ amount, unit, food, note }` (use existing Tandoor `api/food` and `api/unit` as data sources).
  4. Convert instructions into step objects with explicit ordering and ingredient references.
  5. **Strict requirement**: All referenced `food`, `unit`, and `keyword` entities must already exist in Tandoor (agent must create them beforehand using separate tools). If any are missing, return `error_code: missing_entities` with list of missing items and suggested creation actions.
  6. POST to `/api/recipe/` with nested `steps` + `ingredients`.
  7. If `image` is provided as URL or base64, attempt upload via `/api/recipe/{id}/image/`. Log status in response.
  8. Return a JSON result with `recipe_id`, `recipe_url`, `import_status`, and `mapping_notes`.

- Response format:
  ```json
  {
    "recipe_id": 123,
    "recipe_url": "https://tandoor.example.com/api/recipe/123/",
    "import_status": "success",
    "mapping_notes": {
      "image_status": "uploaded" | "failed" | "not_provided",
      "field_transformations": [
        "recipeCuisine 'Italian' mapped to keyword 'Italian'",
        "prepTime 'PT30M' distributed to step times"
      ],
      "ignored_fields": ["estimatedCost", "aggregateRating", "author"],
      "warnings": ["Unit 'tsp' not found; stored as text in ingredient note"]
    }
  }
  ```

- Error handling (strict, machine-guided):
  - validation errors: return `error_code: invalid_payload`, `details` containing precise field/path issue.
  - missing entities: `error_code: missing_entities`, `details` with list of missing foods/units/keywords and creation tool calls.
  - API creation errors (400/422): return `error_code: api_schema_mismatch`, include Tandoor error body and suggested field map.
  - auth errors: `error_code: auth_failed`, include required token shape.
  - duplicate recipe: `error_code: duplicate_recipe`, with existing recipe ID and update suggestion.

### Tool B: `list_all_foods()` (agent-facing)
- Input: none (optional `page`, `page_size` for pagination).
- Behavior: GET `/api/food/` with no query filter. Return paginated list of all foods in Tandoor.
- Output: `{ results: [{ id, name, plural_name, substitute }], count, page, page_size, has_next, has_previous }` where `substitute` is an array of substitutable foods (read-only).
- Use case: Agent fetches once at start of import workflow to build a local reference map, avoiding repeated search calls.

### Tool C: `search_food(query)` (agent-facing)
- Input: search string (e.g., "onion", "tomatoes").
- Behavior: GET `/api/food/?query=<query>` to find matching foods. Return list of matching foods with IDs, names, plural forms, and substitutes.
- Output: array of food objects `{ id, name, plural_name, substitute }` where `substitute` lists foods that can substitute this one.
- Use case: Refine or validate specific food matches when list_all_foods is insufficient.

### Tool D: `create_food(name, plural_name?)` (agent-facing)
- Input: food name and optional plural form.
- Behavior: POST `/api/food/` with `{ name, plural_name }`. Return created food object.
- **Constraint**: Agent MUST check for existence first using `search_food()` or `list_all_foods()`. If the food already exists, return `error_code: entity_already_exists`.
- **Important**: Food names must be used exactly as they appear in the database (case-insensitive match). Use `list_all_foods()` to see available foods and their exact names before creating or referencing them in recipes.
- Note: Food substitutes are managed separately in Tandoor UI; agent should not set them during creation.

### Tool E: `list_all_units()` (agent-facing)
- Input: none (optional `page`, `page_size` for pagination).
- Behavior: GET `/api/unit/` with no query filter. Return paginated list of all units in Tandoor.
- Output: `{ results: [{ id, name }], count, page, page_size, has_next, has_previous }`.
- Use case: Agent fetches once at start to build reference map.

### Tool F: `search_unit(query)` (agent-facing)
- Input: search string (e.g., "cup", "grams").
- Behavior: GET `/api/unit/?query=<query>` to find matching units. Return list of matching units with IDs, names.
- Output: array of unit objects `{ id, name }`.
- Use case: Refine or validate specific unit matches.

### Tool G: `create_unit(name)` (agent-facing)
- Input: unit name.
- Behavior: POST `/api/unit/` with `{ name }`. Return created unit object.
- **Constraint**: Agent MUST check for existence first using `search_unit()` or `list_all_units()`. If the unit already exists, return `error_code: entity_already_exists`.
- **Important**: Unit names must be used exactly as they appear in the database (case-insensitive match). Use `list_all_units()` to see available units and their exact names before creating or referencing them in recipes.

### Tool H: `list_all_keywords()` (agent-facing)
- Input: none (optional `page`, `page_size` for pagination).
- Behavior: GET `/api/keyword/` with no query filter. Return paginated list of all keywords in Tandoor.
- Output: `{ results: [{ id, name }], count, page, page_size, has_next, has_previous }`.
- Use case: Agent fetches once at start to build reference map.

### Tool I: `search_keyword(query)` (agent-facing)
- Input: search string (e.g., "Italian", "vegetarian").
- Behavior: GET `/api/keyword/?query=<query>` to find matching keywords. Return list of matching keywords with IDs, names.
- Output: array of keyword objects `{ id, name }`.
- Use case: Refine or validate specific keyword matches.

### Tool J: `create_keyword(name)` (agent-facing)
- Input: keyword name.
- Behavior: POST `/api/keyword/` with `{ name }`. Return created keyword object.
- **Constraint**: Agent MUST check for existence first using `search_keyword()` or `list_all_keywords()`. If the keyword already exists, return `error_code: entity_already_exists`.
- **Important**: Keyword names must be used exactly as they appear in the database (case-insensitive match). Use `list_all_keywords()` to see available keywords and their exact names before creating or referencing them in recipes.

### Tool K: `search_recipes(query_params)` (agent-facing)
- Input: object with optional search parameters:
  - `query`: string for full-text search (name, description, etc.)
  - `foods`: array of food **IDs** (OR - match recipes containing ANY of these foods)
  - `foods_and`: array of food **IDs** (AND - match recipes containing ALL of these foods)
  - `foods_not`: array of food **IDs** to exclude (exclude recipes containing ANY of these foods)
  - `keywords`: array of keyword **IDs** (OR - match recipes with ANY of these keywords)
  - `keywords_and`: array of keyword **IDs** (AND - match recipes with ALL of these keywords)
  - `keywords_not`: array of keyword **IDs** to exclude (exclude recipes with ANY of these keywords)
  - `rating_gte`: minimum rating filter (0-5)
  - `timescooked_gte`: minimum times cooked filter
  - `all_ingredients_stocked`: boolean - only show recipes that can be made with stocked ingredients
  - `sort_order`: e.g., "score", "-score", "name", "-name", "rating", "-rating", etc.
  - `page`, `page_size`: pagination
- **Important**: Use `search_food()` and `search_keyword()` first to resolve names to IDs before calling this tool.
- Behavior: GET `/api/recipe/` with the provided query parameters. Return paginated list of recipe overviews.
- Output: `{ results: [recipe_overview], count, page, page_size, has_next, has_previous }`.
- Use case: Find recipes by ingredients/tags, browse existing recipes, check for duplicates.

**Input Schema for Tool K** (for reference implementation):
```json
{
  "type": "object",
  "properties": {
    "query": { "type": "string", "maxLength": 255, "description": "Full-text search string (name, description)" },
    "foods": { "type": "array", "items": { "type": "integer" }, "description": "Food IDs (OR - match recipes with any of these foods)" },
    "foods_and": { "type": "array", "items": { "type": "integer" }, "description": "Food IDs (AND - match recipes with all of these foods)" },
    "foods_not": { "type": "array", "items": { "type": "integer" }, "description": "Food IDs to exclude (exclude recipes with any of these foods)" },
    "keywords": { "type": "array", "items": { "type": "integer" }, "description": "Keyword IDs (OR - match recipes with any of these keywords)" },
    "keywords_and": { "type": "array", "items": { "type": "integer" }, "description": "Keyword IDs (AND - match recipes with all of these keywords)" },
    "keywords_not": { "type": "array", "items": { "type": "integer" }, "description": "Keyword IDs to exclude (exclude recipes with any of these keywords)" },
    "rating_gte": { "type": "number", "minimum": 0, "maximum": 5, "description": "Minimum rating filter (0-5)" },
    "timescooked_gte": { "type": "integer", "minimum": 0, "description": "Minimum times cooked filter" },
    "all_ingredients_stocked": { "type": "boolean", "description": "Only recipes that can be made with stocked/on-hand ingredients" },
    "sort_order": { "type": "string", "enum": ["score", "-score", "name", "-name", "created_at", "-created_at", "rating", "-rating", "times_cooked", "-times_cooked", "lastcooked", "-lastcooked", "lastviewed", "-lastviewed"], "description": "Sort order; prefix with '-' for descending" },
    "page": { "type": "integer", "minimum": 1, "default": 1, "description": "Page number (1-indexed)" },
    "page_size": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20, "description": "Results per page" }
  },
  "required": [],
  "additionalProperties": false
}
```

### Tool L: `get_recipe(recipe_id)` (agent-facing)
- Input: `recipe_id` (integer ID of the recipe).
- Behavior: GET `/api/recipe/{id}/` to retrieve the full recipe details. Convert the Tandoor response to schema.org/Recipe JSON format for consistency with import.
- Output: full recipe object in schema.org/Recipe structure (name, description, recipeIngredient, recipeInstructions, image, keywords, etc.).
- Use case: Inspect complete recipe content, verify imports, read recipes to users, compare with sources.

### Internal helpers (not exposed to agent):
- `convert_schemaorg_to_tandoor(recipe_json)`: maps schema.org to Tandoor payload.
- `create_recipe(recipe_payload)`: posts to Tandoor API.

---

## 3.1. Output Schemas (Machine-Readable Tool Results)

To support agent validation and structured parsing, each tool returns results conforming to JSON schemas defined below. Tools MAY include both unstructured text content and structured JSON for backwards compatibility.

### Tool A Output Schema: `import_recipe_from_json`
```json
{
  "type": "object",
  "properties": {
    "recipe_id": { "type": "integer", "description": "Tandoor recipe ID" },
    "recipe_url": { "type": "string", "format": "uri", "description": "Tandoor API recipe URL" },
    "import_status": { "type": "string", "enum": ["success", "error"] },
    "mapping_notes": {
      "type": "object",
      "properties": {
        "image_status": { "type": "string", "enum": ["uploaded", "failed", "not_provided"] },
        "field_transformations": { "type": "array", "items": { "type": "string" } },
        "ignored_fields": { "type": "array", "items": { "type": "string" } },
        "warnings": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "required": ["recipe_id", "import_status", "mapping_notes"]
}
```

### Tool B Output Schema: `list_all_foods`
```json
{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "plural_name": { "type": ["string", "null"] },
          "substitute": { "type": "array", "items": { "type": "object" } }
        },
        "required": ["id", "name"]
      }
    },
    "count": { "type": "integer", "description": "Total count of foods (across all pages)" },
    "page": { "type": "integer", "description": "Current page number (1-indexed)" },
    "page_size": { "type": "integer", "description": "Number of items on this page" },
    "has_next": { "type": "boolean", "description": "True if there are more pages after this one" },
    "has_previous": { "type": "boolean", "description": "True if there are pages before this one" }
  },
  "required": ["results", "count", "page", "page_size", "has_next", "has_previous"]
}
```

### Tool C Output Schema: `search_food`
Same as Tool B `results` array structure.

### Tool D Output Schema: `create_food`
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer", "description": "Tandoor food ID (existing or newly created)" },
    "name": { "type": "string" },
    "plural_name": { "type": ["string", "null"] },
    "substitute": { "type": "array", "items": { "type": "object" } }
  },
  "required": ["id", "name"]
}
```

### Tool E Output Schema: `list_all_units`
```json
{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" }
        },
        "required": ["id", "name"]
      }
    },
    "count": { "type": "integer" },
    "page": { "type": "integer", "description": "Current page number (1-indexed)" },
    "page_size": { "type": "integer", "description": "Number of items on this page" },
    "has_next": { "type": "boolean" },
    "has_previous": { "type": "boolean" }
  },
  "required": ["results", "count", "page", "page_size", "has_next", "has_previous"]
}
```

### Tool F Output Schema: `search_unit`
Same as Tool E `results` array structure.

### Tool G Output Schema: `create_unit`
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" }
  },
  "required": ["id", "name"]
}
```

### Tool H Output Schema: `list_all_keywords`
Same as Tool E structure (results array of `{ id, name }`), count, pagination.

### Tool I Output Schema: `search_keyword`
Same as Tool H `results` array structure.

### Tool J Output Schema: `create_keyword`
Same as Tool G structure (`{ id, name }`).

### Tool K Output Schema: `search_recipes`
```json
{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "description": { "type": ["string", "null"] },
          "rating": { "type": ["number", "null"] }
        },
        "required": ["id", "name"]
      }
    },
    "count": { "type": "integer" },
    "page": { "type": "integer", "description": "Current page number (1-indexed)" },
    "page_size": { "type": "integer", "description": "Number of items on this page" },
    "has_next": { "type": "boolean" },
    "has_previous": { "type": "boolean" }
  },
  "required": ["results", "count", "page", "page_size", "has_next", "has_previous"]
}
```

### Tool L Output Schema: `get_recipe`
```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "description": { "type": ["string", "null"] },
    "recipeIngredient": { "type": "array" },
    "recipeInstructions": { "type": "array" },
    "image": { "type": ["string", "null"] },
    "keywords": { "type": "array", "items": { "type": "object" } }
  },
  "required": ["id", "name"]
}
```

---

## 3.2. Pagination Convention

Tools that return paginated lists (`list_all_foods`, `list_all_units`, `list_all_keywords`, `search_recipes`) support pagination via optional parameters:

- **`page`** (optional, integer): Page number (1-indexed). If omitted, defaults to page 1.
- **`page_size`** (optional, integer): Number of results per page. If omitted, defaults to 20. Maximum 100.

Responses include pagination metadata to help agents navigate results:
- **`count`**: Total number of items across all pages.
- **`page`**: Current page number (1-indexed).
- **`page_size`**: Number of items returned in this response.
- **`has_next`**: Boolean indicating whether a next page exists. If `true`, agent can call tool again with `page = page + 1`.
- **`has_previous`**: Boolean indicating whether a previous page exists. If `true`, agent can call tool again with `page = page - 1`.

Example agent workflow:
```
1. Agent calls: list_all_foods(page=1, page_size=50)
2. Server returns: { results: [...50 items...], count: 237, page: 1, page_size: 50, has_next: true, has_previous: false }
3. Agent wants next page, calls: list_all_foods(page=2, page_size=50)
4. Server returns: { results: [...50 items...], count: 237, page: 2, page_size: 50, has_next: true, has_previous: true }
```

This parameter-based approach allows agents to easily construct subsequent tool calls without parsing or storing URIs.

---

## 3.3. MCP Capabilities Declaration

When this MCP server initializes a connection with an MCP client, it declares the following capabilities in the `initialize` response:

```json
{
  "capabilities": {
    "tools": {
      "listChanged": false
    }
  },
  "serverInfo": {
    "name": "tandoor-mcp",
    "version": "1.0.0"
  }
}
```

**Explanation**:
- **`tools`**: This server exposes 12 MCP tools for recipe import, food/unit/keyword management, and search.
- **`listChanged: false`**: The tools available to the server do not change at runtime; the tool list is static. Clients do not need to watch for tool list change notifications.
- **No `resources` or `prompts` capabilities**: This server does not expose resources or prompts; it focuses solely on tool-based actions.

---

### Agent contract (required behavior)
- Agent must produce valid JSON with no markdown/verbatim free text wrappers (`not: "<json> ..."`).
- **Ingredient Format**: When providing `recipeIngredient` strings, use the format `[amount] [unit] [food name][, optional note]` (e.g., `"1 onion, chopped"`, `"2 cups tomatoes"`, `"salt"`). Amounts are numbers, units and foods must exist in Tandoor, notes are optional.
- **Agent must check existence before creating**: Always use `list_all_*()` and `search_*()` tools to verify an entity does NOT exist before calling `create_*()` tools. This prevents `entity_already_exists` errors.
- When MCP returns an error, agent should adapt payload and retry. Error responses must include structured fields for each failure path.
- IDs are optional convenience data; agents may work with entity names and objects instead if preferred.

---


## 4. Requirements / Policy & Security

### 4.1. Core Policy Requirements
- strict schema approach: require a structured JSON recipe payload; no operator-level free-text fallback ingest is allowed.
- entity pre-existence: all `food`, `unit`, and `keyword` entities referenced in the recipe must already exist in Tandoor before import. Agent must use search/create tools to ensure this. Import fails with `missing_entities` error if any are absent.
- deduplicate: check if recipe already exists by `name` and normalized ingredient set, and return `error_code: duplicate_recipe` if already exists (optionally offer update path). Note: `source_url` is not used for duplicate detection as the Tandoor API does not support searching by source URL.
- units standardization: map units via `/api/unit/`; if unknown, keep raw text in `Ingredient.note` and return a warning annotation, not a failure.
- fields unsupported by Tandoor can be stored as `metadata` or `properties` and may be written via secondary updates.
- validation feedback: when a recipe field cannot be mapped or creates incompatibility, response should include `error_code`, `details`, and a “fix suggestion” entry (field, current_value, expected_format).
- user approval is optional, but for agent-run import, the default is automatic create after successful validation with a final confirmation block in output.

### 4.2. Security & Trust Model

**Human-in-the-Loop Responsibility**: This MCP server provides no user-facing safety mechanisms or confirmation prompts. It is the responsibility of the **MCP host** (the AI agent framework or application) to:

1. **Confirm recipe imports** with the user before invoking `import_recipe_from_json()` tool. Users should review recipe name, ingredients, and source URL.
2. **Show recipe details** prominently (name, ingredients, instructions) during review to prevent accidental imports of incorrect recipes.
3. **Handle errors gracefully**, presenting clear error messages and remediation steps to the user (e.g., "Food 'shallots' not found; create it first using the create_food tool").
4. **Log all import operations**, including source URL, import timestamp, and agent identity for audit purposes.
5. **Rate-limit tool invocations** to prevent accidental bulk imports or API exhaustion (recommended: max 10 imports per minute per user).

**Input Validation**: This server MUST validate all tool inputs according to JSON Schema and return structured errors (`error_code`, `details`, `suggestions`) to enable agent self-correction. Servers SHOULD NOT assume inputs are trustworthy; all external data (agent-provided JSON, Tandoor API responses) must be sanitized before storage or use.

**API Token Security**: Bearer tokens for Tandoor API authentication are passed via environment variables (`TANDOOR_API_TOKEN`, `TANDOOR_BASE_URL`) and are never logged, echoed, or returned in tool responses. The MCP host is responsible for securely managing and rotating credentials. Tokens should be protected from disclosure in logs or error messages.

**Error Information Leakage**: Error responses MAY include API schema details to help agents adapt requests, but MUST NOT include raw stack traces, internal paths, or credential information.

---


## 5. Implementation Roadmap
1. **API adapter layer** (Python recommended for MCP compatibility): wraps all Tandoor endpoints with retry, auth via environment variables (`TANDOOR_BASE_URL`, `TANDOOR_API_TOKEN`).
2. **Conversion/normalization module**:
   - map schema.org recipe JSON to Tandoor payload structure.
   - parse ingredients into amount/unit/food/note.
   - convert instructions to ordered steps with ingredient links.
3. **MCP server setup** (use MCP SDK for Python, protocol version 2025-11-25):
   - Expose tools as MCP tools with JSON schemas.
   - Handle errors with structured JSON responses.
4. **Unit tests**:
   - Mock Tandoor API responses.
   - Test schema validation, conversion, and error cases.
5. **Prototype** using conversation example:
   - Agent fetches URL, parses to JSON, uses MCP tools for import.

## 6. PoC Implementation Details
- **Language**: Python 3.10+.
- **Dependencies**: `mcp`, `httpx` for API calls, `pydantic` for validation.
- **Server behavior**: Synchronous tool calls, no background processing. Validate inputs strictly, return machine-readable errors.
- **Auth**: Bearer token in headers for Tandoor API.
- **Error format**: `{ "error_code": "string", "details": "object", "suggestions": ["string"] }`.
- **No AI processing**: Server only maps and calls APIs; all intelligence in agent.

## 7. Edge cases + handling
- If `Recipe` POST rejects because fields missing: capture response, attempt alt model mapping.
- Unsupported language unit and ingredient names: preserve as text in `Ingredient.note`.
- Image upload failures: log warning, continue without image.
- Simultaneous duplicates: agent checks beforehand via `search_recipes`.

## 8. Agent Workflow Example (Step-by-Step Recipe Import)

This section illustrates the expected sequence of MCP tool calls for an agent to successfully import a recipe from a URL.

### High-Level Flow
1. **Fetch reference data** — Load all foods, units, keywords once (cached locally)
2. **Fetch recipe content** — Download and parse URL to schema.org/Recipe JSON
3. **Check for duplicates** — Search existing recipes by name/source_url
4. **Resolve entities** — Ensure all foods, units, keywords exist; create if missing
5. **Import recipe** — Call `import_recipe_from_json` with validated payload
6. **Verify result** — Fetch full recipe to confirm import success

### Pseudo-Code Example

```python
import mcp

# ============================================================================
# STEP 1: Load reference data (cached for duration of import session)
# ============================================================================

# Fetch all foods (paginate if needed)
foods_db = {}
page = 1
while True:
    food_list = mcp.list_all_foods(page=page, page_size=100)
    foods_db.update({ f["name"].lower(): f["id"] for f in food_list["results"] })
    if not food_list["has_next"]:
        break
    page += 1

# Fetch all units (paginate if needed)
units_db = {}
page = 1
while True:
    unit_list = mcp.list_all_units(page=page, page_size=100)
    units_db.update({ u["name"].lower(): u["id"] for u in unit_list["results"] })
    if not unit_list["has_next"]:
        break
    page += 1

# Fetch all keywords (paginate if needed)
keywords_db = {}
page = 1
while True:
    keyword_list = mcp.list_all_keywords(page=page, page_size=100)
    keywords_db.update({ k["name"].lower(): k["id"] for k in keyword_list["results"] })
    if not keyword_list["has_next"]:
        break
    page += 1

# ============================================================================
# STEP 2: Parse recipe from URL to schema.org/Recipe JSON
# ============================================================================

recipe_url = "https://example.com/recipes/tomato-pasta"
recipe_json = parse_recipe_from_url(recipe_url)  # Agent's own parsing logic
# recipe_json now looks like:
# {
#   "name": "Tomato Pasta",
#   "description": "Quick weeknight pasta",
#   "source_url": "https://example.com/recipes/tomato-pasta",
#   "servings": 4,
#   "recipeIngredient": ["1 onion, chopped", "2 cups tomatoes", "1 tsp salt"],
#   "recipeInstructions": ["Chop onions.", "Add tomatoes. Simmer 30min."],
#   "keywords": ["Italian", "quick"],
#   "image": "https://example.com/image.jpg"
# }

# ============================================================================
# STEP 3: Check for duplicates
# ============================================================================

# Note: search_recipes only accepts IDs for foods/keywords filtering (not names).
# For this duplicate check, we search by recipe name via the 'query' parameter.
# If agent needed to find recipes by ingredient names, it would first resolve
# those names to IDs using search_food(), then pass food IDs to search_recipes().

existing = mcp.search_recipes(query=recipe_json["name"])
if existing["results"]:
    print(f"Recipe already exists: {existing['results'][0]}")
    return  # Skip import

# Example (not used here): if searching recipes containing specific foods by name:
# tomato_search = mcp.search_food(query="tomato")
# tomato_id = tomato_search[0]["id"]  # Resolve name to ID
# recipes_with_tomato = mcp.search_recipes(foods=[tomato_id])  # Use ID

# ============================================================================
# STEP 4: Resolve all entities (foods, units, keywords)
# ============================================================================

# Extract food names from ingredients
foods_needed = set()
for ingredient in recipe_json["recipeIngredient"]:
    food_name = extract_food_name(ingredient)  # "1 onion, chopped" → "onion"
    foods_needed.add(food_name)

# Ensure all foods exist; create if missing
# IMPORTANT: Agent must check existence first (via foods_db from list_all_foods)
# Only create_food if confirmed not in database. Otherwise, create_food returns entity_already_exists error.
food_mapping = {}  # Maps food names to IDs
for food_name in foods_needed:
    if food_name.lower() in foods_db:
        # Food exists in database, use its ID
        food_mapping[food_name] = foods_db[food_name.lower()]
    else:
        # Food doesn't exist; CREATE it
        # Safe to call create_food() because we've verified non-existence above
        new_food = mcp.create_food(name=food_name)
        food_mapping[food_name] = new_food["id"]
        foods_db[food_name.lower()] = new_food["id"]

# Extract units from ingredients
units_needed = set()
for ingredient in recipe_json["recipeIngredient"]:
    unit_name = extract_unit(ingredient)  # "1 onion, chopped" → None or "cups"
    if unit_name:
        units_needed.add(unit_name)

# Ensure all units exist; create if missing
# IMPORTANT: Agent must check existence first (via units_db from list_all_units)
unit_mapping = {}
for unit_name in units_needed:
    if unit_name.lower() in units_db:
        # Unit exists, use its ID
        unit_mapping[unit_name] = units_db[unit_name.lower()]
    else:
        # Unit doesn't exist; CREATE it
        # Safe to call create_unit() because we've verified non-existence above
        new_unit = mcp.create_unit(name=unit_name)
        unit_mapping[unit_name] = new_unit["id"]
        units_db[unit_name.lower()] = new_unit["id"]

# Ensure all keywords exist; create if missing
# IMPORTANT: Agent must check existence first (via keywords_db from list_all_keywords)
keyword_mapping = {}
for keyword in recipe_json.get("keywords", []):
    if keyword.lower() in keywords_db:
        # Keyword exists, use its ID
        keyword_mapping[keyword] = keywords_db[keyword.lower()]
    else:
        # Keyword doesn't exist; CREATE it
        # Safe to call create_keyword() because we've verified non-existence above
        new_keyword = mcp.create_keyword(name=keyword)
        keyword_mapping[keyword] = new_keyword["id"]
        keywords_db[keyword.lower()] = new_keyword["id"]

# ============================================================================
# STEP 5: Call import tool
# ============================================================================

try:
    result = mcp.import_recipe_from_json(recipe_json)
    
    if result["import_status"] == "success":
        recipe_id = result["recipe_id"]
        print(f"Recipe imported successfully: ID {recipe_id}")
        
        # Check mapping_notes for warnings
        if result["mapping_notes"]["warnings"]:
            print("Warnings:", result["mapping_notes"]["warnings"])
        
    else:
        print(f"Import failed: {result.get('error_code', 'unknown error')}")
        if "details" in result:
            print(f"Details: {result['details']}")
        if "suggestions" in result:
            for suggestion in result["suggestions"]:
                print(f"  → {suggestion}")
        return
        
except Exception as e:
    print(f"MCP error: {e}")
    return

# ============================================================================
# STEP 6: Verify import (optional, but recommended)
# ============================================================================

full_recipe = mcp.get_recipe(recipe_id)
print(f"Verified recipe: {full_recipe['name']} ({full_recipe['id']})")
print(f"  Ingredients: {len(full_recipe['recipeIngredient'])}")
print(f"  Instructions: {len(full_recipe['recipeInstructions'])}")
```

### Agent Error Handling

#### Proper Workflow: Check Before Create

The correct agent workflow always follows this pattern:
1. Load reference data via `list_all_foods()`, `list_all_units()`, `list_all_keywords()`
2. Check existence by searching the loaded data
3. **Only call create tools if verified NOT in database**

This prevents `entity_already_exists` errors.

#### If Entity Already Exists Error Occurs

If an agent calls `create_food()`, `create_unit()`, or `create_keyword()` for an entity that already exists, the server returns:
```json
{
  "error_code": "entity_already_exists",
  "details": {
    "entity_type": "food",
    "entity_name": "tomato",
    "existing_id": 42
  },
  "suggestions": [
    "Entity 'tomato' already exists in database (ID: 42)",
    "Use search_food() or list_all_foods() to verify existence before calling create_food()",
    "If you need to use this entity, reference its existing ID"
  ]
}
```

**Agent should NOT retry with different names or attempt workarounds.** This error indicates the agent skipped the existence check and must be fixed in the agent logic.

#### Handling `missing_entities` During Import

If the import fails with `missing_entities` (i.e., entities referenced in recipe_json don't exist), the agent should:
1. Extract the missing foods/units/keywords from error response
2. Create them using `create_food`, `create_unit`, `create_keyword`
3. Retry `import_recipe_from_json` with the same payload

Example:
```python
import_result = mcp.import_recipe_from_json(recipe_json)

if import_result.get("error_code") == "missing_entities":
    print("Missing entities detected. Creating them now...")
    
    missing = import_result["details"]["missing"]  # List of missing entity names
    
    for missing_food in missing.get("foods", []):
        new_food = mcp.create_food(name=missing_food)
        print(f"Created food: {missing_food} (ID: {new_food['id']})")
    
    for missing_unit in missing.get("units", []):
        new_unit = mcp.create_unit(name=missing_unit)
        print(f"Created unit: {missing_unit} (ID: {new_unit['id']})")
    
    for missing_keyword in missing.get("keywords", []):
        new_keyword = mcp.create_keyword(name=missing_keyword)
        print(f"Created keyword: {missing_keyword} (ID: {new_keyword['id']})")
    
    # Retry import now that entities exist
    import_result = mcp.import_recipe_from_json(recipe_json)
    if import_result["import_status"] == "success":
        print(f"Import succeeded on retry: Recipe ID {import_result['recipe_id']}")
```

---

## 9. Next steps (after spec approval)
1. Implement minimal proof-of-concept `mcp/` server with 1-2 tools.
2. Unit test recipe import from known URL sample.
3. Add schema conversion util `content-to-Recipe`.
4. Connect to Tandoor via real API token and run against sandbox.

---

### Appendix A: Reference Tandoor API dynamic endpoints
- `/api/recipe/` POST (create recipe with nested steps/ingredients)
- `/api/recipe/{id}/image/` PUT (image upload)
- `/api/food/`, `/api/unit/`, `/api/keyword/` (lookup / create)

### Appendix B: Minimal recipe payload example (MCP input body)
```json
{
  "name": "Tomato Pasta",
  "description": "A quick weeknight pasta",
  "source_url": "https://example.com/tomato-pasta",
  "servings": 4,
  "recipeCategory": "Main Dish",
  "recipeCuisine": "Italian",
  "image": "https://example.com/image.jpg",
  "recipeIngredient": [
    "1 onion, chopped",
    "2 cups tomatoes",
    "1 tsp salt"
  ],
  "recipeInstructions": "Chop onions. Add tomatoes.",
  "keywords": ["pasta", "quick"]
}
```

### Appendix C: Example import response (MCP output)
```json
{
  "recipe_id": 42,
  "recipe_url": "https://tandoor.example.com/api/recipe/42/",
  "import_status": "success",
  "mapping_notes": {
    "image_status": "uploaded",
    "field_transformations": [
      "recipeCuisine 'Italian' created/linked as keyword",
      "recipeCategory 'Main Dish' created/linked as keyword"
    ],
    "ignored_fields": [],
    "warnings": []
  }
}
```
