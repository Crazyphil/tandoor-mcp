import axios, { AxiosInstance } from 'axios';
import {
  TandoorFood,
  TandoorUnit,
  TandoorKeyword,
  TandoorRecipePayload,
  TandoorRecipeResponse,
  TandoorPaginatedResponse,
  TandoorIngredientResponse,
  TandoorStepResponse,
  Food,
  Unit,
  Keyword,
  Recipe,
  Ingredient,
  Step,
  PaginatedResponse
} from '../types';

export interface TandoorClientConfig {
  baseUrl: string;
  token: string;
}

// Generic helper to transform Tandoor paginated responses to MCP paginated responses
function transformPaginatedResponse<T, U>(
  response: TandoorPaginatedResponse<T>,
  transformItem: (item: T) => U
): PaginatedResponse<U> {
  return {
    results: response.results.map(transformItem),
    count: response.count,
    page: response.page
  };
}

// Transformation functions to filter Tandoor API responses to MCP-facing types

function transformFood(tandoorFood: TandoorFood): Food {
  return {
    id: tandoorFood.id,
    name: tandoorFood.name,
    plural_name: tandoorFood.plural_name
  };
}

function transformUnit(tandoorUnit: TandoorUnit): Unit {
  return {
    id: tandoorUnit.id,
    name: tandoorUnit.name,
    plural_name: tandoorUnit.plural_name
  };
}

function transformKeyword(tandoorKeyword: TandoorKeyword): Keyword {
  return {
    id: tandoorKeyword.id,
    name: tandoorKeyword.name
  };
}

function transformIngredient(tandoorIngredient: TandoorIngredientResponse): Ingredient {
  return {
    id: tandoorIngredient.id,
    amount: tandoorIngredient.amount ?? 0,
    unit: tandoorIngredient.unit ? transformUnit(tandoorIngredient.unit) : null,
    food: transformFood(tandoorIngredient.food),
    note: tandoorIngredient.note,
    order: tandoorIngredient.order,
    is_header: tandoorIngredient.is_header,
    no_amount: tandoorIngredient.no_amount
  };
}

function transformStep(tandoorStep: TandoorStepResponse): Step {
  return {
    id: tandoorStep.id,
    name: tandoorStep.name,
    instruction: tandoorStep.instruction,
    order: tandoorStep.order,
    ingredients: tandoorStep.ingredients.map(transformIngredient)
  };
}

function transformRecipe(tandoorRecipe: TandoorRecipeResponse): Recipe {
  return {
    id: tandoorRecipe.id,
    name: tandoorRecipe.name,
    description: tandoorRecipe.description,
    servings: tandoorRecipe.servings,
    servings_text: tandoorRecipe.servings_text,
    source_url: tandoorRecipe.source_url,
    image: tandoorRecipe.image,
    keywords: tandoorRecipe.keywords?.map(transformKeyword),
    steps: tandoorRecipe.steps?.map(transformStep),
    working_time: tandoorRecipe.working_time,
    waiting_time: tandoorRecipe.waiting_time
  };
}

export class TandoorApiClient {
  private client: AxiosInstance;

