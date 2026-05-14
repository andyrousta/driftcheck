import { scoreAttribute, scoreResource, scoreDrift, scoreToSeverity } from './scorer';
import { DriftResult } from './types';

const makeDriftResult = (address: string, attrs: { attribute: string; expected: unknown; actual: unknown }[]): DriftResult => ({
  resourceAddress: address,
  driftedAttributes: attrs.map((a) => ({ ...a, expected: a.expected as string, actual: a.actual as string })),
});

describe('scoreToSeverity', () => {
  it('returns critical for score >= 10', () => expect(scoreToSeverity(10)).toBe('critical'));
  it('returns high for score >= 6', () => expect(scoreToSeverity(7)).toBe('high'));
  it('returns medium for score >= 3', () => expect(scoreToSeverity(4)).toBe('medium'));
  it('returns low for score < 3', () => expect(scoreToSeverity(1)).toBe('low'));
});

describe('scoreAttribute', () => {
  it('returns base score of 1 for non-sensitive attribute', () => {
    expect(scoreAttribute({ attribute: 'instance_type', expected: 't2.micro', actual: 't3.micro' })).toBe(1);
  });

  it('adds 4 for sensitive attribute names', () => {
    expect(scoreAttribute({ attribute: 'db_password', expected: 'old', actual: 'new' })).toBe(5);
  });

  it('adds 2 when expected or actual is null', () => {
    expect(scoreAttribute({ attribute: 'tags', expected: null, actual: '{}' })).toBe(3);
  });

  it('combines bonuses for null sensitive attribute', () => {
    expect(scoreAttribute({ attribute: 'api_token', expected: null, actual: 'abc' })).toBe(7);
  });
});

describe('scoreResource', () => {
  it('scores a plain resource with no sensitive attributes', () => {
    const result = makeDriftResult('aws_instance.web', [{ attribute: 'ami', expected: 'ami-old', actual: 'ami-new' }]);
    const scored = scoreResource(result);
    expect(scored.score).toBe(1);
    expect(scored.severityLevel).toBe('low');
  });

  it('adds bonus for critical resource type prefix', () => {
    const result = makeDriftResult('aws_iam_role.admin', [{ attribute: 'assume_role_policy', expected: '{}', actual: '{"x":1}' }]);
    const scored = scoreResource(result);
    expect(scored.score).toBeGreaterThanOrEqual(4);
    expect(scored.reasons).toContain('Critical resource type: aws_iam_role');
  });

  it('flags sensitive attribute in reasons', () => {
    const result = makeDriftResult('aws_db_instance.main', [{ attribute: 'master_password', expected: 'a', actual: 'b' }]);
    const scored = scoreResource(result);
    expect(scored.reasons.some((r) => r.includes('master_password'))).toBe(true);
  });
});

describe('scoreDrift', () => {
  it('returns zero total score for empty results', () => {
    const score = scoreDrift([]);
    expect(score.totalScore).toBe(0);
    expect(score.overallSeverity).toBe('low');
  });

  it('aggregates scores across multiple resources', () => {
    const results = [
      makeDriftResult('aws_instance.a', [{ attribute: 'ami', expected: 'old', actual: 'new' }]),
      makeDriftResult('aws_instance.b', [{ attribute: 'ami', expected: 'old', actual: 'new' }]),
    ];
    const score = scoreDrift(results);
    expect(score.totalScore).toBe(2);
    expect(score.scoredResources).toHaveLength(2);
  });
});
