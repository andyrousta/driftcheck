import { DriftedResource } from './types';

export interface LabelRule {
  match: { resourceType?: string; attribute?: string; severity?: string };
  labels: Record<string, string>;
}

export interface LabelResult {
  resource: DriftedResource;
  labels: Record<string, string>;
}

export function matchesLabelRule(resource: DriftedResource, rule: LabelRule): boolean {
  const { match } = rule;
  if (match.resourceType && resource.resourceType !== match.resourceType) return false;
  if (match.severity && resource.severity !== match.severity) return false;
  if (match.attribute) {
    const hasAttr = resource.driftedAttributes.some((a) => a.attribute === match.attribute);
    if (!hasAttr) return false;
  }
  return true;
}

export function labelResource(
  resource: DriftedResource,
  rules: LabelRule[]
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const rule of rules) {
    if (matchesLabelRule(resource, rule)) {
      Object.assign(labels, rule.labels);
    }
  }
  return labels;
}

export function labelDriftedResources(
  resources: DriftedResource[],
  rules: LabelRule[]
): LabelResult[] {
  return resources.map((resource) => ({
    resource,
    labels: labelResource(resource, rules),
  }));
}

export function buildLabelerConfigFromEnv(): { rules: LabelRule[] } {
  const raw = process.env.DRIFTCHECK_LABEL_RULES;
  if (!raw) return { rules: [] };
  try {
    const rules = JSON.parse(raw) as LabelRule[];
    return { rules };
  } catch {
    return { rules: [] };
  }
}

export function groupResourcesByLabel(
  results: LabelResult[],
  labelKey: string
): Record<string, DriftedResource[]> {
  const groups: Record<string, DriftedResource[]> = {};
  for (const { resource, labels } of results) {
    const value = labels[labelKey] ?? '__unlabeled__';
    if (!groups[value]) groups[value] = [];
    groups[value].push(resource);
  }
  return groups;
}
