# Tandoor MCP Server - Test Plan

**Date**: April 10, 2026  
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

## 1. List Tools (Read Operations)

### 1.1 list_all_foods
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

### 1.2 list_all_units
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

### 1.3 list_all_keywords
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

## 2. Search Tools (Read Operations)

### 2.1 search_food
**Purpose:** Search for existing foods in the database  
**Test queries:**
- `"onion"` - Common food with multiple variations (should return results)
- `"tomato"` - Common food (should return results)
- `"copilot-test-food"` - Check for test artifacts from previous runs (should return empty or existing artifacts)

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
- [ ] If no matches exist, returns empty array `[]`

---

### 2.2 search_unit
**Purpose:** Search for measurement units  
**Test queries:**
- `"cup"` - Common unit (should return results including "cups", "cup")
- `"gram"` - Weight unit (should return results)
- `"tsp"` - Small volume unit (may return empty or similar units)

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
- [ ] If no matches exist, returns empty array `[]`

---

### 2.3 search_keyword
**Purpose:** Search for recipe keywords/tags  
**Test queries:**
- `"Italian"` - Cuisine keyword
- `"dinner"` - Meal type keyword
- `"vegetarian"` - Dietary keyword

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
- [ ] If no matches exist, returns empty array `[]`

---

### 2.4 search_recipes
**Purpose:** Search and filter recipes

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

### 2.5 get_recipe
**Purpose:** Retrieve full recipe details by ID  
**Note:** Use any recipe ID from `search_recipes` results

**Input:**
```json
{
  "recipe_id": 121830
}
```

