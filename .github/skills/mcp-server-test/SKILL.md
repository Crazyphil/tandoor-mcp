---
name: mcp-server-test
description: 'Execute end-to-end test plans for MCP servers with automated cleanup. Use when: testing MCP tool functionality, validating server responses, verifying tool definitions work correctly against a live MCP server, running integration tests against external APIs via MCP tools, performing cleanup of test artifacts via direct API calls.'
argument-hint: 'Optional: specific test section to run (e.g., "read-operations", "write-operations", "import-tests", "cleanup")'
user-invocable: true
disable-model-invocation: true
---

# MCP Server Test

Execute comprehensive end-to-end tests against an MCP server's tools, following a structured test plan to verify functionality, error handling, and data integrity. The test plan is contained within the file `TEST_PLAN.md` in the same directory as the skill.

## When to Use

- Testing new MCP server implementations
- Validating tool responses match expected schemas
- Running integration tests against live external APIs
- Verifying CRUD operations work correctly
- Checking duplicate handling and error responses
- Regression testing after server changes

## Test Execution Process

### Phase 1: Pre-Flight Checks

Before running tests:
1. Verify the MCP server is connected and available
2. Check for existing test artifacts that may conflict (search for test entities)
3. If artifacts exist, **STOP** and notify user to clean up first
4. Document the starting state

### Phase 2: Read Operations Tests (Section 1-2)

Execute tests from sections 1 and 2 of the test plan.

### Phase 3: Write Operations Tests (Section 3)

Execute tests from section 3 of the test plan.

### Phase 4: Import/Integration Tests (Section 4)

Execute tests from section 4 of the test plan.

### Phase 5: Verification Tests (Section 5)

Execute tests from section 5 of the test plan.

### Phase 6: Results Compilation

Generate test report with:
- Total tests run
- Passed count
- Failed count with details
- Feature gaps documented

### Phase 7: Cleanup Phase (Automated)

**Purpose**: Automatically delete test artifacts via direct API calls

The MCP server doesn't expose delete tools, but the Tandoor API supports DELETE endpoints. To access the API, a Bearer token is needed, which is specified in the file `.vscode/mcp.json` in the workspace as the environment variable "TANDOOR_API_TOKEN". Use the API client to clean up:

#### 7.1 Collect Test Artifacts
Search for all test entities created during the test run:
- Foods matching pattern: `copilot-test-*`
- Units matching pattern: `copilot-test-*`
- Keywords matching pattern: `copilot-test-*`
- Recipes matching pattern: `Copilot Test Recipe*`

#### 7.2 Delete Test Foods
For each test food found:
1. Call `DELETE /api/food/{id}/`
2. Expected: 204 No Content
3. Verify: Food no longer retrievable

#### 7.3 Delete Test Units
For each test unit found:
1. Call `DELETE /api/unit/{id}/`
2. Expected: 204 No Content
3. Verify: Unit no longer retrievable

#### 7.4 Delete Test Keywords
For each test keyword found:
1. Call `DELETE /api/keyword/{id}/`
2. Expected: 204 No Content
3. Verify: Keyword no longer retrievable

#### 7.5 Delete Test Recipes
For each test recipe found:
1. Call `DELETE /api/recipe/{id}/`
2. Expected: 204 No Content
3. Verify: Recipe no longer retrievable

#### 7.6 Cleanup Verification
Search again for all test patterns to confirm deletion:
- All `copilot-test-*` searches should return empty results
- All `Copilot Test Recipe` searches should return empty results

#### 7.7 Cleanup Report
Report cleanup status:
```
Cleanup Summary:
- Foods deleted: X/Y
- Units deleted: X/Y
- Keywords deleted: X/Y
- Recipes deleted: X/Y
- Errors: [list any failed deletions]
```

## Test Result Format

For each test, report:
```
✅ PASS: test_name
   Input: {...}
   Expected: SUCCESS/FAILURE
   Actual: SUCCESS/FAILURE
   Verifications: X/Y passed

❌ FAIL: test_name
   Input: {...}
   Expected: X
   Actual: Y
   Failure: description
   
⚠️  SKIPPED: test_name
   Reason: why test was skipped
```
Write the test report with your findings to file `TEST_RESULTS.md` in the root of the workspace, overwriting existing content.

## Success Criteria

- **PASS**: Tool returns expected response type, all verifications match
- **FAIL**: Tool returns unexpected response, error codes don't match spec, or verifications fail
- **PARTIAL**: Tool works but with documented limitations (e.g., missing duplicate detection)

## Important Notes

1. **Execute exactly as specified**: Do not modify test inputs or work around errors
2. **Report reality**: If tool fails as spec'd, that's a PASS (test catches the bug)
3. **Document behavior**: If spec expects error but tool succeeds differently, document the actual behavior
4. **Test isolation**: Tests may have dependencies (create before duplicate test) - run in order
5. **Cleanup is automated**: The skill uses direct API calls (not MCP tools) to delete test artifacts after testing
6. **Requires API credentials**: Cleanup phase needs valid Tandoor API token with delete permissions
