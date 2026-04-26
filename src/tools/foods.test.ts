/**
 * Food tool tests for Tandoor MCP Server
 *
 * Tests the food tool handlers directly using the factory pattern.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createFoodToolHandlers } from './foods';
import { TandoorApiClient } from '../api/client';
import { PaginatedResponse, Food } from '../types';

describe('Food Tools', () => {
  let mockClient: jest.Mocked<TandoorApiClient>;
  let handlers: ReturnType<typeof createFoodToolHandlers>;

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
    handlers = createFoodToolHandlers(mockClient);
  });

  describe('listAll', () => {
    it('should list all foods with pagination', async () => {
      const mockResponse: PaginatedResponse<Food> = {
        results: [
          { id: 1, name: 'onion', plural_name: 'onions' },
          { id: 2, name: 'tomato', plural_name: 'tomatoes' },
          { id: 3, name: 'garlic', plural_name: 'garlic' }
        ],
        count: 3,
        page: 1
      };

      mockClient.listAllFoods.mockResolvedValue(mockResponse);

      const result = await handlers.listAll({ page: 1, page_size: 20 }, undefined);

      expect(mockClient.listAllFoods).toHaveBeenCalledWith(1, 20);
      expect(result.content[0].text).toContain('"count": 3');
    });

    it('should use default pagination when not specified', async () => {
      mockClient.listAllFoods.mockResolvedValue({
        results: [],
        count: 0,
        page: 1
      });

      await handlers.listAll({}, undefined);

      expect(mockClient.listAllFoods).toHaveBeenCalledWith(1, 20);
    });

    it('should throw error when API call fails', async () => {
      mockClient.listAllFoods.mockRejectedValue(new Error('Network error'));

      await expect(handlers.listAll({}, undefined)).rejects.toThrow();
    });
  });

  describe('search', () => {
    it('should search foods by query', async () => {
      // Real API returns foods where name contains the query (fuzzy search)
      // The code then finds the exact match (case-insensitive) within results
      const mockResponse: Food[] = [
        { id: 1, name: 'onion', plural_name: 'onions' },
        { id: 2, name: 'green onion', plural_name: 'green onions' },
        { id: 3, name: 'onion powder', plural_name: 'onion powders' }
      ];

      mockClient.searchFood.mockResolvedValue(mockResponse);

      const result = await handlers.search({ query: 'onion' }, undefined);

      expect(mockClient.searchFood).toHaveBeenCalledWith('onion');
      // Returns all results containing 'onion' (real API behavior)
      expect(result.content[0].text).toContain('"name": "onion"');
      expect(result.content[0].text).toContain('"name": "green onion"');
    });

    it('should return empty results for no matches', async () => {
      // Real API: even for non-existent queries, may return results where
      // the query string appears as substring in some unrelated names
      // But if no exact match exists, the final filtered result is empty
      mockClient.searchFood.mockResolvedValue([]);

      const result = await handlers.search({ query: 'xyz123nonexistent' }, undefined);

      expect(result.content[0].text).toBe('[]');
    });

    it('should throw error for empty query', async () => {
      await expect(handlers.search({ query: '' }, undefined)).rejects.toThrow(
        new McpError(ErrorCode.InvalidParams, 'Missing required argument: query')
      );
    });

    it('should throw error when API call fails', async () => {
      mockClient.searchFood.mockRejectedValue(new Error('Server error'));

      await expect(handlers.search({ query: 'chicken' }, undefined)).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new food', async () => {
      // Real API behavior: search returns foods containing the query,
      // but none with exact name match (case-insensitive)
      // e.g., searching "avocado" might return "avocado oil", "fake_avocado_test"
      // but no exact "avocado" entry
      mockClient.searchFood.mockResolvedValue([
        { id: 100, name: 'avocado oil', plural_name: 'avocado oils' },
        { id: 101, name: 'test_avocado_something' }
      ]);

      const mockResponse: Food = { id: 10, name: 'avocado', plural_name: 'avocados' };
      mockClient.createFood.mockResolvedValue(mockResponse);

      const result = await handlers.create({ name: 'avocado', plural_name: 'avocados' }, undefined);

      expect(mockClient.searchFood).toHaveBeenCalledWith('avocado');
      expect(mockClient.createFood).toHaveBeenCalledWith('avocado', 'avocados');
      expect(result.content[0].text).toContain('"id": 10');
      expect(result.content[0].text).toContain('"name": "avocado"');
    });

    it('should create food without plural_name', async () => {
      // Food doesn't exist (search returns empty)
      mockClient.searchFood.mockResolvedValue([]);

      const mockResponse: Food = { id: 10, name: 'salt' };
      mockClient.createFood.mockResolvedValue(mockResponse);

      await handlers.create({ name: 'salt' }, undefined);

      expect(mockClient.searchFood).toHaveBeenCalledWith('salt');
      expect(mockClient.createFood).toHaveBeenCalledWith('salt', undefined);
    });

    it('should throw error for empty name', async () => {
      await expect(handlers.create({ name: '' }, undefined)).rejects.toThrow(
        new McpError(ErrorCode.InvalidParams, 'Missing required argument: name')
      );
    });

    it('should return entity_already_exists error when food already exists', async () => {
      // Real API behavior: search returns multiple results containing 'onion',
      // but exact match exists (case-insensitive)
      mockClient.searchFood.mockResolvedValue([
        { id: 42, name: 'onion', plural_name: 'onions' },
        { id: 43, name: 'green onion', plural_name: 'green onions' },
        { id: 44, name: 'onion powder' }
      ]);

      await expect(handlers.create({ name: 'onion' }, undefined)).rejects.toThrow('entity_already_exists');
      await expect(handlers.create({ name: 'onion' }, undefined)).rejects.toThrow('42'); // Check ID is included
    });

    it('should throw generic error when API call fails', async () => {
      // Food doesn't exist: search returns results containing query but no exact match
      mockClient.searchFood.mockResolvedValue([
        { id: 200, name: 'some_newfood_variety' }
      ]);
      mockClient.createFood.mockRejectedValue(new Error('Internal server error'));

      await expect(handlers.create({ name: 'newfood' }, undefined)).rejects.toThrow();
    });

    it('should be case-insensitive when checking for duplicates', async () => {
      // Real API: search is case-insensitive and returns matches containing the query
      mockClient.searchFood.mockResolvedValue([
        { id: 99, name: 'Tomato', plural_name: 'tomatoes' },
        { id: 100, name: 'tomato sauce', plural_name: 'tomato sauces' },
        { id: 101, name: 'cherry tomato', plural_name: 'cherry tomatoes' }
      ]);

      await expect(handlers.create({ name: 'tomato' }, undefined)).rejects.toThrow('entity_already_exists');
      await expect(handlers.create({ name: 'tomato' }, undefined)).rejects.toThrow('99'); // Check ID is included
    });
  });
});
