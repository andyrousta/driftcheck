import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import * as fs from 'fs';
import { registerNotifyCommand } from './notify-command';
import * as notifier from '../drift/notifier';
import * as parser from '../drift/parser';
import * as detector from '../drift/detector';
import * as report from '../drift/report';

const fakePlanJson = JSON.stringify({ resource_changes: [] });

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('registerNotifyCommand', () => {
  it('registers the notify command on the program', () => {
    const program = new Command();
    registerNotifyCommand(program);
    const cmd = program.commands.find(c => c.name() === 'notify');
    expect(cmd).toBeDefined();
  });

  it('exits with code 1 if plan file does not exist', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    const program = new Command();
    registerNotifyCommand(program);
    await expect(program.parseAsync(['node', 'cli', 'notify', 'missing.json'])).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('calls notify with stdout channel by default', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(fakePlanJson);
    vi.spyOn(parser, 'parsePlanJson').mockReturnValue({ resources: [] });
    vi.spyOn(detector, 'detectDrift').mockReturnValue([]);
    vi.spyOn(report, 'buildReport').mockReturnValue({ generatedAt: new Date(), driftedResources: [], totalDrifted: 0, totalChecked: 0 });
    const notifySpy = vi.spyOn(notifier, 'notify').mockResolvedValue({ channel: 'stdout', success: true, message: 'ok' });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const program = new Command();
    registerNotifyCommand(program);
    await program.parseAsync(['node', 'cli', 'notify', 'plan.json']);

    expect(notifySpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ channel: 'stdout' })
    );
    expect(consoleSpy).toHaveBeenCalledWith('ok');
  });

  it('exits with code 1 when notification fails', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(fakePlanJson);
    vi.spyOn(parser, 'parsePlanJson').mockReturnValue({ resources: [] });
    vi.spyOn(detector, 'detectDrift').mockReturnValue([]);
    vi.spyOn(report, 'buildReport').mockReturnValue({ generatedAt: new Date(), driftedResources: [], totalDrifted: 0, totalChecked: 0 });
    vi.spyOn(notifier, 'notify').mockResolvedValue({ channel: 'slack', success: false, message: 'fail' });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const program = new Command();
    registerNotifyCommand(program);
    await expect(program.parseAsync(['node', 'cli', 'notify', 'plan.json', '--channel', 'slack'])).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
