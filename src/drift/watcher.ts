import { DriftReport } from './types';
import { buildReport, hasDrift } from './report';
import { detectDrift } from './detector';
import { parsePlanFile } from './parser';

export interface WatcherConfig {
  intervalMs: number;
  planPath: string;
  onDrift: (report: DriftReport) => void;
  onError?: (error: Error) => void;
  maxRuns?: number;
}

export interface WatcherHandle {
  stop: () => void;
  isRunning: () => boolean;
  runCount: () => number;
}

export function buildWatcherConfigFromEnv(overrides: Partial<WatcherConfig> = {}): Partial<WatcherConfig> {
  const intervalMs = process.env.DRIFTCHECK_WATCH_INTERVAL_MS
    ? parseInt(process.env.DRIFTCHECK_WATCH_INTERVAL_MS, 10)
    : 60000;
  const planPath = process.env.DRIFTCHECK_PLAN_PATH ?? 'plan.json';
  const maxRuns = process.env.DRIFTCHECK_WATCH_MAX_RUNS
    ? parseInt(process.env.DRIFTCHECK_WATCH_MAX_RUNS, 10)
    : undefined;
  return { intervalMs, planPath, maxRuns, ...overrides };
}

export function validateWatcherConfig(config: Partial<WatcherConfig>): string[] {
  const errors: string[] = [];
  if (!config.planPath) errors.push('planPath is required');
  if (config.intervalMs !== undefined && config.intervalMs < 1000) {
    errors.push('intervalMs must be at least 1000ms');
  }
  if (config.maxRuns !== undefined && config.maxRuns < 1) {
    errors.push('maxRuns must be at least 1');
  }
  if (typeof config.onDrift !== 'function') {
    errors.push('onDrift callback is required');
  }
  return errors;
}

export function startWatcher(config: WatcherConfig): WatcherHandle {
  let running = true;
  let count = 0;

  const tick = async () => {
    if (!running) return;
    try {
      const plan = await parsePlanFile(config.planPath);
      const drifted = detectDrift(plan.resources, []);
      const report = buildReport(drifted);
      if (hasDrift(report)) {
        config.onDrift(report);
      }
    } catch (err) {
      if (config.onError) config.onError(err as Error);
    } finally {
      count++;
      if (config.maxRuns !== undefined && count >= config.maxRuns) {
        running = false;
        return;
      }
      if (running) setTimeout(tick, config.intervalMs);
    }
  };

  setTimeout(tick, config.intervalMs);

  return {
    stop: () => { running = false; },
    isRunning: () => running,
    runCount: () => count,
  };
}
