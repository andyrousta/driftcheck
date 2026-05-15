import { Command } from 'commander';
import * as fs from 'fs';
import {
  buildLabelerConfigFromEnv,
  labelDriftedResources,
  groupResourcesByLabel,
  LabelRule,
} from '../drift/labeler';
import { DriftedResource } from '../drift/types';

export function registerLabelCommand(program: Command): void {
  program
    .command('label <report>')
    .description('Apply labels to drifted resources and optionally group by a label key')
    .option('--rules <path>', 'Path to JSON file containing label rules')
    .option('--group-by <key>', 'Label key to group results by')
    .option('--output <format>', 'Output format: text or json', 'text')
    .action((reportPath: string, options: { rules?: string; groupBy?: string; output: string }) => {
      let rawReport: string;
      try {
        rawReport = fs.readFileSync(reportPath, 'utf-8');
      } catch {
        console.error(`Error: cannot read report file "${reportPath}"`);
        process.exit(1);
      }

      let resources: DriftedResource[];
      try {
        resources = JSON.parse(rawReport) as DriftedResource[];
      } catch {
        console.error('Error: report file must be valid JSON');
        process.exit(1);
      }

      let rules: LabelRule[];
      if (options.rules) {
        try {
          rules = JSON.parse(fs.readFileSync(options.rules, 'utf-8')) as LabelRule[];
        } catch {
          console.error(`Error: cannot parse rules file "${options.rules}"`);
          process.exit(1);
        }
      } else {
        rules = buildLabelerConfigFromEnv().rules;
      }

      const labeled = labelDriftedResources(resources, rules);

      if (options.groupBy) {
        const groups = groupResourcesByLabel(labeled, options.groupBy);
        if (options.output === 'json') {
          console.log(JSON.stringify(groups, null, 2));
        } else {
          for (const [key, members] of Object.entries(groups)) {
            console.log(`\n[${options.groupBy}=${key}] (${members.length} resource(s))`);
            members.forEach((r) => console.log(`  - ${r.resourceType}.${r.resourceName}`));
          }
        }
      } else {
        if (options.output === 'json') {
          console.log(JSON.stringify(labeled, null, 2));
        } else {
          for (const { resource, labels } of labeled) {
            const labelStr = Object.entries(labels)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ');
            console.log(`${resource.resourceType}.${resource.resourceName}: ${labelStr || '(no labels)'}`);
          }
        }
      }
    });
}
