import {
  buildRemediationPlan,
  formatRemediationPlan,
  RemediationPlan,
} from './remediation';
import { DriftResult } from './types';

const mockDriftResult: DriftResult = {
  driftedResources: [
    {
      address: 'aws_instance.web',
      type: 'aws_instance',
      driftedAttributes: [
        { attribute: 'instance_type', expected: 't3.micro', actual: 't3.small' },
        { attribute: 'tags.Env', expected: 'prod', actual: 'staging' },
      ],
    },
  ],
  checkedAt: '2024-01-01T00:00:00.000Z',
  totalResources: 1,
  driftCount: 1,
};

describe('buildRemediationPlan', () => {
  it('returns a dry-run plan by default', () => {
    const plan = buildRemediationPlan(mockDriftResult);
    expect(plan.dryRun).toBe(true);
    expect(plan.actions).toHaveLength(2);
  });

  it('sets dryRun false when passed false', () => {
    const plan = buildRemediationPlan(mockDriftResult, false);
    expect(plan.dryRun).toBe(false);
  });

  it('maps each drifted attribute to an action', () => {
    const plan = buildRemediationPlan(mockDriftResult);
    expect(plan.actions[0].resourceAddress).toBe('aws_instance.web');
    expect(plan.actions[0].attribute).toBe('instance_type');
    expect(plan.actions[0].expectedValue).toBe('t3.micro');
    expect(plan.actions[0].actualValue).toBe('t3.small');
  });

  it('includes terraform command in each action', () => {
    const plan = buildRemediationPlan(mockDriftResult);
    expect(plan.actions[0].command).toContain('terraform apply');
    expect(plan.actions[0].command).toContain('aws_instance.web');
  });

  it('returns empty plan when no drift', () => {
    const empty: DriftResult = { ...mockDriftResult, driftedResources: [], driftCount: 0 };
    const plan = buildRemediationPlan(empty);
    expect(plan.actions).toHaveLength(0);
  });
});

describe('formatRemediationPlan', () => {
  it('returns no-action message for empty plan', () => {
    const plan: RemediationPlan = { actions: [], generatedAt: '', dryRun: true };
    expect(formatRemediationPlan(plan)).toBe('No remediation actions required.');
  });

  it('includes DRY RUN label when dryRun is true', () => {
    const plan = buildRemediationPlan(mockDriftResult, true);
    expect(formatRemediationPlan(plan)).toContain('DRY RUN');
  });

  it('includes LIVE label when dryRun is false', () => {
    const plan = buildRemediationPlan(mockDriftResult, false);
    expect(formatRemediationPlan(plan)).toContain('LIVE');
  });

  it('includes resource address and attribute in output', () => {
    const plan = buildRemediationPlan(mockDriftResult);
    const output = formatRemediationPlan(plan);
    expect(output).toContain('aws_instance.web');
    expect(output).toContain('instance_type');
  });
});