**Expected:** `SUCCESS` (if recipe exists) or `FAILURE` with `error_code: not_found` (if recipe doesn't exist)  
**Verify (on success):**
- [ ] Response contains `id` matching the requested `recipe_id`
- [ ] Response contains `name` (string)
- [ ] Response contains `recipeIngredient` array (may be empty)
- [ ] Response contains `recipeInstructions` array (may be empty)
- [ ] Response contains `keywords` array of keyword objects
- [ ] Response contains `servings` (integer or null)
- [ ] Response contains `description` (string or null)
- [ ] Response contains `image` (string URL or null)

**Verify (on failure):**
- [ ] Error response has `error_code: not_found` or similar
- [ ] Error response has `details` explaining the recipe was not found

---

## 3. Create Tools (Write Operations)

**⚠️ CRITICAL**: Use **unique names** to avoid conflicts with existing data. Check for existing entities first using search tools.

### 3.1 create_food - New Entity
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

### 3.2 create_food - Duplicate Entity
**Purpose:** Attempt to create the same food again  
**Precondition:** Test 3.1 must have succeeded (food now exists)

**Input:**
```json
{
  "name": "copilot-test-avocado-unique",
  "plural_name": "copilot-test-avocados"
}
```

**Expected:** `FAILURE` with `error_code: entity_already_exists`  
**Verify:**
- [ ] Response contains `error_code` with value `"entity_already_exists"` OR returns the existing entity
- [ ] Response contains `details` with `entity_type: "food"` and `entity_name: "copilot-test-avocado-unique"`
- [ ] If returning existing entity: response has `id` matching the entity from Test 3.1

---

### 3.3 create_unit - New Entity
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

### 3.4 create_unit - Duplicate Entity
**Purpose:** Attempt to create the same unit again  
**Precondition:** Test 3.3 must have succeeded (unit now exists)

**Input:**
```json
{
  "name": "copilot-test-cup-unique"
}
```

**Expected:** `FAILURE` with `error_code: entity_already_exists`  
**Verify:**
- [ ] Response contains `error_code` with value `"entity_already_exists"` OR returns the existing entity
- [ ] Response contains `details` with `entity_type: "unit"` and `entity_name: "copilot-test-cup-unique"`
- [ ] If returning existing entity: response has `id` matching the entity from Test 3.3

---

### 3.5 create_keyword - New Entity
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

### 3.6 create_keyword - Duplicate Entity
**Purpose:** Attempt to create the same keyword again  
**Precondition:** Test 3.5 must have succeeded (keyword now exists)

**Input:**
```json
{
  "name": "copilot-test-keyword-unique"
}
```

**Expected:** `FAILURE` with `error_code: entity_already_exists`  
**Verify:**
- [ ] Response contains `error_code` with value `"entity_already_exists"` OR returns the existing entity
- [ ] Response contains `details` with `entity_type: "keyword"` and `entity_name: "copilot-test-keyword-unique"`
- [ ] If returning existing entity: response has `id` matching the entity from Test 3.5

---

## 4. Import Recipe (Integration Test)

**⚠️ PREREQUISITES**: Before running these tests:
1. Verify foods "tomato", "onion", "salt" exist via `search_food`
2. Verify unit "cups" exists via `search_unit`
3. Verify keyword " dinner" exists via `search_keyword`
4. Ensure no recipe with name "Copilot Test Recipe - Simple Tomato Pasta" exists (search before test)
5. Ensure no recipe with sourceUrl "https://test-copilot.example.com/recipe" exists (search before test)

### 4.1 Import Simple Recipe (No Units)
**Purpose:** Import a basic recipe with simple ingredient strings (amount + food only)

**Input:**
```json
{
  "recipe": {
    "name": "Copilot Test Recipe - Simple Tomato Pasta",
    "recipeIngredient": [
      "2 tomato",
      "1 onion",
      "salt"
    ],
    "recipeInstructions": [
      "Chop the vegetables",
      "Cook in a pan for 10 minutes"
    ],
    "servings": 2,
    "keywords": [" dinner"],
    "sourceUrl": "https://test-copilot.example.com/recipe"
  }
}
```

**Expected:** `SUCCESS` (recipe created, possibly with mapping warnings)  
**Verify:**
- [ ] Response contains `recipe_id` (positive integer)
- [ ] Response contains `recipe_url` (string URL to the created recipe)
- [ ] Response contains `import_status` with value `"success"` or `"partial"`
- [ ] Response contains `mapping_notes` object with:
  - [ ] `image_status` field (string: "not_provided", "uploaded", or "failed")
  - [ ] `field_transformations` array (may be empty)
  - [ ] `ignored_fields` array (may be empty)
  - [ ] `warnings` array (may contain warnings about foods/keywords not found)
- [ ] If warnings exist, each warning should describe the issue clearly (e.g., "Food 'tomato' not found...")

---

### 4.2 Import Recipe with Valid Units
**Purpose:** Import recipe using valid units that exist in the database  
**Precondition:** Unit "cups" (ID: 4021) must exist

**Input:**
```json
{
  "recipe": {
    "name": "Copilot Test Recipe - With Units",
    "recipeIngredient": [
      "2 cups tomato",
      "1 gram onion",
      "1 Tsp salt"
    ],
    "recipeInstructions": [
      "Mix ingredients",
      "Bake at 350F"
    ],
    "servings": 4,
    "sourceUrl": "https://test-copilot.example.com/recipe-units"
  }
}
```

**Expected:** `SUCCESS` (recipe created, with possible warnings about ingredient parsing)  
**Verify:**
- [ ] Response contains `recipe_id` (positive integer, different from 4.1)
- [ ] Response contains `recipe_url` (string URL)
- [ ] Response contains `import_status` with value `"success"` or `"partial"`
- [ ] Response contains `mapping_notes` with `warnings` array
- [ ] Check warnings array:
  - [ ] If ingredients with units are correctly parsed: warnings should be minimal/empty
  - [ ] If parsing fails: warnings should indicate which ingredients couldn't be matched

**Note:** This test validates that units like "cups", "gram", "Tsp" are recognized. If warnings show food matching failed despite units existing, this indicates a parser bug.

---

### 4.3 Import Recipe with Invalid Unit
**Purpose:** Verify graceful handling of non-existent unit names  
**Note:** "tsp" (lowercase) may not exist while "Tsp" or "tsp." might

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
    "sourceUrl": "https://test-copilot.example.com/recipe-fails"
  }
}
```

**Expected:** `SUCCESS` or `PARTIAL` (recipe created but with warnings about unknown unit)  
**Verify:**
- [ ] Response contains `recipe_id` (positive integer)
- [ ] Response contains `import_status` with value `"success"` or `"partial"`
- [ ] Response contains `mapping_notes.warnings` array
- [ ] Warnings should indicate "tsp" unit not found OR ingredient parsing failed
- [ ] Recipe should still be created (not rejected entirely)

---

### 4.4 Import Duplicate Recipe - Same Name
**Purpose:** Verify duplicate detection by recipe name  
**Precondition:** Test 4.1 must have succeeded (recipe "Copilot Test Recipe - Simple Tomato Pasta" now exists)

**Input:**
```json
{
  "recipe": {
    "name": "Copilot Test Recipe - Simple Tomato Pasta",
    "recipeIngredient": [
      "2 tomato",
      "1 onion",
      "salt"
    ],
    "recipeInstructions": [
      "Chop the vegetables",
      "Cook in a pan for 10 minutes"
    ],
    "servings": 2,
    "keywords": [" dinner"],
    "sourceUrl": "https://test-copilot.example.com/recipe2"
  }
}
```

**Expected:** `FAILURE` with `error_code: duplicate_recipe` (if implemented) or `SUCCESS` with warning (if not implemented)  
**Verify:**
- [ ] If duplicate detection is implemented:
  - [ ] Response contains `error_code: "duplicate_recipe"`
  - [ ] Response contains `details` explaining duplicate found by name
  - [ ] No new recipe created (verify by searching - should only find original from 4.1)
- [ ] If duplicate detection is NOT implemented:
  - [ ] Response contains `recipe_id` (different ID than 4.1)
  - [ ] A second recipe with same name is created (feature gap)

---

### 4.5 Import Duplicate Recipe - Same Source URL
**Purpose:** Verify duplicate detection by sourceUrl  
**Precondition:** Test 4.1 must have succeeded (recipe with sourceUrl "https://test-copilot.example.com/recipe" exists)

**Input:**
```json
{
  "recipe": {
    "name": "Copilot Test Recipe - Simple Tomato Pasta 2",
    "recipeIngredient": [
      "2 tomato",
      "1 onion",
      "salt"
    ],
    "recipeInstructions": [
      "Chop the vegetables",
      "Cook in a pan for 10 minutes"
    ],
    "servings": 2,
    "keywords": [" dinner"],
    "sourceUrl": "https://test-copilot.example.com/recipe"
  }
}
```

**Expected:** `FAILURE` with `error_code: duplicate_recipe` (if implemented) or `SUCCESS` (if not implemented)  
**Verify:**
- [ ] If duplicate detection is implemented:
  - [ ] Response contains `error_code: "duplicate_recipe"`
  - [ ] Response contains `details` explaining duplicate found by sourceUrl
  - [ ] No new recipe created
- [ ] If duplicate detection is NOT implemented:
  - [ ] Response contains `recipe_id` (different from 4.1)
  - [ ] Second recipe created with same sourceUrl (feature gap)

---

## 5. Verification Tests

After completing all import tests, verify the created recipes:

### 5.1 Verify Created Recipe by ID
**Purpose:** Retrieve the recipe created in test 4.1

**Input:**
```json
{
  "recipe_id": <recipe_id_from_test_4.1>
}
```

**Expected:** `SUCCESS`  
**Verify:**
- [ ] Response contains `id` matching the requested ID
- [ ] Response contains `name` with value `"Copilot Test Recipe - Simple Tomato Pasta"`
- [ ] Response contains `recipeIngredient` array
- [ ] Response contains `recipeInstructions` array
- [ ] Response contains `servings` with value `2`
- [ ] Response contains `source_url` with value `"https://test-copilot.example.com/recipe"`

---

### 5.2 Search for Created Recipes
**Purpose:** Find all test recipes created during testing

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
- [ ] `count` reflects number of test recipes created (expected: 3-5 depending on duplicate handling)
- [ ] Each result has `id`, `name`, `source_url` (if stored)
- [ ] Recipe names from tests 4.1-4.5 are present in results

---

## 6. Test Summary Checklist

After completing all tests, verify:

### Read Operations (Section 1-2)
- [ ] All list tools return paginated results with correct metadata
- [ ] All search tools return arrays with properly typed items
- [ ] Recipe retrieval returns full recipe structure

### Write Operations (Section 3)
- [ ] New entities created successfully (foods, units, keywords)
- [ ] Duplicate creation handled appropriately (error or idempotent return)

### Integration Tests (Section 4)
- [ ] Simple recipe imports successfully
- [ ] Recipe with units imports (with or without warnings)
- [ ] Invalid unit handled gracefully
- [ ] Duplicate detection works OR feature gap documented

### Data Verification (Section 5)
- [ ] Created recipes retrievable by ID
- [ ] Recipes searchable by name

---

## Entity IDs for Reference

### Verified Food IDs
| Food | ID |
|------|-----|
| onion | 22245 |
| tomato | 674956 |
| salt | 41252 |

### Verified Unit IDs
| Unit | ID |
|------|-----|
| gram | 7405 |
| cups | 4021 |

### Verified Keyword IDs
| Keyword | ID |
|---------|-----|
| dinner | 4195 |
| italian | 5176 |

---

## Cleanup Instructions

**⚠️ IMPORTANT**: The MCP server currently does NOT provide tools for deleting entities. Cleanup is required, either manually via the Tandoor web UI, or direct API calls.

### Test Data to Clean Up

After testing, delete the following from the Tandoor server:

#### Foods to Delete
- `copilot-test-avocado-unique`
- Any foods created with timestamp suffixes during tests

#### Units to Delete
- `copilot-test-cup-unique`
- Any units created with timestamp suffixes during tests

#### Keywords to Delete
- `copilot-test-keyword-unique`
- Any keywords created with timestamp suffixes during tests

#### Recipes to Delete
- `Copilot Test Recipe - Simple Tomato Pasta`
- `Copilot Test Recipe - Simple Tomato Pasta 2`
- Any recipes created with timestamp suffixes during tests

### Manual Cleanup Steps

1. **Via Tandoor Web UI:**
   - Navigate to each entity type (Foods, Units, Keywords, Recipes)
   - Search for "copilot-test" or "Copilot Test"
   - Select and delete each test artifact

2. **Via Direct API** (if needed):
   ```bash
   # Delete food
   curl -X DELETE "https://app.tandoor.dev/api/food/{id}/" \
     -H "Authorization: Bearer <token>"
   
   # Delete unit
   curl -X DELETE "https://app.tandoor.dev/api/unit/{id}/" \
     -H "Authorization: Bearer <token>"
   
   # Delete keyword
   curl -X DELETE "https://app.tandoor.dev/api/keyword/{id}/" \
     -H "Authorization: Bearer <token>"
   
   # Delete recipe
   curl -X DELETE "https://app.tandoor.dev/api/recipe/{id}/" \
     -H "Authorization: Bearer <token>"
   ```

---

## Expected Test Results

### Success Indicators
- ✅ List tools return paginated results with `count`, `page`, `page_size`, `has_next`, `has_previous`
- ✅ Search tools return arrays of matching entities
- ✅ Create tools return created entities with `id`, `name`
- ✅ Duplicate creates return existing entity (not error)
- ✅ Import recipe returns `recipe_id`, `recipe_url`, `import_status: "success"`
- ✅ Ingredients with units (e.g., "1 tsp salt") must fail during import because the unit in exactly that spelling doesn't exist in the database
