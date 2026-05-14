import { DriftedResource } from './types';

export type GroupKey = 'resourceType' | 'severity' | 'tag' | 'module';

export interface ResourceGroup {
  key: string;
  resources: DriftedResource[];
  count: number;
}

export function groupByResourceType(resources: DriftedResource[]): ResourceGroup[] {
  return groupBy(resources, (r) => r.resourceType ?? 'unknown');
}

export function groupBySeverity(resources: DriftedResource[]): ResourceGroup[] {
  return groupBy(resources, (r) => r.severity ?? 'none');
}

export function groupByModule(resources: DriftedResource[]): ResourceGroup[] {
  return groupBy(resources, (r) => {
    const parts = r.resourceAddress?.split('.') ?? [];
    return parts.length >= 3 ? parts.slice(0, parts.length - 2).join('.') : 'root';
  });
}

export function groupByTag(resources: DriftedResource[], tagKey: string): ResourceGroup[] {
  return groupBy(resources, (r) => {
    const tags: Record<string, string> = (r as any).tags ?? {};
    return tags[tagKey] ?? 'untagged';
  });
}

function groupBy(
  resources: DriftedResource[],
  keyFn: (r: DriftedResource) => string
): ResourceGroup[] {
  const map = new Map<string, DriftedResource[]>();
  for (const resource of resources) {
    const key = keyFn(resource);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(resource);
  }
  return Array.from(map.entries())
    .map(([key, items]) => ({ key, resources: items, count: items.length }))
    .sort((a, b) => b.count - a.count);
}

export function formatGroupSummary(groups: ResourceGroup[]): string {
  if (groups.length === 0) return 'No groups found.';
  return groups
    .map((g) => `  ${g.key}: ${g.count} resource(s)`)
    .join('\n');
}
