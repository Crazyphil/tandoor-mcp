/**
 * Recipe tool tests for Tandoor MCP Server
 *
 * Tests the recipe tool handlers directly using the factory pattern.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createRecipeToolHandlers } from './recipes';
import { TandoorApiClient } from '../api/client';
import { PaginatedResponse, TandoorRecipeResponse } from '../types';

describe('Recipe Tools', () => {
  let mockClient: jest.Mocked<TandoorApiClient>;
  let handlers: ReturnType<typeof createRecipeToolHandlers>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      listAllFoods: jest.fn(),
      searchFood: jest.fn(),
      createFood: jest.fn(),
      listAllUnits: jest.fn(),
      searchUnit: jest.fn(),
      createUnit: jest.fn(),
      listAllKeywords: jest.fn(),
      searchKeyword: jest.fn(),
      createKeyword: jest.fn(),
      createRecipe: jest.fn(),
      getRecipe: jest.fn(),
      searchRecipes: jest.fn(),
      uploadRecipeImage: jest.fn()
    } as unknown as jest.Mocked<TandoorApiClient>;
    handlers = createRecipeToolHandlers(mockClient);
  });

  describe('search', () => {
    it('should search recipes by query', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [
          { id: 1, name: 'Pasta Carbonara', keywords: [{ id: 1, name: 'Italian', label: 'Italian', numchild: 0 }] },
          { id: 2, name: 'Spaghetti Bolognese', keywords: [{ id: 2, name: 'pasta', label: 'pasta', numchild: 0 }] }
        ],
        count: 2,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.searchRecipes.mockResolvedValue(mockResponse);

      const result = await handlers.search({ query: 'pasta' }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({ query: 'pasta' }));
      expect(result.content[0].text).toContain('"name": "Pasta Carbonara"');
    });

    it('should search with filters', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.searchRecipes.mockResolvedValue(mockResponse);

      await handlers.search({
        foods: [1, 2],
        keywords: [3],
        rating_gte: 4
      }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith({
        query: undefined,
        foods: [1, 2],
        foods_and: undefined,
        foods_or_not: undefined,
        keywords: [3],
        keywords_and: undefined,
        keywords_or_not: undefined,
        rating_gte: 4,
        timescooked_gte: undefined,
        sort_order: undefined,
        makenow: undefined,
        page: 1,
        page_size: 20
      });
    });

    it('should search with sort_order parameter', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [{ id: 1, name: 'Sorted Recipe', keywords: [] }],
        count: 1,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.searchRecipes.mockResolvedValue(mockResponse);

      await handlers.search({ sort_order: '-rating' }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({ sort_order: '-rating' }));
    });

    it('should search with food filters (OR, AND, NOT)', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.searchRecipes.mockResolvedValue(mockResponse);

      await handlers.search({
        foods: [1, 2],
        foods_and: [3, 4],
        foods_not: [5, 6]
      }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        foods: [1, 2],
        foods_and: [3, 4],
        foods_or_not: [5, 6]  // mapped from foods_not
      }));
    });

    it('should search with keyword filters (OR, AND, NOT)', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.searchRecipes.mockResolvedValue(mockResponse);

      await handlers.search({
        keywords: [1, 2],
        keywords_and: [3],
        keywords_not: [4, 5]
      }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        keywords: [1, 2],
        keywords_and: [3],
        keywords_or_not: [4, 5]  // mapped from keywords_not
      }));
    });

    it('should search with rating and timescooked filters', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [{ id: 1, name: 'Test Recipe', keywords: [] }],
        count: 1,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.searchRecipes.mockResolvedValue(mockResponse);

      await handlers.search({
        rating_gte: 4,
        timescooked_gte: 5
      }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        rating_gte: 4,
        timescooked_gte: 5
      }));
    });

    it('should search with all_ingredients_stocked flag', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.searchRecipes.mockResolvedValue(mockResponse);

      await handlers.search({
        all_ingredients_stocked: true
      }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        makenow: true
      }));
    });

    it('should search with all_ingredients_stocked parameter', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.searchRecipes.mockResolvedValue(mockResponse);

      await handlers.search({ all_ingredients_stocked: true }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({ makenow: true }));
    });

    it('should return empty results for no matches', async () => {
      mockClient.searchRecipes.mockResolvedValue({
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      });

      const result = await handlers.search({ query: 'xyz123' }, undefined);

      expect(result.content[0].text).toContain('"count": 0');
    });

    it('should throw error when API call fails', async () => {
      mockClient.searchRecipes.mockRejectedValue(new Error('Server error'));

      await expect(handlers.search({ query: 'chicken' }, undefined)).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should get recipe by ID', async () => {
      const mockResponse: TandoorRecipeResponse = {
        id: 1,
        name: 'Test Recipe',
        description: 'A test recipe',
        servings: 4,
        keywords: [{ id: 1, name: 'test', label: 'test', numchild: 0 }],
        steps: [{
          id: 1,
          name: '',
          instruction: 'Test instruction',
          order: 0,
          ingredients: []
        }]
      };

      mockClient.getRecipe.mockResolvedValue(mockResponse);

      const result = await handlers.get({ recipe_id: 1 }, undefined);

      expect(mockClient.getRecipe).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('"id": 1');
      expect(result.content[0].text).toContain('"name": "Test Recipe"');
    });

    it('should throw error for invalid recipe_id', async () => {
      await expect(handlers.get({ recipe_id: 0 }, undefined)).rejects.toThrow(
        new McpError(ErrorCode.InvalidParams, 'Missing or invalid required argument: recipe_id')
      );
    });

    it('should throw error when API call fails', async () => {
      mockClient.getRecipe.mockRejectedValue(new Error('Recipe not found'));

      await expect(handlers.get({ recipe_id: 999 }, undefined)).rejects.toThrow();
    });
  });
});
