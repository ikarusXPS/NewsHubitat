---
status: partial
phase: 06-reading-history
source:
  - 06-01-SUMMARY.md
  - 06-02-SUMMARY.md
  - 06-03-SUMMARY.md
  - 06-04-SUMMARY.md
  - 06-05-SUMMARY.md
  - 06-06-SUMMARY.md
started: 2026-04-19T10:45:00Z
updated: 2026-04-19T10:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Server boots without errors, homepage loads with articles
result: pass

### 2. Reading History Page Access
expected: Navigate to /history via Sidebar. Page loads showing "Reading History" header with stats section and timeline-grouped articles (or empty state if no history).
result: pass

### 3. Article Marks as Read
expected: Click any article in NewsFeed. Return to /history. The article appears in "Today" section with read count badge.
result: blocked
blocked_by: server
reason: "No articles in NewsFeed - news aggregator hasn't fetched content yet"

### 4. History Filters Work
expected: On /history page, use search box to filter articles. Toggle region buttons to filter by region. Select date preset to filter by time.
result: skipped
reason: "No history yet - no articles to read"

### 5. For You Carousel (Authenticated + 10+ reads)
expected: Login as verified user with 10+ articles read. Navigate to homepage. "For You" carousel appears below HeroSection with personalized article cards showing interest badge.
result: skipped
reason: "No articles available"

### 6. For You Not Shown (Insufficient reads)
expected: Login as new user with <10 articles read. Navigate to homepage. For You carousel does NOT appear (or shows threshold message).
result: skipped
reason: "No articles available"

### 7. Profile Reading Insights
expected: Navigate to Profile page. See Reading Insights section showing: daily streak, weekly activity bars, total articles, favorite regions, and top topics.
result: skipped

### 8. Avatar Picker Opens
expected: In Settings, click "Change Avatar" button. Modal opens showing region-based avatar selection with locked/unlocked regions based on reading history.
result: skipped

### 9. Personalization Toggle in Settings
expected: Navigate to Settings. Find "Reading & Personalization" section. Toggle personalization switch - it changes state and persists on page refresh.
result: skipped

### 10. History Pause Toggle in Settings
expected: In Settings, toggle "Pause History" switch. Read an article. Check /history - new article should NOT appear while paused.
result: skipped
reason: "No articles available"

### 11. Badge Definitions Load
expected: Navigate to Profile or Badges section. Badge grid loads showing badge cards organized by category (volume, diversity, behavior).
result: pass

### 12. Badge Category Filter
expected: On badge grid, click category buttons (All, Volume, Diversity, Behavior). Grid filters to show only badges in selected category.
result: skipped
reason: "No account"

### 13. Export Data Button
expected: In Settings > Account section, click "Export Data" button. Modal opens with JSON/CSV format options. Selecting format and clicking download initiates file download.
result: pass

### 14. Delete Account Button
expected: In Settings > Account section, click "Delete Account" button. Modal opens requiring email + password confirmation with 7-day grace period warning.
result: skipped
reason: "No account"

### 15. Clear History Preserves Badges
expected: On /history page, click "Clear History". Confirm in dialog. History clears but badges remain on profile (verified via badge grid).
result: skipped
reason: "No history"

## Summary

total: 15
passed: 4
issues: 0
blocked: 1
skipped: 10

## Gaps

[none yet]
