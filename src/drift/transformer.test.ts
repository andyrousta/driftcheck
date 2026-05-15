import {
  applyTransformRule,
  transformResource,
  transformDriftedResources,
  formatTransformSummary,
  TransformRule,
} from './transformer';
import { DriftedResource } from './types';

function makeResource(overrides?: Partial<DriftedResource>): DriftedResource {
  return {
    resourceType: 'aws_instance',
    resourceName: 'web',
    driftedAttributes: { name: 'Hello', secret: 'abc123', tag: 'prod' },
    severity: 'medium',
    ...overrides,
  };
}

describe('applyTransformRule', () => {
  it('masks a field', () => {
    const r = makeResource();
    const { resource, applied } = applyTransformRule(r, { field: 'secret', operation: 'mask' });
    expect(applied).toBe(true);
    expect(resource.driftedAttributes['secret']).toBe('***');
  });

  it('uppercases a field', () => {
    const r = makeResource();
    const { resource, applied } = applyTransformRule(r, { field: 'tag', operation: 'uppercase' });
    expect(applied).toBe(true);
    expect(resource.driftedAttributes['tag']).toBe('PROD');
  });

  it('renames a field', () => {
    const r = makeResource();
    const { resource, applied } = applyTransformRule(r, {
      field: 'name',
      operation: 'rename',
      target: 'label',
    });
    expect(applied).toBe(true);
    expect(resource.driftedAttributes['label']).toBe('Hello');
    expect(resource.driftedAttributes['name']).toBeUndefined();
  });

  it('truncates a field', () => {
    const r = makeResource();
    const { resource } = applyTransformRule(r, {
      field: 'secret',
      operation: 'truncate',
      maxLength: 3,
    });
    expect(resource.driftedAttributes['secret']).toBe('abc');
  });

  it('returns applied=false when field is missing', () => {
    const r = makeResource();
    const { applied } = applyTransformRule(r, { field: 'missing', operation: 'mask' });
    expect(applied).toBe(false);
  });
});

describe('transformResource', () => {
  it('applies multiple rules and records them', () => {
    const r = makeResource();
    const rules: TransformRule[] = [
      { field: 'secret', operation: 'mask' },
      { field: 'tag', operation: 'uppercase' },
    ];
    const result = transformResource(r, rules);
    expect(result.appliedRules).toEqual(['mask:secret', 'uppercase:tag']);
    expect(result.transformed.driftedAttributes['secret']).toBe('***');
  });
});

describe('transformDriftedResources', () => {
  it('transforms all resources', () => {
    const resources = [makeResource(), makeResource({ resourceName: 'db' })];
    const results = transformDriftedResources(resources, [{ field: 'secret', operation: 'mask' }]);
    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r.transformed.driftedAttributes['secret']).toBe('***'));
  });
});

describe('formatTransformSummary', () => {
  it('reports changed resources', () => {
    const r = makeResource();
    const results = transformDriftedResources(r ? [r] : [], [{ field: 'secret', operation: 'mask' }]);
    const summary = formatTransformSummary(results);
    expect(summary).toContain('1/1 resources modified');
    expect(summary).toContain('mask:secret');
  });
});
