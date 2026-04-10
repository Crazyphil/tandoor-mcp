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
| `name` | `Recipe.name` | ✅ | Direct string mapping. Required field. |
| `description` | `Recipe.description` | ✅ | Direct string mapping. Optional. |
| `recipeIngredient` | `Ingredient` (via `steps[].ingredients`) | ✅ | Parsed into structured `{amount, unit, food, note}`. See [Ingredient Parsing](#ingredient-parsing). |
| `recipeInstructions` | `Step` objects | 📝 | String array: split into ordered steps. `HowToStep` objects: `text` extracted. `HowToSection` (nested): ⚠️ NOT IMPLEMENTED - flattened. |
| `recipeYield` | `Recipe.servings` | 🔀 | Parsed to integer. Original value lost. |
| `servings` | `Recipe.servings` | ✅ | Direct integer mapping. Preferred over `recipeYield`. |

## Categorization & Metadata

| Schema.org Field | Tandoor Field | Status | Implementation Details |
|------------------|---------------|--------|------------------------|
| `keywords` | `Recipe.keywords` | ✅ | Mapped by name lookup. **Error if keyword not found** (must exist in Tandoor). |
| `recipeCategory` | `Recipe.keywords` | 🔀 | Mapped to keyword if exists. **Warning if not found** (optional mapping). |
| `recipeCuisine` | `Recipe.keywords` | 🔀 | Mapped to keyword if exists. **Warning if not found** (optional mapping). |

## Media & References

| Schema.org Field | Tandoor Field | Status | Implementation Details |
|------------------|---------------|--------|------------------------|
| `image` | `Recipe.image` | ✅ | URL or base64 uploaded via `PUT /api/recipe/{id}/image/`. |
| `url` / `sourceUrl` | `Recipe.source_url` | ✅ | Direct string mapping. Used for duplicate detection. |
| `author` | ❌ | ❌ | Not stored. Listed in `ignored_fields` response. |
| `datePublished` | ❌ | ❌ | Not stored. Listed in `ignored_fields` response. |

## Time & Duration

| Schema.org Field | Tandoor Field | Status | Implementation Details |
|------------------|---------------|--------|------------------------|
| `prepTime` | `Step.time` | ⚠️ | Spec: "distributed to step times". Parser exists (`parseIsoDuration`) but **never applied**. Currently ignored. |
| `cookTime` | `Step.time` | ⚠️ | Spec: "distributed to step times". Parser exists but **never applied**. Currently ignored. |
| `totalTime` | `Step.time` | ⚠️ | Spec: "aggregated or distributed". Parser exists but **never applied**. Currently ignored. |

## Nutrition

| Schema.org Field | Tandoor Field | Status | Implementation Details |
|------------------|---------------|--------|------------------------|
| `nutrition` | `Recipe.nutrition` | ⚠️ | Spec: "stored as Recipe.nutrition object (Tandoor JSON field)". **NOT IMPLEMENTED**. Currently ignored. |

## Ignored Fields (Tandoor Has No Concept)

These fields are recognized but cannot be imported. They appear in `mapping_notes.ignored_fields`:

- `estimatedCost` - No cost field in Tandoor
- `aggregateRating` - No rating storage in Tandoor
- `review` - No review concept
- `suitableForDiet` - No diet field (could map to keywords)
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

### Entity Resolution Rules

| Entity | Required | Missing Behavior |
|--------|----------|------------------|
| `food` | ✅ Yes | **Error** (`missing_entities`) - Import blocked |
| `unit` | ❌ No | Stored without unit (amount only) |

**Important**: Foods and units must **already exist** in Tandoor before import. Use `list_all_foods()`, `search_food()`, `create_food()` etc. to prepare entities.

---

## Time Duration Parsing

The `parseIsoDuration()` function exists and handles ISO 8601 durations:

| Input | Output (minutes) |
|-------|------------------|
| `PT30M` | 30 |
| `PT1H` | 60 |
| `PT1H30M` | 90 |
| `PT45S` | 1 (rounded) |

**Status**: Parser implemented but **never applied** to `Step.time` field during import.

---

## Implementation Gaps

### 1. Time Fields (High Priority)
**Spec Requirement**: `prepTime`, `cookTime`, `totalTime` → `Step.time`

**Current State**: 
- ✅ Parser exists: `parseIsoDuration()`
- ❌ Never applied to payload
- ❌ Listed as "known field" but actually ignored

**Proposed Implementation**:
- Distribute `prepTime` to first step(s)
- Distribute `cookTime` to cooking step(s) (heuristic: look for "cook", "bake", "simmer")
- Use `totalTime` as fallback or validation

### 2. Nutrition Information (Medium Priority)
**Spec Requirement**: `nutrition` → `Recipe.nutrition` JSON field

**Current State**:
- ❌ Not implemented
- ❌ No `nutrition` field in `TandoorRecipePayload` type

**Tandoor Support**: Tandoor has a `nutrition` JSON field that can store arbitrary nutrition data.

**Proposed Implementation**:
- Map common fields: `calories`, `carbohydrateContent`, `proteinContent`, `fatContent`
- Store as JSON object in `nutrition` field

### 3. Author & Date (Low Priority)
**Spec Requirement**: `author`, `datePublished` → metadata or `source_url`

**Current State**:
- ❌ Ignored completely
- ❌ Not stored anywhere

**Proposed Implementation**:
- Append author name to `description`: `"By [author]. [original description]"`
- Or append to `source_url` as query param (less ideal)

### 4. Recipe Instructions with Structure
**Current State**:
- ✅ `string[]`: Split by periods/newlines
- ✅ `HowToStep` with `text`: Extracted
- ❌ `HowToStep` with `name`: Ignored (could map to `Step.name`)
- ❌ `HowToSection`: Flattened (nested structure lost)

**Tandoor Support**: Steps have `name` and `instruction` fields.

**Proposed Implementation**:
- Map `HowToStep.name` to `Step.name`
- For `HowToSection`: Create header step or prepend section name to instructions

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
    "ignored_fields": ["estimatedCost", "aggregateRating", "author"],
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
  suitableForDiet?: unknown;
  tool?: unknown;
  supply?: unknown;
}
```

---

## Version History

- **Current**: Initial compatibility matrix based on implementation analysis
- **Last Updated**: 2026-04-10
