import {
  groupByResourceType,
  groupBySeverity,
  groupByModule,
  groupByTag,
  formatGroupSummary,
} from './grouper';
import { DriftedResource } from './types';

const makeResource = (overrides: Partial<DriftedResource>): DriftedResource =>
  ({
    resourceAddress: 'aws_instance.web',
    resourceType: 'aws_instance',
    severity: 'high',
    driftedAttributes: [],
    ...overrides,
  } as DriftedResource);

describe('groupByResourceType', () => {
  it('groups resources by type', () => {
    const resources = [
      makeResource({ resourceType: 'aws_instance', resourceAddress: 'aws_instance.a' }),
      makeResource({ resourceType: 'aws_instance', resourceAddress: 'aws_instance.b' }),
      makeResource({ resourceType: 'aws_s3_bucket', resourceAddress: 'aws_s3_bucket.c' }),
    ];
    const groups = groupByResourceType(resources);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe('aws_instance');
    expect(groups[0].count).toBe(2);
  });
});

describe('groupBySeverity', () => {
  it('groups resources by severity', () => {
    const resources = [
      makeResource({ severity: 'high' }),
      makeResource({ severity: 'low' }),
      makeResource({ severity: 'high' }),
    ];
    const groups = groupBySeverity(resources);
    expect(groups[0].key).toBe('high');
    expect(groups[0].count).toBe(2);
  });
});

describe('groupByModule', () => {
  it('groups resources by terraform module path', () => {
    const resources = [
      makeResource({ resourceAddress: 'module.vpc.aws_subnet.public' }),
      makeResource({ resourceAddress: 'module.vpc.aws_subnet.private' }),
      makeResource({ resourceAddress: 'aws_instance.web' }),
    ];
    const groups = groupByModule(resources);
    const moduleVpc = groups.find((g) => g.key === 'module.vpc');
    expect(moduleVpc).toBeDefined();
    expect(moduleVpc!.count).toBe(2);
  });
});

describe('groupByTag', () => {
  it('groups resources by a tag value', () => {
    const resources = [
      makeResource({ ...(({ tags: { env: 'prod' } } as any)) }),
      makeResource({ ...(({ tags: { env: 'prod' } } as any)) }),
      makeResource({ ...(({ tags: { env: 'staging' } } as any)) }),
    ];
    const groups = groupByTag(resources, 'env');
    expect(groups.find((g) => g.key === 'prod')?.count).toBe(2);
    expect(groups.find((g) => g.key === 'staging')?.count).toBe(1);
  });

  it('uses "untagged" for missing tag key', () => {
    const resources = [makeResource({})];
    const groups = groupByTag(resources, 'env');
    expect(groups[0].key).toBe('untagged');
  });
});

describe('formatGroupSummary', () => {
  it('returns a formatted string', () => {
    const groups = [{ key: 'aws_instance', resources: [], count: 3 }];
    expect(formatGroupSummary(groups)).toContain('aws_instance: 3 resource(s)');
  });

  it('returns fallback for empty groups', () => {
    expect(formatGroupSummary([])).toBe('No groups found.');
  });
});
