import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify, NotifierConfig } from './notifier';
import { DriftReport } from './types';

const mockReport: DriftReport = {
  generatedAt: new Date('2024-01-01T00:00:00Z'),
  driftedResources: [
    {
      resourceType: 'aws_instance',
      resourceName: 'web',
      driftedAttributes: [
        { attribute: 'instance_type', planned: 't3.micro', actual: 't3.small' }
      ]
    }
  ],
  totalDrifted: 1,
  totalChecked: 3
};

const cleanReport: DriftReport = {
  generatedAt: new Date('2024-01-01T00:00:00Z'),
  driftedResources: [],
  totalDrifted: 0,
  totalChecked: 3
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('notify - stdout', () => {
  it('writes report text to stdout and returns success', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const result = await notify(mockReport, { channel: 'stdout' });
    expect(result.success).toBe(true);
    expect(result.channel).toBe('stdout');
    expect(writeSpy).toHaveBeenCalledOnce();
  });

  it('includes drift summary in stdout output', async () => {
    let output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output += chunk.toString();
      return true;
    });
    await notify(mockReport, { channel: 'stdout' });
    expect(output).toContain('aws_instance');
    expect(output).toContain('instance_type');
  });
});

describe('notify - slack', () => {
  it('returns failure when webhookUrl is missing', async () => {
    const result = await notify(mockReport, { channel: 'slack' });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/webhookUrl/);
  });

  it('posts payload to slack webhook', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const config: NotifierConfig = { channel: 'slack', webhookUrl: 'https://hooks.slack.com/test' };
    const result = await notify(cleanReport, config);
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://hooks.slack.com/test', expect.objectContaining({ method: 'POST' }));
  });

  it('returns failure when slack webhook responds with non-ok status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal('fetch', fetchMock);
    const config: NotifierConfig = { channel: 'slack', webhookUrl: 'https://hooks.slack.com/test' };
    const result = await notify(mockReport, config);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/403/);
  });
});

describe('notify - github', () => {
  it('returns failure when config fields are missing', async () => {
    const result = await notify(mockReport, { channel: 'github', token: 'tok' });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/repo/);
  });

  it('posts PR comment to GitHub API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);
    const config: NotifierConfig = { channel: 'github', token: 'tok', repo: 'org/repo', prNumber: 42 };
    const result = await notify(mockReport, config);
    expect(result.success).toBe(true);
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('org/repo/issues/42/comments');
  });
});
