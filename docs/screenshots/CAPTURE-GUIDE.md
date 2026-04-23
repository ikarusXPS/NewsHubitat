# Screenshot Capture Guide

Capture screenshots at **1920x1080** resolution for best quality.

## Required Screenshots

| Filename | Page | What to Capture |
|----------|------|-----------------|
| `dashboard.png` | `/` | News feed with Signal Cards, showing multiple regions |
| `monitor-globe.png` | `/monitor` | 3D globe with event markers visible |
| `monitor-events.png` | `/monitor` | Event list panel with severity colors |
| `analysis.png` | `/analysis` | Topic clusters with perspective distribution |
| `timeline.png` | `/timeline` | Event timeline with category filters |
| `community.png` | `/community` | Contribute tab showing badges/XP |
| `feed-manager.png` | Any page | Feed Manager modal open (click gear icon) |
| `shortcuts.png` | Any page | Keyboard shortcuts modal (press `?`) |

## Capture Tips

1. **Dark theme**: The app defaults to dark theme - keep it for consistency
2. **Seed data**: Run `npm run seed` to populate with sample data
3. **Browser**: Use Chrome DevTools device toolbar for exact 1920x1080
4. **Format**: PNG with transparency disabled
5. **Compress**: Use TinyPNG or similar to reduce file size

## Quick Capture with Playwright

```bash
# Capture all pages automatically
npx playwright test e2e/screenshots.spec.ts --project=chromium
```

Create `e2e/screenshots.spec.ts`:

```typescript
import { test } from './fixtures';

test('capture dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'docs/screenshots/dashboard.png' });
});

// Add more for other pages...
```
