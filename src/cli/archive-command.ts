import { Command } from 'commander';
import * as fs from 'fs';
import * as crypto from 'crypto';
import {
  buildArchivedReport,
  loadArchiveIndex,
  saveToArchive,
} from '../drift/archiver';
import {
  buildArchiverConfigFromEnv,
  mergeArchiverConfig,
  validateArchiverConfig,
} from '../drift/archiver.config';
import { DriftReport } from '../drift/types';

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

export function registerArchiveCommand(program: Command): void {
  const archive = program
    .command('archive')
    .description('Archive and inspect drift reports');

  archive
    .command('save <report-file>')
    .description('Save a drift report to the archive')
    .option('--archive-dir <dir>', 'Directory to store archive')
    .option('--max-entries <n>', 'Maximum number of archive entries', '50')
    .action((reportFile: string, opts: Record<string, string>) => {
      if (!fs.existsSync(reportFile)) {
        console.error(`Report file not found: ${reportFile}`);
        process.exit(1);
      }
      const envConfig = buildArchiverConfigFromEnv();
      const config = mergeArchiverConfig({
        ...envConfig,
        ...(opts.archiveDir ? { archiveDir: opts.archiveDir } : {}),
        ...(opts.maxEntries ? { maxEntries: parseInt(opts.maxEntries, 10) } : {}),
      });
      const errors = validateArchiverConfig(config);
      if (errors.length > 0) {
        errors.forEach((e) => console.error(`Config error: ${e}`));
        process.exit(1);
      }
      const report: DriftReport = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));
      const planHash = hashFile(reportFile);
      const entry = buildArchivedReport(report, reportFile, planHash);
      saveToArchive(entry, config);
      console.log(`Archived report: ${entry.id} (${entry.driftCount} drifted resources)`);
    });

  archive
    .command('list')
    .description('List archived drift reports')
    .option('--archive-dir <dir>', 'Directory containing archive')
    .action((opts: Record<string, string>) => {
      const envConfig = buildArchiverConfigFromEnv();
      const config = mergeArchiverConfig({
        ...envConfig,
        ...(opts.archiveDir ? { archiveDir: opts.archiveDir } : {}),
      });
      const index = loadArchiveIndex(config.archiveDir);
      if (index.length === 0) {
        console.log('No archived reports found.');
        return;
      }
      index.forEach((e) => {
        console.log(`[${e.timestamp}] ${e.id} — ${e.driftCount} drift(s) — hash: ${e.planHash}`);
      });
    });
}
