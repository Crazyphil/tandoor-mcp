/**
 * Keyword tool tests for Tandoor MCP Server
 */

import { PaginatedResponse } from '../types';
import { TandoorKeyword } from '../types';

// Mock environment variables before importing index
process.env.TANDOOR_BASE_URL = 'https://test.example.com';
process.env.TANDOOR_API_TOKEN = 'test-token';

// Create mock functions outside before they're used
const mockListAllKeywords = jest.fn();
const mockSearchKeyword = jest.fn();
const mockCreateKeyword = jest.fn();

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
      searchKeyword: mockSearchKeyword,
      listAllKeywords: mockListAllKeywords,
      createKeyword: mockCreateKeyword,
      createRecipe: jest.fn(),
      getRecipe: jest.fn(),
      uploadRecipeImage: jest.fn()
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

describe('Keyword Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list_all_keywords', () => {
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

      mockListAllKeywords.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'list_all_keywords',
          arguments: { page: 1, page_size: 20 }
        }
      });

      expect(mockListAllKeywords).toHaveBeenCalledWith(1, 20);
      expect(result.content[0].text).toContain('"count": 5');
      expect(result.content[0].text).toContain('"has_next": false');
    });

    it('should use default pagination when not specified', async () => {
      mockListAllKeywords.mockResolvedValue({
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      });

      await callToolHandler({
        params: {
          name: 'list_all_keywords',
          arguments: {}
        }
      });

      expect(mockListAllKeywords).toHaveBeenCalledWith(1, 20);
    });

    it('should handle multiple pages of results', async () => {
      const page1Response: PaginatedResponse<TandoorKeyword> = {
        results: [
          { id: 1, name: 'Italian' },
          { id: 2, name: 'vegetarian' }
        ],
        count: 5,
        page: 1,
        page_size: 2,
        has_next: true,
        has_previous: false
      };

      const page2Response: PaginatedResponse<TandoorKeyword> = {
        results: [
          { id: 3, name: 'quick' },
          { id: 4, name: 'healthy' }
        ],
        count: 5,
        page: 2,
        page_size: 2,
        has_next: true,
        has_previous: true
      };

      mockListAllKeywords
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const result1 = await callToolHandler({
        params: {
          name: 'list_all_keywords',
          arguments: { page: 1, page_size: 2 }
        }
      });

      const result2 = await callToolHandler({
        params: {
          name: 'list_all_keywords',
          arguments: { page: 2, page_size: 2 }
        }
      });

      expect(result1.content[0].text).toContain('"has_next": true');
      expect(result2.content[0].text).toContain('"has_previous": true');
    });

    it('should throw error when API call fails', async () => {
      mockListAllKeywords.mockRejectedValue(new Error('Network error'));

      await expect(callToolHandler({
        params: {
          name: 'list_all_keywords',
          arguments: {}
        }
      })).rejects.toThrow('Failed to list keywords');
    });
  });

  describe('search_keyword', () => {
    it('should search keywords by query', async () => {
      const mockResponse: TandoorKeyword[] = [
        { id: 1, name: 'Italian' },
        { id: 2, name: 'Indian' }
      ];

      mockSearchKeyword.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'search_keyword',
          arguments: { query: 'Italian' }
        }
      });

      expect(mockSearchKeyword).toHaveBeenCalledWith('Italian');
      expect(result.content[0].text).toContain('"name": "Italian"');
    });

    it('should return empty results for no matches', async () => {
      mockSearchKeyword.mockResolvedValue([]);

      const result = await callToolHandler({
        params: {
          name: 'search_keyword',
          arguments: { query: 'xyz123' }
        }
      });

      expect(result.content[0].text).toBe('[]');
    });

    it('should throw error for missing query argument', async () => {
      await expect(callToolHandler({
        params: {
          name: 'search_keyword',
          arguments: {}
        }
      })).rejects.toThrow('Missing required argument: query');
    });

    it('should throw error for empty query', async () => {
      await expect(callToolHandler({
        params: {
          name: 'search_keyword',
          arguments: { query: '' }
        }
      })).rejects.toThrow('Missing required argument: query');
    });

    it('should throw error when API call fails', async () => {
      mockSearchKeyword.mockRejectedValue(new Error('Server error'));

      await expect(callToolHandler({
        params: {
          name: 'search_keyword',
          arguments: { query: 'vegetarian' }
        }
      })).rejects.toThrow('Failed to search keywords');
    });
  });

  describe('create_keyword', () => {
    it('should create a new keyword', async () => {
      const mockResponse: TandoorKeyword = { id: 10, name: 'gluten-free' };
      mockCreateKeyword.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'create_keyword',
          arguments: { name: 'gluten-free' }
        }
      });

      expect(mockCreateKeyword).toHaveBeenCalledWith('gluten-free');
      expect(result.content[0].text).toContain('"id": 10');
      expect(result.content[0].text).toContain('"name": "gluten-free"');
    });

    it('should throw error for missing name argument', async () => {
      await expect(callToolHandler({
        params: {
          name: 'create_keyword',
          arguments: {}
        }
      })).rejects.toThrow('Missing required argument: name');
    });

    it('should throw error for empty name', async () => {
      await expect(callToolHandler({
        params: {
          name: 'create_keyword',
          arguments: { name: '' }
        }
      })).rejects.toThrow('Missing required argument: name');
    });

    it('should return entity_already_exists error for duplicate keyword', async () => {
      const error: any = new Error('Conflict');
      error.response = { status: 409, data: { name: ['Keyword with this name already exists.'] } };
      mockCreateKeyword.mockRejectedValue(error);

      await expect(callToolHandler({
        params: {
          name: 'create_keyword',
          arguments: { name: 'Italian' }
        }
      })).rejects.toThrow('entity_already_exists');
    });

    it('should throw generic error when API call fails', async () => {
      mockCreateKeyword.mockRejectedValue(new Error('Internal server error'));

      await expect(callToolHandler({
        params: {
          name: 'create_keyword',
          arguments: { name: 'healthy' }
        }
      })).rejects.toThrow('Failed to create keyword');
    });
  });
});
