import { GroupKey } from './grouper';

export interface GrouperConfig {
  groupBy: GroupKey;
  tagKey?: string;
  minGroupSize?: number;
}

const VALID_GROUP_KEYS: GroupKey[] = ['resourceType', 'severity', 'tag', 'module'];

export function isValidGroupKey(value: string): value is GroupKey {
  return VALID_GROUP_KEYS.includes(value as GroupKey);
}

export function buildGrouperConfigFromEnv(): Partial<GrouperConfig> {
  const config: Partial<GrouperConfig> = {};
  const groupBy = process.env.DRIFTCHECK_GROUP_BY;
  if (groupBy && isValidGroupKey(groupBy)) {
    config.groupBy = groupBy;
  }
  if (process.env.DRIFTCHECK_GROUP_TAG_KEY) {
    config.tagKey = process.env.DRIFTCHECK_GROUP_TAG_KEY;
  }
  const minSize = process.env.DRIFTCHECK_GROUP_MIN_SIZE;
  if (minSize !== undefined) {
    const parsed = parseInt(minSize, 10);
    if (!isNaN(parsed) && parsed >= 0) config.minGroupSize = parsed;
  }
  return config;
}

export function validateGrouperConfig(config: Partial<GrouperConfig>): string[] {
  const errors: string[] = [];
  if (config.groupBy !== undefined && !isValidGroupKey(config.groupBy)) {
    errors.push(`Invalid groupBy key: ${config.groupBy}. Must be one of: ${VALID_GROUP_KEYS.join(', ')}`);
  }
  if (config.groupBy === 'tag' && !config.tagKey) {
    errors.push('tagKey is required when groupBy is "tag"');
  }
  if (config.minGroupSize !== undefined && config.minGroupSize < 0) {
    errors.push('minGroupSize must be >= 0');
  }
  return errors;
}

export function mergeGrouperConfig(
  base: GrouperConfig,
  overrides: Partial<GrouperConfig>
): GrouperConfig {
  return { ...base, ...overrides };
}
