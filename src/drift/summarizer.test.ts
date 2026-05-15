import {
  countBySeverity,
  countByResourceType,
  topDriftedAttributes,
  summarizeDrift,
  formatSummaryText,
} from './summarizer';
import { DriftReport, DriftedResource } from './types';

const makeResource = (overrides: Partial<DriftedResource> = {}): DriftedResource => ({
  resourceId: 'aws_instance.web',
  resourceType: 'aws_instance',
  severity: 'high',
  driftedAttributes: [{ attribute: 'instance_type', expected: 't2.micro', actual: 't3.medium' }],
  ...overrides,
});

const makeReport = (resources: DriftedResource[]): DriftReport => ({
  totalResources: 10,
  driftedResources: resources,
  generatedAt: '2024-01-01T00:00:00.000Z',
});

describe('countBySeverity', () => {
  it('counts resources by severity', () => {
    const resources = [
      makeResource({ severity: 'high' }),
      makeResource({ severity: 'high' }),
      makeResource({ severity: 'low' }),
    ];
    expect(countBySeverity(resources)).toEqual({ high: 2, low: 1 });
  });

  it('handles unknown severity', () => {
    const resources = [makeResource({ severity: undefined })];
    expect(countBySeverity(resources)).toEqual({ unknown: 1 });
  });
});

describe('countByResourceType', () => {
  it('counts resources by type', () => {
    const resources = [
      makeResource({ resourceType: 'aws_instance' }),
      makeResource({ resourceType: 'aws_s3_bucket' }),
      makeResource({ resourceType: 'aws_instance' }),
    ];
    expect(countByResourceType(resources)).toEqual({ aws_instance: 2, aws_s3_bucket: 1 });
  });
});

describe('topDriftedAttributes', () => {
  it('returns top attributes sorted by count', () => {
    const resources = [
      makeResource({ driftedAttributes: [{ attribute: 'tags', expected: '{}', actual: '{env:prod}' }] }),
      makeResource({ driftedAttributes: [{ attribute: 'tags', expected: '{}', actual: '{env:dev}' }] }),
      makeResource({ driftedAttributes: [{ attribute: 'instance_type', expected: 't2.micro', actual: 't3.medium' }] }),
    ];
    const result = topDriftedAttributes(resources, 2);
    expect(result[0]).toEqual({ attribute: 'tags', count: 2 });
    expect(result[1]).toEqual({ attribute: 'instance_type', count: 1 });
  });

  it('returns empty array when no attributes', () => {
    expect(topDriftedAttributes([], 5)).toEqual([]);
  });
});

describe('summarizeDrift', () => {
  it('builds a summary from a report', () => {
    const resources = [makeResource(), makeResource({ severity: 'low', resourceType: 'aws_s3_bucket' })];
    const report = makeReport(resources);
    const summary = summarizeDrift(report);
    expect(summary.totalResources).toBe(10);
    expect(summary.driftedResources).toBe(2);
    expect(summary.driftPercentage).toBe(20);
    expect(summary.bySeverity).toEqual({ high: 1, low: 1 });
    expect(summary.byResourceType).toEqual({ aws_instance: 1, aws_s3_bucket: 1 });
  });

  it('handles zero total resources without dividing by zero', () => {
    const report: DriftReport = { totalResources: 0, driftedResources: [], generatedAt: '' };
    const summary = summarizeDrift(report);
    expect(summary.driftPercentage).toBe(0);
  });
});

describe('formatSummaryText', () => {
  it('includes key summary fields in output', () => {
    const resources = [makeResource()];
    const summary = summarizeDrift(makeReport(resources));
    const text = formatSummaryText(summary);
    expect(text).toContain('Drift Summary');
    expect(text).toContain('Drifted');
    expect(text).toContain('By Severity');
    expect(text).toContain('aws_instance');
  });
});
