import { RecipeImporter } from './import';
import { SchemaOrgRecipe } from '../types';

describe('RecipeImporter', () => {
  let importer: RecipeImporter;
  let mockClient: any;

  beforeEach(() => {
    // Create a simple mock with search methods (the new import uses search instead of bulk fetch)
    mockClient = {
      client: {
        defaults: {
          baseURL: 'https://tandoor.example.com'
        }
      },
      // Old bulk methods (kept for backwards compatibility)
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
        page: 1
      }),
      listAllUnits: jest.fn().mockResolvedValue({
        results: [
          { id: 1, name: 'g' },
          { id: 2, name: 'cup' }
        ],
        count: 2,
        page: 1
      }),
      listAllKeywords: jest.fn().mockResolvedValue({
        results: [
          { id: 10, name: 'italian' },
          { id: 11, name: 'vegetarian' },
          { id: 12, name: 'main course' }
        ],
        count: 3,
        page: 1
      }),
      // New search methods (used by EntityResolver)
      // Mimics real Tandoor API: search returns foods where name CONTAINS the query (fuzzy search)
      // The EntityResolver then filters for exact matches within those results
      searchFood: jest.fn().mockImplementation((query: string) => {
        const normalizedQuery = query.toLowerCase().trim();
        const allFoods: { id: number; name: string; plural_name?: string | null }[] = [
          { id: 1, name: 'spaghetti', plural_name: 'spaghetti' },
          { id: 2, name: 'bacon', plural_name: 'bacon' },
          { id: 3, name: 'pasta', plural_name: 'pasta' },
          { id: 4, name: 'ingredient', plural_name: 'ingredients' },
          { id: 5, name: 'onion', plural_name: 'onions' },
          { id: 6, name: 'tomato', plural_name: 'tomatoes' },
          { id: 7, name: 'salt', plural_name: 'salt' },
          // Additional foods to simulate fuzzy search behavior
          { id: 8, name: 'green onion', plural_name: 'green onions' },
          { id: 9, name: 'cherry tomato', plural_name: 'cherry tomatoes' },
          { id: 10, name: 'tomato sauce', plural_name: null },
          { id: 11, name: 'coconut milk', plural_name: null },
          { id: 12, name: 'almond milk', plural_name: null },
          { id: 13, name: 'soy milk', plural_name: null },
          { id: 14, name: 'whole milk', plural_name: null },
          { id: 15, name: 'olive oil', plural_name: null },
          { id: 16, name: 'vegetable oil', plural_name: null },
          { id: 17, name: 'canola oil', plural_name: null },
          { id: 18, name: 'coconut oil', plural_name: null },
          { id: 19, name: 'onion powder', plural_name: null },
          { id: 20, name: 'garlic powder', plural_name: null },
        ];

        // Real API: returns foods where name contains the query (case-insensitive)
        return Promise.resolve(
          allFoods.filter(f => f.name.toLowerCase().includes(normalizedQuery))
        );
      }),
      // Mimics real Tandoor API: search returns units where name CONTAINS the query (fuzzy search)
      searchUnit: jest.fn().mockImplementation((query: string) => {
        const normalizedQuery = query.toLowerCase().trim();
        const allUnits: { id: number; name: string; plural_name?: string | null }[] = [
          { id: 1, name: 'g', plural_name: 'g' },
          { id: 2, name: 'cup', plural_name: 'cups' },
          { id: 3, name: 'tsp', plural_name: null },
          { id: 4, name: 'tbsp', plural_name: null },
          { id: 5, name: 'ml', plural_name: 'ml' },
          { id: 6, name: 'l', plural_name: 'l' },
          { id: 7, name: 'kg', plural_name: 'kg' },
          { id: 8, name: 'oz', plural_name: 'oz' },
          { id: 9, name: 'lb', plural_name: 'lbs' },
          { id: 10, name: 'pinch', plural_name: null },
          { id: 11, name: 'dash', plural_name: null },
          { id: 12, name: 'drop', plural_name: null },
          // Units that simulate fuzzy matching (contain 'cup', 'gram', etc.)
          { id: 100, name: '1/4 cup', plural_name: '1/4 cups' },
          { id: 101, name: '1/2 cup', plural_name: '1/2 cups' },
          { id: 102, name: '1/3 cup', plural_name: '1/3 cups' },
        ];

        // Real API: returns units where name contains the query (case-insensitive)
        return Promise.resolve(
          allUnits.filter(u => u.name.toLowerCase().includes(normalizedQuery))
        );
      }),
      // Mimics real Tandoor API: search returns keywords where name CONTAINS the query (fuzzy search)
      searchKeyword: jest.fn().mockImplementation((query: string) => {
        const normalizedQuery = query.toLowerCase().trim();
        const allKeywords: { id: number; name: string }[] = [
          { id: 10, name: 'italian' },
          { id: 11, name: 'vegetarian' },
          { id: 12, name: 'main course' },
          { id: 13, name: 'dinner' },
          { id: 14, name: 'easy' },
          { id: 15, name: 'breakfast' },
          { id: 16, name: 'lunch' },
          { id: 17, name: 'dessert' },
          { id: 18, name: 'snack' },
          { id: 19, name: 'quick dinner' },
          { id: 20, name: 'italian dinner' },
          { id: 21, name: 'italian cuisine' },
          { id: 22, name: 'vegetarian dinner' },
          { id: 23, name: 'main dish' },
        ];

        // Real API: returns keywords where name contains the query (case-insensitive)
        return Promise.resolve(
          allKeywords.filter(k => k.name.toLowerCase().includes(normalizedQuery))
        );
      }),
      // Real Tandoor API returns full recipe object with resolved steps and ingredients
      // See /api/recipe/ POST response structure
      createRecipe: jest.fn().mockResolvedValue({
        id: 123,
        name: 'Test Recipe',
        description: null,
        image: null,
        keywords: [],
        steps: [
          {
            id: 1,
            name: 'Step 1',
            instruction: 'Cook',
            ingredients: [
              {
                id: 1,
                food: { id: 1, name: 'spaghetti', plural_name: 'spaghetti' },
                unit: { id: 1, name: 'g', plural_name: 'g' },
                amount: 100,
                order: 0,
                is_header: false,
                no_amount: false,
                original_text: null
              }
            ],
            order: 0
          }
        ],
        servings: 1,
        servings_text: '',
        source_url: null,
        internal: true,
        working_time: 0,
        waiting_time: 0,
        created_by: { id: 1, username: 'test' }
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

    it('should fail with missing_entities error when food search fails', async () => {
      const failingMockClient = {
        ...mockClient,
        searchFood: jest.fn().mockRejectedValue(new Error('Network error'))
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
      // Should report missing food because the search failed
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
      // This test uses onion, tomato, and salt - all have search mocks defined
      const recipe: SchemaOrgRecipe = {
        name: 'Tomato Pasta',
        recipeIngredient: ['1 onion, chopped', '2 tomato', 'salt'],
        recipeInstructions: ['Cook']
      };

      const result = await importer.importRecipeFromJson(recipe);

      // Debug: print the full result to understand why it's failing
      if (result.import_status !== 'success') {
        console.log('DEBUG: Import failed', JSON.stringify(result, null, 2));
      }

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

    it('should handle API validation errors for missing required fields', async () => {
      // Real Tandoor API returns 400 errors with validation messages like:
      // {"name":["This field is required."]} or {"steps":["This field is required."]}
      const validationError = new Error('API Error');
      (validationError as any).response = {
        data: { name: ['This field is required.'] }
      };
      mockClient.createRecipe.mockRejectedValue(validationError);

      const recipe: SchemaOrgRecipe = {
        name: 'Test Recipe',
        recipeIngredient: ['1 onion'],
        recipeInstructions: ['Cook']
      };

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('error');
      expect(result.mapping_notes.error_code).toBe('api_schema_mismatch');
      expect(result.mapping_notes.error_details).toEqual({ name: ['This field is required.'] });
    });

    it('should handle missing food ID with 500 server error', async () => {
      // Real Tandoor API returns 500 error when ingredient has invalid food ID
      const serverError = new Error('Internal Server Error');
      (serverError as any).response = {
        status: 500,
        data: { detail: 'Server Error' }
      };
      mockClient.createRecipe.mockRejectedValue(serverError);

      const recipe: SchemaOrgRecipe = {
        name: 'Test Recipe',
        recipeIngredient: ['1 onion'],
        recipeInstructions: ['Cook']
      };

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('error');
      expect(result.mapping_notes.error_code).toBe('api_schema_mismatch');
    });

    it('should handle API error without response body', async () => {
      // Test error handling when error doesn't have response.data structure
      const plainError = new Error('Network connection failed');
      mockClient.createRecipe.mockRejectedValue(plainError);

      const recipe: SchemaOrgRecipe = {
        name: 'Test Recipe',
        recipeIngredient: ['1 onion'],
        recipeInstructions: ['Cook']
      };

      const result = await importer.importRecipeFromJson(recipe);

      expect(result.import_status).toBe('error');
      expect(result.mapping_notes.error_code).toBe('api_schema_mismatch');
      expect(result.mapping_notes.error_details).toBe('Network connection failed');
    });

    it('should verify createRecipe is called with correct Tandoor payload', async () => {
      // Track the payload passed to createRecipe to ensure proper structure
      let capturedPayload: any;
      mockClient.createRecipe.mockImplementation((payload: any) => {
        capturedPayload = payload;
        return Promise.resolve({
          id: 123,
          name: payload.name || 'Test Recipe',
          steps: [],
          keywords: []
        });
      });

      const recipe: SchemaOrgRecipe = {
        name: 'Spaghetti Bolognese',
        description: 'A classic pasta dish',
        recipeIngredient: ['2 onion', '100 g spaghetti'],
        recipeInstructions: ['Cook the pasta', 'Add sauce'],
        servings: 4
      };

      await importer.importRecipeFromJson(recipe);

      // Verify the payload structure matches Tandoor API expectations
      expect(capturedPayload).toBeDefined();
      expect(capturedPayload.name).toBe('Spaghetti Bolognese');
      // Note: internal flag defaults to false in the converter (recipes are external by default)
      expect(capturedPayload.internal).toBe(false);
      expect(capturedPayload.servings).toBe(4);
      expect(capturedPayload.steps).toBeDefined();
      expect(Array.isArray(capturedPayload.steps)).toBe(true);
      expect(capturedPayload.steps.length).toBe(2); // One for each instruction
      expect(capturedPayload.ingredients).toBeDefined();
      expect(Array.isArray(capturedPayload.ingredients)).toBe(true);
    });
  });
});
