import { Command } from 'commander';
import * as fs from 'fs';
import { parsePlanFile } from '../drift/parser';
import { detectDrift } from '../drift/detector';
import { buildReport } from '../drift/report';
import {
  validateDrift,
  formatValidationSummary,
  ValidationRule,
} from '../drift/validator';

function loadRulesFromFile(rulesPath: string): ValidationRule[] {
  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Rules file not found: ${rulesPath}`);
  }
  const raw = fs.readFileSync(rulesPath, 'utf-8');
  return JSON.parse(raw) as ValidationRule[];
}

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate a drift report against a set of rules')
    .requiredOption('-p, --plan <path>', 'Path to Terraform plan JSON file')
    .requiredOption('-r, --rules <path>', 'Path to validation rules JSON file')
    .option('--fail-on-warning', 'Exit with non-zero code if warnings are found', false)
    .option('--json', 'Output results as JSON', false)
    .action(async (opts) => {
      try {
        const planData = parsePlanFile(opts.plan);
        const resources = planData.resources ?? [];
        const driftedResources = detectDrift(resources, resources);
        const report = buildReport(driftedResources);
        const rules = loadRulesFromFile(opts.rules);
        const summary = validateDrift(report, rules);

        if (opts.json) {
          console.log(JSON.stringify(summary, null, 2));
        } else {
          console.log(formatValidationSummary(summary));
        }

        const shouldFail =
          !summary.passed || (opts.failOnWarning && summary.warningCount > 0);

        process.exit(shouldFail ? 1 : 0);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(2);
      }
    });
}
