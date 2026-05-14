import * as cron from 'node-cron';
import { EventEmitter } from 'events';

export interface SchedulerConfig {
  cronExpression: string;
  enabled: boolean;
  timezone?: string;
}

export interface SchedulerTask {
  name: string;
  config: SchedulerConfig;
  handler: () => Promise<void>;
}

export class DriftScheduler extends EventEmitter {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  register(task: SchedulerTask): void {
    if (!task.config.enabled) {
      return;
    }

    if (!cron.validate(task.config.cronExpression)) {
      throw new Error(`Invalid cron expression for task "${task.name}": ${task.config.cronExpression}`);
    }

    const scheduled = cron.schedule(
      task.config.cronExpression,
      async () => {
        this.emit('task:start', task.name);
        try {
          await task.handler();
          this.emit('task:success', task.name);
        } catch (err) {
          this.emit('task:error', task.name, err);
        }
      },
      { timezone: task.config.timezone }
    );

    this.tasks.set(task.name, scheduled);
  }

  start(name?: string): void {
    if (name) {
      this.tasks.get(name)?.start();
    } else {
      this.tasks.forEach((t) => t.start());
    }
  }

  stop(name?: string): void {
    if (name) {
      this.tasks.get(name)?.stop();
    } else {
      this.tasks.forEach((t) => t.stop());
    }
  }

  listTasks(): string[] {
    return Array.from(this.tasks.keys());
  }
}

export function buildSchedulerConfigFromEnv(): SchedulerConfig {
  return {
    cronExpression: process.env.DRIFTCHECK_CRON ?? '0 * * * *',
    enabled: process.env.DRIFTCHECK_SCHEDULE_ENABLED === 'true',
    timezone: process.env.DRIFTCHECK_TIMEZONE,
  };
}
