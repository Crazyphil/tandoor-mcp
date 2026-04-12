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
        foods: [1, 2],
        foods_or: undefined,
        foods_and: undefined,
        foods_or_not: undefined,
        foods_and_not: undefined,
        keywords: [3],
        keywords_or: undefined,
        keywords_and: undefined,
        keywords_or_not: undefined,
        keywords_and_not: undefined,
        books: undefined,
        createdby: undefined,
        rating: undefined,
        rating_gte: 4,
        rating_lte: undefined,
        timescooked: undefined,
        timescooked_gte: undefined,
        timescooked_lte: undefined,
        createdon_gte: undefined,
        createdon_lte: undefined,
        lastcooked_gte: undefined,
        lastcooked_lte: undefined,
        sort_order: undefined,
        new: undefined,
        makenow: undefined,
        include_children: undefined,
        num_recent: undefined,
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

    it('should search with advanced food filters', async () => {
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
        foods_or: [1, 2],
        foods_and: [3, 4],
        foods_or_not: [5],
        foods_and_not: [6]
      }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        foods_or: [1, 2],
        foods_and: [3, 4],
        foods_or_not: [5],
        foods_and_not: [6]
      }));
    });

    it('should search with advanced keyword filters', async () => {
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
        keywords_or: [1, 2],
        keywords_and: [3],
        keywords_or_not: [4],
        keywords_and_not: [5]
      }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        keywords_or: [1, 2],
        keywords_and: [3],
        keywords_or_not: [4],
        keywords_and_not: [5]
      }));
    });

    it('should search with rating and timescooked exact filters', async () => {
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
        rating: 5,
        timescooked: 3
      }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        rating: 5,
        timescooked: 3
      }));
    });

    it('should search with boolean flags', async () => {
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
        new: true,
        makenow: true,
        include_children: true
      }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        new: true,
        makenow: true,
        include_children: true
      }));
    });

    it('should search with num_recent parameter', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.searchRecipes.mockResolvedValue(mockResponse);

      await handlers.search({ num_recent: 10 }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({ num_recent: 10 }));
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

    it('should handle lastcooked date filters', async () => {
      mockClient.searchRecipes.mockResolvedValue({
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      });

      await handlers.search({
        lastcooked_gte: '2024-01-01',
        lastcooked_lte: '2024-12-31'
      }, undefined);

      expect(mockClient.searchRecipes).toHaveBeenCalledWith(expect.objectContaining({
        lastcooked_gte: '2024-01-01',
        lastcooked_lte: '2024-12-31'
      }));
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
