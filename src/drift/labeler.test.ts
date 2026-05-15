import {
  matchesLabelRule,
  labelResource,
  labelDriftedResources,
  groupResourcesByLabel,
  LabelRule,
} from './labeler';
import { DriftedResource } from './types';

function makeResource(overrides: Partial<DriftedResource> = {}): DriftedResource {
  return {
    resourceType: 'aws_instance',
    resourceName: 'web',
    driftedAttributes: [{ attribute: 'ami', expected: 'ami-old', actual: 'ami-new' }],
    severity: 'high',
    ...overrides,
  } as DriftedResource;
}

const rule: LabelRule = {
  match: { resourceType: 'aws_instance', severity: 'high' },
  labels: { team: 'platform', env: 'prod' },
};

describe('matchesLabelRule', () => {
  it('returns true when all match fields align', () => {
    expect(matchesLabelRule(makeResource(), rule)).toBe(true);
  });

  it('returns false when resourceType does not match', () => {
    expect(matchesLabelRule(makeResource({ resourceType: 'aws_s3_bucket' }), rule)).toBe(false);
  });

  it('returns false when severity does not match', () => {
    expect(matchesLabelRule(makeResource({ severity: 'low' } as any), rule)).toBe(false);
  });

  it('returns false when required attribute is missing', () => {
    const attrRule: LabelRule = { match: { attribute: 'instance_type' }, labels: { tag: 'size' } };
    expect(matchesLabelRule(makeResource(), attrRule)).toBe(false);
  });

  it('returns true when required attribute is present', () => {
    const attrRule: LabelRule = { match: { attribute: 'ami' }, labels: { tag: 'image' } };
    expect(matchesLabelRule(makeResource(), attrRule)).toBe(true);
  });
});

describe('labelResource', () => {
  it('merges labels from all matching rules', () => {
    const rules: LabelRule[] = [
      { match: { resourceType: 'aws_instance' }, labels: { team: 'platform' } },
      { match: { severity: 'high' }, labels: { priority: 'urgent' } },
    ];
    expect(labelResource(makeResource(), rules)).toEqual({ team: 'platform', priority: 'urgent' });
  });

  it('returns empty object when no rules match', () => {
    expect(labelResource(makeResource(), [])).toEqual({});
  });
});

describe('labelDriftedResources', () => {
  it('returns label results for all resources', () => {
    const resources = [makeResource(), makeResource({ resourceType: 'aws_s3_bucket' })];
    const rules: LabelRule[] = [{ match: { resourceType: 'aws_instance' }, labels: { x: '1' } }];
    const results = labelDriftedResources(resources, rules);
    expect(results).toHaveLength(2);
    expect(results[0].labels).toEqual({ x: '1' });
    expect(results[1].labels).toEqual({});
  });
});

describe('groupResourcesByLabel', () => {
  it('groups resources by label key value', () => {
    const r1 = makeResource({ resourceName: 'a' });
    const r2 = makeResource({ resourceName: 'b', resourceType: 'aws_s3_bucket' });
    const results = [
      { resource: r1, labels: { team: 'platform' } },
      { resource: r2, labels: { team: 'data' } },
    ];
    const groups = groupResourcesByLabel(results, 'team');
    expect(groups['platform']).toContain(r1);
    expect(groups['data']).toContain(r2);
  });

  it('places unlabeled resources under __unlabeled__', () => {
    const r = makeResource();
    const groups = groupResourcesByLabel([{ resource: r, labels: {} }], 'team');
    expect(groups['__unlabeled__']).toContain(r);
  });
});
