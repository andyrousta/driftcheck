import { DriftedResource } from './types';

export interface EnrichmentMetadata {
  source: string;
  enrichedAt: string;
  tags?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface EnrichedResource extends DriftedResource {
  metadata: EnrichmentMetadata;
}

export interface EnricherConfig {
  source: string;
  defaultTags?: Record<string, string>;
  defaultAnnotations?: Record<string, string>;
}

export function enrichResource(
  resource: DriftedResource,
  config: EnricherConfig
): EnrichedResource {
  return {
    ...resource,
    metadata: {
      source: config.source,
      enrichedAt: new Date().toISOString(),
      tags: { ...config.defaultTags },
      annotations: { ...config.defaultAnnotations },
    },
  };
}

export function enrichResources(
  resources: DriftedResource[],
  config: EnricherConfig
): EnrichedResource[] {
  return resources.map((r) => enrichResource(r, config));
}

export function mergeEnrichmentMetadata(
  base: EnrichmentMetadata,
  override: Partial<EnrichmentMetadata>
): EnrichmentMetadata {
  return {
    ...base,
    ...override,
    tags: { ...base.tags, ...override.tags },
    annotations: { ...base.annotations, ...override.annotations },
  };
}

export function formatEnrichmentSummary(resources: EnrichedResource[]): string {
  const lines: string[] = [`Enriched ${resources.length} resource(s):`, ''];
  for (const r of resources) {
    lines.push(`  [${r.metadata.source}] ${r.address} — enriched at ${r.metadata.enrichedAt}`);
    if (r.metadata.tags && Object.keys(r.metadata.tags).length > 0) {
      const tagStr = Object.entries(r.metadata.tags)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      lines.push(`    tags: ${tagStr}`);
    }
  }
  return lines.join('\n');
}
