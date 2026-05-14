import { SchedulerConfig } from './scheduler';

export interface SchedulerConfigFile {
  schedule: SchedulerConfig;
}

export function validateSchedulerConfig(config: Partial<SchedulerConfig>): string[] {
  const errors: string[] = [];

  if (!config.cronExpression || typeof config.cronExpression !== 'string') {
    errors.push('cronExpression is required and must be a string');
  }

  if (typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  if (config.timezone !== undefined && typeof config.timezone !== 'string') {
    errors.push('timezone must be a string if provided');
  }

  return errors;
}

export function mergeSchedulerConfig(
  base: SchedulerConfig,
  overrides: Partial<SchedulerConfig>
): SchedulerConfig {
  return {
    cronExpression: overrides.cronExpression ?? base.cronExpression,
    enabled: overrides.enabled ?? base.enabled,
    timezone: overrides.timezone ?? base.timezone,
  };
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  cronExpression: '0 * * * *',
  enabled: false,
  timezone: 'UTC',
};
