import { applyFilters, filterByAttribute, filterByMinSeverity, filterByResourceName, filterByResourceType } from './filter';
import { DriftResult, DriftedResource } from './types';

const makeResource = (overrides: Partial<DriftedResource> = {}): DriftedResource => ({
  resourceType: 'aws_instance',
  resourceName: 'web_server',
  driftedAttributes: [{ key: 'instance_type', expected: 't2.micro', actual: 't3.small' }],
  severity: 'medium',
  ...overrides,
});

const makeResult = (resources: DriftedResource[]): DriftResult => ({
  driftedResources: resources,
  planFile: 'plan.json',
  checkedAt: new Date().toISOString(),
});

describe('filterByResourceType', () => {
  it('returns only matching resource types', () => {
    const resources = [
      makeResource({ resourceType: 'aws_instance' }),
      makeResource({ resourceType: 'aws_s3_bucket' }),
    ];
    const result = filterByResourceType(resources, ['aws_instance']);
    expect(result).toHaveLength(1);
    expect(result[0].resourceType).toBe('aws_instance');
  });

  it('is case-insensitive', () => {
    const resources = [makeResource({ resourceType: 'AWS_INSTANCE' })];
    const result = filterByResourceType(resources, ['aws_instance']);
    expect(result).toHaveLength(1);
  });
});

describe('filterByResourceName', () => {
  it('filters by partial name match', () => {
    const resources = [
      makeResource({ resourceName: 'web_server_prod' }),
      makeResource({ resourceName: 'db_primary' }),
    ];
    const result = filterByResourceName(resources, ['web']);
    expect(result).toHaveLength(1);
    expect(result[0].resourceName).toBe('web_server_prod');
  });
});

describe('filterByAttribute', () => {
  it('removes resources with no matching attributes', () => {
    const resources = [
      makeResource({ driftedAttributes: [{ key: 'instance_type', expected: 'a', actual: 'b' }] }),
      makeResource({ driftedAttributes: [{ key: 'ami', expected: 'x', actual: 'y' }] }),
    ];
    const result = filterByAttribute(resources, ['instance_type']);
    expect(result).toHaveLength(1);
    expect(result[0].driftedAttributes[0].key).toBe('instance_type');
  });
});

describe('filterByMinSeverity', () => {
  it('excludes resources below minimum severity', () => {
    const resources = [
      makeResource({ severity: 'low' }),
      makeResource({ severity: 'medium' }),
      makeResource({ severity: 'high' }),
    ];
    const result = filterByMinSeverity(resources, 'medium');
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.severity !== 'low')).toBe(true);
  });
});

describe('applyFilters', () => {
  it('applies exclude filters before include filters', () => {
    const result = makeResult([
      makeResource({ resourceType: 'aws_instance', resourceName: 'web' }),
      makeResource({ resourceType: 'aws_s3_bucket', resourceName: 'logs' }),
    ]);
    const filtered = applyFilters(result, {
      excludeResourceTypes: ['aws_s3_bucket'],
      resourceTypes: ['aws_instance', 'aws_s3_bucket'],
    });
    expect(filtered.driftedResources).toHaveLength(1);
    expect(filtered.driftedResources[0].resourceType).toBe('aws_instance');
  });

  it('returns empty array when all resources are excluded', () => {
    const result = makeResult([makeResource()]);
    const filtered = applyFilters(result, { excludeResourceTypes: ['aws_instance'] });
    expect(filtered.driftedResources).toHaveLength(0);
  });

  it('preserves original result metadata', () => {
    const result = makeResult([makeResource()]);
    const filtered = applyFilters(result, {});
    expect(filtered.planFile).toBe(result.planFile);
    expect(filtered.checkedAt).toBe(result.checkedAt);
  });
});
