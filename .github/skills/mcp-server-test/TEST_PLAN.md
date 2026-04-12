# Tandoor MCP Server - Test Plan

**Date**: April 11, 2026
**Test Server**: https://app.tandoor.dev
**Purpose**: Reproducible test cases for validating MCP tool functionality

---

## Test Sequence

**⚠️ IMPORTANT**: Execute the tests exactly as they are stated in the test plan. Do not modify any inputs or try to work around errors returned by the MCP server - if the tool doesn't succeed or fail exactly as the test plan expects it to, it indicates a failed test! Tests can either completely pass or fail, there is no "it worked, but a little bit different than expected".

Run tests in this order to avoid dependency issues. Before running the test suite, ensure that entities that should be created during tests don't already exist. If they do, don't start testing and abort immediately. Notify the user that the test setup is wrong and which entities have to be deleted manually before the test can be started again (tools deleting entities aren't available yet, so cleanup between test runs is still a manual operation).

---

## Expected Outcome Format

Each test includes:
- **Expected**: `SUCCESS` or `FAILURE` (with error code)
- **Verify**: List of fields/conditions to check in the response

---

## 1. Pre-flight Checks

**Purpose**: Ensure no conflicting test artifacts exist from previous runs

| Search Pattern | Expected Result |
|----------------|-----------------|
| `search_food`: "copilot-test-avocado-unique" | Empty or no exact match |
| `search_unit`: "copilot-test-cup-unique" | Empty or no exact match |
| `search_keyword`: "copilot-test-keyword-unique" | Empty or no exact match |
| `search_recipes`: "Copilot Test Recipe" | No recipes with this prefix |

**Action**: If any conflicts found, abort testing and clean up before proceeding.

---

## 2. List Tools (Read Operations)

### 2.1 list_all_foods
**Input:**
```json
{
  "page": 1,
  "page_size": 10
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `results` array (0-10 items)
- [ ] Response contains `count` (integer ≥ 0)
- [ ] Response contains `page` with value `1`
- [ ] Response contains `page_size` with value `10`
- [ ] Response contains `has_next` (boolean)
- [ ] Response contains `has_previous` (boolean, should be `false` for page 1)
- [ ] Each item in `results` has `id`, `name` fields

---

### 2.2 list_all_units
**Input:**
```json
{
  "page": 1,
  "page_size": 10
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `results` array (0-10 items)
- [ ] Response contains `count` (integer ≥ 0)
- [ ] Response contains `page` with value `1`
- [ ] Response contains `page_size` with value `10`
- [ ] Response contains `has_next` (boolean)
- [ ] Response contains `has_previous` (boolean, should be `false` for page 1)
- [ ] Each item in `results` has `id`, `name` fields

---

### 2.3 list_all_keywords
**Input:**
```json
{
  "page": 1,
  "page_size": 10
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `results` array (0-10 items)
- [ ] Response contains `count` (integer ≥ 0)
- [ ] Response contains `page` with value `1`
- [ ] Response contains `page_size` with value `10`
- [ ] Response contains `has_next` (boolean)
- [ ] Response contains `has_previous` (boolean, should be `false` for page 1)
- [ ] Each item in `results` has `id`, `name`, `label` fields

---

## 3. Search Tools (Read Operations)

### 3.1 search_food - Common Foods
**Input:**
```json
{
  "query": "onion"
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Returns array of food objects
- [ ] Each item has `id` (integer) and `name` (string)
- [ ] Results contain items with names matching or containing "onion"
- [ ] First result should be exact or close match for "onion"

---

### 3.2 search_unit - Common Units
**Input:**
```json
{
  "query": "cup"
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Returns array of unit objects
- [ ] Each item has `id` (integer) and `name` (string)
- [ ] Results should include unit "cups" (ID: 4021) if it exists

---

### 3.3 search_keyword - Common Keywords
**Input:**
```json
{
  "query": "Italian"
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Returns array of keyword objects
- [ ] Each item has `id` (integer), `name` (string), and `label` (string)
- [ ] Results contain items with names/labels matching or containing "Italian"

---

### 3.4 search_recipes - Basic
**Input:**
```json
{
  "page": 1,
  "page_size": 10
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `results` array (0-10 recipe overviews)
- [ ] Response contains `count` (integer ≥ 0, total matching recipes)
- [ ] Response contains `page` with value `1`
- [ ] Response contains `page_size` with value `10`
- [ ] Response contains `has_next` (boolean)
- [ ] Response contains `has_previous` (boolean, should be `false` for page 1)
- [ ] Each recipe has `id`, `name`, `description` (may be null), `image` (may be null)

---

### 3.5 search_recipes - With Filters (Optional Advanced Test)
**Purpose**: Verify complex filtering pipeline works end-to-end
**Prerequisites**: Note food ID from 3.1 (onion) and keyword ID from 3.3 (Italian)

**Input:**
```json
{
  "query": "pasta",
  "foods": [<onion_id>],
  "keywords": [<italian_id>],
  "rating_gte": 3,
  "sort_order": "-rating",
  "page": 1,
  "page_size": 5
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `results` array
- [ ] `count` reflects filtered results (may be 0 if no matches)
- [ ] Results respect pagination (max 5 items)

---

### 3.6 get_recipe - Existing Recipe
**Purpose**: Retrieve full recipe details by ID
**Prerequisites**: Use any recipe ID from `search_recipes` results (3.4)

**Input:**
```json
{
  "recipe_id": <existing_recipe_id>
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `id` matching the requested `recipe_id`
- [ ] Response contains `name` (string)
- [ ] Response contains `recipeIngredient` array (may be empty)
- [ ] Response contains `recipeInstructions` array (may be empty)
- [ ] Response contains `keywords` array of keyword objects
- [ ] Response contains `servings` (integer or null)
- [ ] Response contains `description` (string or null)
- [ ] Response contains `image` (string URL or null)

---

### 3.7 get_recipe - Non-existent Recipe
**Purpose**: Verify error handling for missing recipes

**Input:**
```json
{
  "recipe_id": 999999999
}
```

**Expected:** `FAILURE` with `error_code: not_found` or `api_schema_mismatch`
**Verify:**
- [ ] Error response has appropriate `error_code`
- [ ] HTTP status is 404 (implied by error)

---

## 4. Create Tools (Write Operations)

**⚠️ CRITICAL**: Use **unique names** to avoid conflicts with existing data.

### 4.1 create_food - New Entity
**Purpose:** Create a new food item that doesn't exist
**Precondition:** Search for `copilot-test-avocado-unique` must return empty results

**Input:**
```json
{
  "name": "copilot-test-avocado-unique",
  "plural_name": "copilot-test-avocados-unique"
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `id` (positive integer)
- [ ] Response contains `name` with exact value `"copilot-test-avocado-unique"`
- [ ] Response contains `plural_name` with value `"copilot-test-avocados-unique"`
- [ ] Response does NOT contain error fields (`error_code`, `details`)

---

### 4.2 create_food - Duplicate Entity
**Purpose:** Verify duplicate detection by MCP server
**Precondition:** Test 4.1 must have succeeded (food now exists)

**Input:**
```json
{
  "name": "copilot-test-avocado-unique",
  "plural_name": "copilot-test-avocados"
}
```

**Expected:** `FAILURE` with `error_code: entity_already_exists`
**Verify:**
- [ ] Response contains `error_code` with value `"entity_already_exists"`
- [ ] Response contains `details` with `entity_type: "food"` and `entity_name: "copilot-test-avocado-unique"`
- [ ] `details.existing_id` matches ID from Test 4.1

---

### 4.3 create_unit - New Entity
**Purpose:** Create a new measurement unit
**Precondition:** Search for `copilot-test-cup-unique` must return empty results

**Input:**
```json
{
  "name": "copilot-test-cup-unique"
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `id` (positive integer)
- [ ] Response contains `name` with exact value `"copilot-test-cup-unique"`
- [ ] Response does NOT contain error fields

---

### 4.4 create_unit - Duplicate Entity
**Purpose:** Verify duplicate detection
**Precondition:** Test 4.3 must have succeeded (unit now exists)

**Input:**
```json
{
  "name": "copilot-test-cup-unique"
}
```

**Expected:** `FAILURE` with `error_code: entity_already_exists`
**Verify:**
- [ ] Response contains `error_code` with value `"entity_already_exists"`
- [ ] Response contains `details` with `entity_type: "unit"` and `entity_name: "copilot-test-cup-unique"`
- [ ] `details.existing_id` matches ID from Test 4.3

---

### 4.5 create_keyword - New Entity
**Purpose:** Create a new keyword/tag
**Precondition:** Search for `copilot-test-keyword-unique` must return empty results

**Input:**
```json
{
  "name": "copilot-test-keyword-unique"
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `id` (positive integer)
- [ ] Response contains `name` with exact value `"copilot-test-keyword-unique"`
- [ ] Response contains `label` (may be same as name or generated)
- [ ] Response does NOT contain error fields

---

### 4.6 create_keyword - Duplicate Entity
**Purpose:** Verify duplicate detection
**Precondition:** Test 4.5 must have succeeded (keyword now exists)

**Input:**
```json
{
  "name": "copilot-test-keyword-unique"
}
```

**Expected:** `FAILURE` with `error_code: entity_already_exists`
**Verify:**
- [ ] Response contains `error_code` with value `"entity_already_exists"`
- [ ] Response contains `details` with `entity_type: "keyword"` and `entity_name: "copilot-test-keyword-unique"`
- [ ] `details.existing_id` matches ID from Test 4.5

---

## 5. Import Recipe Tests (Integration)

**⚠️ PREREQUISITES**: Before running these tests:
1. Verify foods "tomato", "onion", "salt" exist via `search_food`
2. Verify unit "cups" exists via `search_unit`
3. Verify keyword " dinner" exists via `search_keyword`

### 5.1 Import Comprehensive Recipe (Consolidated)
**Purpose:** Import a complex recipe with units, keywords, multiple ingredients, and notes
**Consolidates**: Former tests 4.1 (simple) + 4.2 (with units) into one comprehensive test

**Input:**
```json
{
  "recipe": {
    "name": "Copilot Test Recipe - Comprehensive",
    "recipeIngredient": [
      "2 cups tomato",
      "1 onion, finely chopped",
      "1 tsp salt"
    ],
    "recipeInstructions": [
      "Prepare all vegetables",
      "Sauté onions for 5 minutes",
      "Add tomatoes and cook for 10 minutes",
      "Season and serve"
    ],
    "servings": 4,
    "keywords": [" dinner"],
    "sourceUrl": "https://test-copilot.example.com/comprehensive",
    "description": "A comprehensive test recipe for end-to-end validation"
  }
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `recipe_id` (positive integer)
- [ ] Response contains `recipe_url` (string URL to the created recipe)
- [ ] Response contains `import_status` with value `"success"`
- [ ] Response contains `mapping_notes` object
- [ ] `mapping_notes.image_status` is `"not_provided"`
- [ ] `mapping_notes.warnings` array is empty or minimal
- [ ] `mapping_notes.field_transformations` documents any conversions

**Record**: Note the `recipe_id` for Test 6.1 (Round-Trip Verification)

---

### 5.2 Import Recipe with Invalid/Unknown Unit
**Purpose:** Verify graceful handling of non-existent unit names
**Note:** "tsp" (lowercase) may be auto-corrected or may trigger warning

**Input:**
```json
{
  "recipe": {
    "name": "Copilot Test Recipe - Invalid Unit",
    "recipeIngredient": [
      "2 cups tomato",
      "1 gram onion",
      "1 tsp salt"
    ],
    "recipeInstructions": [
      "Mix ingredients",
      "Bake at 350F"
    ],
    "servings": 4,
    "sourceUrl": "https://test-copilot.example.com/invalid-unit"
  }
}
```

**Expected:** `SUCCESS` or `PARTIAL` (recipe created, possibly with warnings)
**Verify:**
- [ ] Response contains `recipe_id` (positive integer)
- [ ] Response contains `import_status` with value `"success"` or `"partial"`
- [ ] Response contains `mapping_notes.warnings` array
- [ ] If "tsp" was not recognized: warnings should indicate parsing issue or unknown unit
- [ ] Recipe is still created (not rejected entirely)

---

### 5.3 Import with Missing Entities Error
**Purpose:** Verify `missing_entities` error for non-existent food
**Critical**: Tests the EntityResolver error path

**Input:**
```json
{
  "recipe": {
    "name": "Copilot Test Recipe - Missing Food",
    "recipeIngredient": [
      "5 definitely-nonexistent-food-xyz123"
    ],
    "recipeInstructions": [
      "Cook the mystery ingredient"
    ],
    "servings": 2,
    "sourceUrl": "https://test-copilot.example.com/missing-food"
  }
}
```

**Expected:** `FAILURE` with `error_code: missing_entities`
**Verify:**
- [ ] Response contains `import_status`: `"error"`
- [ ] Response contains `error_code`: `"missing_entities"`
- [ ] `error_details.missing.foods` contains `"definitely-nonexistent-food-xyz123"`
- [ ] `error_details.suggestions` array contains suggested `create_food()` action
- [ ] `recipe_id` is `-1` or null

---

### 5.4 Import with Invalid Payload
**Purpose:** Verify `invalid_payload` error for missing required fields

**Input:**
```json
{
  "recipe": {
    "recipeIngredient": [
      "1 tomato"
    ],
    "recipeInstructions": [
      "Cook"
    ]
    // Missing required 'name' field
  }
}
```

**Expected:** `FAILURE` with `error_code: invalid_payload`
**Verify:**
- [ ] Response contains `import_status`: `"error"`
- [ ] Response contains `error_code`: `"invalid_payload"`
- [ ] `error_details` specifies which field is missing (e.g., `field: "name"`)
- [ ] `recipe_id` is `-1` or null

---

### 5.5 Import with Image URL (Soft Failure Expected)
**Purpose:** Test image upload flow - external URL will likely fail but should track status
**Note**: Image download failures are "soft" - Tandoor continues without image

**Input:**
```json
{
  "recipe": {
    "name": "Copilot Test Recipe - With Image",
    "recipeIngredient": [
      "1 tomato"
    ],
    "recipeInstructions": [
      "Cook"
    ],
    "servings": 2,
    "sourceUrl": "https://test-copilot.example.com/with-image",
    "image": "https://invalid-domain-that-will-fail.example.com/image.jpg"
  }
}
```

**Expected:** `SUCCESS` (recipe created, image_status indicates failure)
**Verify:**
- [ ] Response contains `recipe_id` (positive integer)
- [ ] Response contains `import_status`: `"success"` or `"partial"`
- [ ] `mapping_notes.image_status` is `"failed"` (external URL blocked/failed)
- [ ] Recipe is created despite image failure

---

### 5.6 Import with Time Fields, Nutrition, and Per-Step Ingredients
**Purpose:** Verify ISO 8601 duration parsing, nutrition preservation, AND per-step ingredient distribution

**Input:**
```json
{
  "recipe": {
    "name": "Copilot Test Recipe - Extended Fields",
    "recipeIngredient": [
      "2 cups tomato",
      "1 onion"
    ],
    "recipeInstructions": [
      {
        "@type": "HowToStep",
        "name": "Prep",
        "text": "Prep vegetables for 15 minutes",
        "recipeIngredient": ["1 tsp olive oil"]
      },
      {
        "@type": "HowToStep",
        "name": "Cook",
        "text": "Cook for 30 minutes",
        "recipeIngredient": ["100g cheese"]
      }
    ],
    "servings": 4,
    "sourceUrl": "https://test-copilot.example.com/extended",
    "prepTime": "PT15M",
    "cookTime": "PT30M",
    "totalTime": "PT45M",
    "nutrition": {
      "calories": "200 kcal",
      "proteinContent": "10g"
    }
  }
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `recipe_id` (positive integer)
- [ ] `import_status` is `"success"`
- [ ] `mapping_notes.field_transformations` contains notes about:
  - time field handling
  - global ingredients placed in first step (2 global ingredients)
- [ ] `mapping_notes.warnings` is empty (nutrition stored as-is)

**Record**: Note the `recipe_id` for Test 6.2 (Round-Trip Verification)

---

### 5.7 Import Duplicate Detection (Same Source URL)
**Purpose:** Verify MCP server's duplicate detection works before Tandoor
**Precondition:** Test 5.1 must have succeeded (recipe exists with sourceUrl)

**Input:**
```json
{
  "recipe": {
    "name": "Copilot Test Recipe - Comprehensive 2",
    "recipeIngredient": [
      "2 cups tomato"
    ],
    "recipeInstructions": [
      "Different instructions"
    ],
    "servings": 2,
    "sourceUrl": "https://test-copilot.example.com/comprehensive"
  }
}
```

**Expected:** `FAILURE` with `error_code: duplicate_recipe`
**Verify:**
- [ ] Response contains `error_code`: `"duplicate_recipe"`
- [ ] `error_details.existing_recipe_id` matches recipe from Test 5.1
- [ ] `error_details.match_reason` is `"source_url"`
- [ ] No new recipe created (verify via search if unsure)

---

## 6. Round-Trip Verification Tests

**Purpose**: Verify data integrity from import → storage → retrieval

### 6.1 Verify Comprehensive Recipe (Test 5.1)
**Purpose:** Full round-trip data integrity check

**Step 1**: Retrieve the recipe using `get_recipe`
**Input:**
```json
{
  "recipe_id": <recipe_id_from_test_5.1>
}
```

**Expected:** `SUCCESS`
**Verify Data Integrity:**
- [ ] `name` matches exactly: `"Copilot Test Recipe - Comprehensive"`
- [ ] `recipeIngredient` array has 3 items
- [ ] Ingredient parsing preserved:
  - Item 0: amount `2`, unit `"cups"`, food `"tomato"`, note should be empty or null
  - Item 1: amount `1`, unit `null`, food `"onion"`, note `"finely chopped"`
  - Item 2: amount `1`, unit `"tsp"` or `null`, food `"salt"`, note `null`
- [ ] `recipeInstructions` array has 4 items
- [ ] Each instruction contains expected text (may be truncated but core meaning preserved)
- [ ] `servings` is `4`
- [ ] `sourceUrl` matches: `"https://test-copilot.example.com/comprehensive"`
- [ ] `description` matches: `"A comprehensive test recipe for end-to-end validation"`
- [ ] `keywords` array contains keyword object(s)

---

### 6.2 Verify Extended Fields Recipe with Per-Step Ingredients (Test 5.6)
**Purpose:** Verify time fields, nutrition, AND per-step ingredients round-trip correctly

**Step 1**: Retrieve the recipe using `get_recipe`
**Input:**
```json
{
  "recipe_id": <recipe_id_from_test_5.6>
}
```

**Expected:** `SUCCESS`
**Verify Data Integrity:**
- [ ] `name` matches: `"Copilot Test Recipe - Extended Fields"`
- [ ] `prepTime`, `cookTime`, or `totalTime` present (may be distributed to steps)
- [ ] `nutrition` object present with `calories` and `proteinContent`
- [ ] `recipeIngredient` has 2 items (global ingredients): tomato and onion
- [ ] `recipeInstructions` is an array of `HowToStep` objects with:
  - Step 1: `recipeIngredient` containing `"1 tsp olive oil"`
  - Step 2: `recipeIngredient` containing `"100g cheese"`

---

### 6.3 Search for All Test Recipes
**Purpose:** Confirm all test recipes are searchable and retrievable

**Input:**
```json
{
  "query": "Copilot Test Recipe",
  "page": 1,
  "page_size": 20
}
```

**Expected:** `SUCCESS`
**Verify:**
- [ ] Response contains `results` array
- [ ] `count` reflects number of test recipes created (expected: 4-5 depending on failures)
- [ ] Each result has `id`, `name`, `source_url` (if stored)
- [ ] Recipe names from tests 5.1, 5.2, 5.5, 5.6 are present in results

---

## 7. Test Summary Checklist

After completing all tests, verify:

### Read Operations (Sections 2-3)
- [ ] All list tools return paginated results with correct metadata
- [ ] All search tools return arrays with properly typed items
- [ ] Recipe retrieval returns full recipe structure
- [ ] Non-existent recipe returns appropriate error

### Write Operations (Section 4)
- [ ] New entities created successfully (foods, units, keywords)
- [ ] Duplicate creation returns `entity_already_exists` error

### Import Integration (Section 5)
- [ ] Comprehensive recipe imports successfully with all fields
- [ ] Invalid/unknown unit handled gracefully (warnings, not failure)
- [ ] Missing entities returns `missing_entities` error with suggestions
- [ ] Invalid payload returns `invalid_payload` error
- [ ] Image URL failures are soft (recipe created, image_status: failed)
- [ ] Time fields and nutrition stored/transformed correctly
- [ ] Duplicate detection by source URL works (returns `duplicate_recipe`)

### Round-Trip Verification (Section 6)
- [ ] Retrieved recipes match imported data (ingredients, instructions, metadata)
- [ ] Ingredient parsing (amount, unit, food, notes) is reversible
- [ ] All test recipes appear in search results

---

## Entity IDs for Reference

Update these as you discover them during testing:

### Verified Food IDs
| Food | ID | Discovered In |
|------|-----|---------------|
| onion | TBD | search_food |
| tomato | TBD | search_food |
| salt | TBD | search_food |
| copilot-test-avocado-unique | TBD | create_food 4.1 |

### Verified Unit IDs
| Unit | ID | Discovered In |
|------|-----|---------------|
| cups | TBD | search_unit |
| gram | TBD | search_unit |
| copilot-test-cup-unique | TBD | create_unit 4.3 |

### Verified Keyword IDs
| Keyword | ID | Discovered In |
|---------|-----|---------------|
| dinner | TBD | search_keyword |
| Italian | TBD | search_keyword |
| copilot-test-keyword-unique | TBD | create_keyword 4.5 |

### Test Recipe IDs
| Test | Recipe Name | ID | Status |
|------|-------------|-----|--------|
| 5.1 | Copilot Test Recipe - Comprehensive | TBD | Created |
| 5.2 | Copilot Test Recipe - Invalid Unit | TBD | Created |
| 5.5 | Copilot Test Recipe - With Image | TBD | Created |
| 5.6 | Copilot Test Recipe - Extended Fields | TBD | Created |

---

## Cleanup Instructions

**⚠️ IMPORTANT**: The MCP server currently does NOT provide tools for deleting entities. Cleanup is required manually via the Tandoor web UI or direct API calls.

### Entities to Delete

#### Foods
- `copilot-test-avocado-unique` (created in 4.1)

#### Units
- `copilot-test-cup-unique` (created in 4.3)

#### Keywords
- `copilot-test-keyword-unique` (created in 4.5)

#### Recipes
- `Copilot Test Recipe - Comprehensive` (5.1)
- `Copilot Test Recipe - Invalid Unit` (5.2)
- `Copilot Test Recipe - With Image` (5.5)
- `Copilot Test Recipe - Extended Fields` (5.6)

### Manual Cleanup Steps
1. **Via Tandoor Web UI**: Navigate to each entity type (Foods, Units, Keywords, Recipes)
2. Search for "copilot-test" or "Copilot Test"
3. Delete each test entity manually
4. **Verify**: Re-run pre-flight checks to ensure clean state

---

## Test Plan Changes

### Version History

| Date | Changes |
|------|---------|
| April 10, 2026 | Initial test plan |
| April 11, 2026 | Optimized for efficiency: consolidated tests, added round-trip verification, added error condition tests, removed redundant duplicate tests, improved coverage of image handling and time/nutrition fields |

### Key Optimizations (April 11, 2026)
1. **Consolidated import tests**: Combined simple + units tests into one comprehensive test (5.1)
2. **Added critical error tests**: Missing entities (5.3), invalid payload (5.4)
3. **Added round-trip verification**: Full data integrity checks (6.1, 6.2)
4. **Improved image testing**: Tests soft failure handling (5.5)
5. **Added time/nutrition test**: Verifies extended field handling (5.6)
6. **Reduced total tests**: From 31 to ~25 while improving coverage depth
