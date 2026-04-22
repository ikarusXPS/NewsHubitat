/**
 * Array utility functions for batch operations
 * Used by services for chunked parallel processing (D-07, D-08)
 */

/**
 * Split array into chunks of specified size
 * @param array - Array to chunk
 * @param size - Maximum chunk size (must be > 0)
 * @returns Array of chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Chunk size must be positive');
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
