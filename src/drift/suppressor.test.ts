import { suppressDrift, loadSuppressionConfig, isRuleExpired, matchesRule, SuppressionConfig } from './suppressor';
import { DriftedResource } from './types';
import * as fs from 'fs';

jest.mock('fs');

const mockResource: DriftedResource = {
  address: 'aws_instance.web',
  driftedAttributes: [
    { attribute: 'instance_type', planned: 't2.micro', actual: 't2.small' },
    { attribute: 'tags', planned: '{}', actual: '{"env":"prod"}' },
  ],
};

describe('isRuleExpired', () => {
  it('returns false when no expiry set', () => {
    expect(isRuleExpired({})).toBe(false);
  });

  it('returns true when expiry is in the past', () => {
    expect(isRuleExpired({ expiresAt: '2000-01-01' })).toBe(true);
  });

  it('returns false when expiry is in the future', () => {
    expect(isRuleExpired({ expiresAt: '2099-01-01' })).toBe(false);
  });
});

describe('matchesRule', () => {
  it('matches by exact address', () => {
    expect(matchesRule(mockResource, { resourceAddress: 'aws_instance.web' })).toBe(true);
  });

  it('does not match different address', () => {
    expect(matchesRule(mockResource, { resourceAddress: 'aws_instance.db' })).toBe(false);
  });

  it('matches by resource type prefix', () => {
    expect(matchesRule(mockResource, { resourceType: 'aws_instance' })).toBe(true);
  });

  it('returns false for expired rule', () => {
    expect(matchesRule(mockResource, { resourceAddress: 'aws_instance.web', expiresAt: '2000-01-01' })).toBe(false);
  });
});

describe('suppressDrift', () => {
  const config: SuppressionConfig = {
    rules: [{ resourceAddress: 'aws_instance.web', attributes: ['tags'] }],
  };

  it('removes suppressed attributes and keeps active ones', () => {
    const { active, suppressed } = suppressDrift([mockResource], config);
    expect(active).toHaveLength(1);
    expect(active[0].driftedAttributes).toHaveLength(1);
    expect(active[0].driftedAttributes[0].attribute).toBe('instance_type');
    expect(suppressed).toHaveLength(0);
  });

  it('moves resource to suppressed when all attributes are suppressed', () => {
    const fullSuppress: SuppressionConfig = { rules: [{ resourceAddress: 'aws_instance.web' }] };
    const { active, suppressed } = suppressDrift([mockResource], fullSuppress);
    expect(suppressed).toHaveLength(1);
    expect(active).toHaveLength(0);
  });

  it('returns all resources as active when no rules match', () => {
    const { active, suppressed } = suppressDrift([mockResource], { rules: [] });
    expect(active).toHaveLength(1);
    expect(suppressed).toHaveLength(0);
  });
});

describe('loadSuppressionConfig', () => {
  it('returns empty rules when file does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const config = loadSuppressionConfig('.driftignore.json');
    expect(config.rules).toHaveLength(0);
  });

  it('parses config from file', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ rules: [{ resourceAddress: 'aws_s3_bucket.logs' }] }));
    const config = loadSuppressionConfig('.driftignore.json');
    expect(config.rules).toHaveLength(1);
  });
});
