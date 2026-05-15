import {
  buildResourceKey,
  deduplicateResources,
  mergeAndDeduplicate,
  hasDuplicates,
} from './deduplicator';
import { DriftedResource } from './types';

function makeResource(
  address: string,
  attrs: string[]
): DriftedResource {
  return {
    address,
    resourceType: address.split('.')[0],
    driftedAttributes: attrs.map((attr) => ({
      attribute: attr,
      plannedValue: 'a',
      actualValue: 'b',
    })),
  } as unknown as DriftedResource;
}

describe('buildResourceKey', () => {
  it('produces a stable key from address and sorted attributes', () => {
    const r = makeResource('aws_instance.web', ['ami', 'instance_type']);
    expect(buildResourceKey(r)).toBe('aws_instance.web::ami,instance_type');
  });

  it('sorts attribute names for stability', () => {
    const r1 = makeResource('aws_instance.web', ['z_attr', 'a_attr']);
    const r2 = makeResource('aws_instance.web', ['a_attr', 'z_attr']);
    expect(buildResourceKey(r1)).toBe(buildResourceKey(r2));
  });
});

describe('deduplicateResources', () => {
  it('returns all resources when no duplicates exist', () => {
    const resources = [
      makeResource('aws_instance.web', ['ami']),
      makeResource('aws_s3_bucket.data', ['acl']),
    ];
    const result = deduplicateResources(resources);
    expect(result.unique).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it('removes duplicate resources and tracks keys', () => {
    const r = makeResource('aws_instance.web', ['ami']);
    const result = deduplicateResources([r, r]);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.duplicateKeys).toHaveLength(1);
  });

  it('keeps the first occurrence on duplicate', () => {
    const r1 = makeResource('aws_instance.web', ['ami']);
    const r2 = makeResource('aws_instance.web', ['ami']);
    const result = deduplicateResources([r1, r2]);
    expect(result.unique[0]).toBe(r1);
  });
});

describe('mergeAndDeduplicate', () => {
  it('merges two lists and deduplicates', () => {
    const base = [makeResource('aws_instance.web', ['ami'])];
    const incoming = [
      makeResource('aws_instance.web', ['ami']),
      makeResource('aws_s3_bucket.data', ['acl']),
    ];
    const result = mergeAndDeduplicate(base, incoming);
    expect(result.unique).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(1);
  });
});

describe('hasDuplicates', () => {
  it('returns false for unique list', () => {
    expect(hasDuplicates([makeResource('aws_instance.web', ['ami'])])).toBe(false);
  });

  it('returns true when duplicates are present', () => {
    const r = makeResource('aws_instance.web', ['ami']);
    expect(hasDuplicates([r, r])).toBe(true);
  });
});
