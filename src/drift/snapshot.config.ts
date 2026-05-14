export interface SnapshotConfig {
  snapshotDir: string;
  maxSnapshots: number;
  autoCleanup: boolean;
}

const DEFAULT_CONFIG: SnapshotConfig = {
  snapshotDir: '.driftcheck/snapshots',
  maxSnapshots: 50,
  autoCleanup: false,
};

export function buildSnapshotConfigFromEnv(): Partial<SnapshotConfig> {
  const config: Partial<SnapshotConfig> = {};
  if (process.env.DRIFTCHECK_SNAPSHOT_DIR) {
    config.snapshotDir = process.env.DRIFTCHECK_SNAPSHOT_DIR;
  }
  if (process.env.DRIFTCHECK_MAX_SNAPSHOTS) {
    const val = parseInt(process.env.DRIFTCHECK_MAX_SNAPSHOTS, 10);
    if (!isNaN(val)) config.maxSnapshots = val;
  }
  if (process.env.DRIFTCHECK_SNAPSHOT_AUTO_CLEANUP) {
    config.autoCleanup = process.env.DRIFTCHECK_SNAPSHOT_AUTO_CLEANUP === 'true';
  }
  return config;
}

export function mergeSnapshotConfig(overrides: Partial<SnapshotConfig> = {}): SnapshotConfig {
  return { ...DEFAULT_CONFIG, ...buildSnapshotConfigFromEnv(), ...overrides };
}

export function validateSnapshotConfig(config: SnapshotConfig): string[] {
  const errors: string[] = [];
  if (!config.snapshotDir || config.snapshotDir.trim() === '') {
    errors.push('snapshotDir must not be empty');
  }
  if (config.maxSnapshots < 1) {
    errors.push('maxSnapshots must be at least 1');
  }
  if (config.maxSnapshots > 1000) {
    errors.push('maxSnapshots must not exceed 1000');
  }
  return errors;
}
