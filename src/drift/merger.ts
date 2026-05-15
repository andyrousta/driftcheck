import { DriftedResource } from './types';

export interface MergeStrategy {
  preferSource?: 'left' | 'right' | 'newest';
  conflictResolution?: 'skip' | 'overwrite' | 'merge-attributes';
}

export interface MergeResult {
  merged: DriftedResource[];
  conflicts: Array<{ resourceId: string; reason: string }>;
  stats: { total: number; merged: number; skipped: number };
}

const DEFAULT_STRATEGY: MergeStrategy = {
  preferSource: 'left',
  conflictResolution: 'merge-attributes',
};

export function mergeResourceById(
  left: DriftedResource,
  right: DriftedResource,
  strategy: MergeStrategy = DEFAULT_STRATEGY
): DriftedResource {
  if (strategy.conflictResolution === 'overwrite') {
    return strategy.preferSource === 'right' ? right : left;
  }

  const mergedAttributes = {
    ...left.driftedAttributes,
    ...right.driftedAttributes,
  };

  const base = strategy.preferSource === 'right' ? right : left;
  return { ...base, driftedAttributes: mergedAttributes };
}

export function mergeDriftedResources(
  primary: DriftedResource[],
  secondary: DriftedResource[],
  strategy: MergeStrategy = DEFAULT_STRATEGY
): MergeResult {
  const result: DriftedResource[] = [...primary];
  const conflicts: MergeResult['conflicts'] = [];
  let mergedCount = 0;
  let skippedCount = 0;

  const primaryIndex = new Map(primary.map((r) => [r.resourceId, r]));

  for (const resource of secondary) {
    const existing = primaryIndex.get(resource.resourceId);

    if (!existing) {
      result.push(resource);
      mergedCount++;
      continue;
    }

    if (strategy.conflictResolution === 'skip') {
      conflicts.push({ resourceId: resource.resourceId, reason: 'duplicate resource skipped' });
      skippedCount++;
      continue;
    }

    const idx = result.findIndex((r) => r.resourceId === resource.resourceId);
    result[idx] = mergeResourceById(existing, resource, strategy);
    mergedCount++;
  }

  return {
    merged: result,
    conflicts,
    stats: { total: primary.length + secondary.length, merged: mergedCount, skipped: skippedCount },
  };
}

export function formatMergeSummary(result: MergeResult): string {
  const lines: string[] = [
    `Merge Summary`,
    `  Total input resources : ${result.stats.total}`,
    `  Successfully merged   : ${result.stats.merged}`,
    `  Skipped (conflicts)   : ${result.stats.skipped}`,
    `  Output resources      : ${result.merged.length}`,
  ];

  if (result.conflicts.length > 0) {
    lines.push(`\nConflicts:`);
    for (const c of result.conflicts) {
      lines.push(`  - ${c.resourceId}: ${c.reason}`);
    }
  }

  return lines.join('\n');
}
