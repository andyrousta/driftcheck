import { Command } from 'commander';
import * as fs from 'fs';
import {
  transformDriftedResources,
  formatTransformSummary,
  TransformRule,
} from '../drift/transformer';
import {
  buildTransformerConfigFromEnv,
  validateTransformerConfig,
} from '../drift/transformer.config';
import { DriftedResource } from '../drift/types';

export function registerTransformCommand(program: Command): void {
  program
    .command('transform <reportFile>')
    .description('Apply transformation rules to a drift report (mask, rename, truncate fields)')
    .option('-r, --rules <rulesFile>', 'Path to JSON file containing transform rules')
    .option('-o, --output <outputFile>', 'Write transformed report to file (default: stdout)')
    .option('--summary', 'Print a transformation summary after processing')
    .action((reportFile: string, options: { rules?: string; output?: string; summary?: boolean }) => {
      if (!fs.existsSync(reportFile)) {
        console.error(`Error: report file not found: ${reportFile}`);
        process.exit(1);
      }

      let resources: DriftedResource[];
      try {
        const raw = fs.readFileSync(reportFile, 'utf-8');
        resources = JSON.parse(raw) as DriftedResource[];
      } catch (err) {
        console.error(`Error: failed to parse report file: ${(err as Error).message}`);
        process.exit(1);
      }

      let config = buildTransformerConfigFromEnv();

      if (options.rules) {
        if (!fs.existsSync(options.rules)) {
          console.error(`Error: rules file not found: ${options.rules}`);
          process.exit(1);
        }
        try {
          const rulesRaw = fs.readFileSync(options.rules, 'utf-8');
          const rules = JSON.parse(rulesRaw) as TransformRule[];
          config = { ...config, rules };
        } catch (err) {
          console.error(`Error: failed to parse rules file: ${(err as Error).message}`);
          process.exit(1);
        }
      }

      const { valid, errors } = validateTransformerConfig(config);
      if (!valid) {
        console.error('Invalid transformer configuration:');
        errors.forEach((e) => console.error(`  - ${e}`));
        process.exit(1);
      }

      const results = transformDriftedResources(resources, config.rules);
      const transformed = results.map((r) => r.transformed);

      const output = JSON.stringify(transformed, null, 2);
      if (options.output) {
        fs.writeFileSync(options.output, output, 'utf-8');
        console.log(`Transformed report written to ${options.output}`);
      } else {
        console.log(output);
      }

      if (options.summary) {
        console.error(formatTransformSummary(results));
      }
    });
}
