import { DriftedResource, DriftedAttribute } from './types';

export interface DiffSummary {
  added: string[];
  removed: string[];
  changed: DriftedResource[];
  unchanged: string[];
}

export interface AttributeDiff {
  attribute: string;
  plannedValue: unknown;
  liveValue: unknown;
  delta: string;
}

export function computeAttributeDelta(
  planned: unknown,
  live: unknown
): string {
  if (typeof planned === 'number' && typeof live === 'number') {
    const diff = live - planned;
    return diff >= 0 ? `+${diff}` : `${diff}`;
  }
  if (typeof planned === 'string' && typeof live === 'string') {
    return `"${planned}" → "${live}"`;
  }
  return `${JSON.stringify(planned)} → ${JSON.stringify(live)}`;
}

export function diffAttributes(
  drifted: DriftedAttribute[]
): AttributeDiff[] {
  return drifted.map((attr) => ({
    attribute: attr.attribute,
    plannedValue: attr.plannedValue,
    liveValue: attr.liveValue,
    delta: computeAttributeDelta(attr.plannedValue, attr.liveValue),
  }));
}

export function buildDiffSummary(
  plannedResourceIds: string[],
  liveResourceIds: string[],
  driftedResources: DriftedResource[]
): DiffSummary {
  const plannedSet = new Set(plannedResourceIds);
  const liveSet = new Set(liveResourceIds);
  const driftedIds = new Set(driftedResources.map((r) => r.resourceId));

  const added = liveResourceIds.filter((id) => !plannedSet.has(id));
  const removed = plannedResourceIds.filter((id) => !liveSet.has(id));
  const unchanged = plannedResourceIds.filter(
    (id) => liveSet.has(id) && !driftedIds.has(id)
  );

  return {
    added,
    removed,
    changed: driftedResources,
    unchanged,
  };
}

export function formatDiffSummary(summary: DiffSummary): string {
  const lines: string[] = ['Diff Summary:'];
  lines.push(`  Added (live only):   ${summary.added.length}`);
  lines.push(`  Removed (plan only): ${summary.removed.length}`);
  lines.push(`  Changed (drifted):   ${summary.changed.length}`);
  lines.push(`  Unchanged:           ${summary.unchanged.length}`);

  if (summary.added.length > 0) {
    lines.push('\nAdded Resources:');
    summary.added.forEach((id) => lines.push(`  + ${id}`));
  }
  if (summary.removed.length > 0) {
    lines.push('\nRemoved Resources:');
    summary.removed.forEach((id) => lines.push(`  - ${id}`));
  }
  if (summary.changed.length > 0) {
    lines.push('\nChanged Resources:');
    summary.changed.forEach((r) => {
      lines.push(`  ~ ${r.resourceId} (${r.driftedAttributes.length} attribute(s) drifted)`);
      diffAttributes(r.driftedAttributes).forEach((d) => {
        lines.push(`      ${d.attribute}: ${d.delta}`);
      });
    });
  }

  return lines.join('\n');
}
