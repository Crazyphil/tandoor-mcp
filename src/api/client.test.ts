/**
 * Unit tests for TandoorApiClient
 *
 * Tests the direct API client methods to ensure:
 * - Correct API endpoints are called
 * - Request payloads match expected format
 * - Response handling works correctly
 * - Error handling works for different HTTP status codes
 */

import { TandoorApiClient } from './client';
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

// Mock axios module
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('TandoorApiClient', () => {
  let client: TandoorApiClient;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      defaults: {
        baseURL: 'http://test.tandoor/api',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      },
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    } as unknown as jest.Mocked<AxiosInstance>;

    // Make axios.create return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create client instance
    client = new TandoorApiClient({
      baseUrl: 'http://test.tandoor',
      token: 'test-token',
    });
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://test.tandoor',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('Food operations', () => {
    describe('searchFood', () => {
      it('should call correct endpoint and return results', async () => {
        const mockResponse: AxiosResponse = {
          data: {
            results: [
              {
                id: 1,
                name: 'onion',
                plural_name: 'onions',
                url: 'https://example.com/onion',
              },
              { id: 2, name: 'onion powder', plural_name: 'onion powders' },
            ],
            count: 2,
            page: 1,
            page_size: 20,
            has_next: false,
            has_previous: false,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        };
        mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

        const result = await client.searchFood('onion');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/food/', {
          params: { query: 'onion' },
        });
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          id: 1,
          name: 'onion',
        });
      });

      it('should handle empty results', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: {
            results: [],
            count: 0,
            page: 1,
            page_size: 20,
            has_next: false,
            has_previous: false,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

        const result = await client.searchFood('nonexistent');
        expect(result).toEqual([]);
      });
    });

    describe('listAllFoods', () => {
      it('should call correct endpoint with pagination', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: {
            results: [],
            count: 0,
            page: 2,
            page_size: 10,
            has_next: false,
            has_previous: true,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

        await client.listAllFoods(2, 10);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/food/', {
          params: { page: 2, page_size: 10 },
        });
      });
    });

    describe('createFood', () => {
      it('should create food with all fields', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: {
            id: 10,
            name: 'quinoa',
            plural_name: 'quinoa',
          },
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as any,
        });

        const result = await client.createFood(
          'quinoa',
          'quinoa',
        );

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/food/', {
          name: 'quinoa',
          plural_name: 'quinoa',
        });
        expect(result).toMatchObject({
          id: 10,
          name: 'quinoa',
          plural_name: 'quinoa',
        });
      });

      it('should create food with only name', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { id: 11, name: 'salt' },
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as any,
        });

        const result = await client.createFood('salt');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/food/', {
          name: 'salt',
        });
        expect(result).toMatchObject({ id: 11, name: 'salt' });
      });

      it('should create food with null plural_name', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { id: 12, name: 'uniquefood', plural_name: null },
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as any,
        });

        const result = await client.createFood('uniquefood', null);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/food/', {
          name: 'uniquefood',
          plural_name: null,
        });
        expect(result.plural_name).toBeNull();
      });

      it('should handle 403 Forbidden (insufficient permissions)', async () => {
        const error = new Error('Forbidden') as AxiosError;
        error.response = {
          data: {
            detail: 'You do not have permission to perform this action.',
          },
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config: {} as any,
        };
        mockAxiosInstance.post.mockRejectedValueOnce(error);

        await expect(client.createFood('newfood')).rejects.toThrow();
      });

      it('should handle 409 Conflict', async () => {
        const error = new Error('Conflict') as AxiosError;
        error.response = {
          data: { detail: 'This food already exists in this space.' },
          status: 409,
          statusText: 'Conflict',
          headers: {},
          config: {} as any,
        };
        mockAxiosInstance.post.mockRejectedValueOnce(error);

        await expect(client.createFood('existingfood')).rejects.toThrow();
      });
    });
  });

  describe('Unit operations', () => {
    describe('createUnit', () => {
      it('should create unit with all fields', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: {
            id: 20,
            name: 'handful',
            plural_name: 'handfuls',
          },
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as any,
        });

        const result = await client.createUnit('handful', 'handfuls');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/unit/', {
          name: 'handful',
          plural_name: 'handfuls',
        });

        expect(result).toMatchObject({
          id: 20,
          name: 'handful',
          plural_name: 'handfuls',
        });
      });

      it('should create unit with only name', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { id: 21, name: 'cup', plural_name: 'cups' },
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as any,
        });

        const result = await client.createUnit('cup');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/unit/', {
          name: 'cup',
        });
        expect(result.name).toBe('cup');
      });
    });

    describe('searchUnit', () => {
      it('should return units with plural_name in response', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: {
            results: [
              { id: 1, name: 'cup', plural_name: 'cups' },
              { id: 2, name: 'tsp', plural_name: 'tsp' },
            ],
            count: 2,
            page: 1,
            page_size: 20,
            has_next: false,
            has_previous: false,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

        const result = await client.searchUnit('cup');

        expect(result).toHaveLength(2);
        expect(result[0].plural_name).toBe('cups');
      });
    });
  });

  describe('Keyword operations', () => {
    describe('createKeyword', () => {
      it('should create keyword and return full response with label', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: {
            id: 30,
            name: 'vegetarian',
            label: 'vegetarian',
            numchild: 0,
            description: 'Vegetarian recipes',
          },
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as any,
        });

        const result = await client.createKeyword('vegetarian');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/keyword/', {
          name: 'vegetarian',
        });
        expect(result).toMatchObject({
          id: 30,
          name: 'vegetarian',
        });
      });
    });

    describe('listAllKeywords', () => {
      it('should return keywords with label field', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: {
            results: [
              { id: 1, name: 'Italian', label: 'Italian', numchild: 0 },
              { id: 2, name: 'vegetarian', label: 'vegetarian', numchild: 0 },
            ],
            count: 2,
            page: 1,
            page_size: 20,
            has_next: false,
            has_previous: false,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

        const result = await client.listAllKeywords();

        expect(result.results).toHaveLength(2);
        expect(result.results[0].name).toBe('Italian');
      });
    });
  });

  describe('Recipe operations', () => {
    describe('searchRecipes', () => {
      it('should search with basic query', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: {
            results: [{ id: 1, name: 'Pasta', keywords: [] }],
            count: 1,
            page: 1,
            page_size: 20,
            has_next: false,
            has_previous: false,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

        await client.searchRecipes({ query: 'pasta' });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/recipe/', {
          params: expect.objectContaining({ query: 'pasta' }),
        });
      });

      it('should pass all filter parameters correctly', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: {
            results: [],
            count: 0,
            page: 1,
            page_size: 20,
            has_next: false,
            has_previous: false,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

        await client.searchRecipes({
          query: 'pasta',
          foods: [1, 2],
          foods_and: [3, 4],
          foods_or_not: [5, 6],
          keywords: [10, 11],
          keywords_and: [12, 13],
          keywords_or_not: [14, 15],
          rating_gte: 4,
          timescooked_gte: 5,
          makenow: true,
          sort_order: '-rating',
          page: 2,
          page_size: 10,
        });

        const callParams = mockAxiosInstance.get.mock.calls[0][1];
        expect(callParams?.params).toMatchObject({
          query: 'pasta',
          foods: [1, 2],
          foods_and: [3, 4],
          foods_or_not: [5, 6],
          keywords: [10, 11],
          keywords_and: [12, 13],
          keywords_or_not: [14, 15],
          rating_gte: 4,
          timescooked_gte: 5,
          makenow: true,
          sort_order: '-rating',
          page: 2,
          page_size: 10,
        });
      });

      it('should handle pagination defaults', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: {
            results: [],
            count: 0,
            page: 1,
            page_size: 20,
            has_next: false,
            has_previous: false,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

        await client.searchRecipes({});

        const callParams = mockAxiosInstance.get.mock.calls[0][1];
        expect(callParams?.params.page).toBeUndefined();
        expect(callParams?.params.page_size).toBeUndefined();
      });
    });

    describe('createRecipe', () => {
      it('should create recipe with payload', async () => {
        const recipePayload = {
          name: 'Test Recipe',
          internal: true,
          steps: [
            {
              instruction: 'Test instruction',
              order: 0,
              ingredients: [
                {
                  amount: 100,
                  unit: 1,
                  food: 2,
                  order: 0,
                },
              ],
            },
          ],
          ingredients: [],
        };

        mockAxiosInstance.post.mockResolvedValueOnce({
          data: {
            id: 100,
            name: 'Test Recipe',
            steps: [
              {
                id: 1,
                name: '',
                instruction: 'Test instruction',
                order: 0,
                ingredients: [
                  {
                    id: 1,
                    amount: 100,
                    unit: {
                      id: 1,
                      name: 'g',
                      plural_name: 'g',
                      description: null,
                    },
                    food: {
                      id: 2,
                      name: 'flour',
                      plural_name: null,
                      url: undefined,
                    },
                    note: null,
                    order: 0,
                  },
                ],
              },
            ],
          },
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as any,
        });

        const result = await client.createRecipe(recipePayload);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/recipe/', recipePayload);
        expect(result.id).toBe(100);
        expect(result.name).toBe('Test Recipe');
      });
    });

    describe('getRecipe', () => {
      it('should get recipe by ID', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({
          data: {
            id: 50,
            name: 'Pasta Carbonara',
            keywords: [{ id: 1, name: 'Italian', label: 'Italian', numchild: 0 }],
            steps: [],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

        const result = await client.getRecipe(50);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/recipe/50/');
        expect(result.id).toBe(50);
        expect(result.keywords?.[0].name).toBe('Italian');
      });

      it('should handle 404 Not Found', async () => {
        const error = new Error('Not Found') as AxiosError;
        error.response = {
          data: { detail: 'Not found.' },
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
        };
        mockAxiosInstance.get.mockRejectedValueOnce(error);
        await expect(client.getRecipe(999)).rejects.toThrow();
      });
    });
  });

  describe('Image operations', () => {
    describe('uploadRecipeImage', () => {
      // Mock Blob and FormData for Node.js environment
      const mockBlob = { type: 'image/jpeg' } as Blob;

      beforeEach(() => {
        // Mock axios.get for downloadImage
        mockedAxios.get.mockResolvedValue({
          data: new ArrayBuffer(8),
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

        // Mock Blob constructor
        global.Blob = jest.fn().mockImplementation((parts: unknown[]) => {
          return { ...mockBlob, parts };
        }) as unknown as typeof Blob;

        // Mock FormData
        global.FormData = jest.fn().mockImplementation(() => ({
          append: jest.fn(),
        })) as unknown as typeof FormData;
      });

      it('should upload image without manual Content-Type header', async () => {
        mockAxiosInstance.put.mockResolvedValueOnce({
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });

        await client.uploadRecipeImage(100, 'http://example.com/image.jpg');

        // Verify put was called WITHOUT Content-Type header (axios handles it)
        const putCall = mockAxiosInstance.put.mock.calls[0];
        expect(putCall[0]).toBe('/api/recipe/100/image/');
        expect(putCall[2]).toBeUndefined(); // No config/header override
      });
    });
  });

  describe('Error handling', () => {
    it('should propagate Axios errors with response details', async () => {
      const error = new Error('Unauthorized') as AxiosError;
      error.response = {
        data: { detail: 'Invalid token' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as any,
      };
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(client.listAllFoods()).rejects.toMatchObject({
        response: {
          status: 401,
          data: { detail: 'Invalid token' },
        },
      });
    });

    it('should handle network errors', async () => {
      const error = new Error('Network Error') as AxiosError;
      error.request = {};
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(client.listAllFoods()).rejects.toThrow('Network Error');
    });
  });
});
