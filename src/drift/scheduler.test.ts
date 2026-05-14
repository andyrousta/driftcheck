import { DriftScheduler, buildSchedulerConfigFromEnv, SchedulerTask } from './scheduler';

jest.mock('node-cron', () => ({
  validate: jest.fn((expr: string) => expr === '0 * * * *' || expr === '*/5 * * * *'),
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

describe('DriftScheduler', () => {
  let scheduler: DriftScheduler;

  beforeEach(() => {
    scheduler = new DriftScheduler();
  });

  it('registers a valid task', () => {
    const task: SchedulerTask = {
      name: 'check-drift',
      config: { cronExpression: '0 * * * *', enabled: true },
      handler: jest.fn().mockResolvedValue(undefined),
    };
    expect(() => scheduler.register(task)).not.toThrow();
    expect(scheduler.listTasks()).toContain('check-drift');
  });

  it('skips disabled tasks', () => {
    const task: SchedulerTask = {
      name: 'disabled-task',
      config: { cronExpression: '0 * * * *', enabled: false },
      handler: jest.fn(),
    };
    scheduler.register(task);
    expect(scheduler.listTasks()).not.toContain('disabled-task');
  });

  it('throws on invalid cron expression', () => {
    const task: SchedulerTask = {
      name: 'bad-task',
      config: { cronExpression: 'not-a-cron', enabled: true },
      handler: jest.fn(),
    };
    expect(() => scheduler.register(task)).toThrow('Invalid cron expression');
  });

  it('emits task:start and task:success on successful run', async () => {
    const cron = require('node-cron');
    let capturedCallback: () => Promise<void>;
    cron.schedule.mockImplementationOnce((_expr: string, cb: () => Promise<void>) => {
      capturedCallback = cb;
      return { start: jest.fn(), stop: jest.fn() };
    });

    const task: SchedulerTask = {
      name: 'emit-test',
      config: { cronExpression: '0 * * * *', enabled: true },
      handler: jest.fn().mockResolvedValue(undefined),
    };

    const startSpy = jest.fn();
    const successSpy = jest.fn();
    scheduler.on('task:start', startSpy);
    scheduler.on('task:success', successSpy);
    scheduler.register(task);
    await capturedCallback!();

    expect(startSpy).toHaveBeenCalledWith('emit-test');
    expect(successSpy).toHaveBeenCalledWith('emit-test');
  });
});

describe('buildSchedulerConfigFromEnv', () => {
  it('returns defaults when env vars are absent', () => {
    delete process.env.DRIFTCHECK_CRON;
    delete process.env.DRIFTCHECK_SCHEDULE_ENABLED;
    const config = buildSchedulerConfigFromEnv();
    expect(config.cronExpression).toBe('0 * * * *');
    expect(config.enabled).toBe(false);
  });

  it('reads values from environment', () => {
    process.env.DRIFTCHECK_CRON = '*/5 * * * *';
    process.env.DRIFTCHECK_SCHEDULE_ENABLED = 'true';
    const config = buildSchedulerConfigFromEnv();
    expect(config.cronExpression).toBe('*/5 * * * *');
    expect(config.enabled).toBe(true);
  });
});
