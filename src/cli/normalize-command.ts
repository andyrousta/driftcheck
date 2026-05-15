import { Command } from 'commander';
import * as fs from 'fs';
import {
  normalizeDriftedResources,
  formatNormalizeSummary,
  NormalizerConfig,
} from '../drift/normalizer';
import { DriftedResource } from '../drift/types';

export function registerNormalizeCommand(program: Command): void {
  program
    .command('normalize <input>')
    .description('Normalize drifted resource attribute values from a JSON report')
    .option('-o, --output <file>', 'Write normalized output to file (default: stdout)')
    .option('--no-trim', 'Disable string trimming')
    .option('--no-coerce', 'Disable numeric coercion')
    .option('--no-sort', 'Disable attribute sorting')
    .option('--lowercase-keys', 'Lowercase all attribute keys')
    .action((input: string, options) => {
      if (!fs.existsSync(input)) {
        console.error(`Error: file not found: ${input}`);
        process.exit(1);
      }

      let resources: DriftedResource[];
      try {
        const raw = fs.readFileSync(input, 'utf-8');
        const parsed = JSON.parse(raw);
        resources = Array.isArray(parsed) ? parsed : parsed.driftedResources ?? [];
      } catch (err) {
        console.error(`Error: failed to parse input file — ${(err as Error).message}`);
        process.exit(1);
      }

      const config: Partial<NormalizerConfig> = {
        trimStrings: options.trim !== false,
        coerceNumbers: options.coerce !== false,
        sortAttributes: options.sort !== false,
        lowercaseKeys: Boolean(options.lowercaseKeys),
      };

      const normalized = normalizeDriftedResources(resources, config);
      const summary = formatNormalizeSummary(resources, normalized);

      const output = JSON.stringify(normalized, null, 2);

      if (options.output) {
        fs.writeFileSync(options.output, output, 'utf-8');
        console.log(`Normalized report written to ${options.output}`);
      } else {
        console.log(output);
      }

      console.error(summary);
    });
}
