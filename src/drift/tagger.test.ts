import {
  matchesTagRule,
  tagResource,
  tagDriftedResources,
  groupResourcesByTag,
  buildTaggerConfigFromEnv,
  TaggerConfig,
} from './tagger';
import { DriftedResource } from './types';

const makeResource = (overrides: Partial<DriftedResource> = {}): DriftedResource => ({
  resourceId: 'aws_instance.web',
  resourceType: 'aws_instance',
  driftedAttributes: [{ attribute: 'instance_type', expected: 't2.micro', actual: 't3.micro' }],
  ...overrides,
});

const config: TaggerConfig = {
  rules: [
    { match: { resourceType: 'aws_instance' }, tags: ['compute'] },
    { match: { attribute: 'instance_type' }, tags: ['sizing'] },
    { match: { resourceType: 'aws_s3_bucket' }, tags: ['storage'] },
  ],
};

describe('matchesTagRule', () => {
  it('matches by resourceType', () => {
    const resource = makeResource();
    expect(matchesTagRule(resource, { match: { resourceType: 'aws_instance' }, tags: [] })).toBe(true);
  });

  it('does not match wrong resourceType', () => {
    const resource = makeResource();
    expect(matchesTagRule(resource, { match: { resourceType: 'aws_s3_bucket' }, tags: [] })).toBe(false);
  });

  it('matches by attribute', () => {
    const resource = makeResource();
    expect(matchesTagRule(resource, { match: { attribute: 'instance_type' }, tags: [] })).toBe(true);
  });

  it('does not match missing attribute', () => {
    const resource = makeResource();
    expect(matchesTagRule(resource, { match: { attribute: 'ami' }, tags: [] })).toBe(false);
  });

  it('matches when both resourceType and attribute match', () => {
    const resource = makeResource();
    expect(matchesTagRule(resource, { match: { resourceType: 'aws_instance', attribute: 'instance_type' }, tags: [] })).toBe(true);
  });
});

describe('tagResource', () => {
  it('returns all matching tags without duplicates', () => {
    const resource = makeResource();
    const tags = tagResource(resource, config);
    expect(tags).toContain('compute');
    expect(tags).toContain('sizing');
    expect(tags).not.toContain('storage');
  });

  it('returns empty array when no rules match', () => {
    const resource = makeResource({ resourceType: 'aws_lambda_function', driftedAttributes: [] });
    expect(tagResource(resource, config)).toEqual([]);
  });
});

describe('tagDriftedResources', () => {
  it('maps resource ids to tags', () => {
    const resources = [makeResource(), makeResource({ resourceId: 'aws_s3_bucket.data', resourceType: 'aws_s3_bucket', driftedAttributes: [] })];
    const result = tagDriftedResources(resources, config);
    expect(result.get('aws_instance.web')).toContain('compute');
    expect(result.get('aws_s3_bucket.data')).toContain('storage');
  });
});

describe('groupResourcesByTag', () => {
  it('groups resource ids by tag', () => {
    const tagMap = new Map([['res1', ['compute', 'sizing']], ['res2', ['compute']]]);
    const grouped = groupResourcesByTag(tagMap);
    expect(grouped.get('compute')).toEqual(expect.arrayContaining(['res1', 'res2']));
    expect(grouped.get('sizing')).toEqual(['res1']);
  });
});

describe('buildTaggerConfigFromEnv', () => {
  it('returns empty rules when env var not set', () => {
    delete process.env.DRIFTCHECK_TAG_RULES;
    expect(buildTaggerConfigFromEnv()).toEqual({ rules: [] });
  });

  it('parses rules from env var', () => {
    process.env.DRIFTCHECK_TAG_RULES = JSON.stringify([{ match: { resourceType: 'aws_instance' }, tags: ['compute'] }]);
    const cfg = buildTaggerConfigFromEnv();
    expect(cfg.rules).toHaveLength(1);
    delete process.env.DRIFTCHECK_TAG_RULES;
  });

  it('returns empty rules on invalid JSON', () => {
    process.env.DRIFTCHECK_TAG_RULES = 'not-json';
    expect(buildTaggerConfigFromEnv()).toEqual({ rules: [] });
    delete process.env.DRIFTCHECK_TAG_RULES;
  });
});
