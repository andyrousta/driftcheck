import { Command } from 'commander';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { registerTransformCommand } from './transform-command';
import { DriftedResource } from '../drift/types';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerTransformCommand(program);
  return program;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'driftcheck-transform-'));
}

function writeReport(dir: string, resources: DriftedResource[]): string {
  const file = path.join(dir, 'report.json');
  fs.writeFileSync(file, JSON.stringify(resources), 'utf-8');
  return file;
}

const sampleResources: DriftedResource[] = [
  {
    resourceType: 'aws_instance',
    resourceName: 'web',
    driftedAttributes: { secret: 'topsecret', env: 'production' },
    severity: 'high',
  },
];

describe('registerTransformCommand', () => {
  it('writes transformed output to file', () => {
    const dir = makeTempDir();
    const reportFile = writeReport(dir, sampleResources);
    const rulesFile = path.join(dir, 'rules.json');
    fs.writeFileSync(rulesFile, JSON.stringify([{ field: 'secret', operation: 'mask' }]));
    const outputFile = path.join(dir, 'out.json');

    const program = makeProgram();
    program.parse(['transform', reportFile, '--rules', rulesFile, '--output', outputFile], {
      from: 'user',
    });

    const result = JSON.parse(fs.readFileSync(outputFile, 'utf-8')) as DriftedResource[];
    expect(result[0].driftedAttributes['secret']).toBe('***');
  });

  it('exits with error when report file does not exist', () => {
    const program = makeProgram();
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    expect(() =>
      program.parse(['transform', '/nonexistent/report.json'], { from: 'user' })
    ).toThrow();
    mockExit.mockRestore();
  });

  it('exits with error for invalid rules config', () => {
    const dir = makeTempDir();
    const reportFile = writeReport(dir, sampleResources);
    const rulesFile = path.join(dir, 'bad-rules.json');
    fs.writeFileSync(rulesFile, JSON.stringify([{ field: 'secret', operation: 'rename' }]));

    const program = makeProgram();
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    expect(() =>
      program.parse(['transform', reportFile, '--rules', rulesFile], { from: 'user' })
    ).toThrow();
    mockExit.mockRestore();
  });
});
