/**
 * Keyword tool handlers for Tandoor MCP Server
 * 
 * Tools for listing, searching, and creating keywords in Tandoor.
 */

import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { TandoorApiClient } from "../api/client";

export const createKeywordToolHandlers = (client: TandoorApiClient) => {
  const listAllKeywordsTool = async (
    args: { page?: number; page_size?: number },
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void _extra;
    const { page = 1, page_size = 20 } = args;

    try {
      const result = await client.listAllKeywords(page, page_size);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list keywords: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const searchKeywordTool = async (
    args: { query: string },
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void _extra;
    const { query } = args;

    if (!query || query.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing required argument: query"
      );
    }

    try {
      const result = await client.searchKeyword(query);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to search keywords: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const createKeywordTool = async (
    args: { name: string },
    _extra: unknown
  ): Promise<{ content: { type: 'text'; text: string }[] }> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void _extra;
    const { name } = args;

    if (!name || name.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing required argument: name"
      );
    }

    try {
      const result = await client.createKeyword(name);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      // Check if it's an "already exists" error (409 Conflict)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        if (axiosError.response?.status === 409) {
          throw new McpError(
            ErrorCode.InvalidParams,
            JSON.stringify({
              error_code: "entity_already_exists",
              details: {
                entity_type: "keyword",
                entity_name: name
              },
              suggestions: [
                `Keyword '${name}' already exists in database`,
                "Use search_keyword() or list_all_keywords() to verify existence before calling create_keyword()",
                "If you need to use this entity, reference its existing ID"
              ]
            })
          );
        }
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create keyword: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  return {
    listAllKeywordsTool,
    searchKeywordTool,
    createKeywordTool
  };
};
