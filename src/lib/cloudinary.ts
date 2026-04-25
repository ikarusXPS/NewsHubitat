/**
 * Cloudinary URL builder for responsive images
 *
 * Uses Cloudinary's "fetch" mode to transform external images
 * on-the-fly without uploading them first.
 */

/**
 * Build Cloudinary URL for responsive images
 * Falls back to original URL if Cloudinary not configured
 *
 * @param originalUrl - The original image URL to transform
 * @param width - Target width in pixels
 * @param format - Output format (avif, webp, jpg)
 * @returns Cloudinary fetch URL or original URL if not configured
 */
export function buildCloudinaryUrl(
  originalUrl: string,
  width: number,
  format: 'avif' | 'webp' | 'jpg' = 'jpg'
): string {
  // Get Cloudinary cloud name from environment
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  // Graceful fallback if no Cloudinary configured
  if (!cloudName) {
    return originalUrl;
  }

  // Validate URL to prevent empty/invalid inputs
  if (!originalUrl || typeof originalUrl !== 'string') {
    return originalUrl;
  }

  // Cloudinary fetch mode: f_format,q_auto,w_width
  // - f_{format}: output format (avif, webp, jpg)
  // - q_auto: automatic quality optimization (Cloudinary chooses based on format)
  // - w_{width}: resize to width, maintain aspect ratio
  // - encodeURIComponent: prevent URL injection (Security Domain per RESEARCH.md)
  return `https://res.cloudinary.com/${cloudName}/image/fetch/f_${format},q_auto,w_${width}/${encodeURIComponent(originalUrl)}`;
}
