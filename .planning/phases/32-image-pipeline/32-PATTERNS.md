# Phase 32: Image Pipeline - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 3 modified files
**Analogs found:** 3 / 3 (all share the same analog: ResponsiveImage)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/SignalCard.tsx` | component | request-response | `src/components/ResponsiveImage.tsx` | exact |
| `src/components/NewsCardPremium.tsx` | component | request-response | `src/components/ResponsiveImage.tsx` | exact |
| `src/components/ForYouCard.tsx` | component | request-response | `src/components/ResponsiveImage.tsx` | exact |

## Pattern Assignments

### `src/components/SignalCard.tsx` (component, request-response)

**Analog:** `src/components/ResponsiveImage.tsx`

**Current image implementation** (lines 134-161):
```typescript
<div className="relative h-40 overflow-hidden">
  {hasValidImage ? (
    <>
      {/* Loading skeleton */}
      {imageLoading && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${perspective.color}10 0%, #0a0e1a 50%, ${perspective.color}05 100%)`,
          }}
        />
      )}
      <img
        src={article.imageUrl}
        alt={article.title}
        loading="lazy"
        decoding="async"
        className={cn(
          'h-full w-full object-cover transition-all duration-500 group-hover:scale-105',
          imageLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setImageLoading(false)}
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
      />
    </>
  ) : (
    /* Enhanced fallback placeholder with perspective-colored gradient + pattern */
    // ... perspective-specific fallback (lines 164-221)
  )}
</div>
```

**Migration pattern - Replace `<img>` with ResponsiveImage:**
```typescript
// AFTER: Use ResponsiveImage inside the hasValidImage branch
import { ResponsiveImage } from './ResponsiveImage';

<div className="relative h-40 overflow-hidden">
  {hasValidImage ? (
    <ResponsiveImage
      src={article.imageUrl}
      alt={article.title}
      priority={index < 6}  // D-07: first 6 cards eager load
      aspectRatio="16:9"    // Matches current h-40 container proportionally
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="group-hover:scale-105 transition-transform duration-500"
    />
  ) : (
    /* PRESERVE: Enhanced fallback placeholder with perspective-colored gradient */
    // Keep existing fallback (lines 164-221) - DO NOT CHANGE
  )}
  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent" />
</div>
```

**Critical preservation - perspective fallback** (lines 164-221):
The perspective-colored gradient fallback MUST be preserved. Only replace the `<img>` tag inside the `hasValidImage` branch. The fallback placeholder is unique to SignalCard and should NOT be handled by ResponsiveImage.

**State cleanup:**
Remove these state variables as ResponsiveImage handles them internally:
```typescript
// REMOVE (ResponsiveImage handles internally):
const [imageError, setImageError] = useState(false);
const [imageLoading, setImageLoading] = useState(true);
```

Keep `hasValidImage` check but simplify to:
```typescript
const hasValidImage = article.imageUrl && article.imageUrl.trim() !== '';
```

---

### `src/components/NewsCardPremium.tsx` (component, request-response)

**Analog:** `src/components/ResponsiveImage.tsx`

**Current motion.img implementation** (lines 188-200):
```typescript
<div className="relative h-48 overflow-hidden">
  <motion.img
    src={article.imageUrl}
    alt=""
    loading="lazy"
    decoding="async"
    onError={() => setImageError(true)}
    className="h-full w-full object-cover"
    animate={{ scale: isHovered ? 1.05 : 1 }}
    transition={{ duration: 0.5 }}
  />
  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
  // ... floating badges
</div>
```

**Migration pattern - Wrap ResponsiveImage in motion.div:**
```typescript
// AFTER: motion.div wrapper for animation, ResponsiveImage for optimization
import { ResponsiveImage } from './ResponsiveImage';

