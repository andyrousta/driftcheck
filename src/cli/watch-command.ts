import { Command } from 'commander';
import { buildWatcherConfigFromEnv, startWatcher, validateWatcherConfig } from '../drift/watcher';
import { formatReportText } from '../drift/report';

export function registerWatchCommand(program: Command): void {
  program
    .command('watch')
    .description('Continuously poll a Terraform plan file and report drift at a set interval')
    .requiredOption('-p, --plan <path>', 'Path to Terraform plan JSON file')
    .option('-i, --interval <ms>', 'Polling interval in milliseconds', '60000')
    .option('--max-runs <n>', 'Stop after N runs (useful for testing)')
    .action((opts) => {
      const intervalMs = parseInt(opts.interval, 10);
      const maxRuns = opts.maxRuns ? parseInt(opts.maxRuns, 10) : undefined;

      const config = buildWatcherConfigFromEnv({
        planPath: opts.plan,
        intervalMs,
        maxRuns,
        onDrift: (report) => {
          console.log('\n[driftcheck] Drift detected:');
          console.log(formatReportText(report));
        },
        onError: (err) => {
          console.error(`[driftcheck] Error during watch tick: ${err.message}`);
        },
      });

      const errors = validateWatcherConfig(config);
      if (errors.length > 0) {
        console.error('[driftcheck] Invalid watcher configuration:');
        errors.forEach((e) => console.error(`  - ${e}`));
        process.exit(1);
      }

      console.log(`[driftcheck] Watching ${opts.plan} every ${intervalMs}ms...`);
      if (maxRuns !== undefined) {
        console.log(`[driftcheck] Will stop after ${maxRuns} run(s).`);
      }

      const handle = startWatcher(config as Required<typeof config>);

      process.on('SIGINT', () => {
        console.log('\n[driftcheck] Stopping watcher.');
        handle.stop();
        process.exit(0);
      });
    });
}
