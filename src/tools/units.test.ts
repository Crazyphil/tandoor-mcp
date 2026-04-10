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
      const mockResponse: TandoorUnit[] = [
        { id: 1, name: 'cup' },
        { id: 2, name: 'cupful' }
      ];

      mockClient.searchUnit.mockResolvedValue(mockResponse);

      const result = await handlers.search({ query: 'cup' }, undefined);

      expect(mockClient.searchUnit).toHaveBeenCalledWith('cup');
      expect(result.content[0].text).toContain('"name": "cup"');
    });

    it('should return empty results for no matches', async () => {
      mockClient.searchUnit.mockResolvedValue([]);

      const result = await handlers.search({ query: 'xyz123' }, undefined);

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
      // Unit doesn't exist (search returns empty)
      mockClient.searchUnit.mockResolvedValue([]);

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
      // Unit already exists
      mockClient.searchUnit.mockResolvedValue([{ id: 5, name: 'cup' }]);

      await expect(handlers.create({ name: 'cup' }, undefined)).rejects.toThrow('entity_already_exists');
      await expect(handlers.create({ name: 'cup' }, undefined)).rejects.toThrow('5'); // Check ID is included
    });

    it('should throw generic error when API call fails', async () => {
      // Unit doesn't exist (search returns empty)
      mockClient.searchUnit.mockResolvedValue([]);
      mockClient.createUnit.mockRejectedValue(new Error('Internal server error'));

      await expect(handlers.create({ name: 'dash' }, undefined)).rejects.toThrow();
    });

    it('should be case-insensitive when checking for duplicates', async () => {
      // Unit exists with different case
      mockClient.searchUnit.mockResolvedValue([{ id: 88, name: 'Gram' }]);

      await expect(handlers.create({ name: 'gram' }, undefined)).rejects.toThrow('entity_already_exists');
      await expect(handlers.create({ name: 'gram' }, undefined)).rejects.toThrow('88'); // Check ID is included
    });
  });
});
