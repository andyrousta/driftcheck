import { Command } from 'commander';
import * as fs from 'fs';
import { parsePlanJson } from '../drift/parser';
import { detectDrift } from '../drift/detector';
import { buildReport } from '../drift/report';
import { notify, NotificationChannel, NotifierConfig } from '../drift/notifier';
import { loadBaseline } from '../drift/baseline';

export function registerNotifyCommand(program: Command): void {
  program
    .command('notify <plan-file>')
    .description('Run drift detection and send results to a notification channel')
    .option('-c, --channel <channel>', 'Notification channel: slack | github | stdout', 'stdout')
    .option('--webhook-url <url>', 'Slack webhook URL')
    .option('--github-token <token>', 'GitHub personal access token')
    .option('--repo <owner/repo>', 'GitHub repository (owner/repo)')
    .option('--pr <number>', 'GitHub pull request number', parseInt)
    .option('--baseline <path>', 'Path to baseline file for comparison')
    .action(async (planFile: string, opts) => {
      if (!fs.existsSync(planFile)) {
        console.error(`Plan file not found: ${planFile}`);
        process.exit(1);
      }

      const raw = fs.readFileSync(planFile, 'utf-8');
      const planData = parsePlanJson(raw);
      const planned = planData.resources;

      let actual = planned;
      if (opts.baseline) {
        const baseline = loadBaseline(opts.baseline);
        actual = baseline?.resources ?? planned;
      }

      const drifted = detectDrift(planned, actual);
      const report = buildReport(drifted, planned.length);

      const config: NotifierConfig = {
        channel: opts.channel as NotificationChannel,
        webhookUrl: opts.webhookUrl,
        token: opts.githubToken,
        repo: opts.repo,
        prNumber: opts.pr
      };

      const result = await notify(report, config);
      if (!result.success) {
        console.error(`Notification failed: ${result.message}`);
        process.exit(1);
      }
      console.log(result.message);
    });
}
