// Mock environment variables before importing index
process.env.TANDOOR_BASE_URL = 'https://test.example.com';
process.env.TANDOOR_API_TOKEN = 'test-token';

// Create mock functions outside before they're used
const mockListAllUnits = jest.fn();
const mockSearchUnit = jest.fn();
const mockCreateUnit = jest.fn();

// Mock the TandoorApiClient - must be before import
jest.mock('../api/client', () => {
  return {
    TandoorApiClient: jest.fn().mockImplementation(() => ({
      searchFood: jest.fn(),
      listAllFoods: jest.fn(),
      createFood: jest.fn(),
      searchUnit: mockSearchUnit,
      listAllUnits: mockListAllUnits,
      createUnit: mockCreateUnit,
      searchKeyword: jest.fn(),
      listAllKeywords: jest.fn(),
      createKeyword: jest.fn(),
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

describe('Unit Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list_all_units', () => {
    it('should list all units with pagination', async () => {
      const mockResponse = {
        results: [
          { id: 1, name: 'gram' },
          { id: 2, name: 'kilogram' },
          { id: 3, name: 'cup' },
          { id: 4, name: 'tablespoon' },
          { id: 5, name: 'teaspoon' }
        ],
        count: 5,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      mockListAllUnits.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'list_all_units',
          arguments: { page: 1, page_size: 20 }
        }
      });

      expect(mockListAllUnits).toHaveBeenCalledWith(1, 20);
      expect(result.content[0].text).toContain('"count": 5');
      expect(result.content[0].text).toContain('"has_next": false');
    });

    it('should use default pagination when not specified', async () => {
      mockListAllUnits.mockResolvedValue({
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      });

      await callToolHandler({
        params: {
          name: 'list_all_units',
          arguments: {}
        }
      });

      expect(mockListAllUnits).toHaveBeenCalledWith(1, 20);
    });

    it('should handle multiple pages of results', async () => {
      const page1Response = {
        results: [
          { id: 1, name: 'gram' },
          { id: 2, name: 'kilogram' }
        ],
        count: 5,
        page: 1,
        page_size: 2,
        has_next: true,
        has_previous: false
      };

      const page2Response = {
        results: [
          { id: 3, name: 'cup' },
          { id: 4, name: 'tablespoon' }
        ],
        count: 5,
        page: 2,
        page_size: 2,
        has_next: true,
        has_previous: true
      };

      mockListAllUnits
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const result1 = await callToolHandler({
        params: {
          name: 'list_all_units',
          arguments: { page: 1, page_size: 2 }
        }
      });

      const result2 = await callToolHandler({
        params: {
          name: 'list_all_units',
          arguments: { page: 2, page_size: 2 }
        }
      });

      expect(result1.content[0].text).toContain('"has_next": true');
      expect(result2.content[0].text).toContain('"has_previous": true');
    });

    it('should throw error when API call fails', async () => {
      mockListAllUnits.mockRejectedValue(new Error('Network error'));

      await expect(callToolHandler({
        params: {
          name: 'list_all_units',
          arguments: {}
        }
      })).rejects.toThrow('Failed to list units');
    });
  });

  describe('search_unit', () => {
    it('should search units by query', async () => {
      const mockResponse = [
        { id: 1, name: 'gram' },
        { id: 2, name: 'grams' }
      ];

      mockSearchUnit.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'search_unit',
          arguments: { query: 'gram' }
        }
      });

      expect(mockSearchUnit).toHaveBeenCalledWith('gram');
      expect(result.content[0].text).toContain('"name": "gram"');
    });

    it('should return empty results for no matches', async () => {
      mockSearchUnit.mockResolvedValue([]);

      const result = await callToolHandler({
        params: {
          name: 'search_unit',
          arguments: { query: 'xyz123' }
        }
      });

      expect(result.content[0].text).toBe('[]');
    });

    it('should throw error for missing query argument', async () => {
      await expect(callToolHandler({
        params: {
          name: 'search_unit',
          arguments: {}
        }
      })).rejects.toThrow('Missing required argument: query');
    });

    it('should throw error for empty query', async () => {
      await expect(callToolHandler({
        params: {
          name: 'search_unit',
          arguments: { query: '' }
        }
      })).rejects.toThrow('Missing required argument: query');
    });

    it('should throw error when API call fails', async () => {
      mockSearchUnit.mockRejectedValue(new Error('Server error'));

      await expect(callToolHandler({
        params: {
          name: 'search_unit',
          arguments: { query: 'cup' }
        }
      })).rejects.toThrow('Failed to search units');
    });
  });

  describe('create_unit', () => {
    it('should create a new unit', async () => {
      const mockResponse = { id: 10, name: 'pinch' };
      mockCreateUnit.mockResolvedValue(mockResponse);

      const result = await callToolHandler({
        params: {
          name: 'create_unit',
          arguments: { name: 'pinch' }
        }
      });

      expect(mockCreateUnit).toHaveBeenCalledWith('pinch');
      expect(result.content[0].text).toContain('"id": 10');
      expect(result.content[0].text).toContain('"name": "pinch"');
    });

    it('should throw error for missing name argument', async () => {
      await expect(callToolHandler({
        params: {
          name: 'create_unit',
          arguments: {}
        }
      })).rejects.toThrow('Missing required argument: name');
    });

    it('should throw error for empty name', async () => {
      await expect(callToolHandler({
        params: {
          name: 'create_unit',
          arguments: { name: '' }
        }
      })).rejects.toThrow('Missing required argument: name');
    });

    it('should return entity_already_exists error for duplicate unit', async () => {
      const error: any = new Error('Conflict');
      error.response = { status: 409, data: { name: ['Unit with this name already exists.'] } };
      mockCreateUnit.mockRejectedValue(error);

      await expect(callToolHandler({
        params: {
          name: 'create_unit',
          arguments: { name: 'gram' }
        }
      })).rejects.toThrow('entity_already_exists');
    });

    it('should throw generic error when API call fails', async () => {
      mockCreateUnit.mockRejectedValue(new Error('Internal server error'));

      await expect(callToolHandler({
        params: {
          name: 'create_unit',
          arguments: { name: 'pinch' }
        }
      })).rejects.toThrow('Failed to create unit');
    });
  });
});
