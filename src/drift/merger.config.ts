import { MergeStrategy } from './merger';

export interface MergerConfig {
  preferSource: 'left' | 'right' | 'newest';
  conflictResolution: 'skip' | 'overwrite' | 'merge-attributes';
}

const VALID_PREFER_SOURCES = ['left', 'right', 'newest'] as const;
const VALID_CONFLICT_RESOLUTIONS = ['skip', 'overwrite', 'merge-attributes'] as const;

export function isValidPreferSource(value: string): value is MergerConfig['preferSource'] {
  return (VALID_PREFER_SOURCES as readonly string[]).includes(value);
}

export function isValidConflictResolution(value: string): value is MergerConfig['conflictResolution'] {
  return (VALID_CONFLICT_RESOLUTIONS as readonly string[]).includes(value);
}

export function buildMergerConfigFromEnv(): Partial<MergerConfig> {
  const config: Partial<MergerConfig> = {};

  const preferSource = process.env.DRIFTCHECK_MERGE_PREFER_SOURCE;
  if (preferSource && isValidPreferSource(preferSource)) {
    config.preferSource = preferSource;
  }

  const conflictResolution = process.env.DRIFTCHECK_MERGE_CONFLICT_RESOLUTION;
  if (conflictResolution && isValidConflictResolution(conflictResolution)) {
    config.conflictResolution = conflictResolution;
  }

  return config;
}

export function validateMergerConfig(config: Partial<MergerConfig>): string[] {
  const errors: string[] = [];

  if (config.preferSource && !isValidPreferSource(config.preferSource)) {
    errors.push(`Invalid preferSource: ${config.preferSource}. Must be one of: ${VALID_PREFER_SOURCES.join(', ')}`);
  }

  if (config.conflictResolution && !isValidConflictResolution(config.conflictResolution)) {
    errors.push(`Invalid conflictResolution: ${config.conflictResolution}. Must be one of: ${VALID_CONFLICT_RESOLUTIONS.join(', ')}`);
  }

  return errors;
}

export function mergeMergerConfig(base: MergerConfig, overrides: Partial<MergerConfig>): MergerConfig {
  return { ...base, ...overrides };
}

export const DEFAULT_MERGER_CONFIG: MergerConfig = {
  preferSource: 'left',
  conflictResolution: 'merge-attributes',
};

export function buildStrategyFromConfig(config: MergerConfig): MergeStrategy {
  return {
    preferSource: config.preferSource,
    conflictResolution: config.conflictResolution,
  };
}
