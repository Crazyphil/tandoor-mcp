import {
  SchemaOrgRecipe,
  TandoorRecipePayload,
  TandoorStep,
  TandoorIngredient,
  ValidationError
} from '../types';

/**
 * Validates that a recipe has minimum required fields for import
 */
export function validateRecipePayload(recipe: SchemaOrgRecipe): ValidationError | null {
  if (!recipe.name || typeof recipe.name !== 'string' || recipe.name.trim().length === 0) {
    return {
      error_code: 'invalid_payload',
      details: { field: 'name', issue: 'Missing or invalid recipe name (must be non-empty string)' }
    };
  }

  if (!recipe.recipeIngredient || !Array.isArray(recipe.recipeIngredient) || recipe.recipeIngredient.length === 0) {
    return {
      error_code: 'invalid_payload',
      details: { field: 'recipeIngredient', issue: 'Missing or empty ingredient list (must be array)' }
    };
  }

  if (!recipe.recipeInstructions || (Array.isArray(recipe.recipeInstructions) && recipe.recipeInstructions.length === 0)) {
    return {
      error_code: 'invalid_payload',
      details: { field: 'recipeInstructions', issue: 'Missing or empty instructions (must be non-empty array or string)' }
    };
  }

  return null;
}

/**
 * Parse time duration in ISO 8601 format (e.g., PT30M, PT1H30M)
 * Returns minutes as a number
 */
export function parseIsoDuration(duration: string): number | null {
  if (!duration || typeof duration !== 'string') return null;

  const iso8601Regex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;
  const match = duration.match(iso8601Regex);

  if (!match) return null;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseFloat(match[3] || '0');

  return hours * 60 + minutes + Math.round(seconds / 60);
}

/**
 * Extract ingredient amount and unit from a string like "2 cups" or "500g"
 * Returns { amount, unit_string } or null
 */
export function parseIngredientAmount(ingredientStr: string): { amount: string; unit: string } | null {
  if (!ingredientStr || typeof ingredientStr !== 'string') return null;

  // Match pattern: number (with optional decimal) followed by optional unit
  const match = ingredientStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);

  if (!match) return null;

  const amount = match[1];
  const unit = match[2].trim();

  return { amount, unit };
}

/**
 * Parse instructions string or array into TandoorStep objects
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseInstructions(
  instructions: any
): { steps: TandoorStep[]; warnings: string[] } {
  const warnings: string[] = [];
  const steps: TandoorStep[] = [];

  let instructionList: string[] = [];

  if (typeof instructions === 'string') {
    // Simple string - split by period or newline
    instructionList = instructions
      .split(/\n|\./)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  } else if (Array.isArray(instructions)) {
    for (const instr of instructions) {
      if (typeof instr === 'string') {
        instructionList.push(instr);
      } else if (typeof instr === 'object' && instr.text) {
        instructionList.push(instr.text);
      } else if (typeof instr === 'object' && instr.name) {
        instructionList.push(instr.name);
      }
    }
  }

  // Convert to steps
  instructionList.forEach((instruction, index) => {
    if (instruction.trim().length > 0) {
      steps.push({
        instruction: instruction.trim(),
        order: index,
        ingredients: [] // Will be filled in during ingredient mapping
      });
    }
  });

  if (steps.length === 0) {
    warnings.push('No valid instructions could be parsed');
  }

  return { steps, warnings };
}

/**
 * Convert schema.org Recipe to Tandoor recipe payload
 * Note: This does NOT validate or fetch entities from Tandoor
 * Caller must ensure all food_ids, unit_ids, keyword_ids exist
 */
