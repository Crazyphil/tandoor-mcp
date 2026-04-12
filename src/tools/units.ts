/**
 * Unit tool handlers for Tandoor MCP Server
 *
 * Tools for listing, searching, and creating measurement units in Tandoor.
 *
 * This module uses the factory pattern to create handler functions
 * that are pre-bound to a TandoorApiClient instance.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TandoorApiClient } from '../api/client';
import { handleApiError, createEntityExistsError, isAxiosError, isEntityExistsError } from '../utils/errors';
import { createJsonResponse } from '../utils/response';
import { HTTP_CONFLICT } from '../constants';

/**
 * Handler function type for MCP tools
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolHandler<T = any> = (args: T, extra: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>;

/**
 * Unit tool handlers interface
 */
interface UnitToolHandlers {
  listAll: ToolHandler<{ page?: number; page_size?: number }>;
  search: ToolHandler<{ query: string }>;
  create: ToolHandler<{ name: string }>;
}

/**
 * Create unit tool handlers bound to a TandoorApiClient instance
 *
 * @param client - The TandoorApiClient to use for API calls
 * @returns Object containing listAll, search, and create handler functions
 */
export function createUnitToolHandlers(client: TandoorApiClient): UnitToolHandlers {
  /**
   * List all units with pagination
   */
  const listAll = async (
    args: { page?: number; page_size?: number },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { page = 1, page_size = 20 } = args;

    try {
      const result = await client.listAllUnits(page, page_size);
      return createJsonResponse(result);
    } catch (error) {
      throw handleApiError(error, 'unit');
    }
  };

  /**
   * Search for units by query string
   */
  const search = async (
    args: { query: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { query } = args;

    if (!query || query.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing required argument: query"
      );
    }

    try {
      const result = await client.searchUnit(query);
      return createJsonResponse(result);
    } catch (error) {
      throw handleApiError(error, 'unit');
    }
  };

  /**
   * Create a new unit in Tandoor
   *
   * Per MCP spec: First checks if unit already exists by name (case-insensitive).
   * If it exists, returns entity_already_exists error with the existing entity info.
   * If not, creates the new unit.
   */
  const create = async (
    args: { name: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    const { name } = args;

    if (!name || name.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing required argument: name"
      );
    }

    try {
      // Per spec: MUST check for existence first by searching
      const existingUnits = await client.searchUnit(name);
      const normalizedName = name.trim().toLowerCase();
      const existingUnit = existingUnits.find(
        u => u.name.toLowerCase() === normalizedName
      );

      if (existingUnit) {
        // Entity already exists - return error with existing entity info
        throw createEntityExistsError('unit', name, existingUnit.id);
      }

      // Entity doesn't exist - create it
      const result = await client.createUnit(name);
      return createJsonResponse(result);
    } catch (error) {
      // If it's already an entity_already_exists error, re-throw it directly
      if (isEntityExistsError(error)) {
        throw error;
      }
      // Handle 409 Conflict if Tandoor returns it in the future
      if (isAxiosError(error) && error.response?.status === HTTP_CONFLICT) {
        throw createEntityExistsError('unit', name);
      }
      throw handleApiError(error, 'unit', name);
    }
  };

  return {
    listAll,
    search,
    create
  };
}
