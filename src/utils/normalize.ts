import {
  SchemaOrgRecipe,
  TandoorRecipePayload,
  TandoorStep,
  TandoorIngredient,
  ValidationError,
  RecipeInstruction,
  TandoorFood,
  TandoorUnit,
  TandoorKeyword
} from '../types';
import { TandoorApiClient } from '../api/client';

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
export function parseInstructions(
  instructions: string | string[] | RecipeInstruction[] | undefined
): { steps: TandoorStep[]; warnings: string[] } {
  const warnings: string[] = [];
  const steps: TandoorStep[] = [];

  let instructionList: { text: string; name?: string }[] = [];

  if (typeof instructions === 'string') {
    // Simple string - split by period or newline
    const rawInstructions = instructions
      .split(/\n|\./)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    instructionList = rawInstructions.map(text => ({ text }));
  } else if (Array.isArray(instructions)) {
    for (const instr of instructions) {
      if (typeof instr === 'string') {
        instructionList.push({ text: instr });
      } else if (typeof instr === 'object' && instr.text) {
        instructionList.push({ text: instr.text, name: instr.name });
      } else if (typeof instr === 'object' && instr.name) {
        // Only name field, use as instruction text
        instructionList.push({ text: instr.name, name: instr.name });
      }
    }
  }

  // Convert to steps
  instructionList.forEach((item, index) => {
    if (item.text.trim().length > 0) {
      steps.push({
        name: item.name,
        instruction: item.text.trim(),
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
 * Append author attribution as an italicized Markdown paragraph to the last step's instruction.
 * This keeps the recipe description clean while still crediting the original author.
 */
function appendAuthorToSteps(steps: TandoorStep[], authorName: string): TandoorStep[] {
  if (steps.length === 0 || !authorName) {
    return steps;
  }

  const lastIndex = steps.length - 1;
  const lastStep = steps[lastIndex];
  
  // Append author as italicized paragraph
  const authorAttribution = `\n\n*${authorName}*`;
  const updatedStep: TandoorStep = {
    ...lastStep,
    instruction: lastStep.instruction + authorAttribution
  };

  return [
    ...steps.slice(0, lastIndex),
    updatedStep
  ];
}

interface MissingEntities {
  foods: string[];
  units: string[];
  keywords: string[];
}

/**
 * Convert schema.org Recipe to Tandoor recipe payload
 * Note: This does NOT validate or fetch entities from Tandoor
 * Caller must ensure all food_ids, unit_ids, keyword_ids exist
 * 
 * Entity map now includes plural forms for more natural ingredient parsing.
 * Agents can use plural forms (e.g., "2 cups onions") which will be matched
 * to singular food/unit entries if plural_name is configured in Tandoor.
 */
export function convertSchemaOrgToTandoor(
  recipe: SchemaOrgRecipe,
  entityMap: {
    foodIdMap: Map<string, number>;
    foodPluralMap: Map<string, number>;
    unitIdMap: Map<string, number>;
    unitPluralMap: Map<string, number>;
    keywordIdMap: Map<string, number>;
  }
): { payload: TandoorRecipePayload; warnings: string[]; field_transformations: string[]; missingEntities: MissingEntities } {
  const warnings: string[] = [];
  const field_transformations: string[] = [];

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
    if (typeof recipe.recipeYield === 'number') {
      // If recipeYield is a number, use it directly
      payload.servings = recipe.recipeYield;
      field_transformations.push(`servings set from recipeYield: ${recipe.recipeYield}`);
    } else if (typeof recipe.recipeYield === 'string') {
      // Parse string format: extract number and text parts
      // Examples: "4 servings" -> servings: 4, servings_text: "servings"
      //           "2 loaves" -> servings: 2, servings_text: "loaves"
      //           "6" -> servings: 6, no servings_text
      const yieldStr = recipe.recipeYield.trim();
      const match = yieldStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      
      if (match) {
        const numValue = parseFloat(match[1]);
        if (!isNaN(numValue)) {
          payload.servings = numValue;
          const textPart = match[2].trim();
          if (textPart) {
            payload.servings_text = textPart;
            field_transformations.push(`servings (${numValue}) and servings_text ('${textPart}') derived from recipeYield: '${recipe.recipeYield}'`);
          } else {
            field_transformations.push(`servings (${numValue}) derived from recipeYield: '${recipe.recipeYield}'`);
          }
        }
      }
    }
  }

  // Handle source URL
  if (recipe.sourceUrl) {
    payload.source_url = recipe.sourceUrl;
  }

  // Handle time fields - map to Tandoor's recipe-level time fields
  // prepTime -> working_time (active preparation time)
  // cookTime -> waiting_time (cooking/waiting time)
  if (recipe.prepTime) {
    const prepMinutes = parseIsoDuration(recipe.prepTime);
    if (prepMinutes !== null) {
      payload.working_time = prepMinutes;
      field_transformations.push(`prepTime (${prepMinutes} min) mapped to working_time`);
    }
  }
  
  if (recipe.cookTime) {
    const cookMinutes = parseIsoDuration(recipe.cookTime);
    if (cookMinutes !== null) {
      payload.waiting_time = cookMinutes;
      field_transformations.push(`cookTime (${cookMinutes} min) mapped to waiting_time`);
    }
  }
  
  // totalTime is informational - validate it equals prep + cook or just note it
  if (recipe.totalTime) {
    const totalMinutes = parseIsoDuration(recipe.totalTime);
    if (totalMinutes !== null) {
      const prepMinutes = payload.working_time || 0;
      const cookMinutes = payload.waiting_time || 0;
      if (totalMinutes !== prepMinutes + cookMinutes) {
        field_transformations.push(`totalTime (${totalMinutes} min) differs from prep + cook time sum (${prepMinutes + cookMinutes} min)`);
      }
    }
  }

  // Handle instructions
  const { steps: instructionSteps, warnings: instructionWarnings } = parseInstructions(
    recipe.recipeInstructions || []
  );
  
  // Apply author attribution to last step if present
  let finalSteps = instructionSteps;
  if (recipe.author?.name) {
    finalSteps = appendAuthorToSteps(instructionSteps, recipe.author.name);
    field_transformations.push(`author '${recipe.author.name}' appended to last step as italicized attribution`);
  }
  
  // Add warning for datePublished if present
  if (recipe.datePublished) {
    warnings.push(`datePublished ('${recipe.datePublished}') not supported by Tandoor and has been ignored`);
  }
  
  payload.steps = finalSteps;
  warnings.push(...instructionWarnings);

  // Handle ingredients
  const { ingredients, warnings: ingredientWarnings, missingEntities: missingIngredientEntities } = parseIngredients(
    recipe.recipeIngredient || [],
    entityMap
  );
  payload.ingredients = ingredients;
  warnings.push(...ingredientWarnings);

  // Handle nutrition - map to Tandoor's nutrition JSON field
  if (recipe.nutrition && typeof recipe.nutrition === 'object') {
    payload.nutrition = recipe.nutrition;
    field_transformations.push('nutrition information included in recipe');
  }

  // Track all missing entities
  const missingEntities: MissingEntities = {
    foods: [...missingIngredientEntities.foods],
    units: [...missingIngredientEntities.units],
    keywords: []
  };

  // Handle keywords (explicitly provided by agent - treat as error if missing)
  const keywordIds: number[] = [];
  if (recipe.keywords && Array.isArray(recipe.keywords)) {
    for (const keyword of recipe.keywords) {
      const id = entityMap.keywordIdMap.get(keyword.toLowerCase());
      if (id !== undefined) {
        keywordIds.push(id);
        field_transformations.push(`keyword '${keyword}' mapped to ID ${id}`);
      } else {
        missingEntities.keywords.push(keyword);
      }
    }
  }

  if (recipe.recipeCategory && typeof recipe.recipeCategory === 'string') {
    const id = entityMap.keywordIdMap.get(recipe.recipeCategory.toLowerCase());
    if (id !== undefined) {
      keywordIds.push(id);
      field_transformations.push(`recipeCategory '${recipe.recipeCategory}' mapped to keyword ID ${id}`);
    } else {
      warnings.push(`recipeCategory '${recipe.recipeCategory}' not found. Use list_all_keywords() to see exact names; consider creating keyword if needed.`);
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
          warnings.push(`recipeCuisine '${cuisine}' not found. Use list_all_keywords() to see exact names; consider creating keyword if needed.`);
        }
      }
    }
  }

  // Handle suitableForDiet - map to keywords if they exist
  if (recipe.suitableForDiet) {
    const diets = Array.isArray(recipe.suitableForDiet)
      ? recipe.suitableForDiet
      : [recipe.suitableForDiet];

    for (const diet of diets) {
      if (typeof diet === 'string') {
        // Convert diet value to a more readable keyword name
        // e.g., "GlutenFreeDiet" -> "gluten free", "VeganDiet" -> "vegan"
        const dietKeyword = diet
          .replace(/Diet$/, '') // Remove 'Diet' suffix
          .replace(/([A-Z])/g, ' $1') // Insert space before capitals
          .trim()
          .toLowerCase();
        
        // Try exact match first, then try the transformed version
        let id = entityMap.keywordIdMap.get(diet.toLowerCase());
        if (id === undefined && dietKeyword) {
          id = entityMap.keywordIdMap.get(dietKeyword);
        }
        
        if (id !== undefined) {
          keywordIds.push(id);
          field_transformations.push(`suitableForDiet '${diet}' mapped to keyword ID ${id}`);
        } else {
          warnings.push(`suitableForDiet '${diet}' not found. Consider creating keyword '${dietKeyword}' if needed.`);
        }
      }
    }
  }

  if (keywordIds.length > 0) {
    payload.keywords = [...new Set(keywordIds)]; // Remove duplicates
  }

  return { payload, warnings, field_transformations, missingEntities };
}

/**
 * Parse ingredients list and map to Tandoor ingredient format
 * 
 * Supports both singular and plural forms of units and foods.
 * For example: "2 cups onions" will match unit "cup" and food "onion"
 * if their plural_name fields are properly set in Tandoor.
 */
function parseIngredients(
  ingredients: string[],
  entityMap: {
    foodIdMap: Map<string, number>;
    foodPluralMap: Map<string, number>;
    unitIdMap: Map<string, number>;
    unitPluralMap: Map<string, number>;
    keywordIdMap: Map<string, number>;
  }
): { ingredients: TandoorIngredient[]; warnings: string[]; missingEntities: MissingEntities } {
  const warnings: string[] = [];
  const missingEntities: MissingEntities = { foods: [], units: [], keywords: [] };
  const tandoorIngredients: TandoorIngredient[] = [];

  ingredients.forEach((ingredientStr, index) => {
    if (!ingredientStr || typeof ingredientStr !== 'string') {
      warnings.push(`Ingredient at index ${index} is not a string`);
      return;
    }

    // Split on comma to separate main ingredient from note
    const [mainPart, ...noteParts] = ingredientStr.split(',');
    const note = noteParts.length > 0 ? noteParts.join(',').trim() : undefined;

    const parsed = parseIngredientAmount(mainPart.trim());
    let foodName: string;
    let amount: string | undefined;
    let unitId: number | undefined;

    if (parsed) {
      amount = parsed.amount;
      const unitAndFood = parsed.unit.trim();

      // Try to extract unit from the start of unitAndFood
      // Check both singular and plural forms
      let extractedUnit = '';
      let remainder = unitAndFood;

      if (unitAndFood) {
        const words = unitAndFood.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
          const potentialUnit = words.slice(0, i + 1).join(' ').toLowerCase();
          // Check singular first, then plural
          if (entityMap.unitIdMap.has(potentialUnit)) {
            extractedUnit = potentialUnit;
            remainder = words.slice(i + 1).join(' ');
            break; // Take the longest matching unit
          } else if (entityMap.unitPluralMap && entityMap.unitPluralMap.has(potentialUnit)) {
            extractedUnit = potentialUnit;
            unitId = entityMap.unitPluralMap.get(potentialUnit);
            remainder = words.slice(i + 1).join(' ');
            break;
          }
        }
      }

      if (extractedUnit && unitId === undefined) {
        unitId = entityMap.unitIdMap.get(extractedUnit);
      }

      foodName = remainder.trim() || unitAndFood;
    } else {
      foodName = mainPart.trim();
    }

    foodName = foodName.toLowerCase();

    // Skip if no food name
    if (!foodName) {
      warnings.push(`Could not parse food name from ingredient: "${ingredientStr}"`);
      return;
    }

    // Look up food ID - try exact match first, then try plural forms, then variations
    let foodId = entityMap.foodIdMap.get(foodName);
    
    // Try plural form if singular not found
    if (foodId === undefined && entityMap.foodPluralMap) {
      foodId = entityMap.foodPluralMap.get(foodName);
    }
    
    if (foodId === undefined && foodName.includes(' ')) {
      // Try splitting on spaces and finding common food parts
      const foodWords = foodName.split(/\s+/);
      for (let i = foodWords.length; i > 0; i--) {
        const testName = foodWords.slice(0, i).join(' ');
        // Check singular then plural
        if (entityMap.foodIdMap.has(testName)) {
          foodId = entityMap.foodIdMap.get(testName);
          break;
        } else if (entityMap.foodPluralMap && entityMap.foodPluralMap.has(testName)) {
          foodId = entityMap.foodPluralMap.get(testName);
          break;
        }
      }
    }

    if (foodId === undefined) {
      missingEntities.foods.push(foodName);
      // Not adding to warnings - this is an error, reported via missingEntities
      return;
    }

    tandoorIngredients.push({
      amount: amount ? parseFloat(amount) : undefined,
      unit: unitId,
      food: foodId,
      note: note,
      order: index,
      original_text: ingredientStr,
      no_amount: !amount
    });
  });

  return { ingredients: tandoorIngredients, warnings, missingEntities };
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
    'suitableForDiet',
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

// ============================================================================
// Entity Resolver (uses search instead of bulk fetch to avoid timeouts)
// ============================================================================

interface EntityCache {
  foods: Map<string, TandoorFood | undefined>;
  units: Map<string, TandoorUnit | undefined>;
  keywords: Map<string, TandoorKeyword | undefined>;
}

interface AsyncMissingEntities {
  foods: string[];
  units: string[];
  keywords: string[];
}

interface AsyncEntityLookup {
  getFood: (name: string) => Promise<TandoorFood | undefined>;
  getUnit: (name: string) => Promise<TandoorUnit | undefined>;
  getKeyword: (name: string) => Promise<TandoorKeyword | undefined>;
  getMissingEntities: () => AsyncMissingEntities;
  /**
   * Find a unit but don't mark it as missing if not found.
   * Used for parsing ingredients where we try to extract potential units.
   * Returns undefined if not found without adding to missing entities.
   */
  findUnit: (name: string) => Promise<TandoorUnit | undefined>;
}

/**
 * EntityResolver uses targeted search API calls instead of bulk fetching
 * all entities from Tandoor. This prevents timeouts on instances with
 * thousands of foods/units/keywords (e.g., 42k+ foods).
 * 
 * Uses in-memory caching to avoid duplicate API calls for the same entity names
 * within a single recipe import.
 */
export class EntityResolver implements AsyncEntityLookup {
  private client: TandoorApiClient;
  private cache: EntityCache;
  private missingEntities: AsyncMissingEntities;

  constructor(client: TandoorApiClient) {
    this.client = client;
    this.cache = {
      foods: new Map(),
      units: new Map(),
      keywords: new Map()
    };
    this.missingEntities = {
      foods: [],
      units: [],
      keywords: []
    };
  }

  async getFood(name: string): Promise<TandoorFood | undefined> {
    const normalizedName = name.toLowerCase().trim();

    // Check cache first
    if (this.cache.foods.has(normalizedName)) {
      return this.cache.foods.get(normalizedName);
    }

    try {
      // Search for the food using the API
      const results = await this.client.searchFood(normalizedName);

      // Find exact match (case-insensitive) in the search results
      // Tandoor search returns foods that contain the query string,
      // so we must scan all results to find the exact match
      const match = results.find(f =>
        f.name.toLowerCase() === normalizedName ||
        (f.plural_name && f.plural_name.toLowerCase() === normalizedName)
      );

      if (match) {
        this.cache.foods.set(normalizedName, match);
        return match;
      }

      // Not found - cache the miss and track as missing
      this.cache.foods.set(normalizedName, undefined);
      if (!this.missingEntities.foods.includes(name)) {
        this.missingEntities.foods.push(name);
      }
      return undefined;
    } catch (error) {
      // API error - treat as not found
      this.cache.foods.set(normalizedName, undefined);
      if (!this.missingEntities.foods.includes(name)) {
        this.missingEntities.foods.push(name);
      }
      return undefined;
    }
  }

  async getUnit(name: string): Promise<TandoorUnit | undefined> {
    const normalizedName = name.toLowerCase().trim();
    
    if (this.cache.units.has(normalizedName)) {
      return this.cache.units.get(normalizedName);
    }

    try {
      const results = await this.client.searchUnit(normalizedName);
      
      const match = results.find(u => 
        u.name.toLowerCase() === normalizedName || 
        (u.plural_name && u.plural_name.toLowerCase() === normalizedName)
      );

      if (match) {
        this.cache.units.set(normalizedName, match);
        return match;
      }

      this.cache.units.set(normalizedName, undefined);
      if (!this.missingEntities.units.includes(name)) {
        this.missingEntities.units.push(name);
      }
      return undefined;
    } catch (error) {
      this.cache.units.set(normalizedName, undefined);
      if (!this.missingEntities.units.includes(name)) {
        this.missingEntities.units.push(name);
      }
      return undefined;
    }
  }

  async getKeyword(name: string): Promise<TandoorKeyword | undefined> {
    const normalizedName = name.toLowerCase().trim();

    if (this.cache.keywords.has(normalizedName)) {
      return this.cache.keywords.get(normalizedName);
    }

    try {
      const results = await this.client.searchKeyword(normalizedName);

      // Find exact match (case-insensitive) in the search results
      const match = results.find(k => k.name.toLowerCase() === normalizedName);

      if (match) {
        this.cache.keywords.set(normalizedName, match);
        return match;
      }

      this.cache.keywords.set(normalizedName, undefined);
      if (!this.missingEntities.keywords.includes(name)) {
        this.missingEntities.keywords.push(name);
      }
      return undefined;
    } catch (error) {
      this.cache.keywords.set(normalizedName, undefined);
      if (!this.missingEntities.keywords.includes(name)) {
        this.missingEntities.keywords.push(name);
      }
      return undefined;
    }
  }

  getMissingEntities(): AsyncMissingEntities {
    return {
      foods: [...this.missingEntities.foods],
      units: [...this.missingEntities.units],
      keywords: [...this.missingEntities.keywords]
    };
  }

  /**
   * Search for a unit without tracking it as "missing" if not found.
   * Used during ingredient parsing to test if a word might be a unit.
   * This is distinct from getUnit() which is used for explicit unit lookups.
   */
  async findUnit(name: string): Promise<TandoorUnit | undefined> {
    const normalizedName = name.toLowerCase().trim();
    
    // Check cache first
    if (this.cache.units.has(normalizedName)) {
      return this.cache.units.get(normalizedName);
    }

    try {
      const results = await this.client.searchUnit(normalizedName);
      
      const match = results.find(u => 
        u.name.toLowerCase() === normalizedName || 
        (u.plural_name && u.plural_name.toLowerCase() === normalizedName)
      );

      if (match) {
        this.cache.units.set(normalizedName, match);
        return match;
      }

      // Not found - cache the miss but don't track as missing (this is a speculative lookup)
      this.cache.units.set(normalizedName, undefined);
      return undefined;
    } catch (error) {
      // API error - just return undefined
      return undefined;
    }
  }
}

/**
 * Async version of convertSchemaOrgToTandoor that uses the EntityResolver
 * instead of a pre-built entity map. This prevents the need to fetch all
 * entities upfront, avoiding timeouts with large databases.
 */
export async function convertSchemaOrgToTandoorAsync(
  recipe: SchemaOrgRecipe,
  entityResolver: AsyncEntityLookup
): Promise<{ payload: TandoorRecipePayload; field_transformations: string[]; missingEntities: AsyncMissingEntities }> {
  const field_transformations: string[] = [];

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
    if (typeof recipe.recipeYield === 'number') {
      payload.servings = recipe.recipeYield;
      field_transformations.push(`servings set from recipeYield: ${recipe.recipeYield}`);
    } else if (typeof recipe.recipeYield === 'string') {
      const yieldStr = recipe.recipeYield.trim();
      const match = yieldStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      
      if (match) {
        const numValue = parseFloat(match[1]);
        if (!isNaN(numValue)) {
          payload.servings = numValue;
          const textPart = match[2].trim();
          if (textPart) {
            payload.servings_text = textPart;
            field_transformations.push(`servings (${numValue}) and servings_text ('${textPart}') derived from recipeYield: '${recipe.recipeYield}'`);
          } else {
            field_transformations.push(`servings (${numValue}) derived from recipeYield: '${recipe.recipeYield}'`);
          }
        }
      }
    }
  }

  // Handle source URL
  if (recipe.sourceUrl) {
    payload.source_url = recipe.sourceUrl;
  }

  // Handle time fields
  if (recipe.prepTime) {
    const prepMinutes = parseIsoDuration(recipe.prepTime);
    if (prepMinutes !== null) {
      payload.working_time = prepMinutes;
      field_transformations.push(`prepTime (${prepMinutes} min) mapped to working_time`);
    }
  }
  
  if (recipe.cookTime) {
    const cookMinutes = parseIsoDuration(recipe.cookTime);
    if (cookMinutes !== null) {
      payload.waiting_time = cookMinutes;
      field_transformations.push(`cookTime (${cookMinutes} min) mapped to waiting_time`);
    }
  }
  
  if (recipe.totalTime) {
    const totalMinutes = parseIsoDuration(recipe.totalTime);
    if (totalMinutes !== null) {
      const prepMinutes = payload.working_time || 0;
      const cookMinutes = payload.waiting_time || 0;
      if (totalMinutes !== prepMinutes + cookMinutes) {
        field_transformations.push(`totalTime (${totalMinutes} min) differs from prep + cook time sum (${prepMinutes + cookMinutes} min)`);
      }
    }
  }

  // Handle instructions
  const { steps: instructionSteps } = parseInstructions(
    recipe.recipeInstructions || []
  );
  
  let finalSteps = instructionSteps;
  if (recipe.author?.name) {
    finalSteps = appendAuthorToSteps(instructionSteps, recipe.author.name);
    field_transformations.push(`author '${recipe.author.name}' appended to last step as italicized attribution`);
  }
  
  payload.steps = finalSteps;

  // Handle ingredients using async resolution
  const ingredients: TandoorIngredient[] = [];
  const ingredientList = recipe.recipeIngredient || [];
  
  for (let index = 0; index < ingredientList.length; index++) {
    const ingredientStr = ingredientList[index];
    
    if (!ingredientStr || typeof ingredientStr !== 'string') {
      continue;
    }

    // Split on comma to separate main ingredient from note
    const [mainPart, ...noteParts] = ingredientStr.split(',');
    const note = noteParts.length > 0 ? noteParts.join(',').trim() : undefined;

    const parsed = parseIngredientAmount(mainPart.trim());
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
          // Use a special method that doesn't mark failed lookups as missing
          // since many "potential units" are actually foods
          const unitResult = await entityResolver.findUnit(potentialUnit);
          
          if (unitResult) {
            extractedUnit = potentialUnit;
            unitId = unitResult.id;
            remainder = words.slice(i + 1).join(' ');
            break;
          }
        }
      }

      foodName = remainder.trim() || unitAndFood;
    } else {
      foodName = mainPart.trim();
    }

    foodName = foodName.toLowerCase();

    // Skip if no food name
    if (!foodName) {
      continue;
    }

    // Look up food ID using async resolver
    let foodId: number | undefined;
    
    // Try full name first
    let foodResult = await entityResolver.getFood(foodName);
    
    // If not found and has multiple words, try progressively shorter prefixes
    if (!foodResult && foodName.includes(' ')) {
      const foodWords = foodName.split(/\s+/);
      for (let i = foodWords.length; i > 0; i--) {
        const testName = foodWords.slice(0, i).join(' ');
        foodResult = await entityResolver.getFood(testName);
        if (foodResult) {
          break;
        }
      }
    }

    if (foodResult) {
      foodId = foodResult.id;
    }

    if (foodId === undefined) {
      // Entity resolver already tracked this as missing
      continue;
    }

    ingredients.push({
      amount: amount ? parseFloat(amount) : undefined,
      unit: unitId,
      food: foodId,
      note: note,
      order: index,
      original_text: ingredientStr,
      no_amount: !amount
    });
  }

  payload.ingredients = ingredients;

  // Handle nutrition
  if (recipe.nutrition && typeof recipe.nutrition === 'object') {
    payload.nutrition = recipe.nutrition;
    field_transformations.push('nutrition information included in recipe');
  }

  // Handle keywords using async resolution
  const keywordIds: number[] = [];
  
  if (recipe.keywords && Array.isArray(recipe.keywords)) {
    for (const keyword of recipe.keywords) {
      const keywordResult = await entityResolver.getKeyword(keyword.toLowerCase().trim());
      if (keywordResult) {
        keywordIds.push(keywordResult.id);
        field_transformations.push(`keyword '${keyword}' mapped to ID ${keywordResult.id}`);
      }
    }
  }

  if (recipe.recipeCategory && typeof recipe.recipeCategory === 'string') {
    const categoryResult = await entityResolver.getKeyword(recipe.recipeCategory.toLowerCase().trim());
    if (categoryResult) {
      keywordIds.push(categoryResult.id);
      field_transformations.push(`recipeCategory '${recipe.recipeCategory}' mapped to keyword ID ${categoryResult.id}`);
    }
  }

  if (recipe.recipeCuisine) {
    const cuisines = Array.isArray(recipe.recipeCuisine)
      ? recipe.recipeCuisine
      : [recipe.recipeCuisine];

    for (const cuisine of cuisines) {
      if (typeof cuisine === 'string') {
        const cuisineResult = await entityResolver.getKeyword(cuisine.toLowerCase().trim());
        if (cuisineResult) {
          keywordIds.push(cuisineResult.id);
          field_transformations.push(`recipeCuisine '${cuisine}' mapped to keyword ID ${cuisineResult.id}`);
        }
      }
    }
  }

  if (recipe.suitableForDiet) {
    const diets = Array.isArray(recipe.suitableForDiet)
      ? recipe.suitableForDiet
      : [recipe.suitableForDiet];

    for (const diet of diets) {
      if (typeof diet === 'string') {
        const dietKeyword = diet
          .replace(/Diet$/, '')
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .toLowerCase();
        
        let dietResult = await entityResolver.getKeyword(diet.toLowerCase());
        if (!dietResult && dietKeyword) {
          dietResult = await entityResolver.getKeyword(dietKeyword);
        }
        
        if (dietResult) {
          keywordIds.push(dietResult.id);
          field_transformations.push(`suitableForDiet '${diet}' mapped to keyword ID ${dietResult.id}`);
        }
      }
    }
  }

  if (keywordIds.length > 0) {
    payload.keywords = [...new Set(keywordIds)];
  }

  // Get missing entities from resolver
  const missingEntities = entityResolver.getMissingEntities();

  return { payload, field_transformations, missingEntities };
}
