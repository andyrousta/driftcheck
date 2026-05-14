import { exportReportAsJson, exportReportAsCsv, exportReportAsMarkdown } from './exporter';
import { DriftReport } from './types';

const mockReport: DriftReport = {
  generatedAt: '2024-01-15T10:00:00.000Z',
  driftedResources: [
    {
      address: 'aws_instance.web',
      severity: 'high',
      driftedAttributes: [
        { attribute: 'instance_type', expected: 't3.micro', actual: 't3.small' },
        { attribute: 'tags.Env', expected: 'prod', actual: 'staging' },
      ],
    },
  ],
};

describe('exportReportAsJson', () => {
  it('returns valid JSON string', () => {
    const result = exportReportAsJson(mockReport);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes drifted resources', () => {
    const result = JSON.parse(exportReportAsJson(mockReport));
    expect(result.driftedResources).toHaveLength(1);
    expect(result.driftedResources[0].address).toBe('aws_instance.web');
  });
});

describe('exportReportAsCsv', () => {
  it('includes header row', () => {
    const result = exportReportAsCsv(mockReport);
    expect(result.startsWith('resource,attribute,expected,actual,severity')).toBe(true);
  });

  it('includes one row per drifted attribute', () => {
    const result = exportReportAsCsv(mockReport);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3); // header + 2 attributes
  });

  it('contains resource address in rows', () => {
    const result = exportReportAsCsv(mockReport);
    expect(result).toContain('aws_instance.web');
  });
});

describe('exportReportAsMarkdown', () => {
  it('includes report title', () => {
    const result = exportReportAsMarkdown(mockReport);
    expect(result).toContain('# Drift Report');
  });

  it('includes resource address as heading', () => {
    const result = exportReportAsMarkdown(mockReport);
    expect(result).toContain('### aws_instance.web');
  });

  it('includes attribute table rows', () => {
    const result = exportReportAsMarkdown(mockReport);
    expect(result).toContain('instance_type');
    expect(result).toContain('t3.micro');
    expect(result).toContain('t3.small');
  });

  it('includes total drifted resource count', () => {
    const result = exportReportAsMarkdown(mockReport);
    expect(result).toContain('Total Drifted Resources:** 1');
  });
});
