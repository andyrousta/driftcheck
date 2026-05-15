import { DriftReport, DriftedResource } from './types';

export interface DriftSummary {
  totalResources: number;
  driftedResources: number;
  driftPercentage: number;
  bySeverity: Record<string, number>;
  byResourceType: Record<string, number>;
  topDriftedAttributes: Array<{ attribute: string; count: number }>;
  generatedAt: string;
}

export function countBySeverity(resources: DriftedResource[]): Record<string, number> {
  return resources.reduce<Record<string, number>>((acc, resource) => {
    const severity = resource.severity ?? 'unknown';
    acc[severity] = (acc[severity] ?? 0) + 1;
    return acc;
  }, {});
}

export function countByResourceType(resources: DriftedResource[]): Record<string, number> {
  return resources.reduce<Record<string, number>>((acc, resource) => {
    const type = resource.resourceType ?? 'unknown';
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
}

export function topDriftedAttributes(
  resources: DriftedResource[],
  limit = 5
): Array<{ attribute: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const resource of resources) {
    for (const attr of resource.driftedAttributes ?? []) {
      counts[attr.attribute] = (counts[attr.attribute] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([attribute, count]) => ({ attribute, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function summarizeDrift(report: DriftReport): DriftSummary {
  const drifted = report.driftedResources ?? [];
  const total = report.totalResources ?? drifted.length;
  const driftPercentage = total > 0 ? Math.round((drifted.length / total) * 100) : 0;

  return {
    totalResources: total,
    driftedResources: drifted.length,
    driftPercentage,
    bySeverity: countBySeverity(drifted),
    byResourceType: countByResourceType(drifted),
    topDriftedAttributes: topDriftedAttributes(drifted),
    generatedAt: new Date().toISOString(),
  };
}

export function formatSummaryText(summary: DriftSummary): string {
  const lines: string[] = [
    `Drift Summary (${summary.generatedAt})`,
    `  Total Resources : ${summary.totalResources}`,
    `  Drifted         : ${summary.driftedResources} (${summary.driftPercentage}%)`,
    '',
    'By Severity:',
    ...Object.entries(summary.bySeverity).map(([k, v]) => `  ${k}: ${v}`),
    '',
    'By Resource Type:',
    ...Object.entries(summary.byResourceType).map(([k, v]) => `  ${k}: ${v}`),
    '',
    'Top Drifted Attributes:',
    ...summary.topDriftedAttributes.map((a) => `  ${a.attribute}: ${a.count} occurrence(s)`),
  ];
  return lines.join('\n');
}
