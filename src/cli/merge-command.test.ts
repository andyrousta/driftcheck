import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { registerMergeCommand } from './merge-command';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerMergeCommand(program);
  return program;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'driftcheck-merge-'));
}

function writeReport(dir: string, name: string, resources: unknown[]): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, JSON.stringify({ driftedResources: resources }), 'utf-8');
  return filePath;
}

describe('registerMergeCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('registers the merge command', () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === 'merge');
    expect(cmd).toBeDefined();
  });

  it('writes merged output to file when --output is specified', () => {
    const primary = writeReport(tmpDir, 'primary.json', [
      { resourceId: 'res1', resourceType: 'aws_instance', driftedAttributes: {}, severity: 'low' },
    ]);
    const secondary = writeReport(tmpDir, 'secondary.json', [
      { resourceId: 'res2', resourceType: 'aws_s3_bucket', driftedAttributes: {}, severity: 'high' },
    ]);
    const outputPath = path.join(tmpDir, 'merged.json');

    const program = makeProgram();
    program.parse(['merge', primary, secondary, '--output', outputPath], { from: 'user' });

    expect(fs.existsSync(outputPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(Array.isArray(content)).toBe(true);
  });

  it('exits with code 1 for invalid conflict-resolution option', () => {
    const primary = writeReport(tmpDir, 'p.json', []);
    const secondary = writeReport(tmpDir, 's.json', []);
    const program = makeProgram();
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    expect(() =>
      program.parse(['merge', primary, secondary, '--conflict-resolution', 'invalid'], { from: 'user' })
    ).toThrow();
    mockExit.mockRestore();
  });
});
