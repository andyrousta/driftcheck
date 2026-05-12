import { Command } from 'commander';
import * as path from 'path';
import { loadSuppressionConfig, suppressDrift } from '../drift/suppressor';
import { loadBaseline } from '../drift/baseline';
import { detectDrift } from '../drift/detector';
import { buildReport, formatReportText } from '../drift/report';

const DEFAULT_SUPPRESS_FILE = '.driftignore.json';

export function registerSuppressCommand(program: Command): void {
  program
    .command('check-suppressed')
    .description('Run drift detection and apply suppression rules before reporting')
    .option('-p, --plan <file>', 'Path to Terraform plan JSON file')
    .option('-s, --suppress-file <file>', 'Path to suppression config file', DEFAULT_SUPPRESS_FILE)
    .option('--baseline <file>', 'Path to baseline file to compare against')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
      try {
        const suppressConfig = loadSuppressionConfig(
          path.resolve(options.suppressFile)
        );

        if (suppressConfig.rules.length === 0) {
          console.warn(`No suppression rules found in ${options.suppressFile}`);
        }

        let driftedResources;

        if (options.baseline) {
          const baseline = loadBaseline(path.resolve(options.baseline));
          driftedResources = detectDrift(baseline.resources, baseline.resources);
        } else if (options.plan) {
          const { parsePlanFile } = await import('../drift/parser');
          const planResources = parsePlanFile(path.resolve(options.plan));
          driftedResources = detectDrift(planResources, planResources);
        } else {
          console.error('Error: provide --plan or --baseline option');
          process.exit(1);
        }

        const { active, suppressed } = suppressDrift(driftedResources, suppressConfig);

        const report = buildReport(active);

        if (options.json) {
          console.log(JSON.stringify({ report, suppressedCount: suppressed.length }, null, 2));
        } else {
          console.log(formatReportText(report));
          if (suppressed.length > 0) {
            console.log(`\n[suppressed] ${suppressed.length} resource(s) suppressed by rules in ${options.suppressFile}`);
          }
        }

        process.exit(report.hasDrift ? 1 : 0);
      } catch (err) {
        console.error('Error running suppressed drift check:', (err as Error).message);
        process.exit(2);
      }
    });
}
