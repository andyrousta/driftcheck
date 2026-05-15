import { DriftedResource } from './types';

export interface DeduplicationResult {
  unique: DriftedResource[];
  duplicatesRemoved: number;
  duplicateKeys: string[];
}

/**
 * Builds a stable key for a drifted resource based on address and attribute names.
 */
export function buildResourceKey(resource: DriftedResource): string {
  const attrKeys = resource.driftedAttributes
    .map((a) => a.attribute)
    .sort()
    .join(',');
  return `${resource.address}::${attrKeys}`;
}

/**
 * Deduplicates a list of drifted resources by their address + drifted attribute set.
 * When duplicates are found, the first occurrence is kept.
 */
export function deduplicateResources(
  resources: DriftedResource[]
): DeduplicationResult {
  const seen = new Map<string, DriftedResource>();
  const duplicateKeys: string[] = [];

  for (const resource of resources) {
    const key = buildResourceKey(resource);
    if (seen.has(key)) {
      duplicateKeys.push(key);
    } else {
      seen.set(key, resource);
    }
  }

  return {
    unique: Array.from(seen.values()),
    duplicatesRemoved: duplicateKeys.length,
    duplicateKeys,
  };
}

/**
 * Merges two lists of drifted resources, deduplicating across both.
 * Entries from `base` take precedence over `incoming` on conflict.
 */
export function mergeAndDeduplicate(
  base: DriftedResource[],
  incoming: DriftedResource[]
): DeduplicationResult {
  return deduplicateResources([...base, ...incoming]);
}

/**
 * Returns true if the provided list contains any duplicate resource entries.
 */
export function hasDuplicates(resources: DriftedResource[]): boolean {
  const keys = resources.map(buildResourceKey);
  return new Set(keys).size !== keys.length;
}
