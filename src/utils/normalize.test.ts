import {
  validateRecipePayload,
  parseIsoDuration,
  parseIngredientAmount,
  parseInstructions,
  identifyIgnoredFields
} from './normalize';

describe('Recipe Normalization Utilities', () => {
  describe('validateRecipePayload', () => {
    it('should accept valid recipe with required fields', () => {
      const recipe = {
        name: 'Test Recipe',
        recipeIngredient: ['ingredient 1', 'ingredient 2'],
        recipeInstructions: ['step 1', 'step 2']
      };
      expect(validateRecipePayload(recipe)).toBeNull();
    });

    it('should reject recipe without name', () => {
      const recipe = {
        recipeIngredient: ['ingredient 1'],
        recipeInstructions: ['step 1']
      };
      const error = validateRecipePayload(recipe as any);
      expect(error).not.toBeNull();
      expect(error?.error_code).toBe('invalid_payload');
      expect(error?.details.field).toBe('name');
    });

    it('should reject recipe with empty name', () => {
      const recipe = {
        name: '   ',
        recipeIngredient: ['ingredient 1'],
        recipeInstructions: ['step 1']
      };
      const error = validateRecipePayload(recipe);
      expect(error).not.toBeNull();
      expect(error?.error_code).toBe('invalid_payload');
    });

    it('should reject recipe without ingredients', () => {
      const recipe = {
        name: 'Test Recipe',
        recipeInstructions: ['step 1']
      };
      const error = validateRecipePayload(recipe as any);
      expect(error).not.toBeNull();
      expect(error?.details.field).toBe('recipeIngredient');
    });

    it('should reject recipe with empty ingredients array', () => {
      const recipe = {
        name: 'Test Recipe',
        recipeIngredient: [],
        recipeInstructions: ['step 1']
      };
      const error = validateRecipePayload(recipe);
      expect(error).not.toBeNull();
    });

    it('should reject recipe without instructions', () => {
      const recipe = {
        name: 'Test Recipe',
        recipeIngredient: ['ingredient 1']
      };
      const error = validateRecipePayload(recipe as any);
      expect(error).not.toBeNull();
      expect(error?.details.field).toBe('recipeInstructions');
    });

    it('should reject recipe with empty instructions array', () => {
      const recipe = {
        name: 'Test Recipe',
        recipeIngredient: ['ingredient 1'],
        recipeInstructions: []
      };
      const error = validateRecipePayload(recipe);
      expect(error).not.toBeNull();
    });
  });

  describe('parseIsoDuration', () => {
    it('should parse hour format (PT1H)', () => {
      expect(parseIsoDuration('PT1H')).toBe(60);
    });

    it('should parse minute format (PT30M)', () => {
      expect(parseIsoDuration('PT30M')).toBe(30);
    });

    it('should parse hour and minute format (PT1H30M)', () => {
      expect(parseIsoDuration('PT1H30M')).toBe(90);
    });

    it('should parse seconds format (PT45S)', () => {
      expect(parseIsoDuration('PT45S')).toBeLessThanOrEqual(1);
      expect(parseIsoDuration('PT45S')).toBeGreaterThanOrEqual(0);
    });

    it('should handle combined formats (PT1H30M45S)', () => {
      const result = parseIsoDuration('PT1H30M45S');
      expect(result).toBeCloseTo(91, 0);
    });

    it('should return null for invalid format', () => {
      expect(parseIsoDuration('invalid')).toBeNull();
      expect(parseIsoDuration('1H30M')).toBeNull();
      expect(parseIsoDuration('')).toBeNull();
      expect(parseIsoDuration(null as any)).toBeNull();
    });
  });

  describe('parseIngredientAmount', () => {
    it('should parse ingredient with amount and unit', () => {
      const result = parseIngredientAmount('2 cups flour');
      expect(result).toEqual({ amount: '2', unit: 'cups flour' });
    });

    it('should parse ingredient with amount and single unit', () => {
      const result = parseIngredientAmount('500 g');
      expect(result).toEqual({ amount: '500', unit: 'g' });
    });

    it('should parse decimal amounts', () => {
      const result = parseIngredientAmount('0.5 cups');
      expect(result).toEqual({ amount: '0.5', unit: 'cups' });
    });

    it('should return null for ingredient without amount', () => {
      expect(parseIngredientAmount('flour')).toBeNull();
      expect(parseIngredientAmount('salt and pepper')).toBeNull();
    });

    it('should return null for invalid input', () => {
      expect(parseIngredientAmount('')).toBeNull();
      expect(parseIngredientAmount(null as any)).toBeNull();
    });

    it('should handle amount only (no unit)', () => {
      const result = parseIngredientAmount('2');
      expect(result).toEqual({ amount: '2', unit: '' });
    });
  });

  describe('parseInstructions', () => {
    it('should parse string instructions by periods', () => {
      const input = 'Mix ingredients. Bake at 350°F. Cool before serving.';
      const { steps } = parseInstructions(input);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0].instruction).toBeTruthy();
      expect(steps[0].order).toBe(0);
    });

    it('should parse string instructions by newlines', () => {
      const input = 'Step 1\nStep 2\nStep 3';
      const { steps } = parseInstructions(input);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should parse array of string instructions', () => {
      const input = ['Mix ingredients', 'Bake at 350°F', 'Cool before serving'];
      const { steps } = parseInstructions(input);
      expect(steps.length).toBe(3);
      expect(steps[0].instruction).toBe('Mix ingredients');
      expect(steps[0].order).toBe(0);
      expect(steps[2].order).toBe(2);
    });

    it('should parse array of instruction objects with text field', () => {
      const input = [
        { text: 'Mix ingredients' },
        { text: 'Bake' }
      ];
      const { steps } = parseInstructions(input as any);
      expect(steps.length).toBe(2);
      expect(steps[0].instruction).toBe('Mix ingredients');
    });

    it('should parse array of instruction objects with name field', () => {
      const input = [
        { name: 'Mixing' },
        { name: 'Baking' }
      ];
      const { steps } = parseInstructions(input as any);
      expect(steps.length).toBe(2);
      expect(steps[0].instruction).toBe('Mixing');
    });

    it('should handle empty instructions with warning', () => {
      const { steps, warnings } = parseInstructions([]);
      expect(steps.length).toBe(0);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('identifyIgnoredFields', () => {
    it('should identify all known fields as not ignored', () => {
      const recipe = {
        name: 'Test',
        description: 'Desc',
        recipeIngredient: [],
        recipeInstructions: [],
        image: 'url',
        keywords: [],
        sourceUrl: 'http://example.com'
      };
      const ignored = identifyIgnoredFields(recipe as any);
      expect(ignored.length).toBe(0);
    });

    it('should identify unknown fields as ignored', () => {
      const recipe = {
        name: 'Test',
        recipeIngredient: [],
        recipeInstructions: [],
        customField: 'value',
        anotherField: 123
      };
      const ignored = identifyIgnoredFields(recipe as any);
      expect(ignored).toContain('customField');
      expect(ignored).toContain('anotherField');
    });

    it('should not count @context and @type as ignored', () => {
      const recipe = {
        '@context': 'http://schema.org',
        '@type': 'Recipe',
        name: 'Test',
        recipeIngredient: [],
        recipeInstructions: []
      };
      const ignored = identifyIgnoredFields(recipe as any);
      expect(ignored).not.toContain('@context');
      expect(ignored).not.toContain('@type');
    });
  });
});
