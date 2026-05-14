import { Command } from 'commander';
import { loadBaseline } from '../drift/baseline';
import { detectDrift } from '../drift/detector';
import { buildRemediationPlan, formatRemediationPlan } from '../drift/remediation';
import {
  buildRemediationConfigFromEnv,
  validateRemediationConfig,
} from '../drift/remediation.config';
import { parsePlanFile } from '../drift/parser';

export function registerRemediationCommand(program: Command): void {
  program
    .command('remediate <plan-file>')
    .description('Generate a remediation plan for detected drift')
    .option('--live', 'Generate live (non-dry-run) remediation commands', false)
    .option('--baseline <path>', 'Path to baseline file', '.driftcheck-baseline.json')
    .option('--json', 'Output as JSON', false)
    .action(async (planFile: string, options) => {
      const envConfig = buildRemediationConfigFromEnv();
      const dryRun = options.live ? false : envConfig.dryRun;

      const configErrors = validateRemediationConfig({ ...envConfig, dryRun });
      if (configErrors.length > 0) {
        console.error('Invalid remediation config:');
        configErrors.forEach((e) => console.error(`  - ${e}`));
        process.exit(1);
      }

      let planData;
      try {
        planData = await parsePlanFile(planFile);
      } catch (err) {
        console.error(`Failed to parse plan file: ${(err as Error).message}`);
        process.exit(1);
      }

      let baseline;
      try {
        baseline = await loadBaseline(options.baseline);
      } catch (err) {
        console.error(`Failed to load baseline: ${(err as Error).message}`);
        process.exit(1);
      }

      const driftResult = detectDrift(planData, baseline);
      const plan = buildRemediationPlan(driftResult, dryRun);

      if (options.json) {
        console.log(JSON.stringify(plan, null, 2));
      } else {
        console.log(formatRemediationPlan(plan));
      }

      if (plan.actions.length > 0) {
        process.exit(1);
      }
    });
}
