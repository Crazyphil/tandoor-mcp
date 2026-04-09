/**
 * Test mocks for Tandoor MCP Server
 *
 * Provides reusable mock implementations for unit testing.
 */

import { TandoorApiClient } from '../api/client';
import { RecipeImporter } from '../tools/import';
import { SchemaOrgRecipe, ImportResult, PaginatedResponse, TandoorFood, TandoorUnit, TandoorKeyword, TandoorRecipeResponse } from '../types';

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
    uploadRecipeImage: jest.fn()
  } as unknown as jest.Mocked<TandoorApiClient>;
}

/**
 * Create a mock RecipeImporter with all methods as jest mocks
 */
export function createMockImporter(): jest.Mocked<RecipeImporter> {
  return {
    importRecipeFromJson: jest.fn()
  } as unknown as jest.Mocked<RecipeImporter>;
}

/**
 * Create a valid Schema.org Recipe fixture for testing
 */
export function createMockRecipe(overrides: Partial<SchemaOrgRecipe> = {}): SchemaOrgRecipe {
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
    ...overrides
  };
}

/**
 * Create a mock ImportResult for testing
 */
export function createMockImportResult(overrides: Partial<ImportResult> = {}): ImportResult {
  return {
    recipe_id: 123,
    recipe_url: 'https://tandoor.example.com/recipe/123/',
    import_status: 'success',
    mapping_notes: {
      image_status: 'uploaded',
      field_transformations: [],
      ignored_fields: [],
      warnings: []
    },
    ...overrides
  };
}

/**
 * Create a mock PaginatedResponse for foods
 */
export function createMockFoodsResponse(
  foods: TandoorFood[] = [],
  overrides: Partial<PaginatedResponse<TandoorFood>> = {}
): PaginatedResponse<TandoorFood> {
  return {
    results: foods,
    count: foods.length,
    page: 1,
    page_size: 20,
    has_next: false,
    has_previous: false,
    ...overrides
  };
}

/**
 * Create a mock PaginatedResponse for units
 */
export function createMockUnitsResponse(
  units: TandoorUnit[] = [],
  overrides: Partial<PaginatedResponse<TandoorUnit>> = {}
): PaginatedResponse<TandoorUnit> {
  return {
    results: units,
    count: units.length,
    page: 1,
    page_size: 20,
    has_next: false,
    has_previous: false,
    ...overrides
  };
}

/**
 * Create a mock PaginatedResponse for keywords
 */
export function createMockKeywordsResponse(
  keywords: TandoorKeyword[] = [],
  overrides: Partial<PaginatedResponse<TandoorKeyword>> = {}
): PaginatedResponse<TandoorKeyword> {
  return {
    results: keywords,
    count: keywords.length,
    page: 1,
    page_size: 20,
    has_next: false,
    has_previous: false,
    ...overrides
  };
}

/**
 * Create a mock PaginatedResponse for recipes
 */
export function createMockRecipesResponse(
  recipes: TandoorRecipeResponse[] = [],
  overrides: Partial<PaginatedResponse<TandoorRecipeResponse>> = {}
): PaginatedResponse<TandoorRecipeResponse> {
  return {
    results: recipes,
    count: recipes.length,
    page: 1,
    page_size: 20,
    has_next: false,
    has_previous: false,
    ...overrides
  };
}

/**
 * Common food fixtures
 */
export const foodFixtures = {
  onion: { id: 1, name: 'onion', plural_name: 'onions' },
  tomato: { id: 2, name: 'tomato', plural_name: 'tomatoes' },
  garlic: { id: 3, name: 'garlic', plural_name: 'garlic' },
  flour: { id: 4, name: 'flour', plural_name: 'flour' }
};

/**
 * Common unit fixtures
 */
export const unitFixtures = {
  cup: { id: 1, name: 'cup' },
  tsp: { id: 2, name: 'tsp' },
  tbsp: { id: 3, name: 'tbsp' },
  gram: { id: 4, name: 'g' }
};

/**
 * Common keyword fixtures
 */
export const keywordFixtures = {
  dinner: { id: 1, name: 'dinner' },
  easy: { id: 2, name: 'easy' },
  vegetarian: { id: 3, name: 'vegetarian' },
  quick: { id: 4, name: 'quick' }
};
