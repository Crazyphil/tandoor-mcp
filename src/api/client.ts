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
   * Full parameter set from Tandoor API. All parameters are optional.
   * See Tandoor API docs for parameter descriptions.
   */
  async searchRecipes(params: {
    // Query and basic filters
    query?: string;
    
    // Food filters (ID arrays)
    foods?: number[];
    foods_or?: number[];
    foods_and?: number[];
    foods_or_not?: number[];
    foods_and_not?: number[];
    
    // Keyword filters (ID arrays)
    keywords?: number[];
    keywords_or?: number[];
    keywords_and?: number[];
    keywords_or_not?: number[];
    keywords_and_not?: number[];
    
    // Book filters
    books?: number[];
    
    // User filter
    createdby?: number;
    
    // Rating filters
    rating?: number;
    rating_gte?: number;
    rating_lte?: number;
    
    // Times cooked filters
    timescooked?: number;
    timescooked_gte?: number;
    timescooked_lte?: number;
    
    // Date filters
    createdon_gte?: string;
    createdon_lte?: string;
    lastcooked_gte?: string;
    lastcooked_lte?: string;
    
    // Sorting
    sort_order?: 'score' | '-score' | 'name' | '-name' | 'created_at' | '-created_at' | 
                  'lastcooked' | '-lastcooked' | 'rating' | '-rating' | 'times_cooked' | 
                  '-times_cooked' | 'lastviewed' | '-lastviewed' | string;
    
    // Boolean flags
    new?: boolean;
    makenow?: boolean;
    include_children?: boolean;
    
    // Pagination
    page?: number;
    page_size?: number;
    
    // Recent recipes
    num_recent?: number;
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
