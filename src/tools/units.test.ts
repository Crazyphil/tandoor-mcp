/**
 * Unit tool tests for Tandoor MCP Server
 *
 * Tests the unit tool handlers directly using the factory pattern.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createUnitToolHandlers } from './units';
import { TandoorApiClient } from '../api/client';
import { PaginatedResponse, TandoorUnit } from '../types';

describe('Unit Tools', () => {
  let mockClient: jest.Mocked<TandoorApiClient>;
  let handlers: ReturnType<typeof createUnitToolHandlers>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      listAllUnits: jest.fn(),
      searchUnit: jest.fn(),
      createUnit: jest.fn()
    } as unknown as jest.Mocked<TandoorApiClient>;
    handlers = createUnitToolHandlers(mockClient);
  });

  describe('listAll', () => {
    it('should list all units with pagination', async () => {
      const mockResponse: PaginatedResponse<TandoorUnit> = {
        results: [
          { id: 1, name: 'cup' },
          { id: 2, name: 'tsp' },
          { id: 3, name: 'tbsp' },
          { id: 4, name: 'g' },
          { id: 5, name: 'kg' }
        ],
        count: 5,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.listAllUnits.mockResolvedValue(mockResponse);

      const result = await handlers.listAll({ page: 1, page_size: 20 }, undefined);

      expect(mockClient.listAllUnits).toHaveBeenCalledWith(1, 20);
      expect(result.content[0].text).toContain('"count": 5');
      expect(result.content[0].text).toContain('"has_next": false');
    });

    it('should use default pagination when not specified', async () => {
      mockClient.listAllUnits.mockResolvedValue({
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      });

      await handlers.listAll({}, undefined);

      expect(mockClient.listAllUnits).toHaveBeenCalledWith(1, 20);
    });

    it('should throw error when API call fails', async () => {
      mockClient.listAllUnits.mockRejectedValue(new Error('Network error'));

      await expect(handlers.listAll({}, undefined)).rejects.toThrow();
    });
  });

  describe('search', () => {
    it('should search units by query', async () => {
      // Real API: returns units where name contains query (fuzzy search)
      const mockResponse: TandoorUnit[] = [
        { id: 1, name: 'cup' },
        { id: 2, name: 'cupful' },
        { id: 3, name: 'cup/2' },
        { id: 4, name: '1/4 cup' }
      ];

      mockClient.searchUnit.mockResolvedValue(mockResponse);

      const result = await handlers.search({ query: 'cup' }, undefined);

      expect(mockClient.searchUnit).toHaveBeenCalledWith('cup');
      // Returns all results containing 'cup'
      expect(result.content[0].text).toContain('"name": "cup"');
      expect(result.content[0].text).toContain('"name": "cupful"');
    });

    it('should return empty results for no matches', async () => {
      // Real API may return unrelated results, but code filters for exact match
      mockClient.searchUnit.mockResolvedValue([]);

      const result = await handlers.search({ query: 'xyz123nonexistent' }, undefined);

      expect(result.content[0].text).toBe('[]');
    });

    it('should throw error for empty query', async () => {
      await expect(handlers.search({ query: '' }, undefined)).rejects.toThrow(
        new McpError(ErrorCode.InvalidParams, 'Missing required argument: query')
      );
    });

    it('should throw error when API call fails', async () => {
      mockClient.searchUnit.mockRejectedValue(new Error('Server error'));

      await expect(handlers.search({ query: 'grams' }, undefined)).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new unit', async () => {
      // Real API: search returns units containing query, but no exact match
      mockClient.searchUnit.mockResolvedValue([
        { id: 100, name: 'pinch of something' },
        { id: 101, name: 'test_pinch_unit' }
      ]);

      const mockResponse: TandoorUnit = { id: 10, name: 'pinch' };
      mockClient.createUnit.mockResolvedValue(mockResponse);

      const result = await handlers.create({ name: 'pinch' }, undefined);

      expect(mockClient.searchUnit).toHaveBeenCalledWith('pinch');
      expect(mockClient.createUnit).toHaveBeenCalledWith('pinch');
      expect(result.content[0].text).toContain('"id": 10');
      expect(result.content[0].text).toContain('"name": "pinch"');
    });

    it('should throw error for empty name', async () => {
      await expect(handlers.create({ name: '' }, undefined)).rejects.toThrow(
        new McpError(ErrorCode.InvalidParams, 'Missing required argument: name')
      );
    });

    it('should return entity_already_exists error when unit already exists', async () => {
      // Real API: search returns units containing 'cup', exact match exists
      mockClient.searchUnit.mockResolvedValue([
        { id: 5, name: 'cup' },
        { id: 6, name: 'cupful' },
        { id: 7, name: '1/4 cup' }
      ]);

      await expect(handlers.create({ name: 'cup' }, undefined)).rejects.toThrow('entity_already_exists');
      await expect(handlers.create({ name: 'cup' }, undefined)).rejects.toThrow('5'); // Check ID is included
    });

    it('should throw generic error when API call fails', async () => {
      // Unit doesn't exist: search returns results containing query but no exact match
      mockClient.searchUnit.mockResolvedValue([
        { id: 200, name: 'some_dash_variety' }
      ]);
      mockClient.createUnit.mockRejectedValue(new Error('Internal server error'));

      await expect(handlers.create({ name: 'dash' }, undefined)).rejects.toThrow();
    });

    it('should be case-insensitive when checking for duplicates', async () => {
      // Real API: search returns case-insensitive matches containing query
      mockClient.searchUnit.mockResolvedValue([
        { id: 88, name: 'Gram' },
        { id: 89, name: 'grams' },
        { id: 90, name: 'kilogram' }
      ]);

      await expect(handlers.create({ name: 'gram' }, undefined)).rejects.toThrow('entity_already_exists');
      await expect(handlers.create({ name: 'gram' }, undefined)).rejects.toThrow('88'); // Check ID is included
    });
  });
});
