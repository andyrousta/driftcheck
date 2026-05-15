import { mergeDriftedResources, mergeResourceById, formatMergeSummary, MergeStrategy } from './merger';
import { DriftedResource } from './types';

function makeResource(id: string, attrs: Record<string, { planned: unknown; actual: unknown }>): DriftedResource {
  return {
    resourceId: id,
    resourceType: 'aws_instance',
    driftedAttributes: attrs,
    severity: 'medium',
  } as DriftedResource;
}

describe('mergeResourceById', () => {
  it('prefers left by default', () => {
    const left = makeResource('res1', { ami: { planned: 'a', actual: 'b' } });
    const right = makeResource('res1', { ami: { planned: 'c', actual: 'd' } });
    const result = mergeResourceById(left, right);
    expect(result.resourceId).toBe('res1');
    expect(result.driftedAttributes['ami'].planned).toBe('a');
  });

  it('prefers right when strategy says right', () => {
    const left = makeResource('res1', { ami: { planned: 'a', actual: 'b' } });
    const right = makeResource('res1', { ami: { planned: 'c', actual: 'd' } });
    const result = mergeResourceById(left, right, { preferSource: 'right', conflictResolution: 'overwrite' });
    expect(result.driftedAttributes['ami'].planned).toBe('c');
  });

  it('merges attributes from both resources', () => {
    const left = makeResource('res1', { ami: { planned: 'a', actual: 'b' } });
    const right = makeResource('res1', { instance_type: { planned: 't2.micro', actual: 't3.small' } });
    const result = mergeResourceById(left, right, { conflictResolution: 'merge-attributes' });
    expect(result.driftedAttributes['ami']).toBeDefined();
    expect(result.driftedAttributes['instance_type']).toBeDefined();
  });
});

describe('mergeDriftedResources', () => {
  it('adds non-overlapping resources from secondary', () => {
    const primary = [makeResource('res1', {})];
    const secondary = [makeResource('res2', {})];
    const { merged } = mergeDriftedResources(primary, secondary);
    expect(merged).toHaveLength(2);
  });

  it('skips duplicates when conflictResolution is skip', () => {
    const primary = [makeResource('res1', {})];
    const secondary = [makeResource('res1', {})];
    const strategy: MergeStrategy = { conflictResolution: 'skip' };
    const { merged, conflicts, stats } = mergeDriftedResources(primary, secondary, strategy);
    expect(merged).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
    expect(stats.skipped).toBe(1);
  });

  it('reports correct stats', () => {
    const primary = [makeResource('res1', {}), makeResource('res2', {})];
    const secondary = [makeResource('res3', {})];
    const { stats } = mergeDriftedResources(primary, secondary);
    expect(stats.total).toBe(3);
    expect(stats.merged).toBe(1);
  });
});

describe('formatMergeSummary', () => {
  it('includes conflict details when present', () => {
    const result = {
      merged: [],
      conflicts: [{ resourceId: 'res1', reason: 'duplicate resource skipped' }],
      stats: { total: 2, merged: 1, skipped: 1 },
    };
    const text = formatMergeSummary(result);
    expect(text).toContain('Conflicts');
    expect(text).toContain('res1');
  });

  it('omits conflict section when no conflicts', () => {
    const result = {
      merged: [],
      conflicts: [],
      stats: { total: 2, merged: 2, skipped: 0 },
    };
    const text = formatMergeSummary(result);
    expect(text).not.toContain('Conflicts');
  });
});
