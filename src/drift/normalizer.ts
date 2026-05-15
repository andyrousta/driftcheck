import { DriftedResource, DriftedAttribute } from './types';

export interface NormalizerConfig {
  trimStrings: boolean;
  lowercaseKeys: boolean;
  sortAttributes: boolean;
  coerceNumbers: boolean;
}

const DEFAULT_CONFIG: NormalizerConfig = {
  trimStrings: true,
  lowercaseKeys: false,
  sortAttributes: true,
  coerceNumbers: true,
};

export function normalizeValue(value: unknown, config: NormalizerConfig): unknown {
  if (typeof value === 'string') {
    let v = config.trimStrings ? value.trim() : value;
    if (config.coerceNumbers && v !== '' && !isNaN(Number(v))) {
      return Number(v);
    }
    return v;
  }
  if (Array.isArray(value)) {
    return value.map((v) => normalizeValue(v, config));
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = config.lowercaseKeys ? Object.keys(obj).map((k) => k.toLowerCase()) : Object.keys(obj);
    const sorted = config.sortAttributes ? [...keys].sort() : keys;
    return sorted.reduce<Record<string, unknown>>((acc, key, i) => {
      const origKey = Object.keys(obj)[i];
      acc[key] = normalizeValue(obj[origKey], config);
      return acc;
    }, {});
  }
  return value;
}

export function normalizeAttribute(
  attr: DriftedAttribute,
  config: NormalizerConfig
): DriftedAttribute {
  return {
    ...attr,
    plannedValue: normalizeValue(attr.plannedValue, config),
    actualValue: normalizeValue(attr.actualValue, config),
  };
}

export function normalizeResource(
  resource: DriftedResource,
  config: Partial<NormalizerConfig> = {}
): DriftedResource {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const attributes = resource.driftedAttributes.map((a) => normalizeAttribute(a, cfg));
  const sorted = cfg.sortAttributes
    ? [...attributes].sort((a, b) => a.attribute.localeCompare(b.attribute))
    : attributes;
  return { ...resource, driftedAttributes: sorted };
}

export function normalizeDriftedResources(
  resources: DriftedResource[],
  config: Partial<NormalizerConfig> = {}
): DriftedResource[] {
  return resources.map((r) => normalizeResource(r, config));
}

export function formatNormalizeSummary(before: DriftedResource[], after: DriftedResource[]): string {
  const changed = after.filter((r, i) => {
    const b = before[i];
    return JSON.stringify(r.driftedAttributes) !== JSON.stringify(b?.driftedAttributes);
  }).length;
  return `Normalized ${after.length} resource(s); ${changed} had attribute changes.`;
}
