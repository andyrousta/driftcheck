import { Command } from 'commander';
import { registerSuppressCommand } from './suppress-command';
import * as suppressor from '../drift/suppressor';
import * as baseline from '../drift/baseline';
import * as detector from '../drift/detector';
import * as report from '../drift/report';

jest.mock('../drift/suppressor');
jest.mock('../drift/baseline');
jest.mock('../drift/detector');
jest.mock('../drift/report');

const mockSuppressConfig = { rules: [{ resourceAddress: 'aws_instance.web' }] };
const mockDriftedResources = [
  { address: 'aws_instance.web', driftedAttributes: [{ attribute: 'ami', planned: 'ami-1', actual: 'ami-2' }] },
];
const mockReport = { resources: [], hasDrift: false, summary: '' };

describe('registerSuppressCommand', () => {
  let program: Command;
  let exitSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    program = new Command();
    registerSuppressCommand(program);

    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    (suppressor.loadSuppressionConfig as jest.Mock).mockReturnValue(mockSuppressConfig);
    (suppressor.suppressDrift as jest.Mock).mockReturnValue({ active: [], suppressed: mockDriftedResources });
    (baseline.loadBaseline as jest.Mock).mockReturnValue({ resources: mockDriftedResources });
    (detector.detectDrift as jest.Mock).mockReturnValue(mockDriftedResources);
    (report.buildReport as jest.Mock).mockReturnValue(mockReport);
    (report.formatReportText as jest.Mock).mockReturnValue('No drift detected.');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers check-suppressed command', () => {
    const cmd = program.commands.find((c) => c.name() === 'check-suppressed');
    expect(cmd).toBeDefined();
  });

  it('exits 0 when no drift after suppression', async () => {
    await program.parseAsync(['node', 'driftcheck', 'check-suppressed', '--baseline', 'baseline.json']);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('exits 1 when drift remains after suppression', async () => {
    (report.buildReport as jest.Mock).mockReturnValue({ ...mockReport, hasDrift: true });
    await program.parseAsync(['node', 'driftcheck', 'check-suppressed', '--baseline', 'baseline.json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('logs suppressed count when resources are suppressed', async () => {
    await program.parseAsync(['node', 'driftcheck', 'check-suppressed', '--baseline', 'baseline.json']);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('suppressed'));
  });

  it('exits 1 when no plan or baseline provided', async () => {
    await program.parseAsync(['node', 'driftcheck', 'check-suppressed']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
