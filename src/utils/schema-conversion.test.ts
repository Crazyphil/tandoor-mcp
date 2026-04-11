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
    foodPluralMap: new Map<string, number>(), // Empty - plural matching tested separately
    unitIdMap: new Map([
      ['gram', 1],
      ['teaspoon', 2],
      ['cup', 3]
    ]),
    unitPluralMap: new Map<string, number>(), // Empty - plural matching tested separately
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

  it('should derive servings and servings_text from recipeYield string', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      recipeYield: '6 servings'
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.servings).toBe(6);
    expect(payload.servings_text).toBe('servings');
    expect(field_transformations.some((t: string) => t.includes('recipeYield'))).toBe(true);
  });

  it('should handle numeric recipeYield', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      recipeYield: 8
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.servings).toBe(8);
    expect(payload.servings_text).toBeUndefined();
    expect(field_transformations.some((t: string) => t.includes('recipeYield') && t.includes('8'))).toBe(true);
  });

  it('should handle recipeYield with different units', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      recipeYield: '2 loaves'
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.servings).toBe(2);
    expect(payload.servings_text).toBe('loaves');
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

  it('should include nutrition field when provided', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      nutrition: {
        calories: '200',
        carbohydrateContent: '30g',
        proteinContent: '10g',
        fatContent: '5g'
      }
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.nutrition).toEqual({
      calories: '200',
      carbohydrateContent: '30g',
      proteinContent: '10g',
      fatContent: '5g'
    });
    expect(field_transformations.some((t: string) => t.includes('nutrition'))).toBe(true);
  });

  it('should append author attribution to last step instruction', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Mix ingredients', 'Bake in oven', 'Serve hot'],
      author: { name: 'Chef Mario' }
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    // Author should be appended to the last step in italics
    expect(payload.steps[2].instruction).toContain('*Chef Mario*');
    expect(payload.steps[0].instruction).not.toContain('Chef Mario'); // Not in first step
    expect(payload.steps[1].instruction).not.toContain('Chef Mario'); // Not in second step
    expect(field_transformations.some((t: string) => t.includes('Chef Mario'))).toBe(true);
  });

  it('should handle single step with author', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook pasta'],
      author: { name: 'J. Kenji López-Alt' }
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.steps[0].instruction).toContain('*J. Kenji López-Alt*');
  });

  it('should warn about datePublished being ignored', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      datePublished: '2023-06-15'
    };

    const { warnings } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(warnings.some((w: string) => w.includes('datePublished') && w.includes('not supported'))).toBe(true);
  });

  it('should map prepTime to working_time at recipe level', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Chop vegetables', 'Cook pasta'],
      prepTime: 'PT30M'
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.working_time).toBe(30); // prepTime -> working_time
    expect(field_transformations.some((t: string) => t.includes('prepTime') && t.includes('30') && t.includes('working_time'))).toBe(true);
  });

  it('should map cookTime to waiting_time at recipe level', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Chop vegetables', 'Bake at 350F for 20 minutes'],
      cookTime: 'PT45M'
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.waiting_time).toBe(45); // cookTime -> waiting_time
    expect(field_transformations.some((t: string) => t.includes('cookTime') && t.includes('45') && t.includes('waiting_time'))).toBe(true);
  });

  it('should map both prepTime and cookTime to recipe-level time fields', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Mix ingredients', 'Bake in oven', 'Serve'],
      prepTime: 'PT15M',
      cookTime: 'PT30M'
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.working_time).toBe(15); // prepTime -> working_time
    expect(payload.waiting_time).toBe(30); // cookTime -> waiting_time
  });

  it('should not set step time property (removed from schema)', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Mix ingredients', 'Bake in oven'],
      prepTime: 'PT15M',
      cookTime: 'PT30M'
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    // Steps should not have a 'time' property anymore
    expect(payload.steps[0]).not.toHaveProperty('time');
    expect(payload.steps[1]).not.toHaveProperty('time');
  });

  it('should include HowToStep.name as step name', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: [
        { '@type': 'HowToStep', name: 'Preparation', text: 'Chop all vegetables' },
        { '@type': 'HowToStep', name: 'Cooking', text: 'Sauté vegetables' }
      ]
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.steps[0].name).toBe('Preparation');
    expect(payload.steps[0].instruction).toBe('Chop all vegetables');
    expect(payload.steps[1].name).toBe('Cooking');
    expect(payload.steps[1].instruction).toBe('Sauté vegetables');
  });

  it('should map suitableForDiet string to keyword', () => {
    const mockEntityMapWithDiet = {
      ...mockEntityMap,
      keywordIdMap: new Map([
        ...mockEntityMap.keywordIdMap,
        ['gluten free', 20],
        ['vegan', 21]
      ])
    };

    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      suitableForDiet: 'GlutenFreeDiet'
    };

    const { payload, field_transformations, warnings } = convertSchemaOrgToTandoor(recipe, mockEntityMapWithDiet);

    expect(payload.keywords).toContain(20); // gluten free
    expect(field_transformations.some((t: string) => t.includes('suitableForDiet') && t.includes('GlutenFreeDiet'))).toBe(true);
    expect(warnings.length).toBe(0); // Should not warn since keyword exists
  });

  it('should map suitableForDiet array to keywords', () => {
    const mockEntityMapWithDiets = {
      ...mockEntityMap,
      keywordIdMap: new Map([
        ...mockEntityMap.keywordIdMap,
        ['gluten free', 20],
        ['vegan', 21],
        ['vegetarian', 11] // already in mockEntityMap
      ])
    };

    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      suitableForDiet: ['GlutenFreeDiet', 'VeganDiet', 'VegetarianDiet']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMapWithDiets);

    expect(payload.keywords).toContain(20); // gluten free
    expect(payload.keywords).toContain(21); // vegan
    expect(payload.keywords).toContain(11); // vegetarian
  });

  it('should warn when suitableForDiet keyword is not found', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      suitableForDiet: 'KetoDiet'
    };

    const { payload, warnings } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    // Should warn about missing keyword, not block import
    expect(warnings.some((w: string) => w.includes('suitableForDiet') && w.includes('keto'))).toBe(true);
    // Keyword should not be added to payload since it wasn't found
    expect(payload.keywords).toBeUndefined();
  });

  it('should map suitableForDiet with exact keyword match', () => {
    const mockEntityMapExact = {
      ...mockEntityMap,
      keywordIdMap: new Map([
        ...mockEntityMap.keywordIdMap,
        ['ketodiet', 25] // exact match for "KetoDiet"
      ])
    };

    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['1 pasta'],
      recipeInstructions: ['Cook'],
      suitableForDiet: 'KetoDiet'
    };

    const { payload, field_transformations } = convertSchemaOrgToTandoor(recipe, mockEntityMapExact);

    // Should match exactly first (ketodiet -> 25)
    expect(payload.keywords).toContain(25);
    expect(field_transformations.some((t: string) => t.includes('KetoDiet'))).toBe(true);
  });

  it('should match plural unit forms in ingredients', () => {
    const mockEntityMapWithPlurals = {
      ...mockEntityMap,
      unitPluralMap: new Map([
        ['cups', 3],  // cup -> cups
        ['grams', 1]  // gram -> grams
      ]),
      foodPluralMap: new Map<string, number>()
    };

    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['2 cups pasta'],
      recipeInstructions: ['Cook']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMapWithPlurals);

    expect(payload.ingredients.length).toBe(1);
    expect(payload.ingredients[0].amount).toBe(2);
    expect(payload.ingredients[0].unit).toBe(3); // cups -> cup ID
    expect(payload.ingredients[0].food).toBe(1); // pasta
    expect(payload.ingredients[0].original_text).toBe('2 cups pasta');
  });

  it('should match plural food forms in ingredients', () => {
    const mockEntityMapWithPlurals = {
      ...mockEntityMap,
      foodPluralMap: new Map([
        ['tomatoes', 5],  // tomato -> tomatoes (new food)
        ['onions', 6]     // onion -> onions (new food)
      ]),
      unitPluralMap: new Map<string, number>()
    };

    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['3 tomatoes, diced'],
      recipeInstructions: ['Cook']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMapWithPlurals);

    expect(payload.ingredients.length).toBe(1);
    expect(payload.ingredients[0].amount).toBe(3);
    expect(payload.ingredients[0].food).toBe(5); // tomatoes -> tomato ID
    expect(payload.ingredients[0].note).toBe('diced');
    expect(payload.ingredients[0].original_text).toBe('3 tomatoes, diced');
  });

  it('should match both plural units and foods in same ingredient', () => {
    const mockEntityMapWithPlurals = {
      ...mockEntityMap,
      unitPluralMap: new Map([
        ['cups', 3]  // cup -> cups
      ]),
      foodPluralMap: new Map([
        ['tomatoes', 5]  // tomato -> tomatoes
      ])
    };

    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['2 cups tomatoes'],
      recipeInstructions: ['Cook']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMapWithPlurals);

    expect(payload.ingredients.length).toBe(1);
    expect(payload.ingredients[0].amount).toBe(2);
    expect(payload.ingredients[0].unit).toBe(3); // cups -> cup ID
    expect(payload.ingredients[0].food).toBe(5); // tomatoes -> tomato ID
    expect(payload.ingredients[0].original_text).toBe('2 cups tomatoes');
  });

  it('should set no_amount for ingredients without amounts', () => {
    const recipe: SchemaOrgRecipe = {
      name: 'Test',
      recipeIngredient: ['salt, to taste'],
      recipeInstructions: ['Season with salt']
    };

    const { payload } = convertSchemaOrgToTandoor(recipe, mockEntityMap);

    expect(payload.ingredients.length).toBe(1);
    expect(payload.ingredients[0].food).toBe(4); // salt
    // Real API requires 'amount' and 'unit' fields always.
    // When no_amount is true, amount should be 0 and unit should be a valid ID.
    expect(payload.ingredients[0].amount).toBe(0);
    expect(payload.ingredients[0].unit).toBeDefined();
    expect(payload.ingredients[0].no_amount).toBe(true);
    expect(payload.ingredients[0].note).toBe('to taste');
    expect(payload.ingredients[0].original_text).toBe('salt, to taste');
  });
});
