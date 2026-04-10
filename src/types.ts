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
  name?: string;
  instruction: string;
  order: number;
  ingredients: TandoorIngredient[];
}

export interface TandoorIngredient {
  amount?: number;
  unit?: number; // unit ID
  food: number; // food ID
  note?: string;
  order: number;
  is_header?: boolean;
  no_amount?: boolean;
}

export interface TandoorFood {
  id: number;
  name: string;
  plural_name?: string;
  substitute?: TandoorFood[];
}

export interface TandoorUnit {
  id: number;
  name: string;
}

export interface TandoorKeyword {
  id: number;
  name: string;
}

export interface TandoorRecipeResponse {
  id: number;
  name: string;
  description?: string;
  servings?: number;
  source_url?: string;
  image?: string;
  keywords?: TandoorKeyword[];
  steps?: TandoorStep[];
  ingredients?: TandoorIngredient[];
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
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