export function convertSchemaOrgToTandoor(
  recipe: SchemaOrgRecipe,
  entityMap: {
    foodIdMap: Map<string, number>;
    unitIdMap: Map<string, number>;
    keywordIdMap: Map<string, number>;
  }
): { payload: TandoorRecipePayload; warnings: string[]; field_transformations: string[] } {
  const warnings: string[] = [];
  const field_transformations: string[] = [];

  // Parse basic fields
  const payload: TandoorRecipePayload = {
    name: recipe.name,
    description: recipe.description || '',
    internal: false,
    steps: [],
    ingredients: []
  };

  // Handle servings
  if (recipe.servings) {
    payload.servings = recipe.servings;
    field_transformations.push(`servings set to ${recipe.servings}`);
  } else if (recipe.recipeYield) {
    const yieldNum = parseInt(recipe.recipeYield.toString(), 10);
    if (!isNaN(yieldNum)) {
      payload.servings = yieldNum;
      field_transformations.push(`servings derived from recipeYield: ${recipe.recipeYield}`);
    }
  }

  // Handle source URL
  if (recipe.sourceUrl) {
    payload.source_url = recipe.sourceUrl;
  }

  // Handle instructions
  const { steps: instructionSteps, warnings: instructionWarnings } = parseInstructions(
    recipe.recipeInstructions || []
  );
  payload.steps = instructionSteps;
  warnings.push(...instructionWarnings);

  // Handle ingredients
  const { ingredients, warnings: ingredientWarnings } = parseIngredients(
    recipe.recipeIngredient || [],
    entityMap
  );
  payload.ingredients = ingredients;
  warnings.push(...ingredientWarnings);

  // Handle keywords
  const keywordIds: number[] = [];
  if (recipe.keywords && Array.isArray(recipe.keywords)) {
    for (const keyword of recipe.keywords) {
      const id = entityMap.keywordIdMap.get(keyword.toLowerCase());
      if (id !== undefined) {
        keywordIds.push(id);
        field_transformations.push(`keyword '${keyword}' mapped to ID ${id}`);
      } else {
        warnings.push(`Keyword '${keyword}' not found in Tandoor`);
      }
    }
  }

  if (recipe.recipeCategory && typeof recipe.recipeCategory === 'string') {
    const id = entityMap.keywordIdMap.get(recipe.recipeCategory.toLowerCase());
    if (id !== undefined) {
      keywordIds.push(id);
      field_transformations.push(`recipeCategory '${recipe.recipeCategory}' mapped to keyword ID ${id}`);
    } else {
      warnings.push(`recipeCategory '${recipe.recipeCategory}' not found; consider creating keyword`);
    }
  }

  if (recipe.recipeCuisine) {
    const cuisines = Array.isArray(recipe.recipeCuisine)
      ? recipe.recipeCuisine
      : [recipe.recipeCuisine];

    for (const cuisine of cuisines) {
      if (typeof cuisine === 'string') {
        const id = entityMap.keywordIdMap.get(cuisine.toLowerCase());
        if (id !== undefined) {
          keywordIds.push(id);
          field_transformations.push(`recipeCuisine '${cuisine}' mapped to keyword ID ${id}`);
        } else {
          warnings.push(`recipeCuisine '${cuisine}' not found; consider creating keyword`);
        }
      }
    }
  }

  if (keywordIds.length > 0) {
    payload.keywords = [...new Set(keywordIds)]; // Remove duplicates
  }

  return { payload, warnings, field_transformations };
}

/**
 * Parse ingredients list and map to Tandoor ingredient format
 */
function parseIngredients(
  ingredients: string[],
  entityMap: {
    foodIdMap: Map<string, number>;
    unitIdMap: Map<string, number>;
    keywordIdMap: Map<string, number>;
  }
): { ingredients: TandoorIngredient[]; warnings: string[] } {
  const warnings: string[] = [];
  const tandoorIngredients: TandoorIngredient[] = [];

  ingredients.forEach((ingredientStr, index) => {
    if (!ingredientStr || typeof ingredientStr !== 'string') {
      warnings.push(`Ingredient at index ${index} is not a string`);
      return;
    }

    const parsed = parseIngredientAmount(ingredientStr);
    let foodName: string;
    let amount: string | undefined;
    let unitId: number | undefined;

    if (parsed) {
      amount = parsed.amount;
      const unitAndFood = parsed.unit.trim();

      // Try to extract unit from the start of unitAndFood
      let extractedUnit = '';
      let remainder = unitAndFood;

      if (unitAndFood) {
        const words = unitAndFood.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
          const potentialUnit = words.slice(0, i + 1).join(' ').toLowerCase();
          if (entityMap.unitIdMap.has(potentialUnit)) {
            extractedUnit = potentialUnit;
            remainder = words.slice(i + 1).join(' ');
          }
        }
      }

      if (extractedUnit) {
        unitId = entityMap.unitIdMap.get(extractedUnit);
      }

      foodName = remainder || unitAndFood;
    } else {
      foodName = ingredientStr.trim();
    }

    foodName = foodName.trim().toLowerCase();

    // Skip if no food name
    if (!foodName) {
      warnings.push(`Could not parse food name from ingredient: "${ingredientStr}"`);
      return;
    }

    // Look up food ID - try exact match first, then try variations
    let foodId = entityMap.foodIdMap.get(foodName);
    
    if (foodId === undefined && foodName.includes(' ')) {
      // Try splitting on spaces and finding common food parts
      const foodWords = foodName.split(/\s+/);
      for (let i = foodWords.length; i > 0; i--) {
        const testName = foodWords.slice(0, i).join(' ');
        if (entityMap.foodIdMap.has(testName)) {
          foodId = entityMap.foodIdMap.get(testName);
          break;
        }
      }
    }

    if (foodId === undefined) {
      warnings.push(`Food '${foodName}' not found in Tandoor for ingredient: "${ingredientStr}"`);
      return;
    }

    tandoorIngredients.push({
      amount: amount ? parseFloat(amount) : undefined,
      unit: unitId,
      food: foodId,
      note: undefined,
      order: index
    });
  });

  return { ingredients: tandoorIngredients, warnings };
}

/**
 * Identify ignored fields from schema.org recipe
 */
export function identifyIgnoredFields(recipe: SchemaOrgRecipe): string[] {
  const ignoredFields: string[] = [];
  const knownFields = new Set([
    'name',
    'description',
    'recipeIngredient',
    'recipeInstructions',
    'recipeYield',
    'servings',
    'prepTime',
    'cookTime',
    'totalTime',
    'image',
    'keywords',
    'recipeCategory',
    'recipeCuisine',
    'sourceUrl',
    'author',
    'datePublished',
    'nutrition',
    '@context',
    '@type'
  ]);

  for (const key of Object.keys(recipe)) {
    if (!knownFields.has(key)) {
      ignoredFields.push(key);
    }
  }

  return ignoredFields;
}
