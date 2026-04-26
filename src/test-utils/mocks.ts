/**
 * Test mocks for Tandoor MCP Server
 *
 * Provides reusable mock implementations for unit testing.
 */

import { TandoorApiClient } from '../api/client';
import { RecipeImporter } from '../tools/import';
import {
  SchemaOrgRecipe,
  ImportResult,
  TandoorPaginatedResponse,
  TandoorFood,
  TandoorUnit,
  TandoorKeyword,
  TandoorRecipeResponse,
} from '../types';

/**
 * Create a mock TandoorApiClient with all methods as jest mocks
 */
export function createMockClient(): jest.Mocked<TandoorApiClient> {
  return {
    searchFood: jest.fn(),
    listAllFoods: jest.fn(),
    createFood: jest.fn(),
    searchUnit: jest.fn(),
    listAllUnits: jest.fn(),
    createUnit: jest.fn(),
    searchKeyword: jest.fn(),
    listAllKeywords: jest.fn(),
    createKeyword: jest.fn(),
    createRecipe: jest.fn(),
    getRecipe: jest.fn(),
    searchRecipes: jest.fn(),
    uploadRecipeImage: jest.fn(),
  } as unknown as jest.Mocked<TandoorApiClient>;
}

/**
 * Create a mock RecipeImporter with all methods as jest mocks
 */
export function createMockImporter(): jest.Mocked<RecipeImporter> {
  return {
    importRecipeFromJson: jest.fn(),
  } as unknown as jest.Mocked<RecipeImporter>;
}

/**
 * Create a valid Schema.org Recipe fixture for testing
 */
export function createMockRecipe(
  overrides: Partial<SchemaOrgRecipe> = {},
): SchemaOrgRecipe {
  return {
    name: 'Test Recipe',
    description: 'A test recipe description',
    recipeIngredient: ['2 cups flour', '1 tsp salt', '1 onion'],
    recipeInstructions: ['Mix ingredients', 'Bake at 350F'],
    recipeYield: '4 servings',
    servings: 4,
    prepTime: 'PT15M',
    cookTime: 'PT30M',
    totalTime: 'PT45M',
    image: 'https://example.com/image.jpg',
    keywords: ['dinner', 'easy'],
    recipeCategory: 'Main Course',
    recipeCuisine: 'Italian',
    sourceUrl: 'https://example.com/recipe',
    ...overrides,
  };
}

/**
 * Create a mock ImportResult for testing
 */
export function createMockImportResult(
  overrides: Partial<ImportResult> = {},
): ImportResult {
  return {
    recipe_id: 123,
    recipe_url: 'https://tandoor.example.com/recipe/123/',
    import_status: 'success',
    mapping_notes: {
      image_status: 'uploaded',
      field_transformations: [],
      ignored_fields: [],
      warnings: [],
    },
    ...overrides,
  };
}

/**
 * Create a mock TandoorRecipeResponse for testing
 *
 * Mimics real Tandoor API POST /api/recipe/ response structure
 * The real API returns full recipe with resolved nested entities
 */
export function createMockRecipeResponse(
  overrides: Partial<TandoorRecipeResponse> = {},
): TandoorRecipeResponse {
  return {
    id: 123,
    name: 'Test Recipe',
    description: 'A test recipe description',
    servings: 4,
    servings_text: '',
    source_url: null,
    image: null,
    keywords: [],
    steps: [
      {
        id: 1,
        name: '',
        instruction: 'Mix ingredients',
        order: 0,
        ingredients: [
          {
            id: 1,
            food: {
              id: 1,
              name: 'flour',
              plural_name: null,
            },
            unit: {
              id: 1,
              name: 'cup',
              plural_name: 'cups',
            },
            amount: 2,
            note: null,
            order: 0,
            is_header: false,
            no_amount: false,
            original_text: null,
          },
        ],
      },
    ],
    working_time: 0,
    waiting_time: 0,
    internal: true,
    ...overrides,
  } as TandoorRecipeResponse;
}

