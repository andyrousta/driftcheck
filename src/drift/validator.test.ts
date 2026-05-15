import {
  matchesPattern,
  validateResource,
  validateDrift,
  formatValidationSummary,
  ValidationRule,
} from './validator';
import { DriftedResource, DriftReport } from './types';

function makeResource(overrides: Partial<DriftedResource> = {}): DriftedResource {
  return {
    resourceAddress: 'aws_instance.web',
    resourceType: 'aws_instance',
    driftedAttributes: [
      { attribute: 'instance_type', expected: 't2.micro', actual: 't3.medium' },
    ],
    ...overrides,
  };
}

function makeReport(resources: DriftedResource[] = []): DriftReport {
  return {
    generatedAt: new Date().toISOString(),
    driftedResources: resources,
    totalDrifted: resources.length,
  };
}

const rules: ValidationRule[] = [
  {
    id: 'R001',
    description: 'No instance_type drift allowed',
    resourceTypePattern: 'aws_instance',
    attributePattern: 'instance_type',
    severity: 'error',
  },
  {
    id: 'R002',
    description: 'Tag drift is a warning',
    attributePattern: 'tags*',
    severity: 'warning',
  },
  {
    id: 'R003',
    description: 'All S3 drift should be reviewed',
    resourceTypePattern: 'aws_s3*',
    severity: 'info',
  },
];

describe('matchesPattern', () => {
  it('matches exact strings', () => {
    expect(matchesPattern('aws_instance', 'aws_instance')).toBe(true);
  });

  it('matches wildcard patterns', () => {
    expect(matchesPattern('aws_s3_bucket', 'aws_s3*')).toBe(true);
    expect(matchesPattern('tags_env', 'tags*')).toBe(true);
  });

  it('returns false for non-matching patterns', () => {
    expect(matchesPattern('aws_instance', 'aws_s3*')).toBe(false);
  });
});

describe('validateResource', () => {
  it('returns error for instance_type drift on aws_instance', () => {
    const resource = makeResource();
    const results = validateResource(resource, rules);
    expect(results.some(r => r.ruleId === 'R001' && r.severity === 'error')).toBe(true);
  });

  it('returns no results when no rules match', () => {
    const resource = makeResource({ resourceType: 'aws_vpc' });
    const results = validateResource(resource, [rules[0]]);
    expect(results).toHaveLength(0);
  });

  it('matches attribute-only rules across resource types', () => {
    const resource = makeResource({
      driftedAttributes: [{ attribute: 'tags_env', expected: 'prod', actual: 'staging' }],
    });
    const results = validateResource(resource, [rules[1]]);
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('warning');
  });
});

describe('validateDrift', () => {
  it('fails when there are errors', () => {
    const report = makeReport([makeResource()]);
    const summary = validateDrift(report, rules);
    expect(summary.passed).toBe(false);
    expect(summary.errorCount).toBeGreaterThan(0);
  });

  it('passes when no rules match', () => {
    const report = makeReport([makeResource({ resourceType: 'aws_vpc', driftedAttributes: [] })]);
    const summary = validateDrift(report, rules);
    expect(summary.passed).toBe(true);
    expect(summary.errorCount).toBe(0);
  });

  it('counts severities correctly', () => {
    const s3Resource = makeResource({ resourceAddress: 'aws_s3_bucket.data', resourceType: 'aws_s3_bucket' });
    const report = makeReport([s3Resource]);
    const summary = validateDrift(report, rules);
    expect(summary.infoCount).toBeGreaterThan(0);
  });
});

describe('formatValidationSummary', () => {
  it('includes PASSED when no errors', () => {
    const summary = { passed: true, errorCount: 0, warningCount: 1, infoCount: 0, results: [] };
    expect(formatValidationSummary(summary)).toContain('PASSED');
  });

  it('includes FAILED when errors exist', () => {
    const summary = { passed: false, errorCount: 2, warningCount: 0, infoCount: 0, results: [] };
    expect(formatValidationSummary(summary)).toContain('FAILED');
  });

  it('lists results in output', () => {
    const summary = {
      passed: false,
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      results: [{ ruleId: 'R001', description: 'test', severity: 'error' as const, resourceAddress: 'aws_instance.web', message: 'test message' }],
    };
    expect(formatValidationSummary(summary)).toContain('[ERROR]');
    expect(formatValidationSummary(summary)).toContain('R001');
  });
});
