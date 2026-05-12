import { NotificationChannel, NotifierConfig } from './notifier';

export interface RawNotifierEnv {
  DRIFTCHECK_CHANNEL?: string;
  DRIFTCHECK_SLACK_WEBHOOK?: string;
  DRIFTCHECK_GITHUB_TOKEN?: string;
  DRIFTCHECK_GITHUB_REPO?: string;
  DRIFTCHECK_GITHUB_PR?: string;
}

const VALID_CHANNELS: NotificationChannel[] = ['slack', 'github', 'stdout'];

function isValidChannel(value: string): value is NotificationChannel {
  return VALID_CHANNELS.includes(value as NotificationChannel);
}

export function buildNotifierConfigFromEnv(
  env: RawNotifierEnv = process.env as RawNotifierEnv
): NotifierConfig {
  const rawChannel = env.DRIFTCHECK_CHANNEL ?? 'stdout';
  const channel: NotificationChannel = isValidChannel(rawChannel) ? rawChannel : 'stdout';

  const prNumber = env.DRIFTCHECK_GITHUB_PR ? parseInt(env.DRIFTCHECK_GITHUB_PR, 10) : undefined;

  return {
    channel,
    webhookUrl: env.DRIFTCHECK_SLACK_WEBHOOK,
    token: env.DRIFTCHECK_GITHUB_TOKEN,
    repo: env.DRIFTCHECK_GITHUB_REPO,
    prNumber: Number.isNaN(prNumber) ? undefined : prNumber
  };
}

export function validateNotifierConfig(config: NotifierConfig): string[] {
  const errors: string[] = [];

  if (config.channel === 'slack' && !config.webhookUrl) {
    errors.push('DRIFTCHECK_SLACK_WEBHOOK is required for slack channel');
  }

  if (config.channel === 'github') {
    if (!config.token) errors.push('DRIFTCHECK_GITHUB_TOKEN is required for github channel');
    if (!config.repo) errors.push('DRIFTCHECK_GITHUB_REPO is required for github channel');
    if (!config.prNumber) errors.push('DRIFTCHECK_GITHUB_PR is required for github channel');
  }

  return errors;
}
