/**
 * Keyword tool tests for Tandoor MCP Server
 *
 * Tests the keyword tool handlers directly using the factory pattern.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createKeywordToolHandlers } from './keywords';
import { TandoorApiClient } from '../api/client';
import { PaginatedResponse, TandoorKeyword } from '../types';

describe('Keyword Tools', () => {
  let mockClient: jest.Mocked<TandoorApiClient>;
  let handlers: ReturnType<typeof createKeywordToolHandlers>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      listAllKeywords: jest.fn(),
      searchKeyword: jest.fn(),
      createKeyword: jest.fn()
    } as unknown as jest.Mocked<TandoorApiClient>;
    handlers = createKeywordToolHandlers(mockClient);
  });

  describe('listAll', () => {
    it('should list all keywords with pagination', async () => {
      const mockResponse: PaginatedResponse<TandoorKeyword> = {
        results: [
          { id: 1, name: 'Italian' },
          { id: 2, name: 'vegetarian' },
          { id: 3, name: 'quick' },
          { id: 4, name: 'healthy' },
          { id: 5, name: 'dessert' }
        ],
        count: 5,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockClient.listAllKeywords.mockResolvedValue(mockResponse);

      const result = await handlers.listAll({ page: 1, page_size: 20 }, undefined);

      expect(mockClient.listAllKeywords).toHaveBeenCalledWith(1, 20);
      expect(result.content[0].text).toContain('"count": 5');
      expect(result.content[0].text).toContain('"has_next": false');
    });

    it('should use default pagination when not specified', async () => {
      mockClient.listAllKeywords.mockResolvedValue({
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      });

      await handlers.listAll({}, undefined);

      expect(mockClient.listAllKeywords).toHaveBeenCalledWith(1, 20);
    });

    it('should throw error when API call fails', async () => {
      mockClient.listAllKeywords.mockRejectedValue(new Error('Network error'));

      await expect(handlers.listAll({}, undefined)).rejects.toThrow();
    });
  });

  describe('search', () => {
    it('should search keywords by query', async () => {
      // Real API: returns keywords where name contains query (fuzzy search)
      const mockResponse: TandoorKeyword[] = [
        { id: 1, name: 'Italian' },
        { id: 2, name: 'Italian dinner' },
        { id: 3, name: 'italian pasta' }
      ];

      mockClient.searchKeyword.mockResolvedValue(mockResponse);

      const result = await handlers.search({ query: 'Italian' }, undefined);

      expect(mockClient.searchKeyword).toHaveBeenCalledWith('Italian');
      // Returns all results containing 'Italian'
      expect(result.content[0].text).toContain('"name": "Italian"');
      expect(result.content[0].text).toContain('"name": "Italian dinner"');
    });

    it('should return empty results for no matches', async () => {
      // Real API may return results where query is substring in other names
      mockClient.searchKeyword.mockResolvedValue([]);

      const result = await handlers.search({ query: 'xyz123nonexistent' }, undefined);

      expect(result.content[0].text).toBe('[]');
    });

    it('should throw error for empty query', async () => {
      await expect(handlers.search({ query: '' }, undefined)).rejects.toThrow(
        new McpError(ErrorCode.InvalidParams, 'Missing required argument: query')
      );
    });

    it('should throw error when API call fails', async () => {
      mockClient.searchKeyword.mockRejectedValue(new Error('Server error'));

      await expect(handlers.search({ query: 'vegetarian' }, undefined)).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new keyword', async () => {
      // Real API: search returns keywords containing query, but no exact match
      mockClient.searchKeyword.mockResolvedValue([
        { id: 100, name: 'gluten-free bread' },
        { id: 101, name: 'test_gluten_free_keyword' }
      ]);

      const mockResponse: TandoorKeyword = { id: 10, name: 'gluten-free' };
      mockClient.createKeyword.mockResolvedValue(mockResponse);

      const result = await handlers.create({ name: 'gluten-free' }, undefined);

      expect(mockClient.searchKeyword).toHaveBeenCalledWith('gluten-free');
      expect(mockClient.createKeyword).toHaveBeenCalledWith('gluten-free');
      expect(result.content[0].text).toContain('"id": 10');
      expect(result.content[0].text).toContain('"name": "gluten-free"');
    });

    it('should throw error for empty name', async () => {
      await expect(handlers.create({ name: '' }, undefined)).rejects.toThrow(
        new McpError(ErrorCode.InvalidParams, 'Missing required argument: name')
      );
    });

    it('should return entity_already_exists error when keyword already exists', async () => {
      // Real API: search returns keywords containing 'Italian', exact match exists
      mockClient.searchKeyword.mockResolvedValue([
        { id: 3, name: 'Italian' },
        { id: 4, name: 'Italian dinner' },
        { id: 5, name: 'italian recipe' }
      ]);

      await expect(handlers.create({ name: 'Italian' }, undefined)).rejects.toThrow('entity_already_exists');
      await expect(handlers.create({ name: 'Italian' }, undefined)).rejects.toThrow('3'); // Check ID is included
    });

    it('should throw generic error when API call fails', async () => {
      // Keyword doesn't exist: search returns results containing query but no exact match
      mockClient.searchKeyword.mockResolvedValue([
        { id: 200, name: 'some_healthy_variety' }
      ]);
      mockClient.createKeyword.mockRejectedValue(new Error('Internal server error'));

      await expect(handlers.create({ name: 'healthy' }, undefined)).rejects.toThrow();
    });
  });
});
