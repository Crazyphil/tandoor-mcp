import { RecipeImporter } from './import';
import { SchemaOrgRecipe } from '../types';

describe('RecipeImporter', () => {
  let importer: RecipeImporter;
  let mockClient: any;

  beforeEach(() => {
    // Create a simple mock
    mockClient = {
      client: {
        defaults: {
          baseURL: 'https://tandoor.example.com'
        }
      },
      listAllFoods: jest.fn().mockResolvedValue({
        results: [
          { id: 1, name: 'spaghetti', plural_name: 'spaghetti' },
          { id: 2, name: 'bacon', plural_name: 'bacon' },
          { id: 3, name: 'pasta', plural_name: 'pasta' },
          { id: 4, name: 'ingredient', plural_name: 'ingredients' },
          { id: 5, name: 'onion', plural_name: 'onions' },
          { id: 6, name: 'tomato', plural_name: 'tomatoes' },
          { id: 7, name: 'salt', plural_name: 'salt' }
        ],
        count: 7,
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
      importer = new RecipeImporter(mockClient as any);
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

    it('should fail with missing_entities error when food list cannot be fetched', async () => {
      const failingMockClient = {
        ...mockClient,
        listAllFoods: jest.fn().mockRejectedValue(new Error('Network error'))
      };
      importer = new RecipeImporter(failingMockClient as any);

      const recipe: SchemaOrgRecipe = {
        name: 'Pasta',
        recipeIngredient: ['spaghetti'],
        recipeInstructions: ['Cook']
      };

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('error');
      expect(result.mapping_notes.error_code).toBe('missing_entities');
      // Should report missing food because it couldn't be verified against empty/failed fetch
      expect(result.mapping_notes.error_details.missing.foods).toContain('spaghetti');
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

    it('should parse ingredients with comma-separated notes', async () => {
      const recipe: SchemaOrgRecipe = {
        name: 'Tomato Pasta',
        recipeIngredient: ['1 onion, chopped', '2 cup tomato', 'salt'],
        recipeInstructions: ['Cook']
      };

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('success');
      // The test passes if no errors, meaning ingredients were parsed correctly
    });

    it('should fail with missing_entities error when food does not exist', async () => {
      const recipe: SchemaOrgRecipe = {
        name: 'Unknown Food Recipe',
        recipeIngredient: ['1 unknownfood123'],
        recipeInstructions: ['Cook']
      };

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('error');
      expect(result.mapping_notes.error_code).toBe('missing_entities');
      expect(result.mapping_notes.error_details.missing.foods).toContain('unknownfood123');
      // Warnings should NOT contain the missing food message - it's an error, not a warning
      const foodWarning = result.mapping_notes.warnings.find(w => w.includes('unknownfood123'));
      expect(foodWarning).toBeUndefined();
    });
  });
});
