import {
  compareResourceLists,
  extractResourceChanges,
  formatComparisonSummary,
} from './comparer';
import { DriftedResource } from './types';

const makeResource = (
  id: string,
  type: string,
  attrs: { attribute: string; liveValue: unknown; plannedValue: unknown }[] = []
): DriftedResource => ({
  resourceId: id,
  resourceType: type,
  driftedAttributes: attrs,
});

describe('compareResourceLists', () => {
  it('identifies added resources', () => {
    const before: DriftedResource[] = [];
    const after = [makeResource('aws_s3_bucket.new', 'aws_s3_bucket')];
    const result = compareResourceLists(before, after);
    expect(result.added).toHaveLength(1);
    expect(result.added[0].resourceId).toBe('aws_s3_bucket.new');
    expect(result.removed).toHaveLength(0);
  });

  it('identifies removed resources', () => {
    const before = [makeResource('aws_s3_bucket.old', 'aws_s3_bucket')];
    const after: DriftedResource[] = [];
    const result = compareResourceLists(before, after);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].resourceId).toBe('aws_s3_bucket.old');
  });

  it('identifies unchanged resources', () => {
    const attrs = [{ attribute: 'region', liveValue: 'us-east-1', plannedValue: 'us-east-1' }];
    const resource = makeResource('aws_s3_bucket.same', 'aws_s3_bucket', attrs);
    const result = compareResourceLists([resource], [resource]);
    expect(result.unchanged).toHaveLength(1);
    expect(result.changed).toHaveLength(0);
  });

  it('identifies changed resources', () => {
    const before = [makeResource('aws_s3_bucket.a', 'aws_s3_bucket', [{ attribute: 'tags', liveValue: 'old', plannedValue: 'old' }])];
    const after = [makeResource('aws_s3_bucket.a', 'aws_s3_bucket', [{ attribute: 'tags', liveValue: 'new', plannedValue: 'old' }])];
    const result = compareResourceLists(before, after);
    expect(result.changed).toHaveLength(1);
    expect(result.unchanged).toHaveLength(0);
  });
});

describe('extractResourceChanges', () => {
  it('returns attribute-level changes between two snapshots', () => {
    const before = [makeResource('aws_instance.web', 'aws_instance', [{ attribute: 'ami', liveValue: 'ami-111', plannedValue: 'ami-222' }])];
    const after = [makeResource('aws_instance.web', 'aws_instance', [{ attribute: 'ami', liveValue: 'ami-333', plannedValue: 'ami-222' }])];
    const changes = extractResourceChanges(before, after);
    expect(changes).toHaveLength(1);
    expect(changes[0].attributeChanges[0].before).toBe('ami-111');
    expect(changes[0].attributeChanges[0].after).toBe('ami-333');
  });

  it('returns empty array when no attribute changes exist', () => {
    const attrs = [{ attribute: 'ami', liveValue: 'ami-111', plannedValue: 'ami-222' }];
    const resource = makeResource('aws_instance.web', 'aws_instance', attrs);
    const changes = extractResourceChanges([resource], [resource]);
    expect(changes).toHaveLength(0);
  });
});

describe('formatComparisonSummary', () => {
  it('formats summary with correct counts', () => {
    const result = {
      added: [makeResource('a', 'aws_s3_bucket')],
      removed: [],
      changed: [makeResource('b', 'aws_instance')],
      unchanged: [makeResource('c', 'aws_vpc'), makeResource('d', 'aws_vpc')],
    };
    const summary = formatComparisonSummary(result);
    expect(summary).toContain('Added:     1');
    expect(summary).toContain('Removed:   0');
    expect(summary).toContain('Changed:   1');
    expect(summary).toContain('Unchanged: 2');
  });
});
