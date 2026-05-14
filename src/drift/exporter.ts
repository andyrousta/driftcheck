import * as fs from 'fs';
import * as path from 'path';
import { DriftReport } from './types';
import { ExporterConfig } from './exporter.config';

export type ExportFormat = 'json' | 'csv' | 'markdown';

export function exportReportAsJson(report: DriftReport): string {
  return JSON.stringify(report, null, 2);
}

export function exportReportAsCsv(report: DriftReport): string {
  const rows: string[] = ['resource,attribute,expected,actual,severity'];
  for (const resource of report.driftedResources) {
    for (const attr of resource.driftedAttributes) {
      const row = [
        resource.address,
        attr.attribute,
        JSON.stringify(attr.expected),
        JSON.stringify(attr.actual),
        resource.severity ?? 'unknown',
      ].join(',');
      rows.push(row);
    }
  }
  return rows.join('\n');
}

export function exportReportAsMarkdown(report: DriftReport): string {
  const lines: string[] = [
    `# Drift Report`,
    ``,
    `**Generated:** ${report.generatedAt}`,
    `**Total Drifted Resources:** ${report.driftedResources.length}`,
    ``,
    `## Drifted Resources`,
    ``,
  ];

  for (const resource of report.driftedResources) {
    lines.push(`### ${resource.address}`);
    lines.push(`| Attribute | Expected | Actual |`);
    lines.push(`|-----------|----------|--------|`);
    for (const attr of resource.driftedAttributes) {
      lines.push(`| ${attr.attribute} | ${JSON.stringify(attr.expected)} | ${JSON.stringify(attr.actual)} |`);
    }
    lines.push(``);
  }

  return lines.join('\n');
}

export function exportReport(
  report: DriftReport,
  config: ExporterConfig
): string {
  let content: string;
  switch (config.format) {
    case 'csv':
      content = exportReportAsCsv(report);
      break;
    case 'markdown':
      content = exportReportAsMarkdown(report);
      break;
    case 'json':
    default:
      content = exportReportAsJson(report);
  }

  if (config.outputPath) {
    const dir = path.dirname(config.outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(config.outputPath, content, 'utf-8');
  }

  return content;
}
