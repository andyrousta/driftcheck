import { DriftedResource } from './types';

export interface TagRule {
  match: { resourceType?: string; attribute?: string };
  tags: string[];
}

export interface TaggerConfig {
  rules: TagRule[];
}

export function matchesTagRule(resource: DriftedResource, rule: TagRule): boolean {
  const { match } = rule;
  if (match.resourceType && resource.resourceType !== match.resourceType) {
    return false;
  }
  if (match.attribute) {
    const hasAttr = resource.driftedAttributes.some(
      (a) => a.attribute === match.attribute
    );
    if (!hasAttr) return false;
  }
  return true;
}

export function tagResource(
  resource: DriftedResource,
  config: TaggerConfig
): string[] {
  const tags = new Set<string>();
  for (const rule of config.rules) {
    if (matchesTagRule(resource, rule)) {
      rule.tags.forEach((t) => tags.add(t));
    }
  }
  return Array.from(tags);
}

export function tagDriftedResources(
  resources: DriftedResource[],
  config: TaggerConfig
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const resource of resources) {
    const tags = tagResource(resource, config);
    if (tags.length > 0) {
      result.set(resource.resourceId, tags);
    }
  }
  return result;
}

export function buildTaggerConfigFromEnv(): TaggerConfig {
  const raw = process.env.DRIFTCHECK_TAG_RULES;
  if (!raw) return { rules: [] };
  try {
    const rules = JSON.parse(raw) as TagRule[];
    return { rules };
  } catch {
    return { rules: [] };
  }
}

export function groupResourcesByTag(
  tagMap: Map<string, string[]>
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const [resourceId, tags] of tagMap.entries()) {
    for (const tag of tags) {
      const existing = grouped.get(tag) ?? [];
      existing.push(resourceId);
      grouped.set(tag, existing);
    }
  }
  return grouped;
}
