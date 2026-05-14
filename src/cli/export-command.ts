import { Command } from 'commander';
import * as fs from 'fs';
import {
  buildExporterConfigFromEnv,
  validateExporterConfig,
  mergeExporterConfig,
  isValidExportFormat,
} from '../drift/exporter.config';
import { exportReport } from '../drift/exporter';
import { DriftReport } from '../drift/types';

export function registerExportCommand(program: Command): void {
  program
    .command('export <report-file>')
    .description('Export a drift report to a specified format (json, csv, markdown)')
    .option('-f, --format <format>', 'Output format: json | csv | markdown', 'json')
    .option('-o, --output <path>', 'Output file path (defaults to stdout)')
    .action((reportFile: string, options: { format: string; output?: string }) => {
      if (!fs.existsSync(reportFile)) {
        console.error(`Error: Report file not found: ${reportFile}`);
        process.exit(1);
      }

      let report: DriftReport;
      try {
        const raw = fs.readFileSync(reportFile, 'utf-8');
        report = JSON.parse(raw) as DriftReport;
      } catch (err) {
        console.error(`Error: Failed to parse report file: ${(err as Error).message}`);
        process.exit(1);
      }

      if (!isValidExportFormat(options.format)) {
        console.error(`Error: Invalid format "${options.format}". Use: json, csv, markdown`);
        process.exit(1);
      }

      const envConfig = buildExporterConfigFromEnv();
      const cliConfig = {
        format: options.format as 'json' | 'csv' | 'markdown',
        outputPath: options.output,
      };

      let config;
      try {
        config = validateExporterConfig(mergeExporterConfig(envConfig, cliConfig));
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }

      const output = exportReport(report, config);

      if (!config.outputPath) {
        console.log(output);
      } else {
        console.log(`Report exported to: ${config.outputPath}`);
      }
    });
}
