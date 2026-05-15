import { Command } from 'commander';
import * as fs from 'fs';
import { parsePlanJson } from '../drift/parser';
import { enrichResources } from '../drift/enricher';
import {
  buildEnricherConfigFromEnv,
  mergeEnricherConfig,
  validateEnricherConfig,
} from '../drift/enricher.config';
import { detectDrift } from '../drift/detector';

export function registerEnrichCommand(program: Command): void {
  program
    .command('enrich <plan-file>')
    .description('Enrich drifted resources with metadata from a plan file')
    .option('-s, --source <source>', 'metadata source label', 'driftcheck')
    .option('-t, --tags <json>', 'default tags as JSON object')
    .option('-a, --annotations <json>', 'default annotations as JSON object')
    .option('--output <file>', 'write enriched output to a JSON file')
    .action((planFile: string, options) => {
      if (!fs.existsSync(planFile)) {
        console.error(`Error: plan file not found: ${planFile}`);
        process.exit(1);
      }

      const raw = fs.readFileSync(planFile, 'utf-8');
      const plan = parsePlanJson(raw);
      const resources = detectDrift(plan);

      const envConfig = buildEnricherConfigFromEnv();

      const overrideConfig: typeof envConfig = { source: options.source };
      if (options.tags) {
        try {
          overrideConfig.defaultTags = JSON.parse(options.tags);
        } catch {
          console.error('Error: --tags must be valid JSON');
          process.exit(1);
        }
      }
      if (options.annotations) {
        try {
          overrideConfig.defaultAnnotations = JSON.parse(options.annotations);
        } catch {
          console.error('Error: --annotations must be valid JSON');
          process.exit(1);
        }
      }

      const baseConfig = mergeEnricherConfig(
        { source: 'driftcheck' },
        { ...envConfig, ...overrideConfig }
      );

      const errors = validateEnricherConfig(baseConfig);
      if (errors.length > 0) {
        errors.forEach((e) => console.error(`Config error: ${e}`));
        process.exit(1);
      }

      const enriched = enrichResources(resources, baseConfig);

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(enriched, null, 2), 'utf-8');
        console.log(`Enriched ${enriched.length} resource(s) written to ${options.output}`);
      } else {
        console.log(JSON.stringify(enriched, null, 2));
      }
    });
}
