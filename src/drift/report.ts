import { DriftReport, DriftResult, DriftStatus } from './types';

export function buildReport(results: DriftResult[]): DriftReport {
  const counts = results.reduce(
    (acc, r) => {
      if (r.status === DriftStatus.DRIFTED) acc.driftedCount++;
      else if (r.status === DriftStatus.MISSING) acc.missingCount++;
      else if (r.status === DriftStatus.UNPLANNED) acc.unplannedCount++;
      else acc.okCount++;
      return acc;
    },
    { driftedCount: 0, missingCount: 0, unplannedCount: 0, okCount: 0 }
  );

  return {
    timestamp: new Date().toISOString(),
    totalResources: results.length,
    ...counts,
    results,
  };
}

export function formatReportText(report: DriftReport): string {
  const lines: string[] = [
    `DriftCheck Report — ${report.timestamp}`,
    `Total: ${report.totalResources} | OK: ${report.okCount} | Drifted: ${report.driftedCount} | Missing: ${report.missingCount} | Unplanned: ${report.unplannedCount}`,
    '',
  ];

  for (const result of report.results) {
    if (result.status === DriftStatus.OK) continue;
    const icon =
      result.status === DriftStatus.DRIFTED
        ? '⚠️'
        : result.status === DriftStatus.MISSING
        ? '❌'
        : '🔵';
    lines.push(`${icon} [${result.status}] ${result.resourceId} (${result.resourceType})`);
    lines.push(`   ${result.message}`);
    if (result.driftedAttributes.length > 0) {
      lines.push(`   Drifted attributes: ${result.driftedAttributes.join(', ')}`);
    }
    lines.push('');
  }

  const hasDrift =
    report.driftedCount > 0 || report.missingCount > 0 || report.unplannedCount > 0;
  lines.push(hasDrift ? '🚨 Drift detected.' : '✅ No drift detected.');

  return lines.join('\n');
}

export function hasDrift(report: DriftReport): boolean {
  return report.driftedCount > 0 || report.missingCount > 0 || report.unplannedCount > 0;
}
