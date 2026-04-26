import {
  SchemaOrgRecipe,
  ImportResult,
  TandoorRecipePayload
} from '../types';
import { TandoorApiClient } from '../api/client';
import {
  validateRecipePayload,
  convertSchemaOrgToTandoorAsync,
  identifyIgnoredFields,
  EntityResolver
} from '../utils/normalize';
import {
  MISSING_ENTITIES,
  DUPLICATE_RECIPE,
  API_SCHEMA_MISMATCH,
  UNEXPECTED_ERROR
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
      // Step 2: Create an entity resolver that uses search instead of bulk fetching
      // This avoids timeouts when Tandoor has thousands of entities (e.g., 42k+ foods)
      const entityResolver = new EntityResolver(this.client);
      const warnings: string[] = [];

      // Step 3: Convert to Tandoor format using async entity resolution
      const { payload, field_transformations, missingEntities } = await convertSchemaOrgToTandoorAsync(
        recipe,
        entityResolver
      );

      // Step 4: Validation - check for missing entities from conversion
      if (missingEntities.foods.length > 0 || missingEntities.units.length > 0 || missingEntities.keywords.length > 0) {
        return {
          recipe_id: -1,
          recipe_url: '',
          import_status: 'error',
          mapping_notes: {
            field_transformations,
            ignored_fields: identifyIgnoredFields(recipe),
            warnings,
            error_code: MISSING_ENTITIES,
            error_details: {
              missing: {
                foods: missingEntities.foods,
                units: missingEntities.units,
                keywords: missingEntities.keywords
              },
              suggestions: [
                ...missingEntities.foods.map((f: string) => `Create food using: create_food(name: "${f}")`),
                ...missingEntities.units.map((u: string) => `Create unit using: create_unit(name: "${u}")`),
                ...missingEntities.keywords.map((k: string) => `Create keyword using: create_keyword(name: "${k}")`)
              ]
            }
          }
        };
      }

      // Step 5: Check for duplicate recipes (by name and source_url)
      const duplicateCheck = await this.checkForDuplicate(recipe, payload);
      if (duplicateCheck.isDuplicate) {
        return {
          recipe_id: duplicateCheck.existingRecipeId ?? -1,
          recipe_url: duplicateCheck.existingRecipeUrl ?? '',
          import_status: 'error',
          mapping_notes: {
            field_transformations,
            ignored_fields: identifyIgnoredFields(recipe),
            warnings: [`Recipe appears to be a duplicate of existing recipe (ID: ${duplicateCheck.existingRecipeId})`],
            error_code: DUPLICATE_RECIPE,
            error_details: {
              existing_recipe_id: duplicateCheck.existingRecipeId,
              existing_recipe_url: duplicateCheck.existingRecipeUrl,
              match_reason: duplicateCheck.matchReason
            }
          }
        };
      }

      // Step 6: Create recipe in Tandoor
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

      // Step 7: Upload image if available
      let imageStatus: 'uploaded' | 'failed' | 'not_provided' = 'not_provided';
      if (recipe.image) {
        imageStatus = await this.uploadImage(recipeId, recipe.image);
      }

      // Step 8: Return success
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
   * Check if a recipe with the same name already exists
   * Duplicate detection is based on exact name match only (case-insensitive).
   * Ingredient comparison is intentionally excluded as it is an unreliable heuristic.
   */
  private async checkForDuplicate(
    recipe: SchemaOrgRecipe,
    _payload: TandoorRecipePayload
  ): Promise<{
    isDuplicate: boolean;
    existingRecipeId?: number;
    existingRecipeUrl?: string;
    matchReason?: string;
  }> {
    try {
      // Check for duplicate by name only
      // Only proceed if we have a name to search
      if (!recipe.name || recipe.name.trim() === '') {
        return { isDuplicate: false };
      }

      // Search for potential duplicates by name
      const searchResult = await this.client.searchRecipes({
        query: recipe.name,
        page: 1,
        page_size: 50
      });

      // If no results, no duplicate
      if (searchResult.results.length === 0) {
        return { isDuplicate: false };
      }

      // Check for exact name match (case-insensitive)
      const normalizedNewName = recipe.name.toLowerCase().trim();
      for (const existingRecipe of searchResult.results) {
        if (existingRecipe.name.toLowerCase() === normalizedNewName) {
          return {
            isDuplicate: true,
            existingRecipeId: existingRecipe.id,
            existingRecipeUrl: `${this.client['client'].defaults.baseURL}/recipe/${existingRecipe.id}/`,
            matchReason: 'name'
          };
        }
      }

      // No duplicate found
      return { isDuplicate: false };
    } catch {
      // If duplicate check fails, allow the import to proceed
      // Better to have a potential duplicate than block valid imports
      return { isDuplicate: false };
    }
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
