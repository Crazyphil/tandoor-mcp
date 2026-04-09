import {
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { SchemaOrgRecipe } from './types';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    TANDOOR_BASE_URL: 'https://test.tandoor.com',
    TANDOOR_API_TOKEN: 'test-token',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

jest.mock('./api/client');

describe('MCP Server Integration', () => {
  let importRecipeMock: jest.Mock;
  let listAllFoodsMock: jest.Mock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let serverModule: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    importRecipeMock = jest.fn();
    listAllFoodsMock = jest.fn();

    // Mock the API client before importing index
    jest.doMock('./api/client', () => ({
      TandoorApiClient: jest.fn().mockImplementation(() => ({
        listAllFoods: listAllFoodsMock
      }))
    }));

    jest.doMock('./tools/import', () => ({
      RecipeImporter: jest.fn().mockImplementation(() => ({
        importRecipeFromJson: importRecipeMock
      }))
    }));

    // Dynamic import after mocks are set up
    serverModule = await import('./index');
  });

  describe('Tool List', () => {
    it('should return the list of available tools', async () => {
      const response = await serverModule.listToolsHandler();

      expect(response).toEqual({
        tools: [
          {
            name: "import_recipe_from_json",
            title: "Import recipe from JSON",
            description: expect.stringContaining("Import a recipe"),
            inputSchema: expect.any(Object)
          },
          {
            name: "list_all_foods",
            title: "List all foods",
            description: expect.stringContaining("paginated list"),
            inputSchema: expect.any(Object)
          }
        ]
      });
    });
  });

  describe('Tool Call - import_recipe_from_json', () => {
    it('should successfully import a recipe and return formatted result', async () => {
      const mockImportResult = {
        recipe_id: 123,
        recipe_url: 'https://test.tandoor.com/api/recipe/123/',
        import_status: 'success' as const,
        mapping_notes: {
          image_status: 'uploaded' as const,
          field_transformations: [],
          ignored_fields: [],
          warnings: []
        }
      };

      importRecipeMock.mockResolvedValue(mockImportResult as any);

      const recipe: SchemaOrgRecipe = {
        name: 'Test Recipe',
        recipeIngredient: ['1 onion', '2 tomatoes'],
        recipeInstructions: ['Chop onion', 'Add tomatoes']
      };

      const response = await serverModule.callToolHandler({
        params: {
          name: 'import_recipe_from_json',
          arguments: { recipe }
        }
      });

      expect(importRecipeMock).toHaveBeenCalledWith(recipe);
      expect(response).toEqual({
        content: [{ type: 'text', text: JSON.stringify(mockImportResult, null, 2) }]
      });
    });

    it('should handle missing recipe parameter', async () => {
      await expect(serverModule.callToolHandler({
        params: {
          name: 'import_recipe_from_json',
          arguments: {}
        }
      })).rejects.toThrow(
        new McpError(ErrorCode.InvalidParams, "Missing required argument: recipe")
      );
    });

    it('should handle importer errors', async () => {
      const error = new Error('Import failed');
      importRecipeMock.mockRejectedValue(error);

      const recipe: SchemaOrgRecipe = {
        name: 'Test Recipe',
        recipeIngredient: ['1 onion'],
        recipeInstructions: ['Chop onion']
      };

      await expect(serverModule.callToolHandler({
        params: {
          name: 'import_recipe_from_json',
          arguments: { recipe }
        }
      })).rejects.toThrow(
        new McpError(ErrorCode.InternalError, "Import failed: Import failed")
      );
    });

    it('should handle unknown tools', async () => {
      await expect(serverModule.callToolHandler({
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      })).rejects.toThrow(
        new McpError(ErrorCode.MethodNotFound, "Unknown tool: unknown_tool")
      );
    });
  });

  describe('Tool Call - list_all_foods', () => {
    it('should successfully list all foods with pagination', async () => {
      const mockFoodsResponse = {
        results: [
          { id: 1, name: 'Onion', plural_name: 'Onions' },
          { id: 2, name: 'Tomato', plural_name: 'Tomatoes' }
        ],
        count: 2,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      listAllFoodsMock.mockResolvedValue(mockFoodsResponse);

      const response = await serverModule.callToolHandler({
        params: {
          name: 'list_all_foods',
          arguments: { page: 1, page_size: 20 }
        }
      });

      expect(listAllFoodsMock).toHaveBeenCalledWith(1, 20);
      expect(response).toEqual({
        content: [{ type: 'text', text: JSON.stringify(mockFoodsResponse, null, 2) }]
      });
    });

    it('should use default pagination when not provided', async () => {
      const mockFoodsResponse = {
        results: [],
        count: 0,
        page: 1,
        page_size: 20,
        has_next: false,
        has_previous: false
      };

      listAllFoodsMock.mockResolvedValue(mockFoodsResponse);

      const response = await serverModule.callToolHandler({
        params: {
          name: 'list_all_foods',
          arguments: {}
        }
      });

      expect(listAllFoodsMock).toHaveBeenCalledWith(1, 20);
      expect(response).toEqual({
        content: [{ type: 'text', text: JSON.stringify(mockFoodsResponse, null, 2) }]
      });
    });

    it('should handle API errors gracefully', async () => {
      listAllFoodsMock.mockRejectedValue(new Error('API error'));

      await expect(serverModule.callToolHandler({
        params: {
          name: 'list_all_foods',
          arguments: {}
        }
      })).rejects.toThrow(
        new McpError(ErrorCode.InternalError, "Failed to list foods: API error")
      );
    });
  });
});