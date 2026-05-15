import {
  enrichResource,
  enrichResources,
  mergeEnrichmentMetadata,
  formatEnrichmentSummary,
  EnricherConfig,
  EnrichedResource,
} from './enricher';
import { DriftedResource } from './types';

function makeResource(address: string): DriftedResource {
  return {
    address,
    type: 'aws_instance',
    name: address.split('.')[1] ?? address,
    driftedAttributes: [{ attribute: 'ami', plannedValue: 'ami-123', actualValue: 'ami-456' }],
  };
}

const baseConfig: EnricherConfig = {
  source: 'ci-pipeline',
  defaultTags: { env: 'production' },
  defaultAnnotations: { owner: 'platform-team' },
};

describe('enrichResource', () => {
  it('attaches metadata to a resource', () => {
    const resource = makeResource('aws_instance.web');
    const enriched = enrichResource(resource, baseConfig);
    expect(enriched.address).toBe('aws_instance.web');
    expect(enriched.metadata.source).toBe('ci-pipeline');
    expect(enriched.metadata.tags).toEqual({ env: 'production' });
    expect(enriched.metadata.annotations).toEqual({ owner: 'platform-team' });
    expect(enriched.metadata.enrichedAt).toBeTruthy();
  });

  it('preserves original driftedAttributes', () => {
    const resource = makeResource('aws_instance.db');
    const enriched = enrichResource(resource, baseConfig);
    expect(enriched.driftedAttributes).toHaveLength(1);
    expect(enriched.driftedAttributes[0].attribute).toBe('ami');
  });
});

describe('enrichResources', () => {
  it('enriches all resources', () => {
    const resources = [makeResource('aws_instance.a'), makeResource('aws_instance.b')];
    const enriched = enrichResources(resources, baseConfig);
    expect(enriched).toHaveLength(2);
    enriched.forEach((r) => expect(r.metadata.source).toBe('ci-pipeline'));
  });

  it('returns empty array for empty input', () => {
    expect(enrichResources([], baseConfig)).toEqual([]);
  });
});

describe('mergeEnrichmentMetadata', () => {
  it('merges tags and annotations from override', () => {
    const base = { source: 'ci', enrichedAt: '2024-01-01', tags: { env: 'staging' }, annotations: {} };
    const override = { tags: { region: 'us-east-1' }, annotations: { team: 'sre' } };
    const merged = mergeEnrichmentMetadata(base, override);
    expect(merged.tags).toEqual({ env: 'staging', region: 'us-east-1' });
    expect(merged.annotations).toEqual({ team: 'sre' });
    expect(merged.source).toBe('ci');
  });

  it('override source replaces base source', () => {
    const base = { source: 'ci', enrichedAt: '2024-01-01' };
    const override = { source: 'manual' };
    const merged = mergeEnrichmentMetadata(base, override);
    expect(merged.source).toBe('manual');
  });
});

describe('formatEnrichmentSummary', () => {
  it('formats summary with tag info', () => {
    const resource = makeResource('aws_instance.web');
    const enriched = enrichResource(resource, baseConfig);
    const summary = formatEnrichmentSummary([enriched]);
    expect(summary).toContain('Enriched 1 resource(s)');
    expect(summary).toContain('aws_instance.web');
    expect(summary).toContain('env=production');
  });

  it('handles resources with no tags', () => {
    const resource = makeResource('aws_s3_bucket.logs');
    const enriched = enrichResource(resource, { source: 'local' });
    const summary = formatEnrichmentSummary([enriched]);
    expect(summary).toContain('Enriched 1 resource(s)');
    expect(summary).not.toContain('tags:');
  });
});