  constructor(config: TandoorClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /** Search foods by query */
  async searchFood(query: string): Promise<Food[]> {
    const response = await this.client.get<TandoorPaginatedResponse<TandoorFood>>(
      '/api/food/',
      { params: { query } }
    );
    return response.data.results.map(transformFood);
  }

  /** List all foods with pagination */
  async listAllFoods(page = 1, pageSize = 20): Promise<PaginatedResponse<Food>> {
    const response = await this.client.get<TandoorPaginatedResponse<TandoorFood>>(
      '/api/food/',
      { params: { page, page_size: pageSize } }
    );
    return transformPaginatedResponse(response.data, transformFood);
  }

  /** Create a new food */
  async createFood(name: string, pluralName?: string | null): Promise<Food> {
    const payload: { name: string; plural_name?: string | null } = { name };
    if (pluralName !== undefined) {
      payload.plural_name = pluralName;
    }
    const response = await this.client.post<TandoorFood>('/api/food/', payload);
    return transformFood(response.data);
  }

  /** Search units by query */
  async searchUnit(query: string): Promise<Unit[]> {
    const response = await this.client.get<TandoorPaginatedResponse<TandoorUnit>>(
      '/api/unit/',
      { params: { query } }
    );
    return response.data.results.map(transformUnit);
  }

  /** List all units with pagination */
  async listAllUnits(page = 1, pageSize = 20): Promise<PaginatedResponse<Unit>> {
    const response = await this.client.get<TandoorPaginatedResponse<TandoorUnit>>(
      '/api/unit/',
      { params: { page, page_size: pageSize } }
    );
    return transformPaginatedResponse(response.data, transformUnit);
  }

  /** Create a new unit */
  async createUnit(name: string, pluralName?: string | null): Promise<Unit> {
    const payload: { name: string; plural_name?: string | null } = { name };
    if (pluralName !== undefined) {
      payload.plural_name = pluralName;
    }
    const response = await this.client.post<TandoorUnit>('/api/unit/', payload);
    return transformUnit(response.data);
  }

  /** Search keywords by query */
  async searchKeyword(query: string): Promise<Keyword[]> {
    const response = await this.client.get<TandoorPaginatedResponse<TandoorKeyword>>(
      '/api/keyword/',
      { params: { query } }
    );
    return response.data.results.map(transformKeyword);
  }

  /** List all keywords with pagination */
  async listAllKeywords(page = 1, pageSize = 20): Promise<PaginatedResponse<Keyword>> {
    const response = await this.client.get<TandoorPaginatedResponse<TandoorKeyword>>(
      '/api/keyword/',
      { params: { page, page_size: pageSize } }
    );
    return transformPaginatedResponse(response.data, transformKeyword);
  }

  /** Create a new keyword */
  async createKeyword(name: string): Promise<Keyword> {
    const response = await this.client.post<TandoorKeyword>(
      '/api/keyword/',
      { name }
    );
    return transformKeyword(response.data);
  }

  /** Create a new recipe */
  async createRecipe(recipePayload: TandoorRecipePayload): Promise<Recipe> {
    const response = await this.client.post<TandoorRecipeResponse>(
      '/api/recipe/',
      recipePayload
    );
    return transformRecipe(response.data);
  }

  /** Get recipe by ID */
  async getRecipe(recipeId: number): Promise<Recipe> {
    const response = await this.client.get<TandoorRecipeResponse>(
      `/api/recipe/${recipeId}/`
    );
    return transformRecipe(response.data);
  }

  /** Search recipes with filters
   * Simplified parameter set for practical agent use cases.
   * See Tandoor API docs for underlying parameter descriptions.
   */
  async searchRecipes(params: {
    // Query and basic filters
    query?: string;
    
    // Food filters (ID arrays) - use search_food() to find IDs
    foods?: number[];         // OR logic - match if any food is in recipe
    foods_and?: number[];   // AND logic - match if all foods are in recipe
    foods_or_not?: number[]; // OR logic - exclude if any food is in recipe
    
    // Keyword filters (ID arrays) - use search_keyword() to find IDs
    keywords?: number[];         // OR logic - match if any keyword is in recipe
    keywords_and?: number[];   // AND logic - match if all keywords are in recipe
    keywords_or_not?: number[]; // OR logic - exclude if any keyword is in recipe
    
    // Rating filters
    rating_gte?: number;  // Minimum rating (0-5)
    
    // Times cooked filters
    timescooked_gte?: number;  // Minimum times cooked
    
    // Boolean flags
    makenow?: boolean;  // Only recipes with stocked/on-hand ingredients
    
    // Sorting
    sort_order?: 'score' | '-score' | 'name' | '-name' | 'created_at' | '-created_at' | 
                  'lastcooked' | '-lastcooked' | 'rating' | '-rating' | 'times_cooked' | 
                  '-times_cooked' | 'lastviewed' | '-lastviewed' | string;
    
    // Pagination
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Recipe>> {
    const response = await this.client.get<TandoorPaginatedResponse<TandoorRecipeResponse>>(
      '/api/recipe/',
      { params }
    );
    return transformPaginatedResponse(response.data, transformRecipe);
  }

  /** Upload image to recipe
   * Note: Axios automatically sets Content-Type with boundary for FormData
   */
  async uploadRecipeImage(recipeId: number, imageUrl: string): Promise<void> {
    const formData = new FormData();
    const imageBlob = await this.downloadImage(imageUrl);
    formData.append('image', imageBlob);

    // Do NOT manually set Content-Type - axios handles this automatically with proper boundary
    await this.client.put(`/api/recipe/${recipeId}/image/`, formData);
  }

  /** Download image from URL */
  private async downloadImage(url: string): Promise<Blob> {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer'
    });
    return new Blob([response.data]);
  }
}
