import {
  normalizeValue,
  normalizeAttribute,
  normalizeResource,
  normalizeDriftedResources,
  formatNormalizeSummary,
} from './normalizer';
import { DriftedResource } from './types';

const defaultCfg = { trimStrings: true, lowercaseKeys: false, sortAttributes: true, coerceNumbers: true };

function makeResource(overrides: Partial<DriftedResource> = {}): DriftedResource {
  return {
    resourceId: 'aws_instance.web',
    resourceType: 'aws_instance',
    driftedAttributes: [
      { attribute: 'instance_type', plannedValue: 't2.micro', actualValue: 't3.small' },
      { attribute: 'ami', plannedValue: 'ami-123', actualValue: 'ami-456' },
    ],
    ...overrides,
  };
}

describe('normalizeValue', () => {
  it('trims strings when configured', () => {
    expect(normalizeValue('  hello  ', defaultCfg)).toBe('hello');
  });

  it('coerces numeric strings to numbers', () => {
    expect(normalizeValue('42', defaultCfg)).toBe(42);
  });

  it('does not coerce non-numeric strings', () => {
    expect(normalizeValue('t2.micro', defaultCfg)).toBe('t2.micro');
  });

  it('normalizes nested objects', () => {
    const result = normalizeValue({ b: '2', a: '1' }, defaultCfg) as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(['a', 'b']);
  });

  it('normalizes arrays recursively', () => {
    expect(normalizeValue(['  a  ', '3'], defaultCfg)).toEqual(['a', 3]);
  });
});

describe('normalizeAttribute', () => {
  it('normalizes both planned and actual values', () => {
    const attr = { attribute: 'count', plannedValue: ' 5 ', actualValue: '10' };
    const result = normalizeAttribute(attr, defaultCfg);
    expect(result.plannedValue).toBe(5);
    expect(result.actualValue).toBe(10);
  });
});

describe('normalizeResource', () => {
  it('sorts drifted attributes by name', () => {
    const resource = makeResource();
    const result = normalizeResource(resource);
    const names = result.driftedAttributes.map((a) => a.attribute);
    expect(names).toEqual([...names].sort());
  });

  it('preserves resource metadata', () => {
    const resource = makeResource();
    const result = normalizeResource(resource);
    expect(result.resourceId).toBe(resource.resourceId);
    expect(result.resourceType).toBe(resource.resourceType);
  });
});

describe('normalizeDriftedResources', () => {
  it('normalizes all resources', () => {
    const resources = [makeResource(), makeResource({ resourceId: 'aws_s3_bucket.data' })];
    const result = normalizeDriftedResources(resources);
    expect(result).toHaveLength(2);
  });
});

describe('formatNormalizeSummary', () => {
  it('reports changed resource count', () => {
    const before = [makeResource()];
    const after = [normalizeResource(makeResource())];
    const summary = formatNormalizeSummary(before, after);
    expect(summary).toMatch(/1 resource/);
  });
});
