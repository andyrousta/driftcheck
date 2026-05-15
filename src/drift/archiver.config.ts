import { ArchiverConfig } from './archiver';

const DEFAULT_ARCHIVE_DIR = '.driftcheck/archive';
const DEFAULT_MAX_ENTRIES = 50;

export function buildArchiverConfigFromEnv(): Partial<ArchiverConfig> {
  const config: Partial<ArchiverConfig> = {};
  if (process.env.DRIFTCHECK_ARCHIVE_DIR) {
    config.archiveDir = process.env.DRIFTCHECK_ARCHIVE_DIR;
  }
  if (process.env.DRIFTCHECK_ARCHIVE_MAX_ENTRIES) {
    const parsed = parseInt(process.env.DRIFTCHECK_ARCHIVE_MAX_ENTRIES, 10);
    if (!isNaN(parsed) && parsed > 0) config.maxEntries = parsed;
  }
  if (process.env.DRIFTCHECK_ARCHIVE_COMPRESS) {
    config.compress = process.env.DRIFTCHECK_ARCHIVE_COMPRESS === 'true';
  }
  return config;
}

export function mergeArchiverConfig(
  overrides: Partial<ArchiverConfig> = {}
): ArchiverConfig {
  return {
    archiveDir: overrides.archiveDir ?? DEFAULT_ARCHIVE_DIR,
    maxEntries: overrides.maxEntries ?? DEFAULT_MAX_ENTRIES,
    compress: overrides.compress ?? false,
  };
}

export function validateArchiverConfig(config: ArchiverConfig): string[] {
  const errors: string[] = [];
  if (!config.archiveDir || config.archiveDir.trim() === '') {
    errors.push('archiveDir must not be empty');
  }
  if (config.maxEntries < 1) {
    errors.push('maxEntries must be at least 1');
  }
  if (config.maxEntries > 1000) {
    errors.push('maxEntries must not exceed 1000');
  }
  return errors;
}
