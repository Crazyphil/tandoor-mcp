/**
 * Recipe tools tests for Tandoor MCP Server
 */

import { PaginatedResponse, TandoorRecipeResponse } from '../types';

// Mock environment variables before importing index
process.env.TANDOOR_BASE_URL = 'https://test.example.com';
process.env.TANDOOR_API_TOKEN = 'test-token';

// Create mock functions outside before they're used
const mockSearchRecipes = jest.fn();
const mockGetRecipe = jest.fn();

// Mock the TandoorApiClient - must be before import
jest.mock('../api/client', () => {
  return {
    TandoorApiClient: jest.fn().mockImplementation(() => ({
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
      getRecipe: mockGetRecipe,
      uploadRecipeImage: jest.fn(),
      searchRecipes: mockSearchRecipes
    }))
  };
});

// Mock the RecipeImporter
jest.mock('../tools/import', () => ({
  RecipeImporter: jest.fn().mockImplementation(() => ({
    importRecipeFromJson: jest.fn()
  }))
}));

import { callToolHandler } from '../index';

describe('Recipe Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search_recipes', () => {
    it('should search recipes by query string', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [
          { id: 1, name: 'Tomato Pasta', description: 'A delicious pasta' },
          { id: 2, name: 'Tomato Soup', description: 'Warm and cozy' }
        ],
        count: 2,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockSearchRecipes.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'search_recipes',
          arguments: { query: 'Tomato' }
        }
      });

      expect(mockSearchRecipes).toHaveBeenCalledWith({
        query: 'Tomato',
        foods: undefined,
        keywords: undefined,
        books: undefined,
        createdby: undefined,
        rating_gte: undefined,
        rating_lte: undefined,
        timescooked_gte: undefined,
        timescooked_lte: undefined,
        createdon_gte: undefined,
        createdon_lte: undefined,
        sort_order: undefined,
        page: 1,
        page_size: 20
      });
      expect(result.content[0].text).toContain('"count": 2');
      expect(result.content[0].text).toContain('Tomato Pasta');
    });

    it('should search recipes with food IDs filter', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [
          { id: 1, name: 'Chicken Curry' }
        ],
        count: 1,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockSearchRecipes.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'search_recipes',
          arguments: { foods: [5, 12] }
        }
      });

      expect(mockSearchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ foods: [5, 12] })
      );
      expect(result.content[0].text).toContain('Chicken Curry');
    });

    it('should search recipes with keyword IDs filter', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [
          { id: 1, name: 'Margherita Pizza' }
        ],
        count: 1,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockSearchRecipes.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'search_recipes',
          arguments: { keywords: [3] }
        }
      });

      expect(mockSearchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ keywords: [3] })
      );
    });

    it('should search recipes with rating filters', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [
          { id: 1, name: '5-Star Cake' }
        ],
        count: 1,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockSearchRecipes.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'search_recipes',
          arguments: { rating_gte: 4.5, rating_lte: 5 }
        }
      });

      expect(mockSearchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          rating_gte: 4.5,
          rating_lte: 5
        })
      );
    });

    it('should search recipes with pagination', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [],
        count: 50,
        page: 2,
        page_size: 10,
        has_next: true,
        has_previous: true
      };

      mockSearchRecipes.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'search_recipes',
          arguments: { page: 2, page_size: 10 }
        }
      });

      expect(mockSearchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          page_size: 10
        })
      );
      expect(result.content[0].text).toContain('"has_next": true');
      expect(result.content[0].text).toContain('"has_previous": true');
    });

    it('should search recipes with sort order', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockSearchRecipes.mockResolvedValue(mockResponse);

      await callToolHandler({
        params: {
          name: 'search_recipes',
          arguments: { sort_order: '-rating' }
        }
      });

      expect(mockSearchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ sort_order: '-rating' })
      );
    });

    it('should search recipes with combined filters', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [
          { id: 1, name: 'Healthy Pasta' }
        ],
        count: 1,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockSearchRecipes.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'search_recipes',
          arguments: {
            query: 'pasta',
            keywords: [1],
            foods: [5],
            rating_gte: 4,
            sort_order: '-rating'
          }
        }
      });

      expect(mockSearchRecipes).toHaveBeenCalledWith({
        query: 'pasta',
        keywords: [1],
        foods: [5],
        rating_gte: 4,
        sort_order: '-rating',
        books: undefined,
        createdby: undefined,
        rating_lte: undefined,
        timescooked_gte: undefined,
        timescooked_lte: undefined,
        createdon_gte: undefined,
        createdon_lte: undefined,
        page: 1,
        page_size: 20
      });
      expect(result.content[0].text).toContain('Healthy Pasta');
    });

    it('should use default pagination when not specified', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockSearchRecipes.mockResolvedValue(mockResponse);

      await callToolHandler({
        params: {
          name: 'search_recipes',
          arguments: {}
        }
      });

      expect(mockSearchRecipes).toHaveBeenCalledWith({
        query: undefined,
        foods: undefined,
        keywords: undefined,
        books: undefined,
        createdby: undefined,
        rating_gte: undefined,
        rating_lte: undefined,
        timescooked_gte: undefined,
        timescooked_lte: undefined,
        createdon_gte: undefined,
        createdon_lte: undefined,
        sort_order: undefined,
        page: 1,
        page_size: 20
      });
    });

    it('should handle API errors gracefully', async () => {
      mockSearchRecipes.mockRejectedValue(new Error('API Error'));

      await expect(callToolHandler({
        params: {
          name: 'search_recipes',
          arguments: { query: 'test' }
        }
      })).rejects.toThrow('Failed to search recipes: API Error');
    });
  });

  describe('get_recipe', () => {
    it('should get a recipe by ID', async () => {
      const mockRecipe: TandoorRecipeResponse = {
        id: 42,
        name: 'Chocolate Cake',
        description: 'A rich chocolate cake',
        servings: 8,
        source_url: 'https://example.com/chocolate-cake',
        keywords: [{ id: 1, name: 'dessert' }]
      };

      mockGetRecipe.mockResolvedValue(mockRecipe);

      const result = await callToolHandler({
        params: {
          name: 'get_recipe',
          arguments: { recipe_id: 42 }
        }
      });

      expect(mockGetRecipe).toHaveBeenCalledWith(42);
      expect(result.content[0].text).toContain('"id": 42');
      expect(result.content[0].text).toContain('Chocolate Cake');
      expect(result.content[0].text).toContain('A rich chocolate cake');
    });

    it('should get recipe with full details including steps and ingredients', async () => {
      const mockRecipe: TandoorRecipeResponse = {
        id: 99,
        name: 'Complex Recipe',
        description: 'Recipe with steps',
        steps: [
          {
            name: 'Step 1',
            instruction: 'Do something',
            order: 1,
            ingredients: []
          }
        ],
        keywords: []
      };

      mockGetRecipe.mockResolvedValue(mockRecipe);

      const result = await callToolHandler({
        params: {
          name: 'get_recipe',
          arguments: { recipe_id: 99 }
        }
      });

      expect(mockGetRecipe).toHaveBeenCalledWith(99);
      expect(result.content[0].text).toContain('Complex Recipe');
      expect(result.content[0].text).toContain('Step 1');
    });

    it('should handle invalid recipe_id', async () => {
      await expect(callToolHandler({
        params: {
          name: 'get_recipe',
          arguments: { recipe_id: 0 }
        }
      })).rejects.toThrow('Missing or invalid required argument: recipe_id');
    });

    it('should handle missing recipe_id', async () => {
      await expect(callToolHandler({
        params: {
          name: 'get_recipe',
          arguments: {}
        }
      })).rejects.toThrow('Missing or invalid required argument: recipe_id');
    });

    it('should handle not found recipe', async () => {
      mockGetRecipe.mockRejectedValue(new Error('Recipe not found'));

      await expect(callToolHandler({
        params: {
          name: 'get_recipe',
          arguments: { recipe_id: 99999 }
        }
      })).rejects.toThrow('Failed to get recipe: Recipe not found');
    });

    it('should handle API errors gracefully', async () => {
      mockGetRecipe.mockRejectedValue(new Error('Network error'));

      await expect(callToolHandler({
        params: {
          name: 'get_recipe',
          arguments: { recipe_id: 1 }
        }
      })).rejects.toThrow('Failed to get recipe: Network error');
    });
  });
});
