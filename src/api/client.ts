import axios, { AxiosInstance } from 'axios';
import {
  TandoorFood,
  TandoorUnit,
  TandoorKeyword,
  TandoorRecipePayload,
  TandoorRecipeResponse,
  PaginatedResponse
} from '../types';

export interface TandoorClientConfig {
  baseUrl: string;
  token: string;
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
  async searchFood(query: string): Promise<TandoorFood[]> {
    const response = await this.client.get<PaginatedResponse<TandoorFood>>(
      '/api/food/',
      { params: { query } }
    );
    return response.data.results;
  }

  /** List all foods with pagination */
  async listAllFoods(page = 1, pageSize = 20): Promise<PaginatedResponse<TandoorFood>> {
    const response = await this.client.get<PaginatedResponse<TandoorFood>>(
      '/api/food/',
      { params: { page, page_size: pageSize } }
    );
    return response.data;
  }

  /** Create a new food */
  async createFood(name: string, pluralName?: string | null, url?: string): Promise<TandoorFood> {
    const payload: { name: string; plural_name?: string | null; url?: string } = { name };
    if (pluralName !== undefined) {
      payload.plural_name = pluralName;
    }
    if (url !== undefined) {
      payload.url = url;
    }
    const response = await this.client.post<TandoorFood>('/api/food/', payload);
    return response.data;
  }

  /** Search units by query */
  async searchUnit(query: string): Promise<TandoorUnit[]> {
    const response = await this.client.get<PaginatedResponse<TandoorUnit>>(
      '/api/unit/',
      { params: { query } }
    );
    return response.data.results;
  }

  /** List all units with pagination */
  async listAllUnits(page = 1, pageSize = 20): Promise<PaginatedResponse<TandoorUnit>> {
    const response = await this.client.get<PaginatedResponse<TandoorUnit>>(
      '/api/unit/',
      { params: { page, page_size: pageSize } }
    );
    return response.data;
  }

  /** Create a new unit */
  async createUnit(name: string, pluralName?: string | null, description?: string): Promise<TandoorUnit> {
    const payload: { name: string; plural_name?: string | null; description?: string } = { name };
    if (pluralName !== undefined) {
      payload.plural_name = pluralName;
    }
    if (description !== undefined) {
      payload.description = description;
    }
    const response = await this.client.post<TandoorUnit>('/api/unit/', payload);
    return response.data;
  }

  /** Search keywords by query */
  async searchKeyword(query: string): Promise<TandoorKeyword[]> {
    const response = await this.client.get<PaginatedResponse<TandoorKeyword>>(
      '/api/keyword/',
      { params: { query } }
    );
    return response.data.results;
  }

  /** List all keywords with pagination */
  async listAllKeywords(page = 1, pageSize = 20): Promise<PaginatedResponse<TandoorKeyword>> {
    const response = await this.client.get<PaginatedResponse<TandoorKeyword>>(
      '/api/keyword/',
      { params: { page, page_size: pageSize } }
    );
    return response.data;
  }

  /** Create a new keyword */
  async createKeyword(name: string): Promise<TandoorKeyword> {
    const response = await this.client.post<TandoorKeyword>(
      '/api/keyword/',
      { name }
    );
    return response.data;
  }

  /** Create a new recipe */
  async createRecipe(recipePayload: TandoorRecipePayload): Promise<TandoorRecipeResponse> {
    const response = await this.client.post<TandoorRecipeResponse>(
      '/api/recipe/',
      recipePayload
    );
    return response.data;
  }

  /** Get recipe by ID */
  async getRecipe(recipeId: number): Promise<TandoorRecipeResponse> {
    const response = await this.client.get<TandoorRecipeResponse>(
      `/api/recipe/${recipeId}/`
    );
    return response.data;
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
  }): Promise<PaginatedResponse<TandoorRecipeResponse>> {
    const response = await this.client.get<PaginatedResponse<TandoorRecipeResponse>>(
      '/api/recipe/',
      { params }
    );
    return response.data;
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