{article.imageUrl && !imageError && (
  <div className="relative h-48 overflow-hidden">
    <motion.div
      animate={{ scale: isHovered ? 1.05 : 1 }}
      transition={{ duration: 0.5 }}
      className="h-full w-full"
    >
      <ResponsiveImage
        src={article.imageUrl}
        alt=""
        aspectRatio="16:9"    // Matches h-48 container (16:9 = 56.25%)
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        // No priority prop - NewsCardPremium doesn't have index, defaults to lazy
      />
    </motion.div>
    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
    {/* ... floating badges unchanged */}
  </div>
)}
```

**Framer Motion constraint:**
DO NOT use `motion.img` with ResponsiveImage. ResponsiveImage renders a `<picture>` element with multiple `<source>` children which doesn't animate well directly. Wrap in `motion.div` instead.

**State to remove:**
```typescript
// REMOVE - ResponsiveImage handles error state:
const [imageError, setImageError] = useState(false);
```

Update the conditional:
```typescript
// BEFORE:
{article.imageUrl && !imageError && (

// AFTER:
{article.imageUrl && (
```

---

### `src/components/ForYouCard.tsx` (component, request-response)

**Analog:** `src/components/ResponsiveImage.tsx`

**Current img implementation** (lines 58-66):
```typescript
{article.imageUrl && (
  <div className="relative aspect-video mb-3 rounded-lg overflow-hidden bg-gray-800">
    <img
      src={article.imageUrl}
      alt=""
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      loading="lazy"
    />
  </div>
)}
```

**Migration pattern - Direct replacement:**
```typescript
// AFTER: ResponsiveImage with fixed carousel width
import { ResponsiveImage } from './ResponsiveImage';

{article.imageUrl && (
  <div className="relative mb-3 rounded-lg overflow-hidden">
    <ResponsiveImage
      src={article.imageUrl}
      alt=""
      aspectRatio="16:9"    // aspect-video is 16:9
      sizes="280px"         // Fixed carousel card width
      className="group-hover:scale-105 transition-transform duration-300"
      // No priority - carousel is below fold
    />
  </div>
)}
```

**Simplification notes:**
- Remove `bg-gray-800` from wrapper - ResponsiveImage has its own `bg-gray-900` placeholder
- aspect-video ratio handled by ResponsiveImage's `aspectRatio="16:9"` prop
- Fixed `sizes="280px"` because carousel cards have fixed width, not responsive grid

---

## Shared Patterns

### ResponsiveImage Component (The Canonical Pattern)
**Source:** `src/components/ResponsiveImage.tsx`
**Apply to:** All three card components

**Imports pattern** (lines 1-5):
```typescript
import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { ImageOff } from 'lucide-react';
import { buildCloudinaryUrl } from '../lib/cloudinary';
import { cn } from '../lib/utils';
```

**Props interface** (lines 18-25):
```typescript
interface ResponsiveImageProps {
  src: string;
  alt: string;
  priority?: boolean; // true for first 6 cards (D-07)
  aspectRatio?: '16:9' | '4:3' | '1:1';
  className?: string;
  sizes?: string; // default: "(max-width: 768px) 100vw, 50vw"
}
```

**Priority loading pattern** (lines 48-57):
```typescript
// Use IntersectionObserver for lazy loading
// Skip observer for priority images (they load immediately)
const { ref, inView } = useInView({
  triggerOnce: true,
  threshold: 0.1,
  skip: priority, // Skip observer for priority images per D-77
});

// Should load image if priority or in view
const shouldLoad = priority || inView;
```

**Picture element with format fallback** (lines 96-127):
```typescript
<picture className="absolute inset-0">
  {/* AVIF source - highest priority, best compression */}
  <source
    type="image/avif"
    srcSet={generateSrcSet('avif')}
    sizes={sizes}
  />

  {/* WebP source - good compression, wide support */}
  <source
    type="image/webp"
    srcSet={generateSrcSet('webp')}
    sizes={sizes}
  />

  {/* JPEG fallback - universal support */}
  <img
    src={buildCloudinaryUrl(src, 960, 'jpg')}
    srcSet={generateSrcSet('jpg')}
    sizes={sizes}
    alt={alt}
    loading={priority ? 'eager' : 'lazy'}
    decoding="async"
    fetchPriority={priority ? 'high' : 'auto'}
    onLoad={handleImageLoad}
    onError={handleImageError}
    className={cn(
      'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
      loaded ? 'opacity-100' : 'opacity-0'
    )}
  />
</picture>
```

---

### Cloudinary URL Builder
**Source:** `src/lib/cloudinary.ts`
**Apply to:** Used internally by ResponsiveImage (no changes needed)

**URL pattern** (lines 35-40):
```typescript
// Cloudinary fetch mode: f_format,q_auto,w_width
return `https://res.cloudinary.com/${cloudName}/image/fetch/f_${format},q_auto,w_${width}/${encodeURIComponent(originalUrl)}`;
```

**Graceful fallback** (lines 25-28):
```typescript
// Graceful fallback if no Cloudinary configured
if (!cloudName) {
  return originalUrl;
}
```

---

### Priority Loading (D-07, D-08)
**Source:** User decisions from CONTEXT.md
**Apply to:** SignalCard only (has `index` prop)

```typescript
// First 6 cards get priority=true
// D-07: First 6 cards get priority=true (eager loading, fetchPriority=high)
// D-08: Changed from 3 to 6 for better wide-screen experience (3 columns visible)
priority={index < 6}
```

---

### Sizes Attribute Values
**Source:** RESEARCH.md Pattern 1, 2, 3
**Apply to:** All card components

| Component | Grid Layout | Sizes Value |
|-----------|-------------|-------------|
| SignalCard | 1col mobile, 2col tablet, 3col desktop | `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw` |
| NewsCardPremium | Same responsive grid | `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw` |
| ForYouCard | Fixed 280px carousel cards | `280px` |

---

## No Analog Found

None - all files have exact matches with the ResponsiveImage component.

---

## Anti-Patterns to Avoid

### 1. Do NOT animate ResponsiveImage directly with motion
```typescript
// WRONG: motion.img can't handle <picture> element
<motion.img as={ResponsiveImage} />

// CORRECT: Wrap in motion.div
<motion.div animate={{ scale: isHovered ? 1.05 : 1 }}>
  <ResponsiveImage ... />
</motion.div>
```

### 2. Do NOT remove SignalCard's perspective fallback
```typescript
// WRONG: Replacing entire image section with ResponsiveImage
{article.imageUrl && <ResponsiveImage ... />}

// CORRECT: Keep hasValidImage check and preserve fallback
{hasValidImage ? (
  <ResponsiveImage ... />
) : (
  /* Keep perspective-colored gradient fallback */
)}
```

### 3. Do NOT hardcode priority=true
```typescript
// WRONG: Static priority for all cards
<ResponsiveImage priority={true} ... />

// CORRECT: Index-based calculation
<ResponsiveImage priority={index < 6} ... />
```

### 4. Do NOT omit sizes attribute
```typescript
// WRONG: Missing sizes - browser can't select optimal srcSet width
<ResponsiveImage src={url} alt={alt} />

// CORRECT: Always provide realistic sizes based on layout
<ResponsiveImage
  src={url}
  alt={alt}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

---

## Metadata

**Analog search scope:** `src/components/`
**Files scanned:** 4 (ResponsiveImage + 3 target components)
**Pattern extraction date:** 2026-04-25

**Key insight:** This phase is pure integration, not infrastructure building. ResponsiveImage and cloudinary.ts already implement all image optimization features. The migration is straightforward component replacement with attention to:
1. Preserving SignalCard's perspective-colored fallback
2. Using motion.div wrapper for NewsCardPremium's hover animation
3. Passing correct `sizes` and `priority` props
