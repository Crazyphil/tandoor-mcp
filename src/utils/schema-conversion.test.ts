import {
  convertSchemaOrgToTandoor,
  parseInstructions
} from './normalize';
import { SchemaOrgRecipe } from '../types';

describe('convertSchemaOrgToTandoor', () => {
  const mockEntityMap = {
    foodIdMap: new Map([
      ['pasta', 1],
      ['garlic', 2],
      ['olive oil', 3],
      ['salt', 4]
    ]),
    unitIdMap: new Map([
      ['gram', 1],
      ['teaspoon', 2],
      ['cup', 3]
    ]),
    keywordIdMap: new Map([
      ['italian', 10],
      ['vegetarian', 11]
    ])
  };

  it('should convert basic recipe fields', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Simple Pasta',
      description: 'A simple pasta dish',
      recipeIngredient: ['1 gram pasta', '2 teaspoon garlic'],
      recipeInstructions: ['Cook pasta', 'Add garlic']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.name).toBe('Simple Pasta');
    expect(payload.description).toBe('A simple pasta dish');
    expect(payload.ingredients.length).toBe(2);
    expect(payload.steps.length).toBe(2);
  });

  it('should map servings correctly', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      servings: 4
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.servings).toBe(4);
    expect(field_transformations.some((t: string) => t.includes('servings'))).toBe(true);
  });

  it('should derive servings from recipeYield', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      recipeYield: '6 servings'
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.servings).toBe(6);
    expect(field_transformations.some((t: string) => t.includes('recipeYield'))).toBe(true);
  });

  it('should include source URL if provided', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      sourceUrl: 'https://example.com/recipe'
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.source_url).toBe('https://example.com/recipe');
  });

  it('should set internal flag to false', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.internal).toBe(false);
  });

  it('should map food names to IDs', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['100 gram pasta', '50 gram garlic'],
      recipeInstructions: ['Cook']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.ingredients[0].food).toBe(1); // pasta
    expect(payload.ingredients[1].food).toBe(2); // garlic
  });

  it('should map unit names to IDs', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 cup pasta', '1 teaspoon salt'],
      recipeInstructions: ['Cook']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.ingredients[0].unit).toBe(3); // cup
    expect(payload.ingredients[1].unit).toBe(2); // teaspoon
  });

  it('should track missing food in missingEntities', () => {
    // Using exact format: "1 [unit] [food]" to avoid parsing ambiguities
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 unknown-ingredient'],
      recipeInstructions: ['Cook']
    };

    const { missingEntities } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(missingEntities.foods).toContain('unknown-ingredient');
    // Warnings should NOT contain missing food - it's an error, not a warning
  });

  it('should track missing food with amount in missingEntities', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['500 gram totally-unknown-food'],
      recipeInstructions: ['Cook']
    };

    const { missingEntities } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    // "gram" is a valid unit (id=1), so food name should be "totally-unknown-food"
    expect(missingEntities.foods).toContain('totally-unknown-food');
  });

  it('should map keywords from array', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      keywords: ['Italian', 'Vegetarian']
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.keywords).toContain(10); // italian
    expect(payload.keywords).toContain(11); // vegetarian
    expect(field_transformations.length).toBeGreaterThan(0);
  });

  it('should map recipeCategory to keyword', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      recipeCategory: 'Italian'
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.keywords).toContain(10); // italian
    expect(field_transformations.some((t: string) => t.includes('recipeCategory'))).toBe(true);
  });

  it('should map recipeCuisine string to keyword', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      recipeCuisine: 'Italian'
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.keywords).toContain(10); // italian
    expect(field_transformations.some((t: string) => t.includes('recipeCuisine'))).toBe(true);
  });

  it('should map recipeCuisine array to keywords', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      recipeCuisine: ['Italian', 'Vegetarian']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.keywords).toContain(10); // italian
    expect(payload.keywords).toContain(11); // vegetarian
  });

  it('should remove duplicate keyword IDs', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      keywords: ['Italian', 'Italian'],
      recipeCategory: 'Italian'
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    const italianCount = payload.keywords?.filter((k: number) => k === 10).length || 0;
    expect(italianCount).toBe(1); // Should deduplicate
  });

  it('should track missing keywords in missingEntities', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      keywords: ['UnknownKeyword']
    };

    const { missingEntities, warnings } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    // Missing keywords (explicitly provided) should be tracked as missing entities (error), not warnings
    expect(missingEntities.keywords).toContain('UnknownKeyword');
    expect(warnings.some((w: string) => w.includes('UnknownKeyword'))).toBe(false);
  });

  it('should parse ingredient amounts correctly', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1.5 gram pasta', '100 gram garlic'],
      recipeInstructions: ['Cook']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.ingredients[0].amount).toBe(1.5);
    expect(payload.ingredients[1].amount).toBe(100);
  });

  it('should track missing foods in missingEntities when no amounts provided', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['cumin', 'paprika'],
      recipeInstructions: ['Cook']
    };

    const { payload, missingEntities } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    // cumin and paprika don't exist in mockEntityMap, so they should be in missingEntities
    expect(missingEntities.foods).toContain('cumin');
    expect(missingEntities.foods).toContain('paprika');
    // No ingredients should be in the payload since foods are missing
    expect(payload.ingredients.length).toBe(0);
  });

  it('should convert instructions into ordered steps', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Boil water', 'Add salt', 'Cook pasta']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.steps.length).toBe(3);
    expect(payload.steps[0].order).toBe(0);
    expect(payload.steps[0].instruction).toBe('Boil water');
    expect(payload.steps[2].instruction).toBe('Cook pasta');
  });
});
