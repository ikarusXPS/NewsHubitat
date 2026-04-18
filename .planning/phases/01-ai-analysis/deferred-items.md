# Deferred Items - Phase 01

## Pre-existing Test Failures

Discovered during 01-01-PLAN execution. These failures existed before the plan execution (not caused by this plan's changes).

### utils.test.ts (6 failures)
- `getRegionColor('western')` returns `'bg-gray-500'` instead of expected `'bg-blue-500'`
- `getRegionColor('middle-east')` returns `'bg-gray-500'` instead of expected `'bg-orange-500'`
- `getRegionColor('turkish')` returns `'bg-gray-500'` instead of expected `'bg-red-500'`
- `getRegionColor('russian')` returns `'bg-gray-500'` instead of expected `'bg-purple-500'`
- `getRegionLabel('western')` returns `'western'` instead of expected `'Westliche Medien'`
- `getRegionLabel('middle-east')` returns `'middle-east'` instead of expected `'Nahost'`

### factories.test.ts (3 failures)
- `getMockNewsSource()` region is `'deutschland'` instead of expected `'western'`
- `getMockStateSource()` region is `'russland'` instead of expected `'russian'`
- `getMockSentimentData()` region is `'usa'` instead of expected `'western'`

**Root cause:** The region values in the codebase appear to have changed from the 6-value enum (`western`, `russian`, etc.) to a more granular set (`deutschland`, `russland`, `usa`, etc.). The tests were not updated to match.

**Impact:** Low - these are test expectation mismatches, not runtime bugs.

**Recommended action:** Update test expectations or factory functions to use the current region values.