/**
 * Create a mock TandoorPaginatedResponse for foods
 *
 * Mimics real Tandoor API response structure including timestamp field
 */
export function createMockFoodsResponse(
  foods: TandoorFood[] = [],
  overrides: Partial<TandoorPaginatedResponse<TandoorFood>> = {},
): TandoorPaginatedResponse<TandoorFood> {
  return {
    results: foods,
    count: foods.length,
    page: 1,
    page_size: 20,
    has_next: false,
    has_previous: false,
    // Note: Real API also includes a timestamp field, but it's not in the TypeScript type
    // so we don't include it here to maintain type compatibility
    ...overrides,
  };
}

/**
 * Create a mock TandoorPaginatedResponse for units
 *
 * Mimics real Tandoor API response structure
 */
export function createMockUnitsResponse(
  units: TandoorUnit[] = [],
  overrides: Partial<TandoorPaginatedResponse<TandoorUnit>> = {},
): TandoorPaginatedResponse<TandoorUnit> {
  return {
    results: units,
    count: units.length,
    page: 1,
    page_size: 20,
    has_next: false,
    has_previous: false,
    ...overrides,
  };
}

/**
 * Create a mock TandoorPaginatedResponse for keywords
 *
 * Mimics real Tandoor API response structure
 */
export function createMockKeywordsResponse(
  keywords: TandoorKeyword[] = [],
  overrides: Partial<TandoorPaginatedResponse<TandoorKeyword>> = {},
): TandoorPaginatedResponse<TandoorKeyword> {
  return {
    results: keywords,
    count: keywords.length,
    page: 1,
    page_size: 20,
    has_next: false,
    has_previous: false,
    ...overrides,
  };
}

/**
 * Create a mock TandoorPaginatedResponse for recipes
 *
 * Mimics real Tandoor API response structure
 * Note: Recipe search returns count: 0 and empty results for non-existent queries
 * (unlike foods/units/keywords which return fuzzy matches)
 */
export function createMockRecipesResponse(
  recipes: TandoorRecipeResponse[] = [],
  overrides: Partial<TandoorPaginatedResponse<TandoorRecipeResponse>> = {},
): TandoorPaginatedResponse<TandoorRecipeResponse> {
  return {
    results: recipes,
    count: recipes.length,
    page: 1,
    page_size: 20,
    has_next: false,
    has_previous: false,
    ...overrides,
  };
}

/**
 * Common food fixtures
 *
 * Real API returns many more fields, but these are the essential ones
 * used by the MCP tools. The real API includes: description, recipe,
 * url, properties, properties_food_amount, properties_food_unit,
 * fdc_id, food_onhand, supermarket_category, parent, numchild,
 * inherit_fields, full_name, ignore_shopping, substitute, etc.
 */
export const foodFixtures = {
  onion: { id: 1, name: 'onion', plural_name: 'onions' },
  tomato: { id: 2, name: 'tomato', plural_name: 'tomatoes' },
  garlic: { id: 3, name: 'garlic', plural_name: 'garlic' },
  flour: { id: 4, name: 'flour', plural_name: 'flour' },
};

/**
 * Common unit fixtures
 *
 * Real API also returns: plural_name, description, base_unit, open_data_slug
 * The plural_name is often null in the real API for units
 */
export const unitFixtures = {
  cup: { id: 1, name: 'cup', plural_name: 'cups' },
  tsp: { id: 2, name: 'tsp', plural_name: null },
  tbsp: { id: 3, name: 'tbsp', plural_name: null },
  gram: { id: 4, name: 'g', plural_name: 'g' },
};

/**
 * Common keyword fixtures
 *
 * Real API also returns: label, description, parent, numchild, full_name,
 * created_at, updated_at fields. The label is usually the same as name.
 */
export const keywordFixtures = {
  dinner: { id: 1, name: 'dinner' },
  easy: { id: 2, name: 'easy' },
  vegetarian: { id: 3, name: 'vegetarian' },
  quick: { id: 4, name: 'quick' },
};
