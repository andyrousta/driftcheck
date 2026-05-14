import { Command } from 'commander';
import {
  buildSnapshot,
  saveSnapshot,
  loadSnapshot,
  listSnapshots,
  deleteSnapshot,
} from '../drift/snapshot';
import { mergeSnapshotConfig } from '../drift/snapshot.config';
import { parsePlanFile } from '../drift/parser';
import { detectDrift } from '../drift/detector';
import { buildReport, formatReportText } from '../drift/report';

export function registerSnapshotCommand(program: Command): void {
  const snap = program.command('snapshot').description('Manage drift snapshots');

  snap
    .command('create <planFile>')
    .description('Create a new snapshot from a Terraform plan file')
    .option('--dir <dir>', 'Snapshot storage directory')
    .option('--meta <key=value...>', 'Metadata key-value pairs')
    .action((planFile: string, options: { dir?: string; meta?: string[] }) => {
      const config = mergeSnapshotConfig({ ...(options.dir ? { snapshotDir: options.dir } : {}) });
      const metadata: Record<string, string> = {};
      (options.meta || []).forEach((kv) => {
        const [k, v] = kv.split('=');
        if (k && v !== undefined) metadata[k] = v;
      });
      const parsed = parsePlanFile(planFile);
      const drifted = detectDrift(parsed.planned, parsed.live);
      const report = buildReport(drifted);
      const snapshot = buildSnapshot(report, planFile, metadata);
      const savedPath = saveSnapshot(snapshot, config.snapshotDir);
      console.log(`Snapshot saved: ${snapshot.id}`);
      console.log(`Path: ${savedPath}`);
    });

  snap
    .command('list')
    .description('List all available snapshots')
    .option('--dir <dir>', 'Snapshot storage directory')
    .action((options: { dir?: string }) => {
      const config = mergeSnapshotConfig({ ...(options.dir ? { snapshotDir: options.dir } : {}) });
      const snapshots = listSnapshots(config.snapshotDir);
      if (snapshots.length === 0) {
        console.log('No snapshots found.');
        return;
      }
      snapshots.forEach((s) => {
        console.log(`[${s.timestamp}] ${s.id}  (${s.planFile})`);
      });
    });

  snap
    .command('show <id>')
    .description('Show drift report for a snapshot')
    .option('--dir <dir>', 'Snapshot storage directory')
    .action((id: string, options: { dir?: string }) => {
      const config = mergeSnapshotConfig({ ...(options.dir ? { snapshotDir: options.dir } : {}) });
      const snapshot = loadSnapshot(id, config.snapshotDir);
      console.log(`Snapshot: ${snapshot.id}`);
      console.log(`Created:  ${snapshot.timestamp}`);
      console.log(`Plan:     ${snapshot.planFile}`);
      if (snapshot.metadata && Object.keys(snapshot.metadata).length > 0) {
        console.log(`Metadata: ${JSON.stringify(snapshot.metadata)}`);
      }
      console.log(formatReportText(snapshot.report));
    });

  snap
    .command('delete <id>')
    .description('Delete a snapshot by ID')
    .option('--dir <dir>', 'Snapshot storage directory')
    .action((id: string, options: { dir?: string }) => {
      const config = mergeSnapshotConfig({ ...(options.dir ? { snapshotDir: options.dir } : {}) });
      deleteSnapshot(id, config.snapshotDir);
      console.log(`Snapshot deleted: ${id}`);
    });
}
