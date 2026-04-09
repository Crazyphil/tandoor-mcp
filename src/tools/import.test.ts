import { RecipeImporter } from './import';
import { SchemaOrgRecipe } from '../types';

describe('RecipeImporter', () => {
  let importer: RecipeImporter;
  let mockClient: any;

  beforeEach(() => {
    // Create a simple mock
    mockClient = {
      listAllFoods: jest.fn().mockResolvedValue({
        results: [
          { id: 1, name: 'spaghetti', plural_name: 'spaghetti' },
          { id: 2, name: 'bacon', plural_name: 'bacon' },
          { id: 3, name: 'pasta', plural_name: 'pasta' },
          { id: 4, name: 'ingredient', plural_name: 'ingredients' }
        ],
        count: 4,
        page: 1,
        page_size: 100,
        has_next: false,
        has_previous: false
      }),
      listAllUnits: jest.fn().mockResolvedValue({
        results: [
          { id: 1, name: 'g' },
          { id: 2, name: 'cup' }
        ],
        count: 2,
        page: 1,
        page_size: 100,
        has_next: false,
        has_previous: false
      }),
      listAllKeywords: jest.fn().mockResolvedValue({
        results: [
          { id: 10, name: 'italian' },
          { id: 11, name: 'vegetarian' },
          { id: 12, name: 'main course' }
        ],
        count: 3,
        page: 1,
        page_size: 100,
        has_next: false,
        has_previous: false
      }),
      createRecipe: jest.fn().mockResolvedValue({
        id: 123,
        name: 'Test Recipe'
      })
    };

    importer = new RecipeImporter(mockClient as any);
  });

  describe('importRecipeFromJson', () => {
    it('should reject recipe without name', async () => {
      const recipe = {
        recipeIngredient: ['ingredient'],
        recipeInstructions: ['instruction']
      } as SchemaOrgRecipe;

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('error');
      expect(result.mapping_notes.error_code).toBe('invalid_payload');
    });

    it('should reject recipe without ingredients', async () => {
      const recipe = {
        name: 'Test',
        recipeInstructions: ['instruction']
      } as SchemaOrgRecipe;

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('error');
      expect(result.mapping_notes.error_code).toBe('invalid_payload');
    });

    it('should reject recipe without instructions', async () => {
      const recipe = {
        name: 'Test',
        recipeIngredient: ['ingredient']
      } as SchemaOrgRecipe;

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('error');
      expect(result.mapping_notes.error_code).toBe('invalid_payload');
    });

    it('should return ImportResult with valid structure', async () => {
      const recipe: SchemaOrgRecipe = {
        name: 'Pasta',
        recipeIngredient: ['spaghetti'],
        recipeInstructions: ['Cook']
      };

      const result = await importer.importRecipeFromJson(recipe);

      expect(result).toHaveProperty('import_status');
      expect(result).toHaveProperty('recipe_id');
      expect(result).toHaveProperty('mapping_notes');
      expect(['success', 'error']).toContain(result.import_status);
    });

    it('should handle API errors', async () => {
      mockClient.createRecipe.mockRejectedValue(new Error('API Error'));

      const recipe: SchemaOrgRecipe = {
        name: 'Pasta',
        recipeIngredient: ['spaghetti'],
        recipeInstructions: ['Cook']
      };

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('error');
      expect(result.mapping_notes).toHaveProperty('error_code');
    });

    it('should handle network failures gracefully', async () => {
      mockClient.listAllFoods.mockRejectedValue(new Error('Network error'));

      const recipe: SchemaOrgRecipe = {
        name: 'Pasta',
        recipeIngredient: ['spaghetti'],
        recipeInstructions: ['Cook']
      };

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('error');
      expect(result.mapping_notes).toHaveProperty('warnings');
    });

    it('should track ignored fields', async () => {
      const recipe: SchemaOrgRecipe = {
        name: 'Pasta',
        recipeIngredient: ['spaghetti'],
        recipeInstructions: ['Cook'],
        customField: 'ignored' as any
      };

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.mapping_notes).toHaveProperty('ignored_fields');
      expect(Array.isArray(result.mapping_notes.ignored_fields)).toBe(true);
    });
  });
});
