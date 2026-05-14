import { Command } from 'commander';
import {
  groupByResourceType,
  groupBySeverity,
  groupByModule,
  groupByTag,
  formatGroupSummary,
  GroupKey,
} from '../drift/grouper';
import {
  buildGrouperConfigFromEnv,
  isValidGroupKey,
  validateGrouperConfig,
} from '../drift/grouper.config';
import { parsePlanFile } from '../drift/parser';
import { detectDrift } from '../drift/detector';
import { loadSuppressionConfig, suppressDrift } from '../drift/suppressor';

export function registerGroupCommand(program: Command): void {
  program
    .command('group <plan-file>')
    .description('Group drifted resources by a specified dimension')
    .option('-g, --group-by <key>', 'Group key: resourceType, severity, module, tag', 'resourceType')
    .option('-t, --tag-key <key>', 'Tag key to group by (required when --group-by=tag)')
    .option('--suppress <file>', 'Path to suppression config file')
    .action(async (planFile: string, options) => {
      const envConfig = buildGrouperConfigFromEnv();
      const groupBy: string = options.groupBy ?? envConfig.groupBy ?? 'resourceType';
      const tagKey: string | undefined = options.tagKey ?? envConfig.tagKey;

      if (!isValidGroupKey(groupBy)) {
        console.error(`Invalid --group-by value: "${groupBy}"`);
        process.exit(1);
      }

      const configErrors = validateGrouperConfig({ groupBy: groupBy as GroupKey, tagKey });
      if (configErrors.length > 0) {
        configErrors.forEach((e) => console.error(`Config error: ${e}`));
        process.exit(1);
      }

      let plan;
      try {
        plan = await parsePlanFile(planFile);
      } catch (err) {
        console.error(`Failed to parse plan file: ${(err as Error).message}`);
        process.exit(1);
      }

      let drifted = detectDrift(plan);

      if (options.suppress) {
        const suppressionConfig = loadSuppressionConfig(options.suppress);
        drifted = suppressDrift(drifted, suppressionConfig);
      }

      const key = groupBy as GroupKey;
      const groups =
        key === 'resourceType' ? groupByResourceType(drifted) :
        key === 'severity'     ? groupBySeverity(drifted) :
        key === 'module'       ? groupByModule(drifted) :
                                 groupByTag(drifted, tagKey ?? 'Name');

      console.log(`\nDrift grouped by ${key}:\n`);
      console.log(formatGroupSummary(groups));
      console.log(`\nTotal drifted resources: ${drifted.length}`);
    });
}
