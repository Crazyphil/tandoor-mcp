/** Schema.org Recipe types and Tandoor API response types */

export interface SchemaOrgRecipe {
  name: string;
  description?: string;
  recipeIngredient?: string[];
  recipeInstructions?: string[] | RecipeInstruction[];
  recipeYield?: string | number;
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  image?: string | string[];
  keywords?: string[];
  recipeCategory?: string;
  recipeCuisine?: string | string[];
  sourceUrl?: string;
  author?: {
    '@type'?: string;
    name?: string;
  };
  datePublished?: string;
  nutrition?: {
    '@type'?: string;
    calories?: string | number;
    carbohydrateContent?: string | number;
    proteinContent?: string | number;
    fatContent?: string | number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  /** Dietary restrictions (e.g., 'GlutenFreeDiet', 'VeganDiet', 'VegetarianDiet') */
  suitableForDiet?: string | string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface RecipeInstruction {
  '@type'?: string;
  name?: string;
  text?: string;
  url?: string;
  image?: string | Record<string, unknown>;
  /**
   * **Non-standard extension** - Per-step ingredient definitions.
   *
   * When provided, these ingredients are parsed and assigned to this specific step,
   * bypassing the Recipe-level `recipeIngredient` array.
   *
   * Format is identical to `recipeIngredient`: strings in format:
   *   "[amount] [unit] [food][, note]"
   *
   * If this property is used on any step, the Recipe-level `recipeIngredient` is ignored
   * for all steps. Steps without `recipeIngredient` will have empty ingredient lists.
   *
   * @see https://schema.org/recipeIngredient (Recipe-level property)
   */
  recipeIngredient?: string[] | string;
}

export interface TandoorRecipePayload {
  name: string;
  description?: string;
  servings?: number;
  servings_text?: string; // e.g., "servings", "cups", "loaves"
  source_url?: string;
  internal: boolean;
  steps: TandoorStep[];
  ingredients: TandoorIngredient[];
  keywords?: number[];
  nutrition?: Record<string, unknown>;
  working_time?: number; // prep time in minutes
  waiting_time?: number; // cooking/waiting time in minutes
}

export interface TandoorStep {
  id?: number; // Present in API response, optional for creation payload
  name?: string;
  instruction: string;
  order: number;
  ingredients: TandoorIngredient[];
}

export interface TandoorFood {
  id: number;
  name: string;
  plural_name?: string | null;
  url?: string;
  substitute?: TandoorFood[];
}

export interface TandoorUnit {
  id: number;
  name: string;
  plural_name?: string | null;
  description?: string | null;
}

/** Extended ingredient type for API responses with nested entities */
export interface TandoorIngredientResponse {
  id?: number;
  amount?: number;
  unit?: TandoorUnit;
  food: TandoorFood;
  note?: string | null;
  order: number;
  is_header?: boolean;
  no_amount?: boolean;
  original_text?: string | null;
}

/**
 * Tandoor ingredient for API payload (creation/update)
 *
 * Note: API requires both 'amount' and 'unit' fields always present.
 * When no_amount=true, set amount=0 and unit can be null or any valid unit ID.
 */
export interface TandoorIngredient {
  amount: number; // Always required - use 0 when no_amount=true
  unit: number | null; // unit ID - always required but can be null
  food: number; // food ID
  note?: string;
  order: number;
  is_header?: boolean;
  no_amount?: boolean;
  original_text?: string; // original input text for documentation
}

export interface TandoorKeyword {
  id: number;
  name: string;
  label?: string; // Read-only, computed from name
  description?: string;
  parent?: number | null;
  numchild?: number;
  created_at?: string;
  updated_at?: string;
}

/** Step structure as returned by Tandoor API (with resolved nested entities) */
export interface TandoorStepResponse {
  id: number;
  name: string;
  instruction: string;
  order: number;
  ingredients: TandoorIngredientResponse[];
  instructions_markdown?: string;
  time?: number;
  show_as_header?: boolean;
}

export interface TandoorRecipeResponse {
  id: number;
  name: string;
  description?: string | null;
  servings?: number;
  servings_text?: string;
  source_url?: string | null;
  image?: string | null;
  keywords?: TandoorKeyword[];
  steps?: TandoorStepResponse[];
  ingredients?: TandoorIngredientResponse[];
  internal?: boolean;
  working_time?: number;
  waiting_time?: number;
  created_by?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
  };
}

/** Raw Tandoor API paginated response (includes all fields from Tandoor) */
export interface TandoorPaginatedResponse<T> {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
  next?: string | null;
  previous?: string | null;
}

/** MCP-facing paginated response (filtered) */
export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  page: number;
}

export interface ImportResult {
  recipe_id: number;
  recipe_url: string;
  import_status: 'success' | 'error';
  mapping_notes: {
    image_status?: 'uploaded' | 'failed' | 'not_provided';
    field_transformations: string[];
    ignored_fields: string[];
    warnings: string[];
    error_code?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error_details?: any;
  };
}

export interface ValidationError {
  error_code: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
}

// ============================================================================
// MCP Response Types (filtered/transformed for agents)
// ============================================================================
// These types define the lean responses returned to MCP agents.
// They exclude Tandoor-internal fields, UI-only data, and fields not needed
// for the recipe import workflow.

/** Minimal food info for MCP agents */
export interface Food {
  id: number;
  name: string;
  plural_name?: string | null;
}

/** Minimal unit info for MCP agents */
export interface Unit {
  id: number;
  name: string;
  plural_name?: string | null;
}

/** Minimal keyword info for MCP agents */
export interface Keyword {
  id: number;
  name: string;
}

/** Minimal ingredient info for MCP agents (nested in steps) */
export interface Ingredient {
  id?: number;
  amount: number;
  unit: Unit | null;
  food: Food;
  note?: string | null;
  order: number;
  is_header?: boolean;
  no_amount?: boolean;
}

/** Minimal step info for MCP agents */
export interface Step {
  id: number;
  name: string;
  instruction: string;
  order: number;
  ingredients: Ingredient[];
}

/** Minimal recipe info for MCP agents */
export interface Recipe {
  id: number;
  name: string;
  description?: string | null;
  servings?: number;
  servings_text?: string;
  source_url?: string | null;
  image?: string | null;
  keywords?: Keyword[];
  steps?: Step[];
  working_time?: number;
  waiting_time?: number;
}
