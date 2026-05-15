import {
  prioritizeResource,
  prioritizeDrift,
  scoreToPriority,
  formatPrioritySummary,
} from './prioritizer';
import { DriftedResource } from './types';

function makeResource(overrides: Partial<DriftedResource> = {}): DriftedResource {
  return {
    address: 'aws_instance.web',
    type: 'aws_instance',
    name: 'web',
    driftedAttributes: [],
    severity: 'medium',
    ...overrides,
  };
}

describe('scoreToPriority', () => {
  it('returns critical for score >= 90', () => {
    expect(scoreToPriority(90)).toBe('critical');
    expect(scoreToPriority(100)).toBe('critical');
  });

  it('returns high for score in [65, 89]', () => {
    expect(scoreToPriority(65)).toBe('high');
    expect(scoreToPriority(80)).toBe('high');
  });

  it('returns medium for score in [35, 64]', () => {
    expect(scoreToPriority(35)).toBe('medium');
    expect(scoreToPriority(50)).toBe('medium');
  });

  it('returns low for score < 35', () => {
    expect(scoreToPriority(0)).toBe('low');
    expect(scoreToPriority(34)).toBe('low');
  });
});

describe('prioritizeResource', () => {
  it('uses severity as base score', () => {
    const r = makeResource({ severity: 'high' });
    const result = prioritizeResource(r);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('boosts score for critical resource types', () => {
    const r = makeResource({ type: 'aws_iam_role', severity: 'medium' });
    const base = prioritizeResource(r);
    const boosted = prioritizeResource(r, { criticalTypes: ['aws_iam_role'] });
    expect(boosted.score).toBeGreaterThan(base.score);
    expect(boosted.reasons).toContain("resource type 'aws_iam_role' is marked critical");
  });

  it('boosts score for security-sensitive drifted attributes', () => {
    const r = makeResource({
      severity: 'low',
      driftedAttributes: [{ attribute: 'kms_key_id', expected: 'a', actual: 'b' }],
    });
    const result = prioritizeResource(r, { boostSecurityAttributes: true });
    expect(result.score).toBeGreaterThan(25);
    expect(result.reasons.some((r) => r.includes('kms'))).toBe(true);
  });

  it('boosts score for critical attributes', () => {
    const r = makeResource({
      severity: 'low',
      driftedAttributes: [{ attribute: 'instance_type', expected: 't2.micro', actual: 't3.large' }],
    });
    const result = prioritizeResource(r, { criticalAttributes: ['instance_type'] });
    expect(result.reasons).toContain("critical attribute 'instance_type' has drifted");
  });

  it('caps score at 100', () => {
    const r = makeResource({
      severity: 'critical',
      driftedAttributes: [{ attribute: 'password', expected: 'x', actual: 'y' }],
    });
    const result = prioritizeResource(r, {
      criticalTypes: [r.type],
      boostSecurityAttributes: true,
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('prioritizeDrift', () => {
  it('returns resources sorted by score descending', () => {
    const resources = [
      makeResource({ address: 'a', severity: 'low' }),
      makeResource({ address: 'b', severity: 'critical' }),
      makeResource({ address: 'c', severity: 'medium' }),
    ];
    const result = prioritizeDrift(resources);
    expect(result[0].resource.address).toBe('b');
    expect(result[result.length - 1].resource.address).toBe('a');
  });
});

describe('formatPrioritySummary', () => {
  it('outputs correct counts per priority level', () => {
    const resources = [
      makeResource({ severity: 'critical' }),
      makeResource({ severity: 'critical' }),
      makeResource({ severity: 'low' }),
    ];
    const prioritized = prioritizeDrift(resources);
    const summary = formatPrioritySummary(prioritized);
    expect(summary).toContain('Priority Summary');
    expect(summary).toContain('critical');
  });
});
