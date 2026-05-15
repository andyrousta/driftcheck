import { buildWatcherConfigFromEnv, validateWatcherConfig, startWatcher, WatcherConfig } from './watcher';
import { DriftReport } from './types';

jest.mock('./parser', () => ({
  parsePlanFile: jest.fn().mockResolvedValue({ resources: [] }),
}));
jest.mock('./detector', () => ({
  detectDrift: jest.fn().mockReturnValue([]),
}));
jest.mock('./report', () => ({
  buildReport: jest.fn().mockReturnValue({ drifted: [], generatedAt: new Date().toISOString() }),
  hasDrift: jest.fn().mockReturnValue(false),
}));

const noop = () => {};

describe('buildWatcherConfigFromEnv', () => {
  it('returns defaults when env vars are absent', () => {
    delete process.env.DRIFTCHECK_WATCH_INTERVAL_MS;
    delete process.env.DRIFTCHECK_PLAN_PATH;
    const cfg = buildWatcherConfigFromEnv();
    expect(cfg.intervalMs).toBe(60000);
    expect(cfg.planPath).toBe('plan.json');
    expect(cfg.maxRuns).toBeUndefined();
  });

  it('reads values from env vars', () => {
    process.env.DRIFTCHECK_WATCH_INTERVAL_MS = '5000';
    process.env.DRIFTCHECK_PLAN_PATH = 'custom.json';
    process.env.DRIFTCHECK_WATCH_MAX_RUNS = '3';
    const cfg = buildWatcherConfigFromEnv();
    expect(cfg.intervalMs).toBe(5000);
    expect(cfg.planPath).toBe('custom.json');
    expect(cfg.maxRuns).toBe(3);
    delete process.env.DRIFTCHECK_WATCH_INTERVAL_MS;
    delete process.env.DRIFTCHECK_PLAN_PATH;
    delete process.env.DRIFTCHECK_WATCH_MAX_RUNS;
  });

  it('applies overrides over env values', () => {
    const cfg = buildWatcherConfigFromEnv({ intervalMs: 2000 });
    expect(cfg.intervalMs).toBe(2000);
  });
});

describe('validateWatcherConfig', () => {
  it('returns no errors for valid config', () => {
    const errors = validateWatcherConfig({ planPath: 'plan.json', intervalMs: 5000, onDrift: noop });
    expect(errors).toHaveLength(0);
  });

  it('requires planPath', () => {
    const errors = validateWatcherConfig({ intervalMs: 5000, onDrift: noop });
    expect(errors).toContain('planPath is required');
  });

  it('rejects intervalMs below 1000', () => {
    const errors = validateWatcherConfig({ planPath: 'plan.json', intervalMs: 500, onDrift: noop });
    expect(errors).toContain('intervalMs must be at least 1000ms');
  });

  it('rejects maxRuns below 1', () => {
    const errors = validateWatcherConfig({ planPath: 'plan.json', intervalMs: 1000, maxRuns: 0, onDrift: noop });
    expect(errors).toContain('maxRuns must be at least 1');
  });

  it('requires onDrift callback', () => {
    const errors = validateWatcherConfig({ planPath: 'plan.json', intervalMs: 1000 });
    expect(errors).toContain('onDrift callback is required');
  });
});

describe('startWatcher', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns a handle that reports isRunning', () => {
    const handle = startWatcher({ planPath: 'plan.json', intervalMs: 5000, onDrift: noop, maxRuns: 2 });
    expect(handle.isRunning()).toBe(true);
    handle.stop();
    expect(handle.isRunning()).toBe(false);
  });

  it('increments runCount after each tick', async () => {
    const handle = startWatcher({ planPath: 'plan.json', intervalMs: 1000, onDrift: noop, maxRuns: 2 });
    await jest.runAllTimersAsync();
    expect(handle.runCount()).toBeGreaterThanOrEqual(1);
  });
});
