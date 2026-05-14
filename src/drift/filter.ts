import { DriftResult, DriftedResource } from './types';

export interface FilterConfig {
  resourceTypes?: string[];
  resourceNames?: string[];
  attributeKeys?: string[];
  minSeverity?: 'low' | 'medium' | 'high';
  excludeResourceTypes?: string[];
  excludeResourceNames?: string[];
}

const SEVERITY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function filterByResourceType(
  resources: DriftedResource[],
  types: string[]
): DriftedResource[] {
  const normalized = types.map((t) => t.toLowerCase());
  return resources.filter((r) =>
    normalized.includes(r.resourceType.toLowerCase())
  );
}

export function filterByResourceName(
  resources: DriftedResource[],
  names: string[]
): DriftedResource[] {
  const normalized = names.map((n) => n.toLowerCase());
  return resources.filter((r) =>
    normalized.some((n) => r.resourceName.toLowerCase().includes(n))
  );
}

export function filterByAttribute(
  resources: DriftedResource[],
  attributeKeys: string[]
): DriftedResource[] {
  return resources
    .map((r) => ({
      ...r,
      driftedAttributes: r.driftedAttributes.filter((attr) =>
        attributeKeys.includes(attr.key)
      ),
    }))
    .filter((r) => r.driftedAttributes.length > 0);
}

export function filterByMinSeverity(
  resources: DriftedResource[],
  minSeverity: 'low' | 'medium' | 'high'
): DriftedResource[] {
  const minRank = SEVERITY_RANK[minSeverity];
  return resources.filter((r) => {
    const rank = SEVERITY_RANK[r.severity ?? 'low'] ?? 1;
    return rank >= minRank;
  });
}

export function applyFilters(
  result: DriftResult,
  config: FilterConfig
): DriftResult {
  let resources = [...result.driftedResources];

  if (config.excludeResourceTypes?.length) {
    const excluded = config.excludeResourceTypes.map((t) => t.toLowerCase());
    resources = resources.filter(
      (r) => !excluded.includes(r.resourceType.toLowerCase())
    );
  }

  if (config.excludeResourceNames?.length) {
    const excluded = config.excludeResourceNames.map((n) => n.toLowerCase());
    resources = resources.filter(
      (r) => !excluded.some((n) => r.resourceName.toLowerCase().includes(n))
    );
  }

  if (config.resourceTypes?.length) {
    resources = filterByResourceType(resources, config.resourceTypes);
  }

  if (config.resourceNames?.length) {
    resources = filterByResourceName(resources, config.resourceNames);
  }

  if (config.attributeKeys?.length) {
    resources = filterByAttribute(resources, config.attributeKeys);
  }

  if (config.minSeverity) {
    resources = filterByMinSeverity(resources, config.minSeverity);
  }

  return { ...result, driftedResources: resources };
}
