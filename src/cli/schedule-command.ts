import { Command } from 'commander';
import { DriftScheduler, buildSchedulerConfigFromEnv } from '../drift/scheduler';
import { parsePlanFile } from '../drift/parser';
import { detectDrift } from '../drift/detector';
import { buildReport, hasDrift } from '../drift/report';
import { loadSuppressionConfig, suppressDrift } from '../drift/suppressor';

export function registerScheduleCommand(program: Command): void {
  program
    .command('schedule')
    .description('Run drift checks on a cron schedule')
    .requiredOption('--plan <path>', 'Path to the Terraform plan JSON file')
    .option('--suppress <path>', 'Path to suppression config file')
    .option('--cron <expr>', 'Cron expression (overrides DRIFTCHECK_CRON env var)')
    .option('--tz <timezone>', 'Timezone for the schedule')
    .action(async (opts) => {
      const envConfig = buildSchedulerConfigFromEnv();
      const config = {
        cronExpression: opts.cron ?? envConfig.cronExpression,
        enabled: true,
        timezone: opts.tz ?? envConfig.timezone,
      };

      const scheduler = new DriftScheduler();

      scheduler.on('task:start', (name: string) =>
        console.log(`[schedule] Starting task: ${name}`)
      );
      scheduler.on('task:success', (name: string) =>
        console.log(`[schedule] Task completed: ${name}`)
      );
      scheduler.on('task:error', (name: string, err: unknown) =>
        console.error(`[schedule] Task failed: ${name}`, err)
      );

      scheduler.register({
        name: 'drift-check',
        config,
        handler: async () => {
          const plan = await parsePlanFile(opts.plan);
          let drifted = detectDrift(plan);

          if (opts.suppress) {
            const suppression = await loadSuppressionConfig(opts.suppress);
            drifted = suppressDrift(drifted, suppression);
          }

          const report = buildReport(drifted);
          console.log(report);

          if (hasDrift(drifted)) {
            console.warn('[schedule] Drift detected during scheduled check.');
          }
        },
      });

      scheduler.start();
      console.log(`[schedule] Drift check scheduled: ${config.cronExpression}`);
    });
}
