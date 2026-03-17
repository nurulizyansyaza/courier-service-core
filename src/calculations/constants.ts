/** Regex matching a valid package ID: "PKG" followed by digits (case-insensitive) */
export const PKG_ID_REGEX = /^(?:pkg|PKG)\d+$/i;

/** Multiplier applied to package weight in cost formula: baseCost + (weight × WEIGHT_MULTIPLIER) + (distance × DISTANCE_MULTIPLIER) */
export const WEIGHT_MULTIPLIER = 10;

/** Multiplier applied to package distance in cost formula */
export const DISTANCE_MULTIPLIER = 5;

/** Maximum package count for the exact (O(2^n)) shipment algorithm; above this, greedy fallback is used */
export const MAX_PACKAGES_FOR_EXACT = 20;

/**
 * Extract the numeric suffix from a package ID (e.g., "PKG3" → 3).
 * Returns 0 if the ID doesn't match the expected pattern.
 */
export function extractPackageNumber(id: string): number {
  const match = id.match(PKG_ID_REGEX);
  if (!match) return 0;
  const numMatch = id.match(/(\d+)$/);
  return numMatch ? parseInt(numMatch[1]) : 0;
}
