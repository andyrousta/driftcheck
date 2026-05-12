import { DriftReport } from './types';
import { formatReportText, hasDrift } from './report';

export type NotificationChannel = 'slack' | 'github' | 'stdout';

export interface NotifierConfig {
  channel: NotificationChannel;
  webhookUrl?: string;
  token?: string;
  repo?: string;
  prNumber?: number;
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  message: string;
}

export async function notify(
  report: DriftReport,
  config: NotifierConfig
): Promise<NotificationResult> {
  switch (config.channel) {
    case 'slack':
      return notifySlack(report, config);
    case 'github':
      return notifyGitHub(report, config);
    case 'stdout':
    default:
      return notifyStdout(report);
  }
}

async function notifyStdout(report: DriftReport): Promise<NotificationResult> {
  const text = formatReportText(report);
  process.stdout.write(text + '\n');
  return { channel: 'stdout', success: true, message: 'Written to stdout' };
}

async function notifySlack(
  report: DriftReport,
  config: NotifierConfig
): Promise<NotificationResult> {
  if (!config.webhookUrl) {
    return { channel: 'slack', success: false, message: 'Missing webhookUrl' };
  }
  const text = formatReportText(report);
  const payload = {
    text: hasDrift(report) ? ':rotating_light: Drift detected' : ':white_check_mark: No drift',
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `\`\`\`${text}\`\`\`` } }
    ]
  };
  const res = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return {
    channel: 'slack',
    success: res.ok,
    message: res.ok ? 'Slack notification sent' : `Slack error: ${res.status}`
  };
}

async function notifyGitHub(
  report: DriftReport,
  config: NotifierConfig
): Promise<NotificationResult> {
  if (!config.token || !config.repo || !config.prNumber) {
    return { channel: 'github', success: false, message: 'Missing token, repo, or prNumber' };
  }
  const text = formatReportText(report);
  const body = `### DriftCheck Report\n\`\`\`\n${text}\n\`\`\``;
  const [owner, repoName] = config.repo.split('/');
  const url = `https://api.github.com/repos/${owner}/${repoName}/issues/${config.prNumber}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({ body })
  });
  return {
    channel: 'github',
    success: res.ok,
    message: res.ok ? 'GitHub PR comment posted' : `GitHub error: ${res.status}`
  };
}
