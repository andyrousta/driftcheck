import { Command } from 'commander';
import * as fs from 'fs';
import { parsePlanJson } from '../drift/parser';
import { mergeDriftedResources, formatMergeSummary } from '../drift/merger';
import {
  buildMergerConfigFromEnv,
  DEFAULT_MERGER_CONFIG,
  mergeMergerConfig,
  validateMergerConfig,
  buildStrategyFromConfig,
} from '../drift/merger.config';

export function registerMergeCommand(program: Command): void {
  program
    .command('merge <primary> <secondary>')
    .description('Merge two drift report JSON files into a single deduplicated resource list')
    .option('--prefer-source <source>', 'Which source wins on conflict: left | right | newest', 'left')
    .option(
      '--conflict-resolution <mode>',
      'How to handle conflicts: skip | overwrite | merge-attributes',
      'merge-attributes'
    )
    .option('--output <path>', 'Write merged JSON output to file instead of stdout')
    .option('--summary', 'Print a human-readable merge summary', false)
    .action((primaryPath: string, secondaryPath: string, options) => {
      const envConfig = buildMergerConfigFromEnv();
      const cliConfig = {
        preferSource: options.preferSource,
        conflictResolution: options.conflictResolution,
      };
      const config = mergeMergerConfig(DEFAULT_MERGER_CONFIG, { ...envConfig, ...cliConfig });

      const errors = validateMergerConfig(config);
      if (errors.length > 0) {
        console.error('Invalid merger configuration:');
        errors.forEach((e) => console.error(`  - ${e}`));
        process.exit(1);
      }

      let primaryJson: unknown;
      let secondaryJson: unknown;

      try {
        primaryJson = JSON.parse(fs.readFileSync(primaryPath, 'utf-8'));
        secondaryJson = JSON.parse(fs.readFileSync(secondaryPath, 'utf-8'));
      } catch (err) {
        console.error(`Failed to read input files: ${(err as Error).message}`);
        process.exit(1);
      }

      const primaryResources = parsePlanJson(primaryJson).driftedResources ?? [];
      const secondaryResources = parsePlanJson(secondaryJson).driftedResources ?? [];

      const strategy = buildStrategyFromConfig(config);
      const result = mergeDriftedResources(primaryResources, secondaryResources, strategy);

      if (options.summary) {
        console.log(formatMergeSummary(result));
      }

      const output = JSON.stringify(result.merged, null, 2);

      if (options.output) {
        fs.writeFileSync(options.output, output, 'utf-8');
        console.log(`Merged output written to ${options.output}`);
      } else {
        console.log(output);
      }
    });
}
