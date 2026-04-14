# Schema.org/Recipe to Tandoor Compatibility Matrix

This document maps schema.org/Recipe fields to Tandoor's data model, documenting how each field is handled during import. Schema.org/Recipe is treated as the source of truth.

## Legend

- ✅ **Fully Supported** - Direct mapping to Tandoor field
- 🔀 **Mapped** - Transformed to different but equivalent Tandoor concept
- ⚠️ **Unimplemented** - Specified in MCP spec but not yet implemented
- ❌ **Unsupported** - Tandoor has no equivalent concept (field is ignored)
- 📝 **Partial** - Partially supported with limitations

---

## Core Recipe Properties

| Schema.org Field | Tandoor Field | Status | Implementation Details |
|------------------|---------------|--------|------------------------|
| `name` | `Recipe.name` | ✅ | Direct string mapping. Used for duplicate detection. Required field. |
| `description` | `Recipe.description` | ✅ | Direct string mapping. Optional. |
| `recipeIngredient` | `Ingredient` (via `steps[].ingredients`) | ✅ | Parsed into structured `{amount, unit, food, note}`. See [Ingredient Parsing](#ingredient-parsing). |
| `recipeInstructions` | `Step` objects | 📝 | String array: split into ordered steps. `HowToStep` objects: `text` → `instruction`, `name` → `name`. Per-step `url` and `image` are **ignored** (Tandoor doesn't support per-step media). `HowToSection` (nested): ⚠️ NOT IMPLEMENTED - flattened. **Extension**: Steps can have `recipeIngredient` array to define per-step ingredients (bypasses Recipe-level `recipeIngredient`). |
| `recipeYield` | `Recipe.servings` + `Recipe.servings_text` | 🔀 | If number: stored as `servings`. If string: number extracted as `servings`, remainder as `servings_text` (e.g., "4 servings" → servings: 4, servings_text: "servings"; "2 loaves" → servings: 2, servings_text: "loaves"). |
| `servings` | `Recipe.servings` | ✅ | **Non-standard extension** - Direct integer mapping when recipeYield is numeric. Preferred over parsing `recipeYield`. |

## Categorization & Metadata

| Schema.org Field | Tandoor Field | Status | Implementation Details |
|------------------|---------------|--------|------------------------|
| `keywords` | `Recipe.keywords` | ✅ | Mapped by name lookup. **Error if keyword not found** (must exist in Tandoor). |
| `recipeCategory` | `Recipe.keywords` | 🔀 | Mapped to keyword if exists. **Warning if not found** (optional mapping). |
| `recipeCuisine` | `Recipe.keywords` | 🔀 | Mapped to keyword if exists. **Warning if not found** (optional mapping). |
| `suitableForDiet` | `Recipe.keywords` | 🔀 | Mapped to keyword if exists. Normalized from Schema.org values (e.g., "GlutenFreeDiet" → "gluten free"). **Warning if not found** (optional mapping). |

## Media & References

| Schema.org Field | Tandoor Field | Status | Implementation Details |
|------------------|---------------|--------|------------------------|
| `image` | `Recipe.image` | ✅ | URL or base64 uploaded via `PUT /api/recipe/{id}/image/`. |
| `url` / `sourceUrl` | `Recipe.source_url` | ✅ | Direct string mapping. |
| `author` | `Step.instruction` | 🔀 | Author name appended to last step in Markdown italics: `*Author Name*` |

## Time & Duration

| Schema.org Field | Tandoor Field | Status | Implementation Details |
|------------------|---------------|--------|------------------------|
| `prepTime` | `Recipe.working_time` | ✅ | Active preparation time. `parseIsoDuration` converts ISO 8601 to minutes. Mapped to recipe-level field (not per-step). |
| `cookTime` | `Recipe.waiting_time` | ✅ | Cooking/waiting time. `parseIsoDuration` converts ISO 8601 to minutes. Mapped to recipe-level field (not per-step). |
| `totalTime` | N/A | 📝 | Informational only. Validated against `prepTime` + `cookTime`; noted if differs from sum. |

## Nutrition

| Schema.org Field | Tandoor Field | Status | Implementation Details |
|------------------|---------------|--------|------------------------|
| `nutrition` | `Recipe.nutrition` | 🔀 | Transformed to Tandoor format. Schema.org fields mapped: `calories`→`calories`, `carbohydrateContent`→`carbohydrates`, `proteinContent`→`proteins`, `fatContent`→`fats`. String values parsed to numbers (e.g., "30g"→30). Missing fields default to 0 (Tandoor requires all 4 fields). |

## Ignored Fields (Tandoor Has No Concept)

These fields are recognized but cannot be imported. They appear in `mapping_notes.ignored_fields`:

- `datePublished` - No publishing date field in Tandoor
- `estimatedCost` - No cost field in Tandoor
- `aggregateRating` - No rating storage in Tandoor
- `review` - No review concept
- `tool` - No equipment/tools field
- `supply` - No supplies field
- `recipeInstructions` → `HowToSection` (nested sections) - Tandoor has flat steps only

---

## Ingredient Parsing

### Input Format
Schema.org `recipeIngredient` is an array of strings in format:
```
[amount] [unit] [food name][, optional note]
```

### Examples
| Input | Parsed Result |
|-------|---------------|
| `"1 onion, chopped"` | `{amount: 1, unit: undefined, food: "onion", note: "chopped"}` |
| `"2 cups tomatoes"` | `{amount: 2, unit: "cups", food: "tomatoes", note: undefined}` |
| `"salt"` | `{amount: undefined, unit: undefined, food: "salt", note: undefined}` |
| `"20g pecorino romano, grated"` | `{amount: 20, unit: "g", food: "pecorino romano", note: "grated"}` |

### Plural Form Support 📝

**Status**: ✅ Implemented

The import logic now supports both singular and plural forms for foods and units:

| Input | Matches | Parsed Result |
|-------|---------|---------------|
| `"2 cups onions"` | unit `cup` → `cups`, food `onion` → `onions` | `{amount: 2, unit: "cup", food: "onion", note: undefined}` |
| `"3 tomatoes, diced"` | food `tomato` → `tomatoes` | `{amount: 3, food: "tomato", note: "diced"}` |
| `"500 grams flour"` | unit `gram` → `grams` | `{amount: 500, unit: "gram", food: "flour"}` |

**Requirements for Plural Matching**:
- Foods and units in Tandoor must have `plural_name` field set (e.g., "onion" → "onions", "cup" → "cups")
- The original ingredient text is stored in `original_text` field for reference
- Agents can use natural plural forms for better readability (e.g., "2 cups onions" instead of "2 cup onion")
- **Recommendation**: When creating foods/units, always set `plural_name` if applicable for best ingredient matching

### Entity Resolution Rules

| Entity | Required | Missing Behavior |
|--------|----------|------------------|
| `food` | ✅ Yes | **Error** (`missing_entities`) - Import blocked |
| `unit` | ❌ No | Stored without unit (amount only) |

**Important**: Foods and units must **already exist** in Tandoor before import. Use `list_all_foods()`, `search_food()`, `create_food()` etc. to prepare entities. Set `plural_name` when creating foods and units to enable plural matching.

---

## Time Duration Parsing

The `parseIsoDuration()` function handles ISO 8601 durations and maps them to recipe-level time fields:

| Input | Output (minutes) | Tandoor Field |
|-------|------------------|---------------|
| `PT30M` | 30 | `working_time` (prep) or `waiting_time` (cook) |
| `PT1H` | 60 | `working_time` (prep) or `waiting_time` (cook) |
| `PT1H30M` | 90 | `working_time` (prep) or `waiting_time` (cook) |
| `PT45S` | 1 (rounded) | `working_time` (prep) or `waiting_time` (cook) |

**Status**: ✅ Parser implemented and applied to `Recipe.working_time` (from `prepTime`) and `Recipe.waiting_time` (from `cookTime`).

---

## Implementation Status

### Time Fields ✅ IMPLEMENTED
**Mapping**: `prepTime` → `Recipe.working_time`, `cookTime` → `Recipe.waiting_time`

**Implementation**:
- ✅ `parseIsoDuration()` converts ISO 8601 durations to minutes
- ✅ `prepTime`: Mapped to `working_time` (active preparation time)
- ✅ `cookTime`: Mapped to `waiting_time` (cooking/waiting time)
- 📝 `totalTime`: Validated against sum of prep + cook; noted in transformations if different

### Nutrition Information ✅ IMPLEMENTED
**Mapping**: `nutrition` → `Recipe.nutrition` JSON field (transformed)

**Field Name Mapping**:
| Schema.org | Tandoor | Notes |
|------------|---------|-------|
| `calories` | `calories` | Parsed from string (e.g., "200 kcal" → 200) |
| `carbohydrateContent` | `carbohydrates` | Parsed from string (e.g., "30g" → 30) |
| `proteinContent` | `proteins` | Parsed from string (e.g., "10g" → 10) |
| `fatContent` | `fats` | Parsed from string (e.g., "5g" → 5) |

**Implementation**:
- ✅ Schema.org nutrition object transformed to Tandoor format
- ✅ String values parsed to extract numeric portion
- ✅ Missing fields default to 0 (Tandoor requires all 4 fields: calories, carbohydrates, proteins, fats)
- ✅ Partial nutrition data supported (e.g., only calories provided, others default to 0)
- ✅ If no recognizable nutrition fields present, nutrition object is omitted

### Author & Diet Fields ✅ IMPLEMENTED
**Author Mapping**: `author.name` → appended to last step's instruction in Markdown italics (`*Author Name*`)

**Diet Mapping**: `suitableForDiet` → `Recipe.keywords`
- Schema.org values normalized (e.g., "GlutenFreeDiet" → "gluten free")
- Mapped to keyword if exists; warning if not found

**datePublished**: 📝 Not supported by Tandoor - warning generated if field has value

### Recipe Instructions Structure ✅ MOSTLY IMPLEMENTED
**Current State**:
- ✅ `string[]`: Split by periods/newlines into ordered steps
- ✅ `HowToStep` with `text`: Extracted as `Step.instruction`
- ✅ `HowToStep` with `name`: Mapped to `Step.name`
- ❌ `HowToSection`: Nested sections are flattened (structure lost)

**Tandoor Support**: Steps have `name`, `instruction`, and `ingredients` fields; no nested section support.

#### Per-Step Ingredients (Non-Standard Extension)

The Recipe-level `recipeIngredient` property puts all ingredients in the recipe's global list. To support **per-step ingredients** (where different ingredients are used at different steps), this MCP server introduces a **non-standard extension**:

| Property | Scope | Status | Description |
|----------|-------|--------|-------------|
| `recipeIngredient` (Step-level) | `HowToStep` | 📝 **Extension** | Per-step ingredient array. These ingredients are assigned to this specific step (in addition to any global ingredients for step 1). Format identical to Recipe-level: `"[amount] [unit] [food][, note]"`. |

**Example**: Per-step ingredients (preferred non-standard extension)
```json
{
  "name": "Layered Cake",
  "recipeInstructions": [
    { 
      "name": "Make the batter",
      "text": "Mix dry ingredients with wet ingredients",
      "recipeIngredient": ["200g flour", "100g sugar", "2 eggs"]
    },
    { 
      "name": "Make the frosting",
      "text": "Beat butter and sugar until fluffy",
      "recipeIngredient": ["100g butter", "150g powdered sugar"]
    }
  ]
}
```

**Behavior**:
- Recipe-level `recipeIngredient` **always** goes to the first step
- Step-level `recipeIngredient` goes to that specific step
- First step receives **both**: global ingredients first, then step-specific ingredients appended
- Other steps receive only their step-specific ingredients
- This extension will be ignored by standard schema.org validators

---

## Response Format

### Success Response
```json
{
  "recipe_id": 123,
  "recipe_url": "https://tandoor.example.com/api/recipe/123/",
  "import_status": "success",
  "mapping_notes": {
    "image_status": "uploaded",
    "field_transformations": [
      "servings derived from recipeYield: 4 servings"
    ],
    "ignored_fields": ["estimatedCost", "aggregateRating", "datePublished"],
    "warnings": [
      "recipeCategory 'Main Dish' not found. Use list_all_keywords() to see exact names; consider creating keyword if needed."
    ]
  }
}
```

### Error Response (Missing Entities)
```json
{
  "recipe_id": -1,
  "recipe_url": "",
  "import_status": "error",
  "mapping_notes": {
    "error_code": "missing_entities",
    "error_details": {
      "missing": {
        "foods": ["tomato", "onion"],
        "units": [],
        "keywords": []
      },
      "suggestions": [
        "Create food using: create_food(name: \"tomato\")",
        "Create food using: create_food(name: \"onion\")"
      ]
    }
  }
}
```

---

## Appendix: Schema.org/Recipe Type Definition

Reference: https://schema.org/Recipe

```typescript
interface SchemaOrgRecipe {
  // Core
  name: string;
  description?: string;
  recipeIngredient?: string[];
  recipeInstructions?: string[] | HowToStep[] | HowToSection[];
  recipeYield?: string | number;
  
  // Categorization
  keywords?: string[];
  recipeCategory?: string;
  recipeCuisine?: string | string[];
  suitableForDiet?: string;
  
  // Media & References
  image?: string | string[];
  url?: string;
  author?: { name?: string };
  datePublished?: string;
  
  // Time
  prepTime?: string;  // ISO 8601 duration
  cookTime?: string;  // ISO 8601 duration
  totalTime?: string; // ISO 8601 duration
  
  // Nutrition
  nutrition?: {
    calories?: string | number;
    carbohydrateContent?: string | number;
    proteinContent?: string | number;
    fatContent?: string | number;
  };
  
  // Unsupported
  estimatedCost?: unknown;
  aggregateRating?: unknown;
  review?: unknown;
  tool?: unknown;
  supply?: unknown;
}
```
