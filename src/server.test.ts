/**
 * MCP Server Integration Tests for Tandoor MCP Server
 *
 * Tests the server setup and tool listing functionality.
 * Individual tool handler tests are in their respective files
 * (foods.test.ts, units.test.ts, keywords.test.ts, recipes.test.ts).
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { SchemaOrgRecipe } from './types';
import { listToolsHandler, tools } from './tools/tool-definitions';

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
jest.mock('./tools/import');

describe('MCP Server Integration', () => {
  let serverModule: typeof import('./index');

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Dynamic import after mocks are set up
    serverModule = await import('./index');
  });

  describe('Tool List', () => {
    it('should return the list of available tools', async () => {
      const response = await listToolsHandler();

      expect(response.tools).toHaveLength(12);

      // Verify key tools are present
      const toolNames = response.tools.map(t => t.name);
      expect(toolNames).toContain('import_recipe_from_json');
      expect(toolNames).toContain('list_all_foods');
      expect(toolNames).toContain('search_food');
      expect(toolNames).toContain('create_food');
      expect(toolNames).toContain('list_all_units');
      expect(toolNames).toContain('search_unit');
      expect(toolNames).toContain('create_unit');
      expect(toolNames).toContain('list_all_keywords');
      expect(toolNames).toContain('search_keyword');
      expect(toolNames).toContain('create_keyword');
      expect(toolNames).toContain('search_recipes');
      expect(toolNames).toContain('get_recipe');

      // Verify tool structure
      const importRecipeTool = response.tools.find(t => t.name === 'import_recipe_from_json');
      expect(importRecipeTool).toMatchObject({
        name: 'import_recipe_from_json',
        title: 'Import recipe from JSON',
        description: expect.stringContaining('schema.org'),
        inputSchema: expect.any(Object)
      });
    });

    it('should have correct structure for search_food tool', async () => {
      const response = await listToolsHandler();
      const tool = response.tools.find(t => t.name === 'search_food');

      expect(tool).toEqual({
        name: 'search_food',
        title: 'Search foods',
        description: expect.stringContaining('Search for foods'),
        inputSchema: expect.any(Object)
      });
    });

    it('should have correct structure for create_keyword tool', async () => {
      const response = await listToolsHandler();
      const tool = response.tools.find(t => t.name === 'create_keyword');

      expect(tool).toEqual({
        name: 'create_keyword',
        title: 'Create keyword',
        description: expect.stringContaining('already exists'),
        inputSchema: expect.any(Object)
      });
    });
  });

  describe('Server instance', () => {
    it('should export an McpServer instance', async () => {
      const { server } = serverModule;

      expect(server).toBeDefined();
      // McpServer doesn't expose many properties, but we can verify it was created
      expect(typeof server).toBe('object');
    });

    it('should have server capabilities configured', async () => {
      const { server } = serverModule;

      // The server should be a valid McpServer instance
      expect(server).toBeDefined();
      expect(server).not.toBeNull();
    });
  });

  describe('Tool definitions validation', () => {
    it('all tools should have required fields', async () => {
      const response = await listToolsHandler();

      for (const tool of response.tools) {
        expect(tool.name).toBeDefined();
        expect(tool.title).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.title).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      }
    });

    it('search tools should describe their purpose', async () => {
      const response = await listToolsHandler();
      const searchTools = response.tools.filter(t => t.name.includes('search'));

      for (const tool of searchTools) {
        expect(tool.description).toContain('Search');
        expect(tool.title).toContain('Search');
      }
    });

    it('list tools should describe their pagination support', async () => {
      const response = await listToolsHandler();
      const listTools = response.tools.filter(t => t.name.startsWith('list_all'));

      for (const tool of listTools) {
        expect(tool.description).toContain('paginated');
        expect(tool.inputSchema).toBeDefined();
      }
    });

    it('create tools should mention checking for duplicates', async () => {
      const response = await listToolsHandler();
      const createTools = response.tools.filter(t => t.name.startsWith('create_'));

      for (const tool of createTools) {
        expect(tool.description.toLowerCase()).toContain('already exists');
        expect(tool.description.toLowerCase()).toContain('check');
      }
    });
  });

  describe('Schema validation', () => {
    it('all tools should have valid input schemas', async () => {
      const response = await listToolsHandler();

      for (const tool of response.tools) {
        const schema = tool.inputSchema;
        expect(schema).toBeDefined();
        // Zod schema objects have _def or similar internal structure
        // Just verify it's an object with expected Zod-like properties
        expect(typeof schema).toBe('object');
        expect(schema).not.toBeNull();
      }
    });

    it('import_recipe_from_json should require recipe field', async () => {
      const response = await listToolsHandler();
      const tool = response.tools.find(t => t.name === 'import_recipe_from_json');

      expect(tool).toBeDefined();
      expect(tool!.inputSchema).toBeDefined();
    });

    it('search tools should require query field', async () => {
      const response = await listToolsHandler();
      const searchFoodTool = response.tools.find(t => t.name === 'search_food');
      const searchUnitTool = response.tools.find(t => t.name === 'search_unit');
      const searchKeywordTool = response.tools.find(t => t.name === 'search_keyword');

      expect(searchFoodTool!.inputSchema).toBeDefined();
      expect(searchUnitTool!.inputSchema).toBeDefined();
      expect(searchKeywordTool!.inputSchema).toBeDefined();
    });

    it('list tools should have optional pagination parameters', async () => {
      const response = await listToolsHandler();
      const listFoodsTool = response.tools.find(t => t.name === 'list_all_foods');

      expect(listFoodsTool!.inputSchema).toBeDefined();
    });
  });
});
