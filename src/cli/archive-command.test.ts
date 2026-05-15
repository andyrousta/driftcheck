import { Command } from 'commander';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { registerArchiveCommand } from './archive-command';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerArchiveCommand(program);
  return program;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'archive-cmd-test-'));
}

function writeReport(dir: string, driftCount: number): string {
  const report = {
    driftedResources: Array.from({ length: driftCount }, (_, i) => ({
      resourceId: `res-${i}`,
      resourceType: 'aws_s3_bucket',
      driftedAttributes: [],
    })),
    generatedAt: new Date().toISOString(),
  };
  const filePath = path.join(dir, 'report.json');
  fs.writeFileSync(filePath, JSON.stringify(report), 'utf-8');
  return filePath;
}

describe('archive save command', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should save a report and print the archive id', () => {
    const reportFile = writeReport(tmpDir, 2);
    const archiveDir = path.join(tmpDir, 'arch');
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation((msg) => logs.push(msg));
    const program = makeProgram();
    program.parse(['archive', 'save', reportFile, '--archive-dir', archiveDir], { from: 'user' });
    expect(logs.some((l) => l.includes('Archived report:'))).toBe(true);
    expect(logs.some((l) => l.includes('2 drifted'))).toBe(true);
    (console.log as jest.Mock).mockRestore();
  });

  it('should exit with error for missing report file', () => {
    const program = makeProgram();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      program.parse(['archive', 'save', '/nonexistent/report.json'], { from: 'user' })
    ).toThrow();
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    (console.error as jest.Mock).mockRestore();
  });
});

describe('archive list command', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should print no reports message when archive is empty', () => {
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation((msg) => logs.push(msg));
    const program = makeProgram();
    program.parse(['archive', 'list', '--archive-dir', tmpDir], { from: 'user' });
    expect(logs.some((l) => l.includes('No archived reports'))).toBe(true);
    (console.log as jest.Mock).mockRestore();
  });
});
