import {
  SchemaOrgRecipe,
  ImportResult,
  TandoorFood,
  TandoorUnit,
  TandoorKeyword
} from '../types';
import { TandoorApiClient } from '../api/client';
import {
  validateRecipePayload,
  convertSchemaOrgToTandoor,
  identifyIgnoredFields
} from '../utils/normalize';
import {
  MISSING_ENTITIES,
  API_SCHEMA_MISMATCH,
  UNEXPECTED_ERROR,
  ENTITY_FETCH_PAGE_SIZE
} from '../constants';

export class RecipeImporter {
  constructor(private client: TandoorApiClient) {}

  /**
   * Import a recipe from schema.org JSON format into Tandoor
   * 
   * Process:
   * 1. Validate recipe structure
   * 2. Fetch all foods, units, keywords from Tandoor to build entity maps
   * 3. Convert schema.org format to Tandoor format
   * 4. Validate all entities (food, unit, keyword) exist
   * 5. Create recipe in Tandoor
   * 6. Upload image if provided
   * 7. Return result with mapping notes
   */
  async importRecipeFromJson(recipe: SchemaOrgRecipe): Promise<ImportResult> {
    // Step 1: Basic validation
    const validationError = validateRecipePayload(recipe);
    if (validationError) {
      return {
        recipe_id: -1,
        recipe_url: '',
        import_status: 'error',
        mapping_notes: {
          field_transformations: [],
          ignored_fields: [],
          warnings: [],
          error_code: validationError.error_code,
          error_details: validationError.details
        }
      };
    }

    try {
      // Step 2: Fetch entities and build maps
      const entityMapResult = await this.buildEntityMaps();
      if (!entityMapResult.success) {
        return {
          recipe_id: -1,
          recipe_url: '',
          import_status: 'error',
          mapping_notes: {
            field_transformations: [],
            ignored_fields: [],
            warnings: entityMapResult.warnings
          }
        };
      }

      const entityMap = entityMapResult.entityMap!;

      // Step 3: Convert to Tandoor format
      const { payload, warnings, field_transformations } = convertSchemaOrgToTandoor(
        recipe,
        entityMap
      );

      // Step 4: Validation - check all referenced entities exist
      const missingEntities = this.validateEntitiesExist(payload, entityMap);
      if (missingEntities.length > 0) {
        return {
          recipe_id: -1,
          recipe_url: '',
          import_status: 'error',
          mapping_notes: {
            field_transformations,
            ignored_fields: identifyIgnoredFields(recipe),
            warnings: [...warnings, ...missingEntities],
            error_code: MISSING_ENTITIES,
            error_details: { missing: missingEntities }
          }
        };
      }

      // Step 5: Create recipe in Tandoor
      let recipeId: number;
      try {
        const createdRecipe = await this.client.createRecipe(payload);
        recipeId = createdRecipe.id;
      } catch (error: unknown) {
        const errorBody = (error as { response?: { data?: unknown }; message?: string }).response?.data || (error as Error).message;
        return {
          recipe_id: -1,
          recipe_url: '',
          import_status: 'error',
          mapping_notes: {
            field_transformations,
            ignored_fields: identifyIgnoredFields(recipe),
            warnings,
            error_code: API_SCHEMA_MISMATCH,
            error_details: errorBody
          }
        };
      }

      const recipeUrl = `${this.client['client'].defaults.baseURL}/recipe/${recipeId}/`;

      // Step 6: Upload image if available
      let imageStatus: 'uploaded' | 'failed' | 'not_provided' = 'not_provided';
      if (recipe.image) {
        imageStatus = await this.uploadImage(recipeId, recipe.image);
      }

      // Step 7: Return success
      return {
        recipe_id: recipeId,
        recipe_url: recipeUrl,
        import_status: 'success',
        mapping_notes: {
          image_status: imageStatus,
          field_transformations,
          ignored_fields: identifyIgnoredFields(recipe),
          warnings
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        recipe_id: -1,
        recipe_url: '',
        import_status: 'error',
        mapping_notes: {
          field_transformations: [],
          ignored_fields: identifyIgnoredFields(recipe),
          warnings: ['Unexpected error during import: ' + errorMessage],
          error_code: UNEXPECTED_ERROR,
          error_details: errorMessage
        }
      };
    }
  }

  /**
   * Build maps of entity names to IDs for efficient lookup
   *
   * Fetches all foods, units, and keywords in parallel using Promise.all
   * for optimal performance. Each entity type is paginated through sequentially.
   *
   * @returns Promise resolving to success status, entity maps, and any warnings
   */
  private async buildEntityMaps(): Promise<{
    success: boolean;
    entityMap?: {
      foodIdMap: Map<string, number>;
      unitIdMap: Map<string, number>;
      keywordIdMap: Map<string, number>;
    };
    warnings: string[];
  }> {
    try {
      const warnings: string[] = [];

      // Fetch all entity types in parallel for optimal performance
      const [foodsResult, unitsResult, keywordsResult] = await Promise.all([
        this.fetchAllFoods(warnings),
        this.fetchAllUnits(warnings),
        this.fetchAllKeywords(warnings)
      ]);

      // Build maps from fetched entities
      const foodIdMap = new Map(foodsResult.map(f => [f.name.toLowerCase(), f.id]));
      const unitIdMap = new Map(unitsResult.map(u => [u.name.toLowerCase(), u.id]));
      const keywordIdMap = new Map(keywordsResult.map(k => [k.name.toLowerCase(), k.id]));

      return {
        success: true,
        entityMap: { foodIdMap, unitIdMap, keywordIdMap },
        warnings
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        warnings: ['Fatal error building entity maps: ' + msg]
      };
    }
  }

  /**
   * Fetch all foods with pagination
   * @param warnings - Array to collect warning messages
   * @returns Array of all fetched foods
   */
  private async fetchAllFoods(warnings: string[]): Promise<TandoorFood[]> {
    const allFoods: TandoorFood[] = [];
    let page = 1;

    try {
      let hasMore = true;
      while (hasMore) {
        const response = await this.client.listAllFoods(page, ENTITY_FETCH_PAGE_SIZE);
        allFoods.push(...response.results);
        hasMore = response.has_next;
        page++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      warnings.push('Failed to fetch foods list: ' + msg);
    }

    return allFoods;
  }

  /**
   * Fetch all units with pagination
   * @param warnings - Array to collect warning messages
   * @returns Array of all fetched units
   */
  private async fetchAllUnits(warnings: string[]): Promise<TandoorUnit[]> {
    const allUnits: TandoorUnit[] = [];
    let page = 1;

    try {
      let hasMore = true;
      while (hasMore) {
        const response = await this.client.listAllUnits(page, ENTITY_FETCH_PAGE_SIZE);
        allUnits.push(...response.results);
        hasMore = response.has_next;
        page++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      warnings.push('Failed to fetch units list: ' + msg);
    }

    return allUnits;
  }

  /**
   * Fetch all keywords with pagination
   * @param warnings - Array to collect warning messages
   * @returns Array of all fetched keywords
   */
  private async fetchAllKeywords(warnings: string[]): Promise<TandoorKeyword[]> {
    const allKeywords: TandoorKeyword[] = [];
    let page = 1;

    try {
      let hasMore = true;
      while (hasMore) {
        const response = await this.client.listAllKeywords(page, ENTITY_FETCH_PAGE_SIZE);
        allKeywords.push(...response.results);
        hasMore = response.has_next;
        page++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      warnings.push('Failed to fetch keywords list: ' + msg);
    }

    return allKeywords;
  }

  /**
   * Validate that all entities referenced in the recipe exist in Tandoor
   */
  private validateEntitiesExist(
    payload: ReturnType<typeof convertSchemaOrgToTandoor>['payload'],
    entityMap: {
      foodIdMap: Map<string, number>;
      unitIdMap: Map<string, number>;
      keywordIdMap: Map<string, number>;
    }
  ): string[] {
    const missing: string[] = [];

    // Check foods
    for (const ingredient of payload.ingredients) {
      const foodExists = Array.from(entityMap.foodIdMap.values()).includes(ingredient.food);
      if (!foodExists) {
        missing.push(`Food ID ${ingredient.food} does not exist`);
      }
    }

    // Check units
    for (const ingredient of payload.ingredients) {
      if (ingredient.unit) {
        const unitExists = Array.from(entityMap.unitIdMap.values()).includes(ingredient.unit);
        if (!unitExists) {
          missing.push(`Unit ID ${ingredient.unit} does not exist`);
        }
      }
    }

    // Check keywords
    if (payload.keywords) {
      for (const keywordId of payload.keywords) {
        const keywordExists = Array.from(entityMap.keywordIdMap.values()).includes(keywordId);
        if (!keywordExists) {
          missing.push(`Keyword ID ${keywordId} does not exist`);
        }
      }
    }

    return missing;
  }

  /**
   * Upload image to the imported recipe
   */
  private async uploadImage(
    recipeId: number,
    image: string | string[]
  ): Promise<'uploaded' | 'failed' | 'not_provided'> {
    try {
      const imageUrl = typeof image === 'string' ? image : image[0];
      if (!imageUrl) return 'not_provided';

      await this.client.uploadRecipeImage(recipeId, imageUrl);
      return 'uploaded';
    } catch {
      // Image upload failed, return status
      return 'failed';
    }
  }
}
