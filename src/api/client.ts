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
  async createFood(name: string, pluralName?: string): Promise<TandoorFood> {
    const response = await this.client.post<TandoorFood>(
      '/api/food/',
      { name, plural_name: pluralName }
    );
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
  async createUnit(name: string): Promise<TandoorUnit> {
    const response = await this.client.post<TandoorUnit>(
      '/api/unit/',
      { name }
    );
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

  /** Search recipes with filters */
  async searchRecipes(params: {
    query?: string;
    foods?: number[];
    keywords?: number[];
    books?: number[];
    createdby?: number;
    rating_gte?: number;
    rating_lte?: number;
    timescooked_gte?: number;
    timescooked_lte?: number;
    createdon_gte?: string;
    createdon_lte?: string;
    sort_order?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<TandoorRecipeResponse>> {
    const response = await this.client.get<PaginatedResponse<TandoorRecipeResponse>>(
      '/api/recipe/',
      { params }
    );
    return response.data;
  }

  /** Upload image to recipe */
  async uploadRecipeImage(recipeId: number, imageUrl: string): Promise<void> {
    const formData = new FormData();
    const imageBlob = await this.downloadImage(imageUrl);
    formData.append('image', imageBlob);

    await this.client.put(
      `/api/recipe/${recipeId}/image/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  }

  /** Download image from URL */
  private async downloadImage(url: string): Promise<Blob> {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer'
    });
    return new Blob([response.data]);
  }
}
