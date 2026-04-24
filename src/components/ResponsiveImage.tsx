import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { ImageOff } from 'lucide-react';
import { buildCloudinaryUrl } from '../lib/cloudinary';
import { cn } from '../lib/utils';

/**
 * ResponsiveImage - Optimized image component with srcSet, lazy loading, and blur-up
 *
 * Features:
 * - srcSet with 4 viewport sizes (320w, 640w, 960w, 1280w) per D-73
 * - Modern format support: AVIF -> WebP -> JPEG fallback per D-75
 * - Lazy loading with IntersectionObserver (skipped for priority images) per D-77
 * - Blur-up placeholder with 300ms fade transition per D-76
 * - Error handling with ImageOff icon fallback
 */

interface ResponsiveImageProps {
  src: string;
  alt: string;
  priority?: boolean; // true for first 3 cards (D-77, D-78)
  aspectRatio?: '16:9' | '4:3' | '1:1';
  className?: string;
  sizes?: string; // default: "(max-width: 768px) 100vw, 50vw"
}

// srcSet widths per D-73
const WIDTHS = [320, 640, 960, 1280];

// Aspect ratio to padding-bottom mapping
const ASPECT_RATIOS = {
  '16:9': 'pb-[56.25%]', // 9/16 = 0.5625
  '4:3': 'pb-[75%]', // 3/4 = 0.75
  '1:1': 'pb-[100%]', // 1/1 = 1
};

export function ResponsiveImage({
  src,
  alt,
  priority = false,
  aspectRatio = '16:9',
  className,
  sizes = '(max-width: 768px) 100vw, 50vw',
}: Readonly<ResponsiveImageProps>) {
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Use IntersectionObserver for lazy loading
  // Skip observer for priority images (they load immediately)
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    skip: priority, // Skip observer for priority images per D-77
  });

  // Should load image if priority or in view
  const shouldLoad = priority || inView;

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
    setLoaded(true); // Stop showing loading state
  };

  // Handle image load success
  const handleImageLoad = () => {
    setLoaded(true);
  };

  // Generate srcSet string for a given format
  const generateSrcSet = (format: 'avif' | 'webp' | 'jpg'): string => {
    return WIDTHS.map(
      (w) => `${buildCloudinaryUrl(src, w, format)} ${w}w`
    ).join(', ');
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden bg-gray-900',
        aspectRatio && ASPECT_RATIOS[aspectRatio],
        className
      )}
    >
      {/* Blur placeholder - shows while loading */}
      {!loaded && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] to-[#050810] animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Conditional load based on priority or inView */}
      {shouldLoad && !imageError && (
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
      )}

      {/* Error state - shows ImageOff icon */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <ImageOff className="h-8 w-8 text-gray-600" aria-label="Image failed to load" />
        </div>
      )}
    </div>
  );
}
