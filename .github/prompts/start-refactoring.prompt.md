---
description: "Perform a gentle refactoring round between features: review code against documentation, identify inconsistencies, improve readability without micro-management"
name: "Start Refactoring"
agent: "agent"
argument-hint: "Focus area or specific files to review (optional - will review entire codebase by default)"
---

# Refactoring Round

Perform a thorough but gentle refactoring review of the codebase. This is intended to be run between major feature additions to maintain code quality and consistency.

## Process

### 1. Gather Context
Read and understand:
- `README.md` or `ARCHITECTURE.md` for high-level design
- `mcp-spec.md`, `SCHEMA_COMPATIBILITY.md`, or similar specification documents
- Key source files in `src/` that implement the documented behavior
- Any recent changes (check git status if available)

### 2. Identify Issues
Look for these common inconsistencies and opportunities:

**Documentation vs Code Drift**
- Functionality described in docs but missing/implemented differently in code
- Step numbers out of sequence in comments (e.g., two "Step 7" labels)
- Parameter names that don't match the spec

**Schema/Type Mismatches**
- Zod schemas that don't allow structures the code actually handles
- TypeScript interfaces missing fields the implementation uses
- Optional/required field mismatches between schema and spec

**Code Duplication & Boilerplate**
- Identical error handling patterns repeated across handlers
- Similar validation logic in multiple places
- Copy-pasted code with only entity type names changed

**Dead Code**
- Deprecated exports or aliases no longer referenced
- Unused imports or variables
- Commented-out code sections

**Missing Abstractions**
- Utility functions that could be extracted to reduce duplication
- Common patterns that could be standardized

### 3. Be Selective
- **Focus on larger improvements**: Don't change code just for the sake of changing it
- **Gentle changes**: Prefer small, targeted fixes over large rewrites
- **Preserve working code**: If the code is good as documented, leave it be

### 4. Make Changes
For each identified issue:
1. Create a todo list to track progress
2. Fix the issue with minimal, focused changes
3. Run tests after each change to ensure nothing breaks
4. Run linting to maintain code style

### 5. Verify
- All tests must pass
- Linting must pass
- The behavior should remain functionally identical

## Output

Summarize:
1. What issues were found
2. What changes were made and why
3. What was intentionally left unchanged (and why)
4. Test and lint status

## Example Invocations

- `/start-refactoring` - Review entire codebase against all documentation
- `/start-refactoring src/tools/` - Focus on the tools directory
- `/start-refactoring error handling` - Focus on error handling patterns across the codebase
