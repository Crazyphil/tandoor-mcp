/**
 * Constants module for Tandoor MCP Server
 *
 * Centralizes magic values, error codes, and default settings.
 * This makes the code self-documenting and easier to maintain.
 */

// ============================================================================
// Error Codes
// ============================================================================

/** Invalid or malformed input payload */
export const INVALID_PAYLOAD = 'invalid_payload';

/** Referenced entities (foods, units, keywords) do not exist */
export const MISSING_ENTITIES = 'missing_entities';

/** Attempting to create an entity that already exists (409 Conflict) */
export const ENTITY_ALREADY_EXISTS = 'entity_already_exists';

/** API response schema doesn't match expected structure */
export const API_SCHEMA_MISMATCH = 'api_schema_mismatch';

/** Authentication failed (invalid token or missing credentials) */
export const AUTH_FAILED = 'auth_failed';

/** Recipe already exists in the database */
export const DUPLICATE_RECIPE = 'duplicate_recipe';

/** Resource not found (404) */
export const NOT_FOUND = 'not_found';

/** Unexpected or catch-all error */
export const UNEXPECTED_ERROR = 'unexpected_error';

/** Error codes used in MCP error responses */
export const ErrorCodes = {
  INVALID_PAYLOAD,
  MISSING_ENTITIES,
  ENTITY_ALREADY_EXISTS,
  API_SCHEMA_MISMATCH,
  AUTH_FAILED,
  DUPLICATE_RECIPE,
  NOT_FOUND,
  UNEXPECTED_ERROR
} as const;

/** Type for error code values */
export type ErrorCodeType = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// Pagination & Fetching Defaults
// ============================================================================

/** Default number of items per page in list responses */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum allowed page size for API requests */
export const MAX_PAGE_SIZE = 100;

/** Page size for bulk entity fetching (buildEntityMaps) */
export const ENTITY_FETCH_PAGE_SIZE = 100;

// ============================================================================
// HTTP Status Codes
// ============================================================================

/** HTTP 409 Conflict - entity already exists */
export const HTTP_CONFLICT = 409;

/** HTTP 401 Unauthorized - authentication failed */
export const HTTP_UNAUTHORIZED = 401;

/** HTTP 403 Forbidden - insufficient permissions */
export const HTTP_FORBIDDEN = 403;

/** HTTP 404 Not Found - resource doesn't exist */
export const HTTP_NOT_FOUND = 404;

/** HTTP 500 Internal Server Error */
export const HTTP_INTERNAL_ERROR = 500;

// ============================================================================
// Caching Configuration (Optional)
// ============================================================================

/** Default TTL for entity cache in milliseconds (5 minutes) */
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/** Maximum number of items in the cache */
export const MAX_CACHE_SIZE = 1000;

// ============================================================================
// Recipe Import Configuration
// ============================================================================

/** Maximum number of ingredients to process in a single recipe */
export const MAX_INGREDIENTS = 100;

/** Maximum number of instructions/steps to process */
export const MAX_STEPS = 100;

/** Maximum image download size in bytes (10MB) */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// ============================================================================
// Retry Configuration
// ============================================================================

/** Maximum number of retries for failed API requests */
export const MAX_RETRIES = 3;

/** Base delay in milliseconds for exponential backoff */
export const RETRY_BASE_DELAY_MS = 1000;

/** Maximum delay between retries in milliseconds */
export const RETRY_MAX_DELAY_MS = 10000;
