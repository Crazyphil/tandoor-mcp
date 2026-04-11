/**
 * Jest manual mock for the import module
 * Used by server.test.ts which mocks this module
 */
import { jest } from '@jest/globals';

// Mock RecipeImporter as a class that returns an instance with the method
export const RecipeImporter = jest.fn(function(this: { importRecipeFromJson: jest.Mock }) {
  this.importRecipeFromJson = jest.fn();
});
