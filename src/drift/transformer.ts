import { DriftedResource } from './types';

export interface TransformRule {
  field: string;
  operation: 'rename' | 'mask' | 'truncate' | 'uppercase' | 'lowercase';
  target?: string;
  maxLength?: number;
}

export interface TransformResult {
  original: DriftedResource;
  transformed: DriftedResource;
  appliedRules: string[];
}

export function applyTransformRule(
  resource: DriftedResource,
  rule: TransformRule
): { resource: DriftedResource; applied: boolean } {
  const attrs = { ...resource.driftedAttributes };

  if (!(rule.field in attrs)) {
    return { resource, applied: false };
  }

  const value = String(attrs[rule.field] ?? '');

  switch (rule.operation) {
    case 'rename':
      if (rule.target) {
        attrs[rule.target] = attrs[rule.field];
        delete attrs[rule.field];
      }
      break;
    case 'mask':
      attrs[rule.field] = '***';
      break;
    case 'truncate':
      attrs[rule.field] = value.slice(0, rule.maxLength ?? 32);
      break;
    case 'uppercase':
      attrs[rule.field] = value.toUpperCase();
      break;
    case 'lowercase':
      attrs[rule.field] = value.toLowerCase();
      break;
  }

  return { resource: { ...resource, driftedAttributes: attrs }, applied: true };
}

export function transformResource(
  resource: DriftedResource,
  rules: TransformRule[]
): TransformResult {
  let current = resource;
  const appliedRules: string[] = [];

  for (const rule of rules) {
    const { resource: updated, applied } = applyTransformRule(current, rule);
    if (applied) {
      current = updated;
      appliedRules.push(`${rule.operation}:${rule.field}`);
    }
  }

  return { original: resource, transformed: current, appliedRules };
}

export function transformDriftedResources(
  resources: DriftedResource[],
  rules: TransformRule[]
): TransformResult[] {
  return resources.map((r) => transformResource(r, rules));
}

export function formatTransformSummary(results: TransformResult[]): string {
  const changed = results.filter((r) => r.appliedRules.length > 0);
  const lines = [
    `Transform summary: ${changed.length}/${results.length} resources modified`,
    ...changed.map(
      (r) =>
        `  ${r.original.resourceType}.${r.original.resourceName}: [${r.appliedRules.join(', ')}]`
    ),
  ];
  return lines.join('\n');
}
