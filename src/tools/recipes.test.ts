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
      searchRecipes: jest.fn(),
      getRecipe: jest.fn()
    } as unknown as jest.Mocked<TandoorApiClient>;
    handlers = createRecipeToolHandlers(mockClient);
  });

  describe('search', () => {
    it('should search recipes by query', async () => {
      const mockResponse: PaginatedResponse<TandoorRecipeResponse> = {
        results: [
          { id: 1, name: 'Pasta Carbonara' },
          { id: 2, name: 'Spaghetti Bolognese' }
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
        keywords: [3],
        rating_gte: 4,
        page: 1,
        page_size: 20
      });
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
        servings: 4
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
